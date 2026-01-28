import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

interface PriceRangeBarProps {
  entry: number
  stop?: number | null
  currentPrice?: number
  target?: number | null
  direction: 'long' | 'short'
}

/**
 * Visual bar showing price levels: stop, entry, current price, and target
 * Displays relative positions on a horizontal line
 */
export function PriceRangeBar({
  entry,
  stop,
  currentPrice,
  target,
  direction,
}: PriceRangeBarProps) {
  // Determine the price range to display
  const prices = [entry]
  if (stop !== null && stop !== undefined) prices.push(stop)
  if (currentPrice) prices.push(currentPrice)
  if (target) prices.push(target)

  const minPrice = Math.min(...prices) * 0.995 // Add 0.5% padding
  const maxPrice = Math.max(...prices) * 1.005

  const range = maxPrice - minPrice
  if (range === 0) return null

  // Calculate positions as percentages
  const getPosition = (price: number) => ((price - minPrice) / range) * 100

  const stopPos =
    stop !== null && stop !== undefined ? getPosition(stop) : null
  const entryPos = getPosition(entry)
  const currentPos = currentPrice ? getPosition(currentPrice) : null
  const targetPos = target ? getPosition(target) : null

  // Determine if current price is in profit or loss
  const isProfit = currentPrice
    ? direction === 'long'
      ? currentPrice > entry
      : currentPrice < entry
    : false

  // Calculate risk/reward zones
  const isLong = direction === 'long'
  const riskZoneStart =
    stopPos !== null ? (isLong ? stopPos : entryPos) : null
  const riskZoneEnd =
    stopPos !== null ? (isLong ? entryPos : stopPos) : null
  const rewardZoneStart = isLong ? entryPos : (targetPos ?? entryPos)
  const rewardZoneEnd = isLong ? (targetPos ?? entryPos) : entryPos

  return (
    <div className="w-full h-6 relative">
      {/* Base line */}
      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-300 dark:bg-gray-600 -translate-y-1/2" />

      {/* Risk zone (red) - between stop and entry */}
      {riskZoneStart !== null && riskZoneEnd !== null && (
        <div
          className="absolute top-1/2 h-1 bg-rose-200 dark:bg-rose-900/50 -translate-y-1/2 rounded-full"
          style={{
            left: `${Math.min(riskZoneStart, riskZoneEnd)}%`,
            width: `${Math.abs(riskZoneEnd - riskZoneStart)}%`,
          }}
        />
      )}

      {/* Reward zone (green) - between entry and target */}
      {targetPos !== null && (
        <div
          className="absolute top-1/2 h-1 bg-emerald-200 dark:bg-emerald-900/50 -translate-y-1/2 rounded-full"
          style={{
            left: `${Math.min(rewardZoneStart, rewardZoneEnd)}%`,
            width: `${Math.abs(rewardZoneEnd - rewardZoneStart)}%`,
          }}
        />
      )}

      {/* Stop marker */}
      {stopPos !== null && stop !== null && stop !== undefined && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="absolute top-1/2 w-2 h-4 bg-rose-500 rounded-sm -translate-y-1/2 -translate-x-1/2 cursor-help hover:scale-110 transition-transform"
              style={{ left: `${stopPos}%` }}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-rose-500 font-medium">
              Stop: ${stop.toFixed(2)}
            </p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Entry marker */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="absolute top-1/2 w-2 h-4 bg-blue-500 rounded-sm -translate-y-1/2 -translate-x-1/2 cursor-help hover:scale-110 transition-transform"
            style={{ left: `${entryPos}%` }}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-blue-500 font-medium">Entry: ${entry.toFixed(2)}</p>
        </TooltipContent>
      </Tooltip>

      {/* Current price marker */}
      {currentPos !== null && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`absolute top-1/2 w-2.5 h-5 rounded-sm -translate-y-1/2 -translate-x-1/2 cursor-help hover:scale-110 transition-transform border-2 border-white dark:border-gray-800 ${
                isProfit ? 'bg-emerald-500' : 'bg-orange-500'
              }`}
              style={{ left: `${currentPos}%` }}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p className={`font-medium ${isProfit ? 'text-emerald-500' : 'text-orange-500'}`}>
              Current: ${currentPrice!.toFixed(2)}
            </p>
            <p className="text-xs text-gray-400">
              {isProfit ? 'In profit' : 'At risk'}
            </p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Target marker */}
      {targetPos !== null && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="absolute top-1/2 w-2 h-4 bg-emerald-500 rounded-sm -translate-y-1/2 -translate-x-1/2 cursor-help hover:scale-110 transition-transform"
              style={{ left: `${targetPos}%` }}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-emerald-500 font-medium">Target: ${target!.toFixed(2)}</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Labels below */}
      <div className="absolute -bottom-3 left-0 right-0 flex justify-between text-[9px] text-gray-400">
        <span>${minPrice.toFixed(0)}</span>
        <span>${maxPrice.toFixed(0)}</span>
      </div>
    </div>
  )
}
