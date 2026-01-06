import { Card } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Slider } from './ui/slider';

interface PortfolioCardProps {
  portfolioCapital: number;
  setPortfolioCapital: (value: number) => void;
  riskPerTrade: number;
  setRiskPerTrade: (value: number) => void;
  isDarkMode: boolean;
}

export function PortfolioCard({
  portfolioCapital,
  setPortfolioCapital,
  riskPerTrade,
  setRiskPerTrade,
  isDarkMode,
}: PortfolioCardProps) {
  return (
    <Card className={`p-6 shadow-sm hover:shadow-md transition-all duration-300 ${
      isDarkMode 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Portfolio Capital */}
        <div className="space-y-3">
          <Label className={`text-xs uppercase tracking-wider transition-colors ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>Portfolio Capital</Label>
          <div className="relative">
            <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-xl font-medium transition-colors ${
              isDarkMode ? 'text-gray-600' : 'text-gray-300'
            }`}>$</span>
            <Input
              type="number"
              value={portfolioCapital}
              onChange={(e) => setPortfolioCapital(Number(e.target.value))}
              className={`text-3xl font-semibold h-auto py-3 pl-9 transition-all ${
                isDarkMode 
                  ? 'bg-gray-900 border-gray-600 text-white focus:border-blue-400' 
                  : 'bg-white border-gray-200 text-gray-900 focus:border-blue-500'
              }`}
            />
          </div>
        </div>

        {/* Risk Per Trade */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className={`text-xs uppercase tracking-wider transition-colors ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>Risk Per Trade</Label>
            <div className="flex items-baseline gap-1">
              <Input
                type="number"
                value={riskPerTrade}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val >= 0.5 && val <= 1) {
                    setRiskPerTrade(val);
                  }
                }}
                min={0.5}
                max={1}
                step={0.05}
                className={`text-2xl font-semibold w-20 h-auto py-1 px-2 text-right border-transparent transition-all ${
                  isDarkMode
                    ? 'text-blue-400 hover:border-gray-600 focus:border-blue-400 bg-gray-800'
                    : 'text-blue-600 hover:border-gray-200 focus:border-blue-500 bg-white'
                }`}
              />
              <span className={`text-sm transition-colors ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>%</span>
            </div>
          </div>
          <Slider
            value={[riskPerTrade]}
            onValueChange={(value) => setRiskPerTrade(value[0])}
            min={0.5}
            max={1}
            step={0.05}
            className="w-full"
          />
          <div className={`flex justify-between text-xs -mt-1 transition-colors ${
            isDarkMode ? 'text-gray-500' : 'text-gray-400'
          }`}>
            <span>0.5%</span>
            <span>1%</span>
          </div>
        </div>
      </div>
    </Card>
  );
}