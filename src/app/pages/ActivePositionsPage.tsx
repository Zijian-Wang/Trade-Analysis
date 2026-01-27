import { useState, useEffect } from 'react'
import { Trade, getTrades, updateTrade } from '../services/tradeService'
import {
  calculatePortfolioRisk,
  calculateEffectiveStop,
  calculateTradeRisk,
} from '../services/riskCalculator'
import { useAuth } from '../context/AuthContext'
import { useMarketSettings } from '../hooks/useMarketSettings'
import { useUserPreferences } from '../context/UserPreferencesContext'
import { Loader } from '../components/ui/loader'
import { fetchCurrentPrices } from '../services/priceService'
import { getStockNames } from '../services/stockNameService'

import { StopAdjustModal } from '../components/StopAdjustModal'
import { ManualPositionModal } from '../components/ManualPositionModal'
import { EditSharesModal } from '../components/EditSharesModal'
import {
  ShieldAlert,
  PlusCircle,
  XCircle,
  AlertTriangle,
  Link2,
  RefreshCw,
  Plus,
  SquarePen,
} from 'lucide-react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { toast } from 'sonner'
import { useLanguage } from '../context/LanguageContext'
import { getSchwabAuthUrl, syncSchwabAccount } from '../services/schwabAuth'
import { Button } from '../components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../components/ui/tooltip'

interface ActivePositionsPageProps {
  onAddToPosition?: (trade: Trade) => void
}

export function ActivePositionsPage({
  onAddToPosition,
}: ActivePositionsPageProps) {
  const { t } = useLanguage()
  const { user } = useAuth()
  const { market } = useMarketSettings()
  const { preferences } = useUserPreferences()
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
  const [stopModalOpen, setStopModalOpen] = useState(false)

  // Close Confirmation State
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false)
  const [tradeToClose, setTradeToClose] = useState<Trade | null>(null)

  // Manual Position Modal State
  const [manualPositionModalOpen, setManualPositionModalOpen] = useState(false)
  const [manualPositionMarket, setManualPositionMarket] = useState<'US' | 'CN'>('US')

  // Edit Shares Modal State
  const [editSharesModalOpen, setEditSharesModalOpen] = useState(false)
  const [tradeToEditShares, setTradeToEditShares] = useState<Trade | null>(null)

  // Schwab sync state
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null)
  const [stockNames, setStockNames] = useState<Map<string, string>>(new Map())

  const fetchTrades = async () => {
    try {
      const allTrades = await getTrades(user?.uid || null)
      const activeDefaults = allTrades.filter((t) => t.status === 'ACTIVE')

      // Auto-fix invalid stop prices in background (migrate from structureStop if needed)
      const fixes: Promise<void>[] = []
      activeDefaults.forEach((trade) => {
        if (!trade.id || !user?.uid) return

        const isLong = trade.direction === 'long'
        const stopValid = trade.stop
          ? isLong
            ? trade.stop < trade.entry
            : trade.stop > trade.entry
          : false

        // If stop is invalid, try to use structureStop (migration case)
        if (!stopValid && (trade as any).structureStop) {
          const structureStop = (trade as any).structureStop
          const structureStopValid = isLong
            ? structureStop < trade.entry
            : structureStop > trade.entry

          if (structureStopValid) {
            fixes.push(
              updateTrade(user.uid, trade.id, { stop: structureStop })
                .then(() =>
                  console.log(
                    `Migrated stop from structureStop for ${trade.symbol}`,
                  ),
                )
                .catch((err) =>
                  console.error(
                    `Failed to migrate stop for ${trade.symbol}:`,
                    err,
                  ),
                ),
            )
          }
        }
      })

      // Wait for fixes to complete, then refresh
      if (fixes.length > 0) {
        await Promise.all(fixes)
        // Re-fetch to get corrected data
        const refreshedTrades = await getTrades(user?.uid || null)
        const refreshedActive = refreshedTrades.filter(
          (t) => t.status === 'ACTIVE',
        )
        setTrades(refreshedActive)
      } else {
        setTrades(activeDefaults)
      }
    } catch (error) {
      console.error('Failed to load active trades', error)
    }
  }

  useEffect(() => {
    const loadTrades = async () => {
      setLoading(true)
      await fetchTrades()
      setLoading(false)
    }
    loadTrades()
  }, [user])

  // Fetch company names for all trades
  useEffect(() => {
    const fetchNames = async () => {
      const symbols = trades.map((trade) => ({
        symbol: trade.symbol,
        market: trade.market || 'US',
      }))
      if (symbols.length > 0) {
        const names = await getStockNames(symbols)
        setStockNames(names)
      }
    }
    fetchNames()
  }, [trades])

  // Fetch current prices for active positions
  useEffect(() => {
    const updateCurrentPrices = async () => {
      if (trades.length === 0 || !user?.uid) return

      // Only fetch prices for trades that don't have currentPrice or it's stale (older than 5 minutes)
      const now = Date.now()
      const fiveMinutesAgo = now - 5 * 60 * 1000
      const symbolsToFetch = trades
        .filter((t) => {
          // Fetch if no currentPrice or if lastSyncedAt is old (for synced trades)
          // For manual trades, always fetch if no currentPrice
          if (!t.currentPrice) return true
          if (t.syncedFromBroker && (t as any).lastSyncedAt) {
            return (t as any).lastSyncedAt < fiveMinutesAgo
          }
          return false
        })
        .map((t) => ({
          symbol: t.symbol,
          market: t.market || 'US',
        }))

      if (symbolsToFetch.length === 0) return

      try {
        const priceMap = await fetchCurrentPrices(symbolsToFetch)

        // Update trades with current prices
        const updates = trades
          .filter((t) => {
            const newPrice = priceMap.get(t.symbol)
            return newPrice !== undefined && t.currentPrice !== newPrice
          })
          .map((trade) => ({
            tradeId: trade.id!,
            currentPrice: priceMap.get(trade.symbol)!,
          }))

        // Batch update trades with current prices
        for (const update of updates) {
          try {
            await updateTrade(user.uid, update.tradeId, {
              currentPrice: update.currentPrice,
            })
          } catch (error) {
            console.error(
              `Failed to update price for ${update.tradeId}:`,
              error,
            )
          }
        }

        // Refresh trades to show updated prices
        if (updates.length > 0) {
          await fetchTrades()
        }
      } catch (error) {
        console.error('Failed to fetch current prices:', error)
      }
    }

    // Fetch prices after trades are loaded, with a small delay
    const timer = setTimeout(updateCurrentPrices, 2000)
    return () => clearTimeout(timer)
  }, [trades.length, user])

  // Auto-sync on page load if account is linked
  useEffect(() => {
    const checkAndSync = async () => {
      if (!user?.uid) return

      // Check if user has Schwab account linked (we'll check this via a simple API call)
      // For now, we'll just attempt sync - it will fail gracefully if not linked
      try {
        const result = await syncSchwabAccount(user.uid)
        if (result.success) {
          setLastSyncTime(result.syncedAt || Date.now())
          await fetchTrades() // Refresh to show synced positions
        }
      } catch (error) {
        // Silently fail - account might not be linked yet
        console.log('Auto-sync skipped (account not linked or error):', error)
      }
    }

    // Small delay to avoid blocking initial render
    const timer = setTimeout(checkAndSync, 1000)
    return () => clearTimeout(timer)
  }, [user])

  // Polling mechanism (every 5 minutes while on this page)
  useEffect(() => {
    if (!user?.uid) return

    const pollInterval = setInterval(
      async () => {
        try {
          const result = await syncSchwabAccount(user.uid)
          if (result.success) {
            setLastSyncTime(result.syncedAt || Date.now())
            await fetchTrades()
          }
        } catch (error) {
          console.error('Poll sync error:', error)
        }
      },
      5 * 60 * 1000,
    ) // 5 minutes

    return () => clearInterval(pollInterval)
  }, [user])

  const handleStopUpdate = async (newStop: number) => {
    if (!selectedTrade || !selectedTrade.id) return

    // Validate stop price
    const isLong = selectedTrade.direction === 'long'
    const isValid = isLong
      ? newStop < selectedTrade.entry
      : newStop > selectedTrade.entry

    if (!isValid) {
      toast.error(
        isLong
          ? `Invalid stop: Stop must be below entry (${selectedTrade.entry}) for long positions`
          : `Invalid stop: Stop must be above entry (${selectedTrade.entry}) for short positions`,
      )
      return
    }

    try {
      await updateTrade(user?.uid || null, selectedTrade.id, {
        stop: newStop,
      })
      toast.success(t('stopAdjust.success'))
      fetchTrades() // Refresh
    } catch (e) {
      toast.error(t('stopAdjust.error'))
    }
  }

  const handleClosePosition = async () => {
    if (!tradeToClose || !tradeToClose.id) return

    try {
      await updateTrade(user?.uid || null, tradeToClose.id, {
        status: 'CLOSED',
      })
      toast.success(t('activePositions.actions.positionClosed'))
      fetchTrades()
    } catch (e) {
      console.error('Failed to close position', e)
      toast.error(t('activePositions.actions.closeFailed'))
    }
  }


  // Helper to calculate effective stop for a trade
  const getEffectiveStop = (trade: Trade): number => {
    // If trade has contracts, calculate weighted effective stop
    if (trade.contracts && trade.contracts.length > 0) {
      // For display, show the effective stop of the first contract (or average if multiple)
      // In practice, each contract can have its own effective stop
      const firstContract = trade.contracts[0]
      return calculateEffectiveStop(firstContract, trade.stop)
    }
    return trade.stop
  }

  // Check if any contract has a stop override
  const hasContractStopOverride = (trade: Trade): boolean => {
    return trade.contracts?.some((c) => c.contractStop !== undefined) || false
  }

  // Helper to calculate risk remaining for a trade
  const getRiskRemaining = (
    trade: Trade,
    marketCapital: number,
  ): { amount: number; percent: number } => {
    const tradeRisk = calculateTradeRisk(trade)
    const tradeRiskPercent =
      marketCapital > 0 ? (tradeRisk / marketCapital) * 100 : 0
    return { amount: tradeRisk, percent: tradeRiskPercent }
  }

  const handleLinkSchwabAccount = async () => {
    try {
      const { url } = await getSchwabAuthUrl()
      window.location.href = url
    } catch (error) {
      console.error('Failed to initiate OAuth:', error)
      toast.error('Failed to start account linking')
    }
  }

  const handleSyncSchwabAccount = async () => {
    if (!user?.uid) {
      toast.error('Please sign in to sync account')
      return
    }

    setIsSyncing(true)
    try {
      const result = await syncSchwabAccount(user.uid)
      if (result.success) {
        toast.success(t('schwab.syncSuccess'))
        setLastSyncTime(result.syncedAt || Date.now())
        // Refresh trades to show synced positions
        await fetchTrades()
      } else {
        toast.error(result.error || t('schwab.syncFailed'))
      }
    } catch (error) {
      console.error('Sync error:', error)
      toast.error(t('schwab.syncFailed'))
    } finally {
      setIsSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader />
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Schwab Account Linking */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  {preferences.schwabLinked ? 'Schwab Account Connected' : t('schwab.linkAccount')}
                </h3>
                {preferences.schwabLinked && (
                  <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-0.5 rounded-full">
                    Source of Truth
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {lastSyncTime
                  ? `${t('schwab.lastSync')}: ${new Date(lastSyncTime).toLocaleTimeString()}`
                  : 'Link your Schwab account to auto-sync positions'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Show account value when linked */}
              {preferences.schwabLinked && preferences.defaultPortfolio.US > 0 && (
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Portfolio Value</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    ${preferences.defaultPortfolio.US.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={handleLinkSchwabAccount}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:hover:text-white transition-all"
                >
                  <Link2 size={16} />
                  {preferences.schwabLinked ? 'Re-link' : t('schwab.linkAccount')}
                </Button>
                <Button
                  onClick={handleSyncSchwabAccount}
                  variant="outline"
                  size="sm"
                  disabled={isSyncing}
                  className="flex items-center gap-2 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:hover:text-white transition-all"
                >
                  <RefreshCw
                    size={16}
                    className={isSyncing ? 'animate-spin' : ''}
                  />
                  {t('schwab.syncAccount')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Positions Grouped by Market */}
        {trades.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
            {t('activePositions.noPositions')}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Helper to render a table for a set of trades */}
            {(['US', 'CN'] as const).map((groupMarket) => {
              // When Schwab is linked, US market shows ONLY Schwab positions (source of truth)
              // Manual US trades are hidden when Schwab is the source of truth
              const isSchwabSourceOfTruth = preferences.schwabLinked && groupMarket === 'US'
              
              const groupTrades = trades.filter((t) => {
                const isMarketMatch = t.market === groupMarket || (!t.market && groupMarket === 'US')
                if (!isMarketMatch) return false
                
                // For US market with Schwab linked: only show synced positions
                if (isSchwabSourceOfTruth) {
                  return t.syncedFromBroker === true
                }
                
                return true
              })
              if (groupTrades.length === 0) return null

              // Calculate risk for this market
              const marketRisk = calculatePortfolioRisk(groupTrades)
              const marketCapital = groupMarket === 'US' 
                ? preferences.defaultPortfolio.US 
                : preferences.defaultPortfolio.CN
              const marketRiskPercent = marketCapital > 0 
                ? (marketRisk / marketCapital) * 100 
                : 0
              const marketCurrencySymbol = groupMarket === 'US' ? '$' : '¥'

              return (
                <div
                  key={groupMarket}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-medium">
                        <span>
                          {groupMarket === 'US' ? '🇺🇸 US Market' : '🇨🇳 CN Market'}
                        </span>
                        <span className="text-xs text-gray-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">
                          {groupTrades.length}
                        </span>
                        {isSchwabSourceOfTruth && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full">
                            Synced from Schwab
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-6">
                        <Button
                          onClick={() => {
                            setManualPositionMarket(groupMarket as 'US' | 'CN')
                            setManualPositionModalOpen(true)
                          }}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:hover:text-white transition-all"
                        >
                          <Plus size={16} />
                          {t('activePositions.actions.addManualPosition')}
                        </Button>
                        <div>
                          <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            {t('activePositions.totalRisk')}
                          </h2>
                          <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                            {marketCurrencySymbol}
                            {marketRisk.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            {t('activePositions.riskPercent')}
                          </h2>
                          <p className={`text-lg font-bold mt-0.5 ${
                            marketRiskPercent < 1 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {marketRiskPercent.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="px-4 py-3">
                          {t('activePositions.col_symbol')}
                        </th>
                        <th className="px-4 py-3">
                          {t('activePositions.col_cost')}
                        </th>
                        <th className="px-4 py-3">
                          {t('activePositions.col_stop')}
                        </th>
                        <th className="px-4 py-3">
                          {t('activePositions.col_currentPrice')}
                        </th>
                        <th className="px-4 py-3">
                          {t('activePositions.col_shares')}
                        </th>
                        <th className="px-4 py-3">
                          {t('activePositions.col_riskRemaining')}
                        </th>
                        <th className="px-4 py-3 text-right">
                          {t('activePositions.col_actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {groupTrades.map((trade) => (
                          <tr
                            key={trade.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          >
                            <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                              <div className="flex items-center gap-2">
                                <div className="flex flex-col">
                                  <span>{trade.symbol}</span>
                                  {stockNames.get(trade.symbol) &&
                                    stockNames.get(trade.symbol) !==
                                      trade.symbol && (
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {stockNames.get(trade.symbol)}
                                      </span>
                                    )}
                                </div>
                                {trade.isSupported === false && (
                                  <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <AlertTriangle size={12} />
                                    {t('activePositions.unsupported')}
                                  </span>
                                )}
                                {trade.syncedFromBroker && trade.hasWorkingStop === false && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 px-2 py-0.5 rounded-full flex items-center gap-1 cursor-help">
                                        <AlertTriangle size={12} />
                                        No Stop Order
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>This position has no working stop order.</p>
                                      <p className="text-xs text-gray-400">Using 5% fallback for risk calculation.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {trade.entry.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-rose-500">
                              {(() => {
                                // Show effective stop (the actual current stop)
                                const effectiveStop = getEffectiveStop(trade)
                                const isLong = trade.direction === 'long'
                                const isValid = isLong
                                  ? effectiveStop < trade.entry
                                  : effectiveStop > trade.entry

                                if (!isValid) {
                                  return (
                                    <span
                                      className="text-yellow-600 dark:text-yellow-400"
                                      title="Invalid stop price - needs correction"
                                    >
                                      {effectiveStop.toFixed(2)} ⚠️
                                    </span>
                                  )
                                }
                                return (
                                  <>
                                    {effectiveStop.toFixed(2)}
                                    {hasContractStopOverride(trade) && (
                                      <span
                                        className="text-xs text-blue-600 dark:text-blue-400 ml-1"
                                        title={t('stopAdjust.contractStop')}
                                      >
                                        *
                                      </span>
                                    )}
                                  </>
                                )
                              })()}
                            </td>
                            <td className="px-4 py-3">
                              {trade.currentPrice
                                ? trade.currentPrice.toFixed(2)
                                : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span>{trade.positionSize}</span>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setTradeToEditShares(trade)
                                        setEditSharesModalOpen(true)
                                      }}
                                    >
                                      {/* Icon options: SquarePen, FilePen, Edit2, or Pencil */}
                                      <SquarePen
                                        size={14}
                                        className="text-gray-500"
                                      />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{t('activePositions.actions.editShares')}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {(() => {
                                const riskRemaining = getRiskRemaining(trade, marketCapital)
                                return (
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      {marketCurrencySymbol}
                                      {riskRemaining.amount.toFixed(2)}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {riskRemaining.percent.toFixed(2)}%
                                    </span>
                                  </div>
                                )
                              })()}
                            </td>
                            <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedTrade(trade)
                                      setStopModalOpen(true)
                                    }}
                                  >
                                    <ShieldAlert
                                      size={18}
                                      className="text-gray-500"
                                    />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    {t('activePositions.actions.adjustStop')}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (onAddToPosition) {
                                        onAddToPosition(trade)
                                      }
                                    }}
                                  >
                                    <PlusCircle
                                      size={18}
                                      className="text-gray-500"
                                    />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    {t('activePositions.actions.addToPosition')}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setTradeToClose(trade)
                                      setCloseConfirmOpen(true)
                                    }}
                                  >
                                    <XCircle
                                      size={18}
                                      className="text-gray-500"
                                    />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t('activePositions.actions.close')}</p>
                                </TooltipContent>
                              </Tooltip>
                            </td>
                          </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>
        )}

        {selectedTrade && (
          <StopAdjustModal
            open={stopModalOpen}
            onOpenChange={setStopModalOpen}
            trade={selectedTrade}
            onConfirm={handleStopUpdate}
            onContractStopUpdate={fetchTrades}
          />
        )}

        <ConfirmDialog
          open={closeConfirmOpen}
          onOpenChange={setCloseConfirmOpen}
          title={t('activePositions.actions.close')}
          description={t('activePositions.actions.confirmClose')}
          confirmLabel={t('activePositions.actions.close')}
          variant="destructive"
          onConfirm={handleClosePosition}
        />

        <ManualPositionModal
          open={manualPositionModalOpen}
          onOpenChange={setManualPositionModalOpen}
          market={manualPositionMarket}
          onSuccess={fetchTrades}
        />

        <EditSharesModal
          open={editSharesModalOpen}
          onOpenChange={setEditSharesModalOpen}
          trade={tradeToEditShares}
          onSuccess={fetchTrades}
        />
      </div>
    </TooltipProvider>
  )
}
