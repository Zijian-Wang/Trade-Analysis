/**
 * Service to fetch current stock prices
 */

export interface PriceData {
  price: number
  symbol: string
  market: 'US' | 'CN'
}

/**
 * Fetch current price for a symbol
 */
export async function fetchCurrentPrice(
  symbol: string,
  market: 'US' | 'CN',
): Promise<number | null> {
  try {
    if (market === 'CN') {
      // Chinese stocks
      let chineseSuffix = ''
      if (/^[56]/.test(symbol)) {
        chineseSuffix = '.SHH'
      } else if (/^\d+$/.test(symbol) && !symbol.startsWith('920')) {
        chineseSuffix = '.SHZ'
      }

      if (!chineseSuffix) return null

      const querySymbol = `${symbol}${chineseSuffix}`
      const apiKey = import.meta.env.VITE_ALPHAVANTAGE_API_KEY
      const response = await fetch(
        `/api/alphavantage/query?function=GLOBAL_QUOTE&symbol=${querySymbol}&apikey=${apiKey}`,
      )

      if (response.ok) {
        const data = await response.json()
        const price = parseFloat(data['Global Quote']?.['05. price'])
        if (!isNaN(price) && price > 0) {
          return price
        }
      }
    } else {
      // US stocks
      const querySymbol = `${symbol}.US`
      const response = await fetch(
        `/api/stooq/q/l/?s=${querySymbol}&f=sd2t2ohlcv&h&e=csv`,
      )

      if (response.ok) {
        const text = await response.text()
        const lines = text.trim().split('\n')

        if (lines.length >= 2) {
          const headers = lines[0].split(',')
          const values = lines[1].split(',')
          const closeIndex = headers.findIndex((h) => h.trim() === 'Close')

          if (closeIndex !== -1 && values[closeIndex]) {
            const price = parseFloat(values[closeIndex])
            if (!isNaN(price) && price > 0) {
              return price
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(`Failed to fetch price for ${symbol}:`, error)
  }

  return null
}

/**
 * Fetch current prices for multiple symbols
 */
export async function fetchCurrentPrices(
  symbols: Array<{ symbol: string; market: 'US' | 'CN' }>,
): Promise<Map<string, number>> {
  const priceMap = new Map<string, number>()

  // Fetch in parallel with rate limiting (batch of 5)
  const batchSize = 5
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize)
    const results = await Promise.all(
      batch.map(async ({ symbol, market }) => {
        const price = await fetchCurrentPrice(symbol, market)
        return { symbol, price }
      }),
    )

    results.forEach(({ symbol, price }) => {
      if (price !== null) {
        priceMap.set(symbol, price)
      }
    })

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < symbols.length) {
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  }

  return priceMap
}
