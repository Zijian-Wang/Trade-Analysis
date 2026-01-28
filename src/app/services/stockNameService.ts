/**
 * Service to fetch and cache stock company names.
 *
 * Performance note:
 * - CN static name map is large-ish; we lazy-load it so initial bundle stays small.
 */

// Cache for stock names (symbol -> company name)
const stockNameCache = new Map<string, string>()
const inFlightLookups = new Map<string, Promise<string>>()
const lastFailedLookupAt = new Map<string, number>()
const STOCK_NAME_STORAGE_KEY = 'trade_analysis_stock_names_v1'
const STOCK_NAME_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
const FAILED_LOOKUP_BACKOFF_MS = 6 * 60 * 60 * 1000 // 6 hours

type PersistedNameEntry = { name: string; updatedAt: number }

// Small built-in overrides for common US ETFs/ADRs (covers the "RIO/SOXX/SIL/BOXX" case immediately).
const US_STATIC_OVERRIDES: Record<string, string> = {
  RIO: 'Rio Tinto Group',
  SOXX: 'iShares Semiconductor ETF',
  SIL: 'Global X Silver Miners ETF',
  BOXX: 'Alpha Architect 1-3 Month Box ETF',
}

let usStaticMap: Record<string, string> | null = null
let usStaticMapPromise: Promise<Record<string, string>> | null = null

async function getUsStaticMap(): Promise<Record<string, string>> {
  if (usStaticMap) return usStaticMap
  if (!usStaticMapPromise) {
    usStaticMapPromise = fetch('/symbols/us_ticker_to_name.json')
      .then(async (res) => {
        if (!res.ok) return {}
        return (await res.json()) as unknown
      })
      .then((raw) => {
        // Accept either:
        // 1) Pre-built map: { "AAPL": "Apple Inc.", ... }
        // 2) SEC raw format: { "0": { ticker:"AAPL", title:"Apple Inc.", ... }, ... }
        if (!raw || typeof raw !== 'object') {
          usStaticMap = {}
          return usStaticMap
        }

        const record = raw as Record<string, unknown>
        const out: Record<string, string> = {}

        for (const key of Object.keys(record)) {
          const val = record[key]
          if (typeof val === 'string') {
            // Format (1)
            out[key.toUpperCase()] = val
            continue
          }

          // Format (2)
          if (val && typeof val === 'object') {
            const anyVal = val as any
            const t = (anyVal.ticker || '').toString().trim().toUpperCase()
            const title = (anyVal.title || '').toString().trim()
            if (t && title) out[t] = title
          }
        }

        usStaticMap = out
        return out
      })
      .catch(() => {
        usStaticMap = {}
        return {}
      })
  }
  return usStaticMapPromise
}

function getUsStaticNameSync(ticker: string): string | null {
  if (!usStaticMap) return null
  return usStaticMap[ticker] || null
}

let chineseStaticMap: Record<string, string> | null = null
let chineseStaticMapPromise: Promise<Record<string, string>> | null = null

async function getChineseStaticMap(): Promise<Record<string, string>> {
  if (chineseStaticMap) return chineseStaticMap
  if (!chineseStaticMapPromise) {
    chineseStaticMapPromise = import('./chineseStockNames').then((m) => {
      chineseStaticMap = m.CHINESE_STOCK_NAMES
      return chineseStaticMap
    })
  }
  return chineseStaticMapPromise
}

function getChineseStaticNameSync(symbol: string): string | null {
  if (!chineseStaticMap) return null
  return chineseStaticMap[symbol] || null
}

async function fetchCnNameFromTencent(symbol: string): Promise<string | null> {
  const normalized = symbol.trim()
  if (!/^\d{6}$/.test(normalized)) return null

  // Shanghai: 6xxxx / 5xxxx; Shenzhen: others (basic heuristic).
  const prefix = /^[56]/.test(normalized) ? 'sh' : 'sz'

  const res = await fetch(`/api/tencent/q=${prefix}${normalized}`)
  if (!res.ok) return null

  // Tencent responses are commonly GBK encoded.
  const buf = await res.arrayBuffer()
  let text = ''
  try {
    text = new TextDecoder('gbk').decode(buf)
  } catch {
    // Fallback: assume UTF-8 if GBK decoder not available
    text = new TextDecoder().decode(buf)
  }

  // Format: v_sh600301="1~公司名~600301~..."
  const match = text.match(/="([^"]+)"/)
  if (!match?.[1]) return null

  const parts = match[1].split('~')
  const name = parts[1]?.trim()
  if (!name) return null
  return name
}

function readPersistedName(symbol: string): string | null {
  try {
    const raw = localStorage.getItem(STOCK_NAME_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Record<string, PersistedNameEntry>
    const entry = parsed[symbol]
    if (!entry?.name || !entry.updatedAt) return null
    if (Date.now() - entry.updatedAt > STOCK_NAME_TTL_MS) return null
    return entry.name
  } catch {
    return null
  }
}

function writePersistedName(symbol: string, name: string) {
  try {
    const raw = localStorage.getItem(STOCK_NAME_STORAGE_KEY)
    const parsed = (raw ? (JSON.parse(raw) as Record<string, PersistedNameEntry>) : {}) || {}
    parsed[symbol] = { name, updatedAt: Date.now() }
    localStorage.setItem(STOCK_NAME_STORAGE_KEY, JSON.stringify(parsed))
  } catch {
    // ignore storage failures (private mode / quota)
  }
}

/**
 * Get company name for a stock symbol
 * For Chinese stocks, tries to fetch company name
 * Falls back to symbol if name not available
 */
export async function getStockName(
  symbol: string,
  market: 'US' | 'CN',
): Promise<string> {
  const normalizedSymbol = symbol.trim()
  const upperSymbol = normalizedSymbol.toUpperCase()
  const inFlightKey = `${market}:${upperSymbol}`

  // US: prefer local static directory (no 3rd-party API calls).
  if (market === 'US') {
    const override = US_STATIC_OVERRIDES[upperSymbol]
    if (override) {
      stockNameCache.set(upperSymbol, override)
      writePersistedName(upperSymbol, override)
      return override
    }
  }

  // Check cache first
  if (stockNameCache.has(upperSymbol)) {
    return stockNameCache.get(upperSymbol)!
  }

  // Check persisted cache (localStorage)
  const persisted = readPersistedName(upperSymbol)
  if (persisted) {
    stockNameCache.set(upperSymbol, persisted)
    return persisted
  }

  // Check comprehensive stock names list first (no API call needed)
  if (market === 'CN') {
    const cnMap = await getChineseStaticMap()
    const staticName = cnMap[normalizedSymbol]
    if (staticName) {
      stockNameCache.set(upperSymbol, staticName)
      return staticName
    }
  }

  if (market === 'US') {
    // Only attempt clean tickers (avoid OCC option symbols, spaces, etc.)
    if (!/^[A-Z0-9.-]{1,12}$/.test(upperSymbol)) return normalizedSymbol

    // De-dupe concurrent lookups
    if (inFlightLookups.has(inFlightKey)) return inFlightLookups.get(inFlightKey)!

    const lookupPromise = (async () => {
      const map = await getUsStaticMap()
      const name = map[upperSymbol]
      if (name && typeof name === 'string' && name.trim()) {
        const finalName = name.trim()
        stockNameCache.set(upperSymbol, finalName)
        writePersistedName(upperSymbol, finalName)
        return finalName
      }
      return normalizedSymbol
    })()

    inFlightLookups.set(inFlightKey, lookupPromise)
    try {
      return await lookupPromise
    } finally {
      inFlightLookups.delete(inFlightKey)
    }
  }

  // De-dupe concurrent lookups (Active Positions can call this many times).
  if (inFlightLookups.has(inFlightKey)) {
    return inFlightLookups.get(inFlightKey)!
  }

  const lastFailedAt = lastFailedLookupAt.get(inFlightKey)
  if (lastFailedAt && Date.now() - lastFailedAt < FAILED_LOOKUP_BACKOFF_MS) {
    return normalizedSymbol
  }

  const lookupPromise = (async () => {
    try {
      const apiKey = import.meta.env.VITE_ALPHAVANTAGE_API_KEY

      let querySymbol: string | null = null

      if (market === 'CN') {
        // Avoid API calls until the user has entered a full CN ticker (6 digits).
        if (!/^\d{6}$/.test(normalizedSymbol)) return normalizedSymbol

        let chineseSuffix = ''
        if (/^[56]/.test(normalizedSymbol)) {
          chineseSuffix = '.SHH'
        } else if (/^\d+$/.test(normalizedSymbol) && !normalizedSymbol.startsWith('920')) {
          chineseSuffix = '.SHZ'
        }

        if (!chineseSuffix) return normalizedSymbol
        querySymbol = `${normalizedSymbol}${chineseSuffix}`
      } else {
        // US: only attempt "clean" tickers (avoid OCC option symbols, spaces, etc.)
        if (!/^[A-Z0-9.-]{1,12}$/.test(upperSymbol)) return normalizedSymbol
        querySymbol = upperSymbol
      }

      const response = await fetch(
        `/api/alphavantage/query?function=OVERVIEW&symbol=${encodeURIComponent(querySymbol)}&apikey=${apiKey}`,
      )

      if (!response.ok) {
        lastFailedLookupAt.set(inFlightKey, Date.now())
        return normalizedSymbol
      }

      const data = await response.json()
      const companyName = data?.Name
      if (companyName && typeof companyName === 'string' && companyName.trim()) {
        const finalName = companyName.trim()
        stockNameCache.set(upperSymbol, finalName)
        writePersistedName(upperSymbol, finalName)
        return finalName
      }

      // CN fallback: Tencent quote endpoint usually includes the Chinese name.
      if (market === 'CN') {
        const tencentName = await fetchCnNameFromTencent(normalizedSymbol)
        if (tencentName) {
          stockNameCache.set(upperSymbol, tencentName)
          writePersistedName(upperSymbol, tencentName)
          return tencentName
        }
      }

      // AlphaVantage rate-limit / error bodies shouldn't be retried immediately
      if (data?.Note || data?.Information || data?.ErrorMessage) {
        lastFailedLookupAt.set(inFlightKey, Date.now())
      }
    } catch (error) {
      lastFailedLookupAt.set(inFlightKey, Date.now())
      console.error(`Failed to fetch company name for ${normalizedSymbol}:`, error)
    }

    return normalizedSymbol
  })()

  inFlightLookups.set(inFlightKey, lookupPromise)
  try {
    return await lookupPromise
  } finally {
    inFlightLookups.delete(inFlightKey)
  }

  // Fallback: return symbol
  return normalizedSymbol
}

/**
 * Get company name synchronously (from cache only)
 * Returns symbol if not in cache
 */
export function getStockNameSync(symbol: string, market: 'US' | 'CN'): string {
  const normalized = symbol.trim()
  const upper = normalized.toUpperCase()

  if (market === 'US') {
    const override = US_STATIC_OVERRIDES[upper]
    if (override) return override
  }

  if (stockNameCache.has(upper)) {
    return stockNameCache.get(upper)!
  }

  if (market === 'CN') {
    const staticName = getChineseStaticNameSync(normalized)
    if (staticName) return staticName
  }

  if (market === 'US') {
    const staticName = getUsStaticNameSync(upper)
    if (staticName) return staticName
  }

  // localStorage (best-effort sync read)
  const persisted = readPersistedName(upper)
  if (persisted) return persisted

  return normalized
}

/**
 * Optional: preload CN static map (lazy chunk) to enable instant sync lookups.
 * Call this when entering CN-related UI flows to avoid showing empty names while typing.
 */
export async function preloadChineseStaticNames(): Promise<void> {
  await getChineseStaticMap()
}

/**
 * Optional: preload US static map (served from `/public/symbols`).
 * This does not affect initial JS bundle size, and is cached by the browser/CDN.
 */
export async function preloadUsStaticNames(): Promise<void> {
  await getUsStaticMap()
}

/**
 * Batch fetch stock names
 */
export async function getStockNames(
  symbols: Array<{ symbol: string; market: 'US' | 'CN' }>,
): Promise<Map<string, string>> {
  const nameMap = new Map<string, string>()

  // Names are now primarily static/cached, so do this in one shot for best UX.
  // (Network fallbacks are rare and already deduped per symbol.)
  const results = await Promise.all(
    symbols.map(async ({ symbol, market }) => {
      const name = await getStockName(symbol, market)
      return { symbol, name }
    }),
  )

  results.forEach(({ symbol, name }) => {
    nameMap.set(symbol, name)
  })

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
