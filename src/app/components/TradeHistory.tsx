import { Card } from './ui/card';
import { Download, Copy, Clock } from 'lucide-react';

interface Trade {
  id: string;
  date: string;
  symbol: string;
  direction: 'long' | 'short';
  setup: string;
  entry: number;
  stop: number;
  target: number | null;
  riskPercent: number;
  positionSize: number;
  riskAmount: number;
  rrRatio: number;
}

const mockTrades: Trade[] = [
  {
    id: '1',
    date: '2026-01-05',
    symbol: 'AAPL',
    direction: 'long',
    setup: 'Breakout',
    entry: 185.50,
    stop: 182.30,
    target: 192.40,
    riskPercent: 0.75,
    positionSize: 234,
    riskAmount: 2250,
    rrRatio: 2.16
  },
  {
    id: '2',
    date: '2026-01-04',
    symbol: 'TSLA',
    direction: 'short',
    setup: 'Trend Following',
    entry: 238.90,
    stop: 245.20,
    target: 225.60,
    riskPercent: 1.0,
    positionSize: 476,
    riskAmount: 3000,
    rrRatio: 2.11
  },
  {
    id: '3',
    date: '2026-01-03',
    symbol: 'MSFT',
    direction: 'long',
    setup: 'Mean Reversion',
    entry: 378.25,
    stop: 374.10,
    target: 388.50,
    riskPercent: 0.5,
    positionSize: 361,
    riskAmount: 1500,
    rrRatio: 2.47
  }
];

interface TradeHistoryProps {
  loggedTrades: Trade[];
  isDarkMode: boolean;
}

export function TradeHistory({ loggedTrades, isDarkMode }: TradeHistoryProps) {
  return (
    <Card className={`p-6 shadow-sm transition-all duration-300 ${
      isDarkMode 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Clock className={`w-5 h-5 transition-colors ${
            isDarkMode ? 'text-gray-500' : 'text-gray-400'
          }`} />
          <h2 className={`text-lg font-semibold transition-colors ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>Recent Trades</h2>
        </div>
        
        {loggedTrades.length > 0 && (
          <div className="flex gap-2">
            <button 
              title="Copy JSON"
              className={`p-2 text-sm rounded-lg transition-colors ${
                isDarkMode
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Copy className="w-4 h-4" />
            </button>
            <button 
              title="Export JSON"
              className={`p-2 text-sm rounded-lg transition-colors ${
                isDarkMode
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Empty State */}
      {loggedTrades.length === 0 ? (
        <div className="py-16 text-center">
          <Clock className={`w-12 h-12 mx-auto mb-4 transition-colors ${
            isDarkMode ? 'text-gray-600' : 'text-gray-300'
          }`} />
          <p className={`text-base transition-colors ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>No trades logged yet</p>
          <p className={`text-sm mt-1 transition-colors ${
            isDarkMode ? 'text-gray-500' : 'text-gray-400'
          }`}>Start by calculating a position size and clicking "Log Trade to Journal"</p>
        </div>
      ) : (
        /* Table */
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b transition-colors ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <th className={`text-left py-4 px-4 text-xs uppercase tracking-wider font-medium transition-colors ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>Date</th>
                <th className={`text-left py-4 px-4 text-xs uppercase tracking-wider font-medium transition-colors ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>Symbol</th>
                <th className={`text-left py-4 px-4 text-xs uppercase tracking-wider font-medium transition-colors ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>Dir</th>
                <th className={`text-left py-4 px-4 text-xs uppercase tracking-wider font-medium transition-colors ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>Setup</th>
                <th className={`text-right py-4 px-4 text-xs uppercase tracking-wider font-medium transition-colors ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>Entry</th>
                <th className={`text-right py-4 px-4 text-xs uppercase tracking-wider font-medium transition-colors ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>Stop</th>
                <th className={`text-right py-4 px-4 text-xs uppercase tracking-wider font-medium transition-colors ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>Target</th>
                <th className={`text-right py-4 px-4 text-xs uppercase tracking-wider font-medium transition-colors ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>Risk %</th>
                <th className={`text-right py-4 px-4 text-xs uppercase tracking-wider font-medium transition-colors ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>Pos Size</th>
                <th className={`text-right py-4 px-4 text-xs uppercase tracking-wider font-medium transition-colors ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>Risk $</th>
                <th className={`text-right py-4 px-4 text-xs uppercase tracking-wider font-medium transition-colors ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>R:R</th>
              </tr>
            </thead>
            <tbody className={`transition-colors ${
              isDarkMode ? 'divide-gray-700' : 'divide-gray-100'
            } divide-y`}>
              {loggedTrades.map((trade) => (
                <tr key={trade.id} className={`transition-colors ${
                  isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
                }`}>
                  <td className={`py-4 px-4 text-sm transition-colors ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>{trade.date}</td>
                  <td className="py-4 px-4">
                    <span className={`font-semibold transition-colors ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{trade.symbol}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                      trade.direction === 'long'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}>
                      {trade.direction}
                    </span>
                  </td>
                  <td className={`py-4 px-4 text-sm transition-colors ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>{trade.setup}</td>
                  <td className={`py-4 px-4 text-sm font-medium text-right transition-colors ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-900'
                  }`}>
                    ${trade.entry.toFixed(2)}
                  </td>
                  <td className="py-4 px-4 text-sm font-medium text-right text-rose-600">
                    ${trade.stop.toFixed(2)}
                  </td>
                  <td className="py-4 px-4 text-sm font-medium text-right text-emerald-600">
                    {trade.target ? `$${trade.target.toFixed(2)}` : '-'}
                  </td>
                  <td className={`py-4 px-4 text-sm text-right transition-colors ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-900'
                  }`}>
                    {trade.riskPercent.toFixed(2)}%
                  </td>
                  <td className={`py-4 px-4 text-sm font-medium text-right transition-colors ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-900'
                  }`}>
                    {trade.positionSize.toLocaleString()}
                  </td>
                  <td className={`py-4 px-4 text-sm text-right transition-colors ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-900'
                  }`}>
                    ${trade.riskAmount.toLocaleString()}
                  </td>
                  <td className={`py-4 px-4 text-sm font-semibold text-right transition-colors ${
                    isDarkMode ? 'text-blue-400' : 'text-blue-600'
                  }`}>
                    {trade.rrRatio.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}