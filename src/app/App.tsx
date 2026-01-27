import { useState, useEffect, useCallback } from 'react'
import { TradeInputCard } from './components/TradeInputCard'
import { PositionSize } from './components/PositionSize'
import { SettingsModal } from './components/SettingsModal'
import { ActivePositionsPage } from './pages/ActivePositionsPage'
import { PortfolioOverviewPage } from './pages/PortfolioOverviewPage'
import { EmailVerificationBanner } from './components/EmailVerificationBanner'
import { SchwabCallbackPage } from './pages/SchwabCallbackPage'
import { ArrowUpRight } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Header } from './components/Header'
import { NavigationTabs } from './components/NavigationTabs'
import { Toaster, toast } from 'sonner'
import { useLanguage } from './context/LanguageContext'

// Hooks
import { useTradeCalculator } from './hooks/useTradeCalculator'
import { useMarketSettings } from './hooks/useMarketSettings'
import { useAuth } from './context/AuthContext'
import { useUserPreferences } from './context/UserPreferencesContext'

// Services
import {
  saveTrade,
  getTrades,
  updateTrade,
  Trade,
} from './services/tradeService'

export default function App() {
  // Theme
  const { resolvedTheme } = useTheme()
  const isDarkMode = resolvedTheme === 'dark'
  const { t } = useLanguage()

  // Auth & Preferences
  const { user } = useAuth()
  const { preferences } = useUserPreferences()

  // Navigation
  const [currentPage, setCurrentPage] = useState<
    'main' | 'active' | 'portfolio' | 'settings' | 'schwab-callback'
  >('main')
  const [entryContext, setEntryContext] = useState<Trade | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Check if we're on Schwab callback page
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('code') || urlParams.get('error')) {
      setCurrentPage('schwab-callback')
    }
  }, [])

  // Market & Portfolio Settings
  const {
    market,
    setMarket,
    portfolioCapital,
    setPortfolioCapital,
    detectMarketFromSymbol,
    currencySymbol,
  } = useMarketSettings()

  // Apply default portfolio from preferences for guests (0) or logged-in users
  useEffect(() => {
    if (!user) {
      // Guest: use 0 as default
      setPortfolioCapital(0)
    } else if (preferences.defaultPortfolio) {
      // Logged in: use preferences
      const defaultValue =
        market === 'US'
          ? preferences.defaultPortfolio.US
          : preferences.defaultPortfolio.CN
      if (defaultValue > 0) {
        setPortfolioCapital(defaultValue)
      }
    }
  }, [user, preferences.defaultPortfolio, market, setPortfolioCapital])

  // Trade Calculator
  const {
    tickerSymbol,
    setTickerSymbol,
    direction,
    setDirection,
    riskPerTrade,
    setRiskPerTrade,
    entryPrice,
    setEntryPrice,
    stopLoss,
    setStopLoss,
    target,
    setTarget,
    sentiment,
    setSentiment,
    position,
  } = useTradeCalculator(portfolioCapital, market)

  // Trade History
  const [loggedTrades, setLoggedTrades] = useState<Trade[]>([])
  const [, setTradesLoading] = useState(true)

  // Load trades on mount and when user changes
  useEffect(() => {
    const loadTrades = async () => {
      setTradesLoading(true)
      try {
        const trades = await getTrades(user?.uid || null)
        setLoggedTrades(trades)
      } catch (error) {
        console.error('Failed to load trades:', error)
      } finally {
        setTradesLoading(false)
      }
    }
    loadTrades()
  }, [user])

  const handleLogTrade = useCallback(async () => {
    if (!position.canCalculate) return

    const today = new Date().toISOString().split('T')[0]

    // Check for duplicates
    const isDuplicate = loggedTrades.some(
      (t) =>
        t.symbol === tickerSymbol &&
        t.entry === entryPrice &&
        t.stop === stopLoss &&
        t.date === today,
    )

    if (isDuplicate) {
      if (!window.confirm(t('tradeInput.duplicateTrade'))) {
        return
      }
    }

    // Phase 2: Check if adding to existing position
    if (entryContext && entryContext.id) {
      // Create new contract
      const newContract = {
        id: crypto.randomUUID(),
        entryPrice: entryPrice,
        shares: position.shares,
        riskAmount: position.riskAmount,
        createdAt: Date.now(),
      }

      // Update existing trade
      const updatedContracts = [...(entryContext.contracts || []), newContract]

      // Calculate new weighted entry (optional, but good for display)
      // For now, we just append content.

      try {
        await updateTrade(user?.uid || null, entryContext.id, {
          contracts: updatedContracts,
          // Update aggregate fields if needed (positionSize, riskAmount)
          positionSize: entryContext.positionSize + position.shares,
          riskAmount: entryContext.riskAmount + position.riskAmount,
        })

        setLoggedTrades((prev) =>
          prev.map((t) =>
            t.id === entryContext.id
              ? {
                  ...t,
                  contracts: updatedContracts,
                  positionSize: t.positionSize + position.shares,
                  riskAmount: t.riskAmount + position.riskAmount,
                }
              : t,
          ),
        )

        setEntryContext(null)
        toast.success(t('tradeInput.positionAdded'))
      } catch (error) {
        console.error('Failed to update position', error)
      }
      return
    }

    // Validate stop price before saving
    const isLong = direction === 'long'
    const isValidStop = isLong ? stopLoss < entryPrice : stopLoss > entryPrice

    if (!isValidStop) {
      toast.error(
        isLong
          ? `Invalid stop price: Stop (${stopLoss}) must be below entry (${entryPrice}) for long positions`
          : `Invalid stop price: Stop (${stopLoss}) must be above entry (${entryPrice}) for short positions`,
      )
      return
    }

    const newTradeData = {
      date: today,
      symbol: tickerSymbol,
      direction,
      setup: sentiment,
      entry: entryPrice,
      stop: stopLoss, // Keep legacy field for compatibility
      target: target ? parseFloat(target) : null,
      riskPercent: riskPerTrade,
      positionSize: position.shares,
      riskAmount: position.riskAmount,
      rrRatio: position.rrRatio ?? null,
      market,
      // Phase 2 Fields
      status: 'ACTIVE' as const, // Default to Active when logging
      contracts: [
        {
          id: crypto.randomUUID(),
          entryPrice: entryPrice,
          shares: position.shares,
          riskAmount: position.riskAmount,
          createdAt: Date.now(),
        },
      ],
    }

    try {
      const savedTrade = await saveTrade(user?.uid || null, newTradeData)
      setLoggedTrades((prev) => [savedTrade, ...prev])
    } catch (error) {
      console.error('Failed to save trade:', error)
    }
  }, [
    position,
    tickerSymbol,
    entryPrice,
    stopLoss,
    direction,
    sentiment,
    target,
    riskPerTrade,
    market,
    user,
    loggedTrades,
    entryContext,
  ])

  const handleTickerSymbolChange = (value: string) => {
    setTickerSymbol(value)
    // Only auto-switch market if not in single market mode
    if (!preferences.singleMarketMode) {
      detectMarketFromSymbol(value)
    }
  }

  const handleNavigate = (
    page:
      | 'main'
      | 'active'
      | 'portfolio'
      | 'settings'
      | 'schwab-callback',
  ) => {
    // Prevent navigation to portfolio page (work in progress)
    if (page === 'portfolio') {
      return
    }
    if (page === 'settings') {
      setSettingsOpen(true)
    } else {
      setCurrentPage(page)
      if (page !== 'main') {
        setEntryContext(null) // Clear context when leaving main
      }
    }
  }

  const handleAddToPosition = (parentTrade: Trade) => {
    setEntryContext(parentTrade)
    setCurrentPage('main')
  }

  // Render Schwab callback page
  if (currentPage === 'schwab-callback') {
    return (
      <>
        <Toaster
          position="top-center"
          richColors
          theme={isDarkMode ? 'dark' : 'light'}
        />
        <SchwabCallbackPage onComplete={() => setCurrentPage('active')} />
      </>
    )
  }

  // Render main view
  return (
    <div className="min-h-screen transition-colors duration-300 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <Toaster
        position="top-center"
        richColors
        theme={isDarkMode ? 'dark' : 'light'}
      />

      <Header
        market={market}
        onMarketChange={setMarket}
        currentPage={currentPage}
        onNavigate={handleNavigate}
      />

      <NavigationTabs currentPage={currentPage} onNavigate={handleNavigate} />

      {/* Email Verification Banner */}
      <EmailVerificationBanner />

      {/* Main Content */}
      <main className="max-w-[1260px] mx-auto px-4 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        {currentPage === 'active' && (
          <ActivePositionsPage onAddToPosition={handleAddToPosition} />
        )}

        {currentPage === 'portfolio' && <PortfolioOverviewPage />}

        {currentPage === 'main' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6 lg:items-stretch">
              {/* Left Column - Trade Input - takes 3 of 5 columns */}
              <div className="lg:col-span-3 flex">
                <TradeInputCard
                  market={market}
                  currencySymbol={currencySymbol}
                  tickerSymbol={tickerSymbol}
                  setTickerSymbol={handleTickerSymbolChange}
                  portfolioCapital={portfolioCapital}
                  setPortfolioCapital={setPortfolioCapital}
                  riskPerTrade={riskPerTrade}
                  setRiskPerTrade={setRiskPerTrade}
                  direction={direction}
                  setDirection={setDirection}
                  sentiment={sentiment}
                  setSentiment={setSentiment}
                  entryPrice={entryPrice}
                  setEntryPrice={setEntryPrice}
                  stopLoss={stopLoss}
                  setStopLoss={setStopLoss}
                  target={target}
                  setTarget={setTarget}
                  isDarkMode={isDarkMode}
                  onLogTrade={handleLogTrade}
                  parentTrade={entryContext}
                  onClearContext={() => setEntryContext(null)}
                />
              </div>

              {/* Right Column - Position Size - takes 2 of 5 columns */}
              <div className="lg:col-span-2 flex">
                <PositionSize
                  currencySymbol={currencySymbol}
                  shares={position.shares}
                  value={position.value}
                  unitAmount={position.unitAmount}
                  riskPerShare={position.riskPerShare}
                  rrRatio={position.rrRatio}
                  canCalculate={position.canCalculate}
                  isDarkMode={isDarkMode}
                  riskAmount={position.riskAmount}
                  riskPerShareDollar={position.riskPerShareDollar}
                />
              </div>
            </div>

            {/* Mobile Log Button - only visible on mobile */}
            <div className="lg:hidden mt-3 sm:mt-4">
              <button
                onClick={handleLogTrade}
                disabled={!position.canCalculate}
                className={`w-full py-3 px-4 rounded-xl font-medium transition-all shadow-md flex items-center justify-center gap-2 group text-sm ${
                  position.canCalculate
                    ? 'dark:bg-white dark:text-gray-900 dark:hover:bg-gray-50 bg-gray-900 text-white hover:bg-gray-800 hover:shadow-lg hover:-translate-y-0.5'
                    : 'dark:bg-gray-700 dark:text-gray-500 bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <span>{t('tradeInput.logTrade')}</span>
                <ArrowUpRight
                  className={`w-4 h-4 transition-transform ${
                    position.canCalculate
                      ? 'group-hover:translate-x-0.5 group-hover:-translate-y-0.5'
                      : ''
                  }`}
                />
              </button>
            </div>
          </>
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}
