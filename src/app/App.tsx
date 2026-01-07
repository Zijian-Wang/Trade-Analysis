import { useState } from "react";
import { TradeInputCard } from "./components/TradeInputCard";
import { PositionSize } from "./components/PositionSize";
import { TradeHistory } from "./components/TradeHistory";
import { ArrowUpRight } from "lucide-react";
import { useTheme } from "next-themes";
import { Header } from "./components/Header";

// Hooks
import { useTradeCalculator } from "./hooks/useTradeCalculator";
import { useMarketSettings } from "./hooks/useMarketSettings";

export default function App() {
  // Theme
  const { theme, resolvedTheme } = useTheme();
  // We use resolvedTheme to determine if we are in dark mode for logic that requires it
  const isDarkMode = resolvedTheme === "dark";

  // Market & Portfolio Settings
  const { 
    market, 
    setMarket, 
    portfolioCapital, 
    setPortfolioCapital, 
    detectMarketFromSymbol,
    currencySymbol 
  } = useMarketSettings();

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

  // Trade Logging
  // Note: We might want to move this to a hook later too, but for now filtering is simple
  const [loggedTrades, setLoggedTrades] = useState<any[]>([]);

  const handleLogTrade = () => {
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

    const newTrade = {
      id: Date.now().toString(),
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
    };

    setLoggedTrades((prev) => [newTrade, ...prev]);
  };

  const handleDeleteTrade = (id: string) => {
    setLoggedTrades(prev => prev.filter(t => t.id !== id));
  };

  const handleTickerSymbolChange = (value: string) => {
    setTickerSymbol(value);
    detectMarketFromSymbol(value);
  };

  return (
    <div className="min-h-screen transition-colors duration-300 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 bg-gradient-to-br from-gray-50 via-white to-gray-100">
      
      <Header market={market} onMarketChange={setMarket} />

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
        {/* We can extract this to a simpler component later if needed, leaving it here for now */}
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
        <div className="mt-3 sm:mt-4 md:mt-6">
          <TradeHistory
            currencySymbol={currencySymbol}
            loggedTrades={loggedTrades}
            isDarkMode={isDarkMode}
            onDeleteTrade={handleDeleteTrade}
          />
        </div>
      </main >
    </div >
  );
}