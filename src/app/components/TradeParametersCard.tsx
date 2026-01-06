import { Card } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { ArrowUpRight } from 'lucide-react';

interface TradeParametersCardProps {
  tickerSymbol: string;
  setTickerSymbol: (value: string) => void;
  direction: 'long' | 'short';
  setDirection: (value: 'long' | 'short') => void;
  sentiment: string;
  setSentiment: (value: string) => void;
  entryPrice: number;
  setEntryPrice: (value: number) => void;
  stopLoss: number;
  setStopLoss: (value: number) => void;
  target: string;
  setTarget: (value: string) => void;
  isDarkMode: boolean;
}

export function TradeParametersCard({
  tickerSymbol,
  setTickerSymbol,
  direction,
  setDirection,
  sentiment,
  setSentiment,
  entryPrice,
  setEntryPrice,
  stopLoss,
  setStopLoss,
  target,
  setTarget,
  isDarkMode,
}: TradeParametersCardProps) {
  return (
    <Card className={`p-6 shadow-sm hover:shadow-md transition-all duration-300 ${
      isDarkMode 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="space-y-6">
        {/* Ticker Symbol, Direction & Sentiment */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Ticker Symbol */}
          <div className="space-y-3">
            <Label className={`text-xs uppercase tracking-wider transition-colors ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>Ticker Symbol</Label>
            <Input
              type="text"
              value={tickerSymbol}
              onChange={(e) => setTickerSymbol(e.target.value)}
              className={`text-3xl font-semibold h-auto py-3 transition-all ${
                isDarkMode 
                  ? 'bg-gray-900 border-gray-600 text-white focus:border-blue-400' 
                  : 'bg-white border-gray-200 text-gray-900 focus:border-blue-500'
              }`}
            />
          </div>

          {/* Direction */}
          <div className="space-y-3">
            <Label className={`text-xs uppercase tracking-wider transition-colors ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>Direction</Label>
            <div className={`inline-flex rounded-full p-1 transition-colors ${
              isDarkMode ? 'bg-gray-900' : 'bg-gray-100'
            }`}>
              <button
                onClick={() => setDirection('long')}
                className={`px-6 py-2.5 rounded-full font-medium transition-all ${
                  direction === 'long'
                    ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-md shadow-emerald-200'
                    : isDarkMode
                    ? 'text-gray-400 hover:text-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Long
              </button>
              <button
                onClick={() => setDirection('short')}
                className={`px-6 py-2.5 rounded-full font-medium transition-all ${
                  direction === 'short'
                    ? 'bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-md shadow-rose-200'
                    : isDarkMode
                    ? 'text-gray-400 hover:text-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Short
              </button>
            </div>
          </div>

          {/* Sentiment */}
          <div className="space-y-3">
            <Label className={`text-xs uppercase tracking-wider transition-colors ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>Sentiment</Label>
            <div className={`inline-flex rounded-full p-1 transition-colors ${
              isDarkMode ? 'bg-gray-900' : 'bg-gray-100'
            }`}>
              <button
                onClick={() => setSentiment('TREND')}
                className={`px-6 py-2.5 rounded-full font-medium transition-all ${
                  sentiment === 'TREND'
                    ? isDarkMode
                      ? 'bg-white text-gray-900 shadow-md shadow-gray-600'
                      : 'bg-gray-900 text-white shadow-md shadow-gray-300'
                    : isDarkMode
                    ? 'text-gray-400 hover:text-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Trend
              </button>
              <button
                onClick={() => setSentiment('PROBE')}
                className={`px-6 py-2.5 rounded-full font-medium transition-all ${
                  sentiment === 'PROBE'
                    ? isDarkMode
                      ? 'bg-white text-gray-900 shadow-md shadow-gray-600'
                      : 'bg-gray-900 text-white shadow-md shadow-gray-300'
                    : isDarkMode
                    ? 'text-gray-400 hover:text-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Probe
              </button>
            </div>
          </div>
        </div>

        {/* Trade Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Entry Price */}
          <div className="space-y-3">
            <Label className={`text-xs uppercase tracking-wider transition-colors ${
              isDarkMode ? 'text-blue-400' : 'text-blue-600'
            }`}>Entry Price</Label>
            <div className="relative">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold transition-colors ${
                isDarkMode ? 'text-gray-600' : 'text-gray-400'
              }`}>$</span>
              <Input
                type="number"
                value={entryPrice}
                onChange={(e) => setEntryPrice(Number(e.target.value))}
                className={`text-xl font-semibold h-auto py-4 pl-10 transition-all ${
                  isDarkMode
                    ? 'bg-blue-950/30 border-blue-800 text-white focus:border-blue-500'
                    : 'bg-blue-50/30 border-blue-200 text-gray-900 focus:border-blue-500'
                }`}
                step="0.01"
              />
            </div>
            <p className={`text-xs transition-colors ${
              isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`}>Adjust your entry trigger</p>
          </div>

          {/* Stop Loss */}
          <div className="space-y-3">
            <Label className={`text-xs uppercase tracking-wider transition-colors ${
              isDarkMode ? 'text-rose-400' : 'text-rose-600'
            }`}>Stop Loss</Label>
            <div className="relative">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold transition-colors ${
                isDarkMode ? 'text-gray-600' : 'text-gray-400'
              }`}>$</span>
              <Input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(Number(e.target.value))}
                className={`text-xl font-semibold h-auto py-4 pl-10 transition-all ${
                  isDarkMode
                    ? 'bg-rose-950/30 border-rose-800 text-white focus:border-rose-500'
                    : 'bg-rose-50/30 border-rose-200 text-gray-900 focus:border-rose-500'
                }`}
                step="0.01"
              />
            </div>
            <p className={`text-xs transition-colors ${
              isDarkMode ? 'text-rose-400' : 'text-rose-400'
            }`}>Risk: ${Math.abs(entryPrice - stopLoss).toFixed(2)}</p>
          </div>

          {/* Target */}
          <div className="space-y-3">
            <Label className={`text-xs uppercase tracking-wider transition-colors ${
              isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
            }`}>Target</Label>
            <div className="relative">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold transition-colors ${
                isDarkMode ? 'text-gray-600' : 'text-gray-400'
              }`}>$</span>
              <Input
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="Optional"
                className={`text-xl font-semibold h-auto py-4 pl-10 transition-all ${
                  isDarkMode
                    ? 'bg-emerald-950/30 border-emerald-800 text-white focus:border-emerald-500 placeholder:text-gray-600'
                    : 'bg-emerald-50/30 border-emerald-200 text-gray-900 focus:border-emerald-500 placeholder:text-gray-400'
                }`}
                step="0.01"
              />
            </div>
            <p className={`text-xs transition-colors ${
              isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`}>Take profit level</p>
          </div>
        </div>

        {/* Log Trade Button */}
        <div className={`pt-4 border-t transition-colors ${
          isDarkMode ? 'border-gray-700' : 'border-gray-100'
        }`}>
          <button className={`w-full py-4 px-6 rounded-2xl font-medium transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2 group ${
            isDarkMode
              ? 'bg-white text-gray-900 shadow-gray-900 hover:bg-gray-50'
              : 'bg-gray-900 text-white shadow-gray-300 hover:bg-gray-800'
          }`}>
            <span>Log Trade to Journal</span>
            <ArrowUpRight className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </Card>
  );
}