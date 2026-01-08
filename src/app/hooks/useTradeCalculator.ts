import { useState, useMemo } from "react";

export interface TradeCalculationResult {
  shares: number;
  value: number;
  unitAmount: number;
  riskPerShare: number;
  rrRatio: number | null;
  canCalculate: boolean;
  riskAmount: number;
  riskPerShareDollar: number;
}

export function useTradeCalculator(
  portfolioCapital: number
) {
  const [tickerSymbol, setTickerSymbol] = useState("");
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [riskPerTrade, setRiskPerTrade] = useState(0.75);
  const [entryPrice, setEntryPrice] = useState<number>(0);
  const [stopLoss, setStopLoss] = useState<number>(0);
  const [target, setTarget] = useState("");
  const [sentiment, setSentiment] = useState("TREND");

  const position: TradeCalculationResult = useMemo(() => {
    if (!entryPrice || !stopLoss) {
      return {
        shares: 0,
        value: 0,
        unitAmount: 0,
        riskPerShare: 0,
        rrRatio: null,
        canCalculate: false,
        riskAmount: 0,
        riskPerShareDollar: 0,
      };
    }

    // Validation
    const hasRequiredInputs =
      tickerSymbol.trim() !== "" && entryPrice > 0 && stopLoss > 0;
    const isStopLossValid =
      hasRequiredInputs &&
      ((direction === "long" && entryPrice > stopLoss) ||
        (direction === "short" && entryPrice < stopLoss));

    const targetNum = target ? parseFloat(target) : null;
    const isTargetValid =
      !targetNum ||
      (direction === "long" && entryPrice < targetNum) ||
      (direction === "short" && entryPrice > targetNum);

    const canCalculate = hasRequiredInputs && isStopLossValid && isTargetValid;

    if (!canCalculate) {
      return {
        shares: 0,
        value: 0,
        unitAmount: 0,
        riskPerShare: 0,
        rrRatio: null,
        canCalculate: false,
        riskAmount: 0,
        riskPerShareDollar: 0,
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
      riskPerShareDollar: priceRisk,
    };
  }, [
    entryPrice,
    stopLoss,
    target,
    tickerSymbol,
    direction,
    portfolioCapital,
    riskPerTrade,
  ]);

  return {
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
  };
}
