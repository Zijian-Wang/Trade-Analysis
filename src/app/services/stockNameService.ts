/**
 * Service to fetch and cache Chinese stock company names
 */

import { CHINESE_STOCK_NAMES } from './chineseStockNames'

// Cache for stock names (symbol -> company name)
const stockNameCache = new Map<string, string>()

/**
 * Get company name for a stock symbol
 * For Chinese stocks, tries to fetch company name
 * Falls back to symbol if name not available
 */
export async function getStockName(
  symbol: string,
  market: 'US' | 'CN',
): Promise<string> {
  // For US stocks, return symbol as-is (they're already readable)
  if (market === 'US' || /^[a-zA-Z]+$/.test(symbol)) {
    return symbol
  }

  // Check cache first
  if (stockNameCache.has(symbol)) {
    return stockNameCache.get(symbol)!
  }

  // Check comprehensive stock names list first (no API call needed)
  if (CHINESE_STOCK_NAMES[symbol]) {
    stockNameCache.set(symbol, CHINESE_STOCK_NAMES[symbol])
    return CHINESE_STOCK_NAMES[symbol]
  }

  // Try to fetch from Alpha Vantage (though it may not have company name)
  // For now, we'll try to get it from the OVERVIEW endpoint if available
  try {
    let chineseSuffix = ''
    if (/^[56]/.test(symbol)) {
      chineseSuffix = '.SHH'
    } else if (/^\d+$/.test(symbol) && !symbol.startsWith('920')) {
      chineseSuffix = '.SHZ'
    }

    if (chineseSuffix) {
      const querySymbol = `${symbol}${chineseSuffix}`
      const apiKey = import.meta.env.VITE_ALPHAVANTAGE_API_KEY

      // Try OVERVIEW endpoint which may contain company name
      const response = await fetch(
        `/api/alphavantage/query?function=OVERVIEW&symbol=${querySymbol}&apikey=${apiKey}`,
      )

      if (response.ok) {
        const data = await response.json()
        const companyName = data['Name']
        if (
          companyName &&
          typeof companyName === 'string' &&
          companyName.trim()
        ) {
          stockNameCache.set(symbol, companyName)
          return companyName
        }
      }
    }
  } catch (error) {
    console.error(`Failed to fetch company name for ${symbol}:`, error)
  }

  // Fallback: return symbol
  return symbol
}

/**
 * Get company name synchronously (from cache only)
 * Returns symbol if not in cache
 */
export function getStockNameSync(symbol: string, market: 'US' | 'CN'): string {
  if (market === 'US' || /^[a-zA-Z]+$/.test(symbol)) {
    return symbol
  }

  if (stockNameCache.has(symbol)) {
    return stockNameCache.get(symbol)!
  }

  if (CHINESE_STOCK_NAMES[symbol]) {
    return CHINESE_STOCK_NAMES[symbol]
  }

  return symbol
}

/**
 * Batch fetch stock names
 */
export async function getStockNames(
  symbols: Array<{ symbol: string; market: 'US' | 'CN' }>,
): Promise<Map<string, string>> {
  const nameMap = new Map<string, string>()

  // Fetch in parallel with rate limiting (batch of 3 for Alpha Vantage)
  const batchSize = 3
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize)
    const results = await Promise.all(
      batch.map(async ({ symbol, market }) => {
        const name = await getStockName(symbol, market)
        return { symbol, name }
      }),
    )

    results.forEach(({ symbol, name }) => {
      nameMap.set(symbol, name)
    })

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < symbols.length) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  return nameMap
}

/**
 * Preload stock names for a list of symbols
 */
export async function preloadStockNames(
  symbols: Array<{ symbol: string; market: 'US' | 'CN' }>,
): Promise<void> {
  await getStockNames(symbols)
}
