import {
  createChart,
  ColorType,
  CrosshairMode,
  IChartApi,
  CandlestickSeries,
} from 'lightweight-charts'
import { useEffect, useRef, useState } from 'react'
import { useChartData } from '../hooks/useChartData'

interface PriceLevel {
  price: number
  label: string
  color: string
  lineStyle?: 0 | 1 | 2 | 3 | 4 // 0=Solid, 2=Dashed
}

interface MarketChartProps {
  symbol: string
  market: 'US' | 'CN'
  levels?: PriceLevel[]
  height?: number
  className?: string
  data?: any[] // Optional explicit data injection
  useRealData?: boolean // Whether to fetch real data (default: false for backward compatibility)
}

export function MarketChart({
  symbol,
  market,
  levels = [],
  height = 300,
  className,
  data: injectedData,
  useRealData = false,
}: MarketChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch real chart data if enabled
  // #region agent log
  useEffect(() => {
    const payload = {
      location: 'MarketChart.tsx:42',
      message: 'useChartData call',
      data: { symbol, market, useRealData, hasInjectedData: !!injectedData },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'B'
    };
    fetch('http://127.0.0.1:7242/ingest/8304270c-456a-4aa6-adb2-ddd30a6ad70c', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});
  }, [symbol, market, useRealData, injectedData]);
  // #endregion
  const {
    data: realData,
    loading: dataLoading,
    error: dataError,
  } = useChartData(
    symbol,
    market,
    90, // 3 months
    useRealData && !injectedData, // Only fetch if real data is enabled and no injected data
  )

  // Generate 3 Months of Daily Data (approximately 90 days, accounting for weekends)
  // Falls back to dummy data if real data is not enabled or fails
  const getChartData = () => {
    if (injectedData) return injectedData
    if (useRealData && realData && realData.length > 0) return realData

    try {
      const data = []
      // Start from 3 months ago
      let date = new Date()
      date.setMonth(date.getMonth() - 3)

      // Seed price based on symbol length to make it look different per symbol
      let price = 100 + symbol.length * 10

      // Generate approximately 90 days of data (3 months)
      // Skip weekends for more realistic trading days
      let daysGenerated = 0
      const maxDays = 90

      while (daysGenerated < maxDays) {
        // Skip weekends (Saturday = 6, Sunday = 0)
        const dayOfWeek = date.getDay()
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          const change = (Math.random() - 0.5) * (price * 0.03)
          const open = price
          const close = price + change
          const high = Math.max(open, close) + Math.random() * (price * 0.015)
          const low = Math.min(open, close) - Math.random() * (price * 0.015)

          const dateStr = date.toISOString().split('T')[0]

          data.push({
            time: dateStr,
            open,
            high,
            low,
            close,
          })

          price = close
          daysGenerated++
        }
        date.setDate(date.getDate() + 1)
      }
      return data
    } catch (e) {
      console.error('Data generation error', e)
      return []
    }
  }

  useEffect(() => {
    if (!chartContainerRef.current) return

    // Safety check for container having dimensions
    if (chartContainerRef.current.clientWidth === 0) {
      // Retry in a moment if hidden/collapsed initially
      const timeout = setTimeout(() => {
        // Re-check if container is now visible
        if (
          chartContainerRef.current &&
          chartContainerRef.current.clientWidth > 0
        ) {
          // Force re-render by updating a state or re-running effect
          setError(null)
        }
      }, 100)
      return () => clearTimeout(timeout)
    }

    // Clean up previous chart instance
    if (chartRef.current) {
      chartRef.current.remove()
      chartRef.current = null
    }

    try {
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: '#9CA3AF',
        },
        width: chartContainerRef.current.clientWidth,
        height: height,
        grid: {
          vertLines: { color: 'rgba(42, 46, 57, 0)' }, // Cleaner look
          horzLines: { color: 'rgba(42, 46, 57, 0.1)' },
        },
        rightPriceScale: {
          borderColor: 'rgba(197, 203, 206, 0.4)',
        },
        timeScale: {
          borderColor: 'rgba(197, 203, 206, 0.4)',
        },
      })

      chartRef.current = chart

      // In v5.1, use addSeries with CandlestickSeries instead of addCandlestickSeries
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      })

      const data = getChartData()
      // #region agent log
      const minPrice = data.length > 0 ? Math.min(...data.map(d => d.low)) : null;
      const maxPrice = data.length > 0 ? Math.max(...data.map(d => d.high)) : null;
      const firstPrice = data.length > 0 ? data[0].close : null;
      const lastPrice = data.length > 0 ? data[data.length - 1].close : null;
      const payload = {
        location: 'MarketChart.tsx:161',
        message: 'Chart data before render',
        data: {
          symbol,
          market,
          dataLength: data.length,
          minPrice,
          maxPrice,
          firstPrice,
          lastPrice,
          useRealData,
          dataLoading,
          hasRealData: !!realData,
          realDataLength: realData?.length || 0
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'C'
      };
      fetch('http://127.0.0.1:7242/ingest/8304270c-456a-4aa6-adb2-ddd30a6ad70c', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {});
      // #endregion

      // Show loading state if fetching real data
      if (useRealData && dataLoading) {
        setError('Loading chart data...')
        return
      }

      // Show error if real data fetch failed
      if (useRealData && dataError) {
        setError(dataError)
        // Fall through to try dummy data as fallback
      }

      if (data.length > 0) {
        try {
          candleSeries.setData(data as any)
        } catch (dataError) {
          console.error('Error setting chart data:', dataError)
          setError('Failed to load chart data')
          return
        }
      } else {
        // Only show error if we're using real data, otherwise dummy data will be generated
        if (useRealData) {
          console.warn('No chart data available for', symbol)
          setError('No data available')
          return
        }
      }

      // Add Price Lines
      levels.forEach((level) => {
        if (level.price && !isNaN(level.price) && level.price > 0) {
          try {
            candleSeries.createPriceLine({
              price: level.price,
              color: level.color,
              lineWidth: 1,
              lineStyle: level.lineStyle || 0,
              axisLabelVisible: true,
              title: level.label,
            })
          } catch (lineError) {
            console.error('Error creating price line:', lineError, level)
          }
        }
      })

      chart.timeScale().fitContent()
      // Only clear error if we successfully loaded data
      if (data.length > 0) {
        setError(null)
      }

      // Robust Resize Handler
      const resizeObserver = new ResizeObserver((entries) => {
        if (!chartRef.current || entries.length === 0) return

        const newRect = entries[0].contentRect
        if (newRect.width > 0) {
          chartRef.current.applyOptions({ width: newRect.width })
        }
      })

      resizeObserver.observe(chartContainerRef.current)

      // Cleanup
      return () => {
        resizeObserver.disconnect()
        if (chartRef.current) {
          chartRef.current.remove()
          chartRef.current = null
        }
      }
    } catch (err) {
      console.error('Chart init error:', err)
      setError(
        `Failed to load chart: ${err instanceof Error ? err.message : 'Unknown error'}`,
      )
    }
  }, [
    symbol,
    market,
    height,
    JSON.stringify(levels),
    useRealData,
    realData,
    dataLoading,
    dataError,
  ])

  // Show error message if chart fails
  if (error) {
    return (
      <div
        className={`relative w-full ${className} flex items-center justify-center`}
        style={{ height: height }}
      >
        <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
          <p>{error}</p>
          <p className="text-xs mt-1">Chart unavailable for {symbol}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative w-full ${className}`} style={{ height: height }}>
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  )
}
