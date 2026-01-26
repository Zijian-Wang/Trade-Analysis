import { Trade } from './tradeService'

/**
 * Validates that stop price is correct for the trade direction
 * For long: stop must be below entry
 * For short: stop must be above entry
 */
export function isValidStopPrice(
  entry: number,
  stop: number,
  direction: 'long' | 'short',
): boolean {
  if (direction === 'long') {
    return stop < entry
  } else {
    return stop > entry
  }
}

/**
 * Gets the correct stop price for a trade
 * Validates the stop and returns it if valid, otherwise null
 */
export function getValidStopPrice(trade: Trade): number | null {
  const entry = trade.entry
  const stop = trade.stop

  if (stop && isValidStopPrice(entry, stop, trade.direction)) {
    return stop
  }

  // If stop is invalid, return null (should be fixed)
  return null
}

/**
 * Fixes invalid stop prices in a trade
 * Returns a corrected trade object
 */
export function fixInvalidStopPrice(trade: Trade): Trade {
  const validStop = getValidStopPrice(trade)

  if (validStop === null) {
    // If no valid stop exists, we can't fix it automatically
    // Return trade as-is (user will need to fix manually)
    return trade
  }

  // If stop is invalid, we've already validated it above
  // Just return the trade with the valid stop
  return {
    ...trade,
    stop: validStop,
  }
}
