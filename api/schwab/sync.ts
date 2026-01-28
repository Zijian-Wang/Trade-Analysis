import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from '../lib/firebase-admin'

interface SchwabAccountData {
  securitiesAccount: {
    type: string
    accountNumber: string
    roundTrips: number
    isDayTrader: boolean
    isClosingOnlyRestricted: boolean
    pfcbFlag: boolean
    positions?: SchwabPosition[]
    currentBalances?: {
      availableFunds: number
      availableFundsNonMarginableTrade: number
      buyingPower: number
      buyingPowerNonMarginableTrade: number
      dayTradingBuyingPower: number
      dayTradingBuyingPowerCall: number
      equity: number
      equityPercentage: number
      liquidationValue: number
      longMarginValue: number
      maintenanceCall: number
      maintenanceRequirement: number
      margin: number
      marginBalance: number
      marginEquity: number
      moneyMarketFund: number
      mutualFundValue: number
      regTCall: number
      shortMarginValue: number
      shortOptionMarketValue: number
      sma: number
      cashBalance?: number
    }
  }
}

interface SchwabPosition {
  shortQuantity: number
  averagePrice: number
  longQuantity: number
  instrument: {
    assetType: string
    symbol: string
    description: string
  }
  marketValue: number
}

interface SchwabOrder {
  orderId: number
  orderType: string
  stopPrice?: number
  status: string
  remainingQuantity: number
  orderLegCollection: Array<{
    instruction: string
    quantity: number
    instrument: {
      symbol: string
      assetType: string
    }
  }>
}

/**
 * Unified sync endpoint
 * Fetches positions and stop orders, returns risk snapshot
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({ success: false, error: 'Missing userId' })
    }

    // Initialize Firebase (lazy, with proper error handling)
    let db
    try {
      db = getDb()
    } catch (e) {
      return res.status(500).json({
        success: false,
        error: e instanceof Error ? e.message : 'Firebase initialization failed',
      })
    }

    // Get user's Schwab account data
    const userRef = db.collection('users').doc(userId)
    const userDoc = await userRef.get()

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' })
    }

    const userData = userDoc.data()
    const schwabAccount = userData?.schwabAccounts?.[0]

    if (!schwabAccount || !schwabAccount.accessToken) {
      return res.status(400).json({ error: 'No Schwab account linked' })
    }

    let accessToken = schwabAccount.accessToken

    // Check if token needs refresh (refresh 5 minutes before expiry)
    const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000
    if (schwabAccount.expiresAt < fiveMinutesFromNow) {
      // Refresh token
      const refreshResponse = await fetch(
        `${req.headers.origin || 'https://your-domain.com'}/api/auth/schwab/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        },
      )

      if (refreshResponse.ok) {
        const refreshData = (await refreshResponse.json()) as { accessToken: string }
        accessToken = refreshData.accessToken
      } else {
        return res
          .status(401)
          .json({ error: 'Token refresh failed. Re-authentication required.' })
      }
    }

    const accountHash = schwabAccount.accountHash

    // Fetch positions AND balances
    const positionsResponse = await fetch(
      `https://api.schwabapi.com/trader/v1/accounts/${accountHash}?fields=positions`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )

    if (!positionsResponse.ok) {
      const errorText = await positionsResponse.text()
      console.error('Failed to fetch positions:', positionsResponse.status, errorText)
      return res.status(400).json({
        success: false,
        error: `Failed to fetch positions (${positionsResponse.status}): ${errorText.slice(0, 200)}`,
      })
    }

    const positionsData = (await positionsResponse.json()) as SchwabAccountData
    const positions: SchwabPosition[] =
      positionsData.securitiesAccount?.positions || []

    // Extract account value (liquidationValue = total account equity)
    const accountBalances = positionsData.securitiesAccount?.currentBalances
    const accountLiquidationValue = accountBalances?.liquidationValue || 0
    const accountEquity = accountBalances?.equity || accountLiquidationValue
    const cashBalance = accountBalances?.cashBalance || accountBalances?.availableFunds || 0

    // Fetch working orders (last 60 days)
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
    const now = new Date()

    // NOTE:
    // Do NOT treat market-hours as affecting "stop order existence".
    // Schwab stop orders can be returned as `AWAITING_STOP_CONDITION` (and sometimes other active statuses),
    // especially outside regular market hours. We fetch multiple statuses and merge.
    const fetchOrdersByStatus = async (
      status?: string,
    ): Promise<SchwabOrder[]> => {
      const url =
        `https://api.schwabapi.com/trader/v1/accounts/${accountHash}/orders?` +
        `fromEnteredTime=${sixtyDaysAgo.toISOString()}&` +
        `toEnteredTime=${now.toISOString()}` +
        (status ? `&status=${encodeURIComponent(status)}` : '')

      try {
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
        if (!response.ok) return []
        return ((await response.json()) as SchwabOrder[]) || []
      } catch (e) {
        console.error('Failed to fetch Schwab orders:', e)
        return []
      }
    }

    // Try a small set of likely "active" statuses. If Schwab rejects an unknown status,
    // that call will simply return [] and we still proceed.
    const statusesToFetch = [
      'WORKING',
      'AWAITING_STOP_CONDITION',
      'QUEUED',
      'PENDING_ACTIVATION',
    ]

    const ordersByStatus = await Promise.all(
      statusesToFetch.map((s) => fetchOrdersByStatus(s)),
    )

    // Merge + de-dupe by orderId
    const ordersMap = new Map<number, SchwabOrder>()
    for (const list of ordersByStatus) {
      for (const order of list) {
        ordersMap.set(order.orderId, order)
      }
    }
    const orders = Array.from(ordersMap.values())

    // Filter stop orders
    const stopOrders = orders.filter(
      (order) =>
        (order.orderType === 'STOP' ||
          order.orderType === 'STOP_LIMIT' ||
          order.orderType === 'TRAILING_STOP') &&
        // Important: market-hours do not affect stop existence.
        // If Schwab says it's queued/awaiting trigger, we still treat it as a stop.
        (order.status === 'WORKING' ||
          order.status === 'AWAITING_STOP_CONDITION' ||
          order.status === 'QUEUED' ||
          order.status === 'PENDING_ACTIVATION'),
    )

    // Map positions to Trade model format
    const syncedPositions = positions.map((position) => {
      const symbol = position.instrument.symbol
      const quantity =
        position.longQuantity > 0
          ? position.longQuantity
          : position.shortQuantity
      const direction = position.longQuantity > 0 ? 'long' : 'short'

      // Find matching stop order
      const matchingStopOrder = stopOrders.find(
        (order) =>
          order.orderLegCollection[0]?.instrument.symbol === symbol &&
          order.orderLegCollection[0]?.instruction ===
            (direction === 'long' ? 'SELL' : 'BUY'),
      )

      // Determine if supported (EQUITY and ETF are both tradeable like stocks)
      const assetType = position.instrument.assetType
      const isSupported = assetType === 'EQUITY' || assetType === 'ETF'
      const instrumentType = isSupported ? assetType : 'UNSUPPORTED'

      // Calculate effective stop
      const effectiveStop = matchingStopOrder?.stopPrice || null
      const hasWorkingStop = effectiveStop !== null

      // For positions without stops, use 5% fallback for risk calculation display
      // but flag them so users know they need to add a stop order
      const fallbackStop = direction === 'long' 
        ? position.averagePrice * 0.95  // 5% below entry for long
        : position.averagePrice * 1.05  // 5% above entry for short
      const displayStop = effectiveStop || fallbackStop

      // Calculate risk (if stop exists, otherwise use fallback)
      const riskAmount = Math.abs(position.averagePrice - displayStop) * quantity

      return {
        symbol,
        direction,
        entry: position.averagePrice,
        stop: displayStop,
        positionSize: quantity,
        riskAmount,
        market: 'US' as const, // Schwab is US market
        instrumentType,
        isSupported,
        syncedFromBroker: true,
        hasWorkingStop, // Flag to indicate if position has a working stop order
        currentPrice: position.marketValue / quantity, // Approximate current price
        contracts: [
          {
            id: `schwab-${symbol}-${Date.now()}`,
            entryPrice: position.averagePrice,
            shares: quantity,
            riskAmount,
            createdAt: Date.now(),
          },
        ],
      }
    })

    // Calculate portfolio totals
    const totalRisk = syncedPositions
      .filter((p) => p.isSupported)
      .reduce((sum, p) => sum + p.riskAmount, 0)

    // Save synced positions as Trade objects in Firestore
    const tradesRef = db.collection('users').doc(userId).collection('trades')
    const existingTradesSnapshot = await tradesRef
      .where('syncedFromBroker', '==', true)
      .where('status', '==', 'ACTIVE')
      .get()

    const existingSyncedTradeIds = new Set(
      existingTradesSnapshot.docs.map((doc) => {
        const data = doc.data()
        return `${data.symbol}-${data.direction}` // Use symbol-direction as key
      }),
    )

    const batch = db.batch()
    let savedCount = 0

    for (const position of syncedPositions) {
      const tradeKey = `${position.symbol}-${position.direction}`

      // Check if this position already exists
      const existingTrade = existingTradesSnapshot.docs.find((doc) => {
        const data = doc.data()
        return `${data.symbol}-${data.direction}` === tradeKey
      })

      const tradeData = {
        date: new Date().toISOString().split('T')[0],
        symbol: position.symbol,
        direction: position.direction,
        status: 'ACTIVE' as const,
        setup: 'Synced from Schwab',
        entry: position.entry,
        stop: position.stop,
        target: null,
        riskPercent: 0, // Not applicable for synced positions
        positionSize: position.positionSize,
        riskAmount: position.riskAmount,
        rrRatio: null,
        contracts: position.contracts,
        market: position.market,
        instrumentType: position.instrumentType,
        isSupported: position.isSupported,
        syncedFromBroker: true,
        hasWorkingStop: position.hasWorkingStop, // Flag: does position have a working stop order?
        currentPrice: position.currentPrice,
        lastSyncedAt: Date.now(),
      }

      if (existingTrade) {
        // Update existing synced trade
        batch.update(existingTrade.ref, tradeData)
      } else {
        // Create new synced trade
        const newTradeRef = tradesRef.doc()
        batch.set(newTradeRef, {
          ...tradeData,
          createdAt: new Date(),
        })
      }
      savedCount++
    }

    // Delete synced trades that no longer exist in Schwab
    const syncedSymbols = new Set(
      syncedPositions.map((p) => `${p.symbol}-${p.direction}`),
    )
    existingTradesSnapshot.docs.forEach((doc) => {
      const data = doc.data()
      const tradeKey = `${data.symbol}-${data.direction}`
      if (!syncedSymbols.has(tradeKey)) {
        batch.delete(doc.ref)
      }
    })

    await batch.commit()

    // Update user's Schwab account info with latest values
    const syncedAt = Date.now()
    await userRef.set(
      {
        schwabAccounts: [
          {
            ...schwabAccount,
            accountValue: accountLiquidationValue,
            accountEquity,
            cashBalance,
            lastSyncedAt: syncedAt,
          },
        ],
        // Also update user preferences with Schwab account value for US market
        // This makes Schwab the source of truth for US portfolio capital
      },
      { merge: true },
    )

    // Update user preferences to use Schwab account value for US market
    const prefsRef = db.collection('users').doc(userId).collection('settings').doc('preferences')
    await prefsRef.set(
      {
        defaultPortfolio: {
          US: accountLiquidationValue,
        },
        schwabLinked: true,
        schwabLastSyncedAt: syncedAt,
      },
      { merge: true },
    )

    return res.status(200).json({
      success: true,
      positions: syncedPositions,
      portfolioRisk: totalRisk,
      portfolioValue: accountLiquidationValue,
      accountEquity,
      cashBalance,
      syncedAt,
      savedCount,
    })
  } catch (error) {
    console.error('Sync error:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? `Sync failed: ${error.message}` : 'Internal server error',
    })
  }
}
