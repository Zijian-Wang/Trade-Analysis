import { Trade, RiskContract } from './tradeService'

/**
 * Calculates the position size based on risk parameters.
 */
export const calculatePositionSize = (
  portfolioCapital: number,
  riskPercent: number,
  entryPrice: number,
  stopLoss: number,
  market?: 'US' | 'CN',
) => {
  if (!entryPrice || !stopLoss || entryPrice === stopLoss) {
    return { shares: 0, riskAmount: 0, riskPerShare: 0 }
  }

  const riskAmount = portfolioCapital * (riskPercent / 100)
  const priceRisk = Math.abs(entryPrice - stopLoss)

  // Round shares down to be safe (or nearest integer)
  let shares = Math.floor(riskAmount / priceRisk)

  // For CN market, round to nearest 100 share lots
  if (market === 'CN') {
    shares = Math.floor(shares / 100) * 100
  }

  return {
    shares,
    riskAmount: shares * priceRisk, // Actual risk
    riskPerShare: priceRisk,
  }
}

/**
 * Calculates the effective stop for a contract.
 * If contractStop is present, it overrides the trade's stop.
 */
export const calculateEffectiveStop = (
  contract: RiskContract,
  tradeStop: number,
): number => {
  return contract.contractStop ?? tradeStop
}

/**
 * Calculates the total risk of a trade based on its contracts.
 */
export const calculateTradeRisk = (trade: Trade): number => {
  if (!trade.contracts || trade.contracts.length === 0) {
    // Fallback for flat trade (legacy/simple)
    // Assuming trade.riskAmount is accurate or calculate from flat fields if needed
    // But better to verify:
    const priceRisk = Math.abs(trade.entry - trade.stop)
    return trade.positionSize * priceRisk
    // Note: trade.positionSize (shares) * (entry - stop)
  }

  return trade.contracts.reduce((totalRisk, contract) => {
    const effectiveStop = calculateEffectiveStop(contract, trade.stop)
    const contractRisk =
      Math.abs(contract.entryPrice - effectiveStop) * contract.shares
    return totalRisk + contractRisk
  }, 0)
}

/**
 * Calculates the total risk exposure across all active trades.
 */
export const calculatePortfolioRisk = (trades: Trade[]): number => {
  return trades
    .filter((t) => t.status === 'ACTIVE')
    .reduce((total, trade) => total + calculateTradeRisk(trade), 0)
}

/**
 * Calculates the average entry price for a set of contracts.
 */
export const calculateAvgEntry = (contracts: RiskContract[]): number => {
  if (!contracts.length) return 0
  const totalValue = contracts.reduce(
    (sum, c) => sum + c.entryPrice * c.shares,
    0,
  )
  const totalShares = contracts.reduce((sum, c) => sum + c.shares, 0)
  return totalShares === 0 ? 0 : totalValue / totalShares
}
