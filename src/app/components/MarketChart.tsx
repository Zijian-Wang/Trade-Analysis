import { createChart, ColorType, CrosshairMode, IChartApi } from 'lightweight-charts';
import { useEffect, useRef, useState } from 'react';

interface PriceLevel {
  price: number;
  label: string;
  color: string;
  lineStyle?: 0 | 1 | 2 | 3 | 4; // 0=Solid, 2=Dashed
}

interface MarketChartProps {
  symbol: string;
  market: 'US' | 'CN';
  levels?: PriceLevel[];
  height?: number;
  className?: string;
  data?: any[]; // Optional explicit data injection
}

export function MarketChart({ 
  symbol, 
  market, 
  levels = [], 
  height = 300,
  className,
  data: injectedData 
}: MarketChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generate Dummy Data (Shared Logic for now)
  // In a real app, this would be a custom hook: useMarketData(symbol)
  const getChartData = () => {
    if (injectedData) return injectedData;

    try {
      const data = [];
      let date = new Date();
      date.setFullYear(date.getFullYear() - 1);
      
      // Seed price based on symbol length to make it look different per symbol
      let price = 100 + (symbol.length * 10); 
      
      for (let i = 0; i < 365; i++) {
        const change = (Math.random() - 0.5) * (price * 0.03);
        const open = price;
        const close = price + change;
        const high = Math.max(open, close) + Math.random() * (price * 0.015);
        const low = Math.min(open, close) - Math.random() * (price * 0.015);
        
        const dateStr = date.toISOString().split('T')[0];
        
        data.push({
            time: dateStr,
            open,
            high,
            low,
            close,
        });
        
        price = close;
        date.setDate(date.getDate() + 1);
      }
      return data;
    } catch (e) {
      console.error("Data generation error", e);
      return [];
    }
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Safety check for container having dimensions
    if (chartContainerRef.current.clientWidth === 0) {
      // Retry in a moment if hidden/collapsed initially
      const timeout = setTimeout(() => {
         // trigger re-render or check?
      }, 100);
      return () => clearTimeout(timeout);
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
      });

      chartRef.current = chart;

      const candleSeries = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });

      const data = getChartData();
      if (data.length > 0) {
          candleSeries.setData(data as any);
      }

      // Add Price Lines
      levels.forEach(level => {
        if (level.price) {
          candleSeries.createPriceLine({
            price: level.price,
            color: level.color,
            lineWidth: 1,
            lineStyle: level.lineStyle || 0,
            axisLabelVisible: true,
            title: level.label,
          });
        }
      });

      chart.timeScale().fitContent();

      // Robust Resize Handler
      const resizeObserver = new ResizeObserver(entries => {
        if (!chartRef.current || entries.length === 0) return;
        
        const newRect = entries[0].contentRect;
        if (newRect.width > 0) {
           chartRef.current.applyOptions({ width: newRect.width });
        }
      });

      resizeObserver.observe(chartContainerRef.current);

      // Cleanup
      return () => {
        resizeObserver.disconnect();
        chart.remove();
        chartRef.current = null;
      };

    } catch (err) {
      console.error("Chart init error:", err);
      setError("Failed to load chart");
    }
  }, [symbol, market, height, JSON.stringify(levels)]);

  if (error) {
    return <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-800 h-full text-red-500 text-sm">{error}</div>;
  }

  return (
    <div className={`relative w-full ${className}`} style={{ height: height }}>
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
}
