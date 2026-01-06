import { useState } from "react";
import { TradeInputCard } from "./components/TradeInputCard";
import { PositionSize } from "./components/PositionSize";
import { TradeHistory } from "./components/TradeHistory";
import { Moon, Sun, ArrowUpRight } from "lucide-react";

export default function App() {
  const [tickerSymbol, setTickerSymbol] = useState("600301");
  const [portfolioCapital, setPortfolioCapital] =
    useState(300000);
  const [direction, setDirection] = useState<"long" | "short">(
    "long",
  );
  const [sentiment, setSentiment] = useState("TREND");
  const [riskPerTrade, setRiskPerTrade] = useState(0.75);
  const [entryPrice, setEntryPrice] = useState(47.28);
  const [stopLoss, setStopLoss] = useState(45.33);
  const [target, setTarget] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loggedTrades, setLoggedTrades] = useState<any[]>([]);

  const calculatePositionSize = () => {
    if (!entryPrice || !stopLoss)
      return {
        shares: 0,
        value: 0,
        unitAmount: 0,
        riskPerShare: 0,
        rrRatio: null,
        canCalculate: false,
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
    };
  };

  const position = calculatePositionSize();

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDarkMode
          ? "dark bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
          : "bg-gradient-to-br from-gray-50 via-white to-gray-100"
      }`}
    >
      {/* Header */}
      <header
        className={`border-b backdrop-blur-sm transition-colors duration-300 ${
          isDarkMode
            ? "border-gray-700 bg-gray-900/80"
            : "border-gray-200 bg-white/80"
        }`}
      >
        <div className="max-w-[1800px] mx-auto px-4 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1
                className={`text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight transition-colors ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Trade Analysis
              </h1>
              <p
                className={`text-xs sm:text-sm mt-0.5 sm:mt-1 transition-colors ${
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Risk Management & Position Sizing
              </p>
            </div>
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
      </header>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-4 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6 lg:items-stretch">
          {/* Left Column - Trade Input - takes 3 of 5 columns */}
          <div className="lg:col-span-3 flex">
            <TradeInputCard
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
            />
          </div>

          {/* Right Column - Position Size - takes 2 of 5 columns */}
          <div className="lg:col-span-2 flex">
            <PositionSize
              shares={position.shares}
              value={position.value}
              unitAmount={position.unitAmount}
              riskPerShare={position.riskPerShare}
              rrRatio={position.rrRatio}
              canCalculate={position.canCalculate}
              isDarkMode={isDarkMode}
            />
          </div>
        </div>

        {/* Mobile Log Button - only visible on mobile */}
        <div className="lg:hidden mt-3 sm:mt-4">
          <button
            disabled={!position.canCalculate}
            className={`w-full py-3 px-4 rounded-xl font-medium transition-all shadow-md flex items-center justify-center gap-2 group text-sm ${
              position.canCalculate
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
              className={`w-4 h-4 transition-transform ${
                position.canCalculate
                  ? "group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  : ""
              }`}
            />
          </button>
        </div>

        {/* Trade History */}
        <div className="mt-3 sm:mt-4 md:mt-6">
          <TradeHistory
            loggedTrades={loggedTrades}
            isDarkMode={isDarkMode}
          />
        </div>
      </main>
    </div>
  );
}