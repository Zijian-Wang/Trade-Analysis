import { CalendarX, Coffee, Moon, Sun, Sunrise, Sunset } from 'lucide-react'
import type { MarketKey } from '../hooks/useMarketSessionStatus'
import { useMarketSessionStatus } from '../hooks/useMarketSessionStatus'

type MarketSessionIconProps = {
  market: MarketKey
  className?: string
  iconSize?: number
}

export function MarketSessionIcon({
  market,
  className,
  iconSize = 14,
}: MarketSessionIconProps) {
  const status = useMarketSessionStatus(market)

  let Icon = Moon
  let title = `${market}: CLOSED`
  let colorClass = 'text-gray-500 dark:text-gray-400'

  if (status.session === 'OPEN') {
    Icon = Sun
    title = `${market}: OPEN`
    colorClass = 'text-emerald-600 dark:text-emerald-400'
  } else if (status.session === 'EXT') {
    Icon = status.extendedSession === 'AFTER' ? Sunset : Sunrise
    title = `${market}: EXT (${status.extendedSession === 'AFTER' ? 'After-hours' : 'Pre-market'})`
    colorClass = 'text-blue-600 dark:text-blue-400'
  } else if (status.session === 'CLOSED' && status.closedReason) {
    const reason =
      status.closedReason === 'LUNCH'
        ? 'Lunch break'
        : status.closedReason === 'HOLIDAY'
          ? 'Holiday'
        : status.closedReason === 'WEEKEND'
          ? 'Weekend'
          : 'Overnight'
    title = `${market}: CLOSED (${reason})`

    // CN has a real midday lunch break; use a distinct icon so it's not confused with overnight closure.
    if (status.closedReason === 'LUNCH') {
      Icon = Coffee // (alternatively Pause; Coffee reads better as "lunch")
    }
    if (status.closedReason === 'HOLIDAY') {
      Icon = CalendarX
    }
  }

  return (
    <span
      className={className ? `inline-flex items-center ${className}` : 'inline-flex items-center'}
      title={title}
      aria-label={title}
    >
      <Icon size={iconSize} className={colorClass} />
    </span>
  )
}

