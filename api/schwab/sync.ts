import type { VercelRequest, VercelResponse } from '@vercel/node'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin (only once)
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

const db = getFirestore()

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
      return res.status(400).json({ error: 'Missing userId' })
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
        const refreshData = await refreshResponse.json()
        accessToken = refreshData.accessToken
      } else {
        return res
          .status(401)
          .json({ error: 'Token refresh failed. Re-authentication required.' })
      }
    }

    const accountHash = schwabAccount.accountHash

    // Fetch positions
    const positionsResponse = await fetch(
      `https://api.schwabapi.com/v1/accounts/${accountHash}?fields=positions`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )

    if (!positionsResponse.ok) {
      return res.status(400).json({ error: 'Failed to fetch positions' })
    }

    const positionsData = await positionsResponse.json()
    const positions: SchwabPosition[] =
      positionsData.securitiesAccount?.positions || []

    // Fetch working orders (last 60 days)
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
    const now = new Date()

    const ordersResponse = await fetch(
      `https://api.schwabapi.com/v1/accounts/${accountHash}/orders?` +
        `fromEnteredTime=${sixtyDaysAgo.toISOString()}&` +
        `toEnteredTime=${now.toISOString()}&` +
        `status=WORKING`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )

    const orders: SchwabOrder[] = ordersResponse.ok
      ? (await ordersResponse.json()) || []
      : []

    // Filter stop orders
    const stopOrders = orders.filter(
      (order) =>
        (order.orderType === 'STOP' || order.orderType === 'STOP_LIMIT') &&
        (order.status === 'WORKING' ||
          order.status === 'AWAITING_STOP_CONDITION'),
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

      // Determine if supported
      const assetType = position.instrument.assetType
      const isSupported = assetType === 'EQUITY'
      const instrumentType = isSupported ? 'EQUITY' : 'UNSUPPORTED'

      // Calculate effective stop
      const effectiveStop = matchingStopOrder?.stopPrice || null

      // Calculate risk (if stop exists)
      const riskAmount = effectiveStop
        ? Math.abs(position.averagePrice - effectiveStop) * quantity
        : 0

      return {
        symbol,
        direction,
        entry: position.averagePrice,
        stop: effectiveStop || position.averagePrice * 0.95, // Fallback if no stop
        positionSize: quantity,
        riskAmount,
        market: 'US' as const, // Schwab is US market
        instrumentType,
        isSupported,
        syncedFromBroker: true,
        currentPrice: position.marketValue / quantity, // Approximate current price
        contracts: [
          {
            id: `schwab-${symbol}-${Date.now()}`,
            entryPrice: position.averagePrice,
            shares: quantity,
            riskAmount,
            contractStop: effectiveStop || undefined,
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

    return res.status(200).json({
      success: true,
      positions: syncedPositions,
      portfolioRisk: totalRisk,
      syncedAt: Date.now(),
      savedCount,
    })
  } catch (error) {
    console.error('Sync error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
