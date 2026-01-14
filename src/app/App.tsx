import { useState, useEffect, useCallback } from "react";
import { TradeInputCard } from "./components/TradeInputCard";
import { PositionSize } from "./components/PositionSize";
import { TradeHistory } from './components/TradeHistory';
import { SettingsModal } from './components/SettingsModal';
import { TradeHistoryPage } from './pages/TradeHistoryPage';
import { EmailVerificationBanner } from './components/EmailVerificationBanner';
import { ArrowUpRight } from "lucide-react";
import { useTheme } from "next-themes";
import { Header } from "./components/Header";
import { Toaster } from "sonner";

// Hooks
import { useTradeCalculator } from "./hooks/useTradeCalculator";
import { useMarketSettings } from "./hooks/useMarketSettings";
import { useAuth } from "./context/AuthContext";
import { useUserPreferences } from "./context/UserPreferencesContext";

// Services
import { saveTrade, getTrades, deleteTrade, Trade } from "./services/tradeService";

export default function App() {
  // Theme
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";

  // Auth & Preferences
  const { user } = useAuth();
  const { preferences } = useUserPreferences();

  // Navigation
  const [currentPage, setCurrentPage] = useState<'main' | 'history' | 'settings'>('main');
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Market & Portfolio Settings
  const {
    market,
    setMarket,
    portfolioCapital,
    setPortfolioCapital,
    detectMarketFromSymbol,
    currencySymbol
  } = useMarketSettings();

  // Apply default portfolio from preferences for guests (0) or logged-in users
  useEffect(() => {
    if (!user) {
      // Guest: use 0 as default
      setPortfolioCapital(0);
    } else if (preferences.defaultPortfolio) {
      // Logged in: use preferences
      const defaultValue = market === 'US'
        ? preferences.defaultPortfolio.US
        : preferences.defaultPortfolio.CN;
      if (defaultValue > 0) {
        setPortfolioCapital(defaultValue);
      }
    }
  }, [user, preferences.defaultPortfolio, market, setPortfolioCapital]);

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
  } = useTradeCalculator(portfolioCapital);

  // Trade History
  const [loggedTrades, setLoggedTrades] = useState<Trade[]>([]);
  const [, setTradesLoading] = useState(true);

  // Load trades on mount and when user changes
  useEffect(() => {
    const loadTrades = async () => {
      setTradesLoading(true);
      try {
        const trades = await getTrades(user?.uid || null);
        setLoggedTrades(trades);
      } catch (error) {
        console.error('Failed to load trades:', error);
      } finally {
        setTradesLoading(false);
      }
    };
    loadTrades();
  }, [user]);

  const handleLogTrade = useCallback(async () => {
    if (!position.canCalculate) return;

    const today = new Date().toISOString().split('T')[0];

    // Check for duplicates
    const isDuplicate = loggedTrades.some(t =>
      t.symbol === tickerSymbol &&
      t.entry === entryPrice &&
      t.stop === stopLoss &&
      t.date === today
    );

    if (isDuplicate) {
      if (!window.confirm("This trade was already logged. Log it again?")) {
        return;
      }
    }

    const newTradeData = {
      date: today,
      symbol: tickerSymbol,
      direction,
      setup: sentiment,
      entry: entryPrice,
      stop: stopLoss,
      target: target ? parseFloat(target) : null,
      riskPercent: riskPerTrade,
      positionSize: position.shares,
      riskAmount: position.riskAmount,
      rrRatio: position.rrRatio ?? null,
      market,
    };

    try {
      const savedTrade = await saveTrade(user?.uid || null, newTradeData);
      setLoggedTrades((prev) => [savedTrade, ...prev]);
    } catch (error) {
      console.error('Failed to save trade:', error);
    }
  }, [
    position, tickerSymbol, entryPrice, stopLoss, direction,
    sentiment, target, riskPerTrade, market, user, loggedTrades
  ]);

  const handleDeleteTrade = useCallback(async (id: string) => {
    try {
      await deleteTrade(user?.uid || null, id);
      setLoggedTrades(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Failed to delete trade:', error);
    }
  }, [user]);

  const handleTickerSymbolChange = (value: string) => {
    setTickerSymbol(value);
    // Only auto-switch market if not in single market mode
    if (!preferences.singleMarketMode) {
      detectMarketFromSymbol(value);
    }
  };

  const handleNavigate = (page: 'main' | 'history' | 'settings') => {
    if (page === 'settings') {
      setSettingsOpen(true);
    } else {
      setCurrentPage(page);
    }
  };

  // Render trade history page
  if (currentPage === 'history') {
    return (
      <>
        <Toaster
          position="top-center"
          richColors
          theme={isDarkMode ? 'dark' : 'light'}
        />
        <TradeHistoryPage
          currencySymbol={currencySymbol}
          loggedTrades={loggedTrades}
          isDarkMode={isDarkMode}
          onDeleteTrade={handleDeleteTrade}
          onBack={() => setCurrentPage('main')}
        />
      </>
    );
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
        onNavigate={handleNavigate}
      />

      {/* Email Verification Banner */}
      <EmailVerificationBanner />

      {/* Main Content */}
      <main className="max-w-[1260px] mx-auto px-4 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
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
            className={`w-full py-3 px-4 rounded-xl font-medium transition-all shadow-md flex items-center justify-center gap-2 group text-sm ${position.canCalculate
              ? "dark:bg-white dark:text-gray-900 dark:hover:bg-gray-50 bg-gray-900 text-white hover:bg-gray-800 hover:shadow-lg hover:-translate-y-0.5"
              : "dark:bg-gray-700 dark:text-gray-500 bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
          >
            <span>Log Trade to Journal</span>
            <ArrowUpRight
              className={`w-4 h-4 transition-transform ${position.canCalculate
                ? "group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                : ""
                }`}
            />
          </button>
        </div>

        {/* Trade History */}
        <div className="mt-3 sm:mt-4 md:mt-6 flex-1 flex flex-col min-h-0 pb-6">
          <TradeHistory
            currencySymbol={currencySymbol}
            loggedTrades={loggedTrades}
            isDarkMode={isDarkMode}
            onDeleteTrade={handleDeleteTrade}
          />
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}