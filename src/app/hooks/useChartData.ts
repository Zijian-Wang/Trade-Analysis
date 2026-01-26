/**
 * Hook for fetching chart data with caching and error handling
 */

import { useState, useEffect } from 'react'
import { fetchChartData, ChartDataPoint } from '../services/chartDataService'

interface UseChartDataResult {
  data: ChartDataPoint[]
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook to fetch chart data with automatic caching
 *
 * @param symbol Stock symbol
 * @param market Market ('US' or 'CN')
 * @param days Number of days of historical data (default: 90)
 * @param enabled Whether to fetch data (default: true)
 */
export function useChartData(
  symbol: string,
  market: 'US' | 'CN',
  days: number = 90,
  enabled: boolean = true,
): UseChartDataResult {
  const [data, setData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refetchTrigger, setRefetchTrigger] = useState(0)

  useEffect(() => {
    if (!enabled || !symbol) {
      setData([])
      setLoading(false)
      return
    }

    let cancelled = false

    const loadData = async () => {
      setLoading(true)
      setError(null)

      try {
        // #region agent log
        const payload1 = {
          location: 'useChartData.ts:48',
          message: 'Before fetchChartData',
          data: { symbol, market, days },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'D'
        };
        fetch('http://127.0.0.1:7242/ingest/8304270c-456a-4aa6-adb2-ddd30a6ad70c', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload1)
        }).catch(() => {});
        // #endregion
        const chartData = await fetchChartData(symbol, market, days)
        // #region agent log
        const minPrice = chartData.length > 0 ? Math.min(...chartData.map(d => d.low)) : null;
        const maxPrice = chartData.length > 0 ? Math.max(...chartData.map(d => d.high)) : null;
        const payload2 = {
          location: 'useChartData.ts:51',
          message: 'After fetchChartData',
          data: {
            symbol,
            market,
            dataLength: chartData.length,
            minPrice,
            maxPrice,
            firstClose: chartData[0]?.close,
            lastClose: chartData[chartData.length - 1]?.close
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'E'
        };
        fetch('http://127.0.0.1:7242/ingest/8304270c-456a-4aa6-adb2-ddd30a6ad70c', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload2)
        }).catch(() => {});
        // #endregion

        if (!cancelled) {
          setData(chartData)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          const errorMessage =
            err instanceof Error ? err.message : 'Failed to load chart data'
          setError(errorMessage)
          setLoading(false)
          setData([]) // Clear data on error
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [symbol, market, days, enabled, refetchTrigger])

  const refetch = () => {
    setRefetchTrigger((prev) => prev + 1)
  }

  return { data, loading, error, refetch }
}
