import { Card } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Slider } from './ui/slider';

interface TradeSetupProps {
  tickerSymbol: string;
  setTickerSymbol: (value: string) => void;
  portfolioCapital: number;
  setPortfolioCapital: (value: number) => void;
  direction: 'long' | 'short';
  setDirection: (value: 'long' | 'short') => void;
  sentiment: string;
  setSentiment: (value: string) => void;
  riskPerTrade: number;
  setRiskPerTrade: (value: number) => void;
  entryPrice: number;
  setEntryPrice: (value: number) => void;
  stopLoss: number;
  setStopLoss: (value: number) => void;
  target: string;
  setTarget: (value: string) => void;
}

export function TradeSetup({
  tickerSymbol,
  setTickerSymbol,
  portfolioCapital,
  setPortfolioCapital,
  direction,
  setDirection,
  sentiment,
  setSentiment,
  riskPerTrade,
  setRiskPerTrade,
  entryPrice,
  setEntryPrice,
  stopLoss,
  setStopLoss,
  target,
  setTarget,
}: TradeSetupProps) {
  return (
    <div className="space-y-6">
      {/* Portfolio Setup & Trade Info */}
      <Card className="p-6 bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        {/* Portfolio Capital & Risk Per Trade */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
          {/* Portfolio Capital */}
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wider text-gray-500">Portfolio Capital ($)</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-semibold text-gray-400">$</span>
              <Input
                type="number"
                value={portfolioCapital}
                onChange={(e) => setPortfolioCapital(Number(e.target.value))}
                className="text-3xl font-semibold h-auto py-3 pl-10 border-gray-200 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Risk Per Trade */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wider text-gray-500">Risk Per Trade</Label>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-semibold text-blue-600">{riskPerTrade.toFixed(2)}</span>
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
            <Slider
              value={[riskPerTrade]}
              onValueChange={(value) => setRiskPerTrade(value[0])}
              min={0.1}
              max={5}
              step={0.05}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>0.1%</span>
              <span>5%</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-gray-200 my-6"></div>

        {/* Ticker Symbol, Direction & Sentiment */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Ticker Symbol */}
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wider text-gray-500">Ticker Symbol</Label>
            <Input
              type="text"
              value={tickerSymbol}
              onChange={(e) => setTickerSymbol(e.target.value)}
              className="text-3xl font-semibold h-auto py-3 border-gray-200 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Direction */}
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wider text-gray-500">Direction</Label>
            <div className="flex gap-3">
              <button
                onClick={() => setDirection('long')}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                  direction === 'long'
                    ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-md shadow-emerald-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Long
              </button>
              <button
                onClick={() => setDirection('short')}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                  direction === 'short'
                    ? 'bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-md shadow-rose-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Short
              </button>
            </div>
          </div>

          {/* Sentiment */}
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wider text-gray-500">Sentiment</Label>
            <div className="flex gap-3">
              <button
                onClick={() => setSentiment('TREND')}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                  sentiment === 'TREND'
                    ? 'bg-gray-900 text-white shadow-md shadow-gray-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Trend
              </button>
              <button
                onClick={() => setSentiment('PROBE')}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                  sentiment === 'PROBE'
                    ? 'bg-gray-900 text-white shadow-md shadow-gray-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Probe
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Trade Parameters */}
      <Card className="p-6 bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-6">Trade Parameters</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Entry Price */}
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wider text-blue-600">Entry Price</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-gray-400">$</span>
              <Input
                type="number"
                value={entryPrice}
                onChange={(e) => setEntryPrice(Number(e.target.value))}
                className="text-xl font-semibold h-auto py-4 pl-10 border-blue-200 focus:border-blue-500 bg-blue-50/30"
                step="0.01"
              />
            </div>
            <p className="text-xs text-gray-400">Adjust your entry trigger</p>
          </div>

          {/* Stop Loss */}
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wider text-rose-600">Stop Loss</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-gray-400">$</span>
              <Input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(Number(e.target.value))}
                className="text-xl font-semibold h-auto py-4 pl-10 border-rose-200 focus:border-rose-500 bg-rose-50/30"
                step="0.01"
              />
            </div>
            <p className="text-xs text-rose-400">Risk: ${Math.abs(entryPrice - stopLoss).toFixed(2)}</p>
          </div>

          {/* Target */}
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wider text-emerald-600">Target</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-gray-400">$</span>
              <Input
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="Optional"
                className="text-xl font-semibold h-auto py-4 pl-10 border-emerald-200 focus:border-emerald-500 bg-emerald-50/30"
                step="0.01"
              />
            </div>
            <p className="text-xs text-gray-400">Take profit level</p>
          </div>
        </div>
      </Card>
    </div>
  );
}