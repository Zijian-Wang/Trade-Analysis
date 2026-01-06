import { Card } from './ui/card';
import { TrendingUp, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface PositionSizeProps {
  shares: number;
  value: number;
  unitAmount: number;
  riskPerShare: number;
  rrRatio: number | null;
  canCalculate: boolean;
  isDarkMode: boolean;
}

export function PositionSize({ shares, value, riskPerShare, rrRatio, canCalculate, isDarkMode }: PositionSizeProps) {
  const [copiedShares, setCopiedShares] = useState(false);
  const [copiedValue, setCopiedValue] = useState(false);

  const handleCopyShares = async () => {
    await navigator.clipboard.writeText(shares.toString());
    setCopiedShares(true);
    setTimeout(() => setCopiedShares(false), 2000);
  };

  const handleCopyValue = async () => {
    await navigator.clipboard.writeText(value.toFixed(2));
    setCopiedValue(true);
    setTimeout(() => setCopiedValue(false), 2000);
  };

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6 flex flex-col w-full">
      {/* Position Size Card - Horizontal on mobile */}
      <Card className={`p-4 sm:p-6 md:p-8 border-0 shadow-lg overflow-hidden relative transition-all duration-300 flex-1 flex flex-col ${isDarkMode
        ? 'bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 shadow-blue-900/50'
        : 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 shadow-blue-200'
        }`}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        </div>

        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-3 sm:mb-4 md:mb-6 bg-[rgba(255,255,255,0)]">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-white opacity-80" />
            <p className="text-xs sm:text-sm uppercase tracking-wider text-white opacity-90">Calculated Position Size</p>
          </div>

          {/* Desktop: vertical layout, Mobile: horizontal layout */}
          <div className="flex flex-row lg:flex-col flex-1">
            {/* Shares */}
            <div className="flex-1 flex flex-col justify-center lg:mb-6">
              <p className="text-[10px] sm:text-xs uppercase tracking-wider text-white opacity-70 mb-1.5 sm:mb-2">Shares</p>
              <button
                onClick={handleCopyShares}
                disabled={!canCalculate}
                className="group w-full text-left hover:bg-white/10 rounded-lg p-2 sm:p-3 -ml-2 sm:-ml-3 transition-colors relative disabled:cursor-default"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white transition-opacity ${canCalculate ? 'opacity-100' : 'opacity-30'
                      }`}>
                      {shares.toLocaleString()}
                    </span>
                  </div>
                  {canCalculate && (
                    <div className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      {copiedShares ? (
                        <Check className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      ) : (
                        <Copy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      )}
                    </div>
                  )}
                </div>
              </button>
            </div>

            {/* Divider */}
            <div className="w-px lg:w-full h-auto lg:h-px bg-white/10 mx-4 lg:mx-0 lg:my-6"></div>

            {/* Dollar Amount */}
            <div className="flex-1 flex flex-col justify-center">
              <p className="text-[10px] sm:text-xs uppercase tracking-wider text-white opacity-70 mb-1.5 sm:mb-2">Capital for this Trade</p>
              <button
                onClick={handleCopyValue}
                disabled={!canCalculate}
                className="group w-full text-left hover:bg-white/10 rounded-lg p-2 sm:p-3 -ml-2 sm:-ml-3 transition-colors relative disabled:cursor-default"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl sm:text-2xl md:text-3xl font-semibold text-white transition-opacity ${canCalculate ? 'opacity-100' : 'opacity-30'
                      }`}>
                      ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  {canCalculate && (
                    <div className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      {copiedValue ? (
                        <Check className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      ) : (
                        <Copy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      )}
                    </div>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Risk Metrics - Horizontal on mobile */}
      <Card className={`p-4 sm:p-5 md:p-6 shadow-sm transition-all duration-300 ${isDarkMode
        ? 'bg-gray-800 border-gray-700'
        : 'bg-white border-gray-200'
        }`}>
        <h3 className={`text-[10px] sm:text-xs uppercase tracking-wider mb-3 sm:mb-4 transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>Risk/Reward</h3>

        <div className="flex lg:flex-col gap-4 lg:space-y-0">
          <div className="flex-1 flex lg:flex-row items-center justify-between">
            <span className={`text-xs sm:text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>Risk per share</span>
            <span className={`text-sm sm:text-base font-semibold transition-colors ${canCalculate
              ? isDarkMode ? 'text-gray-200' : 'text-gray-900'
              : isDarkMode ? 'text-gray-600' : 'text-gray-400'
              }`}>
              {canCalculate ? `${riskPerShare.toFixed(1)}%` : 'N/A'}
            </span>
          </div>

          <div className={`w-px lg:w-full lg:h-px transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
            }`}></div>

          <div className="flex-1 flex lg:flex-row items-center justify-between">
            <span className={`text-xs sm:text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>R:R Ratio</span>
            <span className={`text-sm sm:text-base font-semibold transition-colors ${canCalculate && rrRatio !== null
              ? isDarkMode ? 'text-gray-200' : 'text-gray-900'
              : isDarkMode ? 'text-gray-600' : 'text-gray-400'
              }`}>
              {canCalculate && rrRatio !== null ? rrRatio.toFixed(1) : 'N/A'}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}