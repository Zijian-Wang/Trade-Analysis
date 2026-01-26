import { useState, useEffect } from 'react'
import { Trade } from '../services/tradeService'
import { calculateEffectiveStop } from '../services/riskCalculator'
import { fetchChartData } from '../services/chartDataService'

interface VisualRiskLineProps {
  trade: Trade
  className?: string
}

/**
 * Visual Risk Line Component
 * Displays a horizontal indicator showing: Stop | Entry | Current | Target
 * Uses 6 months of historical data to determine optimal min/max range
 */
export function VisualRiskLine({ trade, className = '' }: VisualRiskLineProps) {
  const [historicalMin, setHistoricalMin] = useState<number | null>(null)
  const [historicalMax, setHistoricalMax] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch 6 months (180 days) of historical data for better range calculation
  useEffect(() => {
    let cancelled = false

    const loadHistoricalData = async () => {
      try {
        setLoading(true)
        const data = await fetchChartData(
          trade.symbol,
          trade.market || 'US',
          180,
        )

        if (!cancelled && data.length > 0) {
          const prices = data.flatMap((d) => [d.low, d.high, d.close])
          const min = Math.min(...prices)
          const max = Math.max(...prices)

          // Calculate mean and standard deviation
          const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length
          const variance =
            prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) /
            prices.length
          const stdDev = Math.sqrt(variance)

          // Option 1: Use 6-month min/max
          const range1 = max - min

          // Option 2: Use mean ± 2 standard deviations
          const stdMin = Math.max(0, mean - 2 * stdDev)
          const stdMax = mean + 2 * stdDev
          const range2 = stdMax - stdMin

          // Use whichever gives better spacing (larger range)
          if (range2 > range1) {
            setHistoricalMin(stdMin)
            setHistoricalMax(stdMax)
          } else {
            setHistoricalMin(min)
            setHistoricalMax(max)
          }
        }
      } catch (error) {
        console.error(
          'Failed to load historical data for risk visualization:',
          error,
        )
        // Fall back to trade prices only
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadHistoricalData()

    return () => {
      cancelled = true
    }
  }, [trade.symbol, trade.market])

  // Get effective stop (contract stop if exists, else trade stop)
  const effectiveStop =
    trade.contracts && trade.contracts.length > 0
      ? calculateEffectiveStop(trade.contracts[0], trade.stop)
      : trade.stop

  const entry = trade.entry
  const current = trade.currentPrice || entry // Use current price if available, else entry
  const target = trade.target
  const stop = effectiveStop

  // Determine price range for scaling
  const tradePrices = [stop, entry, current, target].filter(
    (p): p is number => p !== null && p !== undefined,
  )
  const tradeMinPrice = Math.min(...tradePrices)
  const tradeMaxPrice = Math.max(...tradePrices)

  // Use historical data if available, otherwise fall back to trade prices
  const minPrice =
    historicalMin !== null
      ? Math.min(historicalMin, tradeMinPrice)
      : tradeMinPrice
  const maxPrice =
    historicalMax !== null
      ? Math.max(historicalMax, tradeMaxPrice)
      : tradeMaxPrice
  const priceRange = maxPrice - minPrice || 1 // Avoid division by zero

  // Add padding: 15% on each side for better readability
  // This gives us room to read prices without crowding
  const paddingPercent = 15
  const paddingAmount = (priceRange * paddingPercent) / 100
  const paddedMinPrice = Math.max(0, minPrice - paddingAmount)
  const paddedMaxPrice = maxPrice + paddingAmount
  const paddedRange = paddedMaxPrice - paddedMinPrice

  // Normalize positions (0 to 100%) with padding
  // The bar itself will be in the middle 70% (with 15% padding on each side)
  const normalize = (price: number) => {
    const offset = price - paddedMinPrice
    return (offset / paddedRange) * 100
  }

  const stopPos = normalize(stop)
  const entryPos = normalize(entry)
  const currentPos = normalize(current)
  const targetPos = target ? normalize(target) : null

  // Determine if long or short
  const isLong = trade.direction === 'long'
  const isProfit = isLong ? current > entry : current < entry

  return (
    <div className={`relative w-full pb-6 ${className}`}>
      {/* Container with flex layout for dynamic width adjustment */}
      <div className="relative flex items-center gap-2">
        {/* Min price box - left side */}
        <div className="flex-shrink-0">
          <div className="bg-gray-500 text-white text-xs font-medium px-2 py-1 rounded whitespace-nowrap">
            ${paddedMinPrice.toFixed(2)}
          </div>
        </div>

        {/* Bar container - takes remaining space */}
        <div className="relative flex-1 min-w-0">
          {/* Background track - much thinner */}
          <div className="relative h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />

          {/* Stop line */}
          <div
            className="absolute top-0 w-0.5 bg-red-500"
            style={{
              left: `${stopPos}%`,
              height: '0.25rem',
              top: '0.375rem', // Center on the thin bar
            }}
          >
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-red-600 dark:text-red-400 whitespace-nowrap">
              STOP
            </div>
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
              ${stop.toFixed(2)}
            </div>
          </div>

          {/* Entry line */}
          <div
            className="absolute top-0 w-0.5 bg-blue-500"
            style={{
              left: `${entryPos}%`,
              height: '0.25rem',
              top: '0.375rem',
            }}
          >
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">
              ENTRY
            </div>
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
              ${entry.toFixed(2)}
            </div>
          </div>

          {/* Current price indicator */}
          <div
            className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2"
            style={{ left: `${currentPos}%` }}
          >
            <div
              className={`w-2.5 h-2.5 rounded-full border-2 ${
                isProfit
                  ? 'bg-green-500 border-green-600'
                  : 'bg-orange-500 border-orange-600'
              }`}
            />
            <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 text-xs font-bold whitespace-nowrap">
              ${current.toFixed(2)}
              {trade.currentPrice && trade.currentPrice !== entry && (
                <span className="ml-1 text-[10px] text-gray-500">(live)</span>
              )}
            </div>
          </div>

          {/* Target line (if exists) */}
          {targetPos !== null && (
            <div
              className="absolute top-0 w-0.5 bg-green-500"
              style={{
                left: `${targetPos}%`,
                height: '0.25rem',
                top: '0.375rem',
                borderStyle: 'dashed',
                borderWidth: '1px',
              }}
            >
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-green-600 dark:text-green-400 whitespace-nowrap">
                TARGET
              </div>
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                ${target.toFixed(2)}
              </div>
            </div>
          )}
        </div>

        {/* Max price box - right side */}
        <div className="flex-shrink-0">
          <div className="bg-gray-500 text-white text-xs font-medium px-2 py-1 rounded whitespace-nowrap">
            ${paddedMaxPrice.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  )
}
