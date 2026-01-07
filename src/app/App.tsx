import { useState, useEffect } from "react";
import { TradeInputCard } from "./components/TradeInputCard";
import { PositionSize } from "./components/PositionSize";
import { TradeHistory } from "./components/TradeHistory";
import { Moon, Sun, ArrowUpRight } from "lucide-react";

export default function App() {
  const [tickerSymbol, setTickerSymbol] = useState("");
  const [market, setMarket] = useState<"US" | "CN">(() => {
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      // Simple check for China timezones
      if (
        timeZone === "Asia/Shanghai" ||
        timeZone === "Asia/Chongqing" ||
        timeZone === "Asia/Harbin" ||
        timeZone === "Asia/Urumqi" ||
        timeZone === "PRC"
      ) {
        const now = new Date();
        // Get hour in Beijing time
        const hour = parseInt(
          new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Shanghai",
            hour: "numeric",
            hour12: false,
          }).format(now),
          10
        );

        if (hour >= 9 && hour < 16) {
          return "CN";
        }
      }
    } catch (e) {
      console.error("Error detecting timezone/market preference", e);
    }
    return "US";
  });
  const [portfolioCapital, setPortfolioCapital] = useState(
    market === "CN" ? 1500000 : 300000
  );
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [sentiment, setSentiment] = useState("TREND");
  const [riskPerTrade, setRiskPerTrade] = useState(0.75);
  const [entryPrice, setEntryPrice] = useState<number>(0);
  const [stopLoss, setStopLoss] = useState<number>(0);
  const [target, setTarget] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  const currencySymbol = market === "US" ? "$" : "¥";

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);
  const [loggedTrades, setLoggedTrades] = useState<any[]>([]);

  const toggleMarket = () => {
    const newMarket = market === "US" ? "CN" : "US";
    setMarket(newMarket);
    // Update default portfolio capital based on market
    if (newMarket === "US") {
      setPortfolioCapital(300000);
    } else {
      setPortfolioCapital(1500000);
    }
  };

  const calculatePositionSize = () => {
    if (!entryPrice || !stopLoss)
      return {
        shares: 0,
        value: 0,
        unitAmount: 0,
        riskPerShare: 0,
        rrRatio: null,
        canCalculate: false,
        riskAmount: 0,
      };

    // Validation
    const hasRequiredInputs =
      tickerSymbol.trim() !== "" &&
      entryPrice > 0 &&
      stopLoss > 0;
    const isStopLossValid =
      hasRequiredInputs &&
      ((direction === "long" && entryPrice > stopLoss) ||
        (direction === "short" && entryPrice < stopLoss));

    const targetNum = target ? parseFloat(target) : null;
    const isTargetValid =
      !targetNum ||
      (direction === "long" && entryPrice < targetNum) ||
      (direction === "short" && entryPrice > targetNum);

    const canCalculate =
      hasRequiredInputs && isStopLossValid && isTargetValid;

    if (!canCalculate) {
      return {
        shares: 0,
        value: 0,
        unitAmount: 0,
        riskPerShare: 0,
        rrRatio: null,
        canCalculate: false,
        riskAmount: 0,
      };
    }

    const riskAmount = portfolioCapital * (riskPerTrade / 100);
    const priceRisk = Math.abs(entryPrice - stopLoss);
    const shares = Math.round(riskAmount / priceRisk);
    const value = shares * entryPrice;
    const riskPerShare = (priceRisk / entryPrice) * 100;

    let rrRatio = null;
    if (targetNum && isTargetValid) {
      rrRatio = Math.abs(targetNum - entryPrice) / priceRisk;
    }

    return {
      shares,
      value,
      unitAmount: entryPrice,
      riskPerShare,
      rrRatio,
      canCalculate: true,
      riskAmount,
    };
  };

  const position = calculatePositionSize();

  /* Duplicate Check & Log */
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
      id: Date.now().toString(), // Ensure string ID
      date: today, // YYYY-MM-DD
      symbol: tickerSymbol, // Mapped to Trade interface
      direction,
      setup: sentiment, // Mapped to Trade interface (using sentiment as setup)
      entry: entryPrice, // Mapped
      stop: stopLoss, // Mapped
      target: target ? parseFloat(target) : null,
      riskPercent: riskPerTrade, // Mapped
      positionSize: position.shares,
      riskAmount: position.riskAmount,
      rrRatio: position.rrRatio || 0,
    };

    // Update state
    setLoggedTrades((prev) => [newTrade, ...prev]);
  };

  const handleDeleteTrade = (id: string) => {
    setLoggedTrades(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${isDarkMode
        ? "dark bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
        : "bg-gradient-to-br from-gray-50 via-white to-gray-100"
        }`}
    >
      {/* Header */}
      <header
        className={`border-b backdrop-blur-sm transition-colors duration-300 ${isDarkMode
          ? "border-gray-700 bg-gray-900/80"
          : "border-gray-200 bg-white/80"
          }`}
      >
        <div className="max-w-[1260px] mx-auto px-4 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1
                className={`text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight transition-colors ${isDarkMode ? "text-white" : "text-gray-900"
                  }`}
              >
                Trade Analysis
              </h1>
              <p
                className={`text-xs sm:text-sm mt-0.5 sm:mt-1 transition-colors ${isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
              >
                Risk Management & Position Sizing
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMarket}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  isDarkMode
                    ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {market === "US" ? "🇺🇸 US" : "🇨🇳 CN"}
              </button>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 sm:p-2.5 md:p-3 rounded-full transition-colors ${
                  isDarkMode
                    ? "hover:bg-gray-800 text-gray-400"
                    : "hover:bg-gray-100 text-gray-600"
                }`}
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Moon className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1260px] mx-auto px-4 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6 lg:items-stretch">
          {/* Left Column - Trade Input - takes 3 of 5 columns */}
          <div className="lg:col-span-3 flex">
            <TradeInputCard
              market={market}
              currencySymbol={currencySymbol}
              tickerSymbol={tickerSymbol}
              setTickerSymbol={setTickerSymbol}
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
            />
          </div>
        </div>

        {/* Mobile Log Button - only visible on mobile */}
        <div className="lg:hidden mt-3 sm:mt-4">
          <button
            onClick={handleLogTrade}
            disabled={!position.canCalculate}
            className={`w-full py-3 px-4 rounded-xl font-medium transition-all shadow-md flex items-center justify-center gap-2 group text-sm ${position.canCalculate
              ? isDarkMode
                ? "bg-white text-gray-900 hover:bg-gray-50 hover:shadow-lg hover:-translate-y-0.5"
                : "bg-gray-900 text-white hover:bg-gray-800 hover:shadow-lg hover:-translate-y-0.5"
              : isDarkMode
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
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