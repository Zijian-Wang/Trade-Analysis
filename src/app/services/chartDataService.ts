/**
 * Chart Data Service
 * Fetches historical stock data with aggressive caching to minimize API calls
 *
 * Strategy:
 * - US Market: Stooq (free, no API key, no rate limits)
 * - CN Market: Alpha Vantage (25 req/day, 5 req/min - needs caching)
 * - Cache historical data in localStorage (doesn't change)
 * - Cache for 24 hours for daily data
 */

interface ChartDataPoint {
  time: string // YYYY-MM-DD format
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

interface CacheEntry {
  data: ChartDataPoint[]
  timestamp: number
  symbol: string
  market: 'US' | 'CN'
}

const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
const CACHE_KEY_PREFIX = 'chart_data_'

/**
 * Get cache key for a symbol
 */
function getCacheKey(symbol: string, market: 'US' | 'CN'): string {
  return `${CACHE_KEY_PREFIX}${market}_${symbol}`
}

/**
 * Get cached data if available and fresh
 */
function getCachedData(
  symbol: string,
  market: 'US' | 'CN',
): ChartDataPoint[] | null {
  try {
    const cacheKey = getCacheKey(symbol, market)
    const cached = localStorage.getItem(cacheKey)

    if (!cached) return null

    const entry: CacheEntry = JSON.parse(cached)
    const now = Date.now()

    // Check if cache is still valid
    if (now - entry.timestamp < CACHE_DURATION) {
      return entry.data
    }

    // Cache expired, remove it
    localStorage.removeItem(cacheKey)
    return null
  } catch (error) {
    console.error('Error reading cache:', error)
    return null
  }
}

/**
 * Save data to cache
 */
function saveToCache(
  symbol: string,
  market: 'US' | 'CN',
  data: ChartDataPoint[],
): void {
  try {
    const cacheKey = getCacheKey(symbol, market)
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      symbol,
      market,
    }
    localStorage.setItem(cacheKey, JSON.stringify(entry))
  } catch (error) {
    console.error('Error saving to cache:', error)
    // If localStorage is full, try to clear old entries
    try {
      clearOldCacheEntries()
      localStorage.setItem(cacheKey, JSON.stringify(entry))
    } catch (e) {
      console.error('Failed to save to cache after cleanup:', e)
    }
  }
}

/**
 * Clear old cache entries to free up space
 */
function clearOldCacheEntries(): void {
  try {
    const now = Date.now()
    const keysToRemove: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(CACHE_KEY_PREFIX)) {
        try {
          const entry: CacheEntry = JSON.parse(
            localStorage.getItem(key) || '{}',
          )
          if (now - entry.timestamp >= CACHE_DURATION) {
            keysToRemove.push(key)
          }
        } catch (e) {
          // Invalid entry, remove it
          keysToRemove.push(key)
        }
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key))
  } catch (error) {
    console.error('Error clearing old cache:', error)
  }
}

/**
 * Fetch US market historical data from Stooq (free, no API key needed)
 */
async function fetchUSChartData(
  symbol: string,
  days: number = 90,
): Promise<ChartDataPoint[]> {
  try {
    // Stooq format: SYMBOL.US for US stocks
    const querySymbol = `${symbol}.US`

    // Calculate date range (approximately 3 months)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Stooq CSV format: Date,Open,High,Low,Close,Volume
    // We'll fetch daily data
    const response = await fetch(
      `/api/stooq/q/d/l/?s=${querySymbol}&i=d&f=sd2t2ohlcv&h&e=csv`,
    )

    if (!response.ok) {
      throw new Error(`Stooq API error: ${response.status}`)
    }

    const text = await response.text()
    const lines = text.trim().split('\n')

    if (lines.length < 2) {
      throw new Error('No data returned from Stooq')
    }

    // Parse CSV (header + data rows)
    const headers = lines[0].split(',')
    const dateIndex = headers.findIndex(
      (h) => h.trim().toLowerCase() === 'date',
    )
    const openIndex = headers.findIndex(
      (h) => h.trim().toLowerCase() === 'open',
    )
    const highIndex = headers.findIndex(
      (h) => h.trim().toLowerCase() === 'high',
    )
    const lowIndex = headers.findIndex((h) => h.trim().toLowerCase() === 'low')
    const closeIndex = headers.findIndex(
      (h) => h.trim().toLowerCase() === 'close',
    )
    const volumeIndex = headers.findIndex(
      (h) => h.trim().toLowerCase() === 'volume',
    )

    if (
      dateIndex === -1 ||
      openIndex === -1 ||
      highIndex === -1 ||
      lowIndex === -1 ||
      closeIndex === -1
    ) {
      throw new Error('Invalid CSV format from Stooq')
    }

    const data: ChartDataPoint[] = []

    // Parse data rows (skip header, process in reverse to get most recent first)
    for (let i = lines.length - 1; i >= 1; i--) {
      const values = lines[i].split(',')
      if (values.length < 5) continue

      const dateStr = values[dateIndex]?.trim()
      const open = parseFloat(values[openIndex])
      const high = parseFloat(values[highIndex])
      const low = parseFloat(values[lowIndex])
      const close = parseFloat(values[closeIndex])
      const volume =
        volumeIndex !== -1 ? parseFloat(values[volumeIndex]) : undefined

      if (
        !dateStr ||
        isNaN(open) ||
        isNaN(high) ||
        isNaN(low) ||
        isNaN(close)
      ) {
        continue
      }

      // Convert date format if needed (Stooq might use different formats)
      let formattedDate = dateStr
      if (dateStr.includes('/')) {
        // Convert MM/DD/YYYY to YYYY-MM-DD
        const [month, day, year] = dateStr.split('/')
        formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }

      data.push({
        time: formattedDate,
        open,
        high,
        low,
        close,
        volume,
      })
    }

    // Limit to requested days and sort chronologically
    const limitedData = data.slice(0, days).reverse()

    return limitedData
  } catch (error) {
    console.error(`Failed to fetch US chart data for ${symbol}:`, error)
    throw error
  }
}

/**
 * Fetch CN market historical data from Alpha Vantage (has rate limits)
 * Note: Alpha Vantage free tier: 25 requests/day, 5 requests/minute
 */
async function fetchCNChartData(
  symbol: string,
  days: number = 90,
): Promise<ChartDataPoint[]> {
  try {
    // Determine exchange suffix
    let chineseSuffix = ''
    if (/^[56]/.test(symbol)) {
      chineseSuffix = '.SHH' // Shanghai
    } else if (/^\d+$/.test(symbol) && !symbol.startsWith('920')) {
      chineseSuffix = '.SHZ' // Shenzhen
    } else {
      throw new Error(`Invalid Chinese stock symbol: ${symbol}`)
    }

    const querySymbol = `${symbol}${chineseSuffix}`
    // #region agent log
    const payload1 = {
      location: 'chartDataService.ts:262',
      message: 'CN symbol conversion',
      data: { originalSymbol: symbol, chineseSuffix, querySymbol },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'H'
    };
    fetch('http://127.0.0.1:7242/ingest/8304270c-456a-4aa6-adb2-ddd30a6ad70c', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload1)
    }).catch(() => {});
    // #endregion
    const apiKey = import.meta.env.VITE_ALPHAVANTAGE_API_KEY

    if (!apiKey) {
      throw new Error('Alpha Vantage API key not configured')
    }

    // Use TIME_SERIES_DAILY_ADJUSTED for historical data
    const response = await fetch(
      `/api/alphavantage/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${querySymbol}&apikey=${apiKey}&outputsize=compact`,
    )

    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status}`)
    }

    const data = await response.json()

    // Check for API errors
    if (data['Error Message']) {
      throw new Error(data['Error Message'])
    }

    if (data['Note']) {
      // Rate limit hit
      throw new Error(
        'Alpha Vantage rate limit exceeded. Please try again later.',
      )
    }

    const timeSeries = data['Time Series (Daily)']
    if (!timeSeries) {
      throw new Error('No time series data in response')
    }

    // #region agent log
    const sampleDates = Object.keys(timeSeries).slice(0, 3);
    const samplePrices = sampleDates.map(d => ({ date: d, close: parseFloat(timeSeries[d]['4. close']) }));
    const payload2 = {
      location: 'chartDataService.ts:292',
      message: 'API response received',
      data: { querySymbol, timeSeriesKeys: Object.keys(timeSeries).length, samplePrices },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'I'
    };
    fetch('http://127.0.0.1:7242/ingest/8304270c-456a-4aa6-adb2-ddd30a6ad70c', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload2)
    }).catch(() => {});
    // #endregion

    const chartData: ChartDataPoint[] = []

    // Convert Alpha Vantage format to our format
    // Alpha Vantage format: "2024-01-15": { "1. open": "100.5", "2. high": "102.3", ... }
    const dates = Object.keys(timeSeries).sort().reverse() // Most recent first

    for (let i = 0; i < Math.min(days, dates.length); i++) {
      const date = dates[i]
      const dayData = timeSeries[date]

      chartData.push({
        time: date,
        open: parseFloat(dayData['1. open']),
        high: parseFloat(dayData['2. high']),
        low: parseFloat(dayData['3. low']),
        close: parseFloat(dayData['4. close']),
        volume: parseFloat(dayData['6. volume']),
      })
    }

    // Reverse to chronological order
    const finalData = chartData.reverse();
    // #region agent log
    const finalMinPrice = finalData.length > 0 ? Math.min(...finalData.map(d => d.low)) : null;
    const finalMaxPrice = finalData.length > 0 ? Math.max(...finalData.map(d => d.high)) : null;
    const payload3 = {
      location: 'chartDataService.ts:318',
      message: 'CN chart data processed',
      data: {
        symbol,
        querySymbol,
        dataLength: finalData.length,
        minPrice: finalMinPrice,
        maxPrice: finalMaxPrice,
        firstClose: finalData[0]?.close,
        lastClose: finalData[finalData.length - 1]?.close
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'J'
    };
    fetch('http://127.0.0.1:7242/ingest/8304270c-456a-4aa6-adb2-ddd30a6ad70c', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload3)
    }).catch(() => {});
    // #endregion
    return finalData;
  } catch (error) {
    console.error(`Failed to fetch CN chart data for ${symbol}:`, error)
    // #region agent log
    const errorMsg = error instanceof Error ? error.message : String(error);
    const payload4 = {
      location: 'chartDataService.ts:320',
      message: 'CN chart data error',
      data: { symbol, error: errorMsg },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'K'
    };
    fetch('http://127.0.0.1:7242/ingest/8304270c-456a-4aa6-adb2-ddd30a6ad70c', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload4)
    }).catch(() => {});
    // #endregion
    throw error
  }
}

/**
 * Fetch chart data with caching
 *
 * @param symbol Stock symbol
 * @param market Market ('US' or 'CN')
 * @param days Number of days of historical data (default: 90)
 * @returns Array of chart data points
 */
export async function fetchChartData(
  symbol: string,
  market: 'US' | 'CN',
  days: number = 90,
): Promise<ChartDataPoint[]> {
  // #region agent log
  const payload5 = {
    location: 'chartDataService.ts:333',
    message: 'fetchChartData entry',
    data: { symbol, market, days },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId: 'F'
  };
  fetch('http://127.0.0.1:7242/ingest/8304270c-456a-4aa6-adb2-ddd30a6ad70c', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload5)
  }).catch(() => {});
  // #endregion
  // Check cache first
  const cached = getCachedData(symbol, market)
  // #region agent log
  const payload6 = {
    location: 'chartDataService.ts:339',
    message: 'Cache check result',
    data: { symbol, market, cacheHit: !!cached, cachedLength: cached?.length || 0 },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId: 'G'
  };
  fetch('http://127.0.0.1:7242/ingest/8304270c-456a-4aa6-adb2-ddd30a6ad70c', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload6)
  }).catch(() => {});
  // #endregion
  if (cached) {
    // Return cached data, limiting to requested days
    return cached.slice(-days)
  }

  // Fetch fresh data
  let data: ChartDataPoint[]

  if (market === 'US') {
    data = await fetchUSChartData(symbol, days)
  } else {
    data = await fetchCNChartData(symbol, days)
  }

  // Save to cache
  if (data.length > 0) {
    saveToCache(symbol, market, data)
  }

  return data
}

/**
 * Clear cache for a specific symbol
 */
export function clearChartCache(symbol: string, market: 'US' | 'CN'): void {
  const cacheKey = getCacheKey(symbol, market)
  localStorage.removeItem(cacheKey)
}

/**
 * Clear all chart data cache
 */
export function clearAllChartCache(): void {
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(CACHE_KEY_PREFIX)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key))
  } catch (error) {
    console.error('Error clearing chart cache:', error)
  }
}
