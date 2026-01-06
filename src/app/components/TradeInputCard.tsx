import { Card } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Slider } from './ui/slider';
import { ArrowUpRight, Check } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { Popover, PopoverContent, PopoverAnchor } from './ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from './ui/command';
import { Loader } from './ui/loader';
import { cn } from './ui/utils';
import debounce from 'lodash.debounce';

interface TradeInputCardProps {
  tickerSymbol: string;
  setTickerSymbol: (value: string) => void;
  portfolioCapital: number;
  setPortfolioCapital: (value: number) => void;
  riskPerTrade: number;
  setRiskPerTrade: (value: number) => void;
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
  onLogTrade: () => void;
}

interface TickerSearchResult {
  symbol: string;
  name: string;
  exchange: string;
}

export function TradeInputCard({
  tickerSymbol,
  setTickerSymbol,
  portfolioCapital,
  setPortfolioCapital,
  riskPerTrade,
  setRiskPerTrade,
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
  onLogTrade,
}: TradeInputCardProps) {
  const [portfolioInputValue, setPortfolioInputValue] = useState(portfolioCapital.toString());
  const [isPortfolioFocused, setIsPortfolioFocused] = useState(false);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
    const [tickerSearchResults, setTickerSearchResults] = useState<TickerSearchResult[]>([]);
    const [isTickerDropdownOpen, setIsTickerDropdownOpen] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [selectedExchange, setSelectedExchange] = useState<string | null>(null);
  
  
      // Auto-fetch price when ticker changes and not typing
      useEffect(() => {
        const fetchPrice = async () => {
          const symbol = tickerSymbol.trim();
          if (!symbol || isTyping) return;
    
          setIsFetchingPrice(true);
          try {
            let querySymbol = symbol;
            if (!symbol.includes('.')) {
              if (selectedExchange === 'SSE' || selectedExchange === 'SZSE') {
                querySymbol = `${symbol}.CN`;
              } else if (selectedExchange === 'HKSE') {
                querySymbol = `${symbol}.HK`;
              } else {
                querySymbol = `${symbol}.US`;
              }
            }
            
            // Use the local proxy /api/stooq which maps to https://stooq.com
            const response = await fetch(`/api/stooq/q/l/?s=${querySymbol}&f=sd2t2ohlcv&h&e=csv`);
            
            if (!response.ok) {
              setIsFetchingPrice(false);
              return;
            }
            
            const text = await response.text();
            const lines = text.trim().split('\n');
            
            if (lines.length >= 2) {
              const headers = lines[0].split(',');
              const values = lines[1].split(',');
              const closeIndex = headers.findIndex(h => h.trim() === 'Close');
              
              if (closeIndex !== -1 && values[closeIndex]) {
                 const price = parseFloat(values[closeIndex]);
                 // Stooq returns 'N/D' for no data
                 if (!isNaN(price) && price > 0) {
                   setEntryPrice(price);
                 }
              }
            }
          } catch (error) {
            console.error('Failed to fetch stock price:', error);
          } finally {
            setIsFetchingPrice(false);
          }
        };
    
        const timeoutId = setTimeout(fetchPrice, 1000);
        return () => clearTimeout(timeoutId);
      }, [tickerSymbol, setEntryPrice, isTyping, selectedExchange]);  
    const debouncedSearch = useCallback(
      debounce(async (query: string) => {
        setIsTyping(true);
        if (!query) {
          setTickerSearchResults([]);
          setIsTickerDropdownOpen(false);
          setIsTyping(false);
          return;
        }
        try {
          const apiKey = import.meta.env.VITE_API_KEY;
          const isChineseStock = /[\u4e00-\u9fa5]/.test(query) || /^\d+$/.test(query);
          let url = `https://financialmodelingprep.com/api/v3/search?query=${query}&limit=10&apikey=${apiKey}`;
          if (isChineseStock) {
            url += '&exchange=SSE,SZSE';
          }
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error('Failed to fetch tickers');
          }
          const data = await response.json();
          if (Array.isArray(data)) {
            setTickerSearchResults(data);
  setIsTickerDropdownOpen(data.length > 0);
          } else {
            setTickerSearchResults([]);
            setIsTickerDropdownOpen(false);
          }
        } catch (error) {
          console.error('Failed to search tickers:', error);
          setTickerSearchResults([]);
          setIsTickerDropdownOpen(false);
        } finally {
          setIsTyping(false);
        }
      }, 300),
      []
    );
  
  
    const handleTickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setTickerSymbol(value);
      debouncedSearch(value);
      // Reset selected exchange when user types
      setSelectedExchange(null);
    }
  
    // Validation logic
    const hasRequiredInputs = tickerSymbol.trim() !== '' && entryPrice > 0 && stopLoss > 0;
  
    const isStopLossValid = hasRequiredInputs && (
      (direction === 'long' && entryPrice > stopLoss) ||
      (direction === 'short' && entryPrice < stopLoss)
    );
  
    const targetNum = target ? parseFloat(target) : null;
    const isTargetValid = !targetNum || (
      (direction === 'long' && entryPrice < targetNum) ||
      (direction === 'short' && entryPrice > targetNum)
    );
  
    const canCalculate = hasRequiredInputs && isStopLossValid && isTargetValid;
  
    const handlePortfolioFocus = () => {
      setIsPortfolioFocused(true);
      setPortfolioInputValue(portfolioCapital.toString());
    };
  
    const handlePortfolioBlur = () => {
      setIsPortfolioFocused(false);
      const num = parseFloat(portfolioInputValue);
      if (!isNaN(num) && num >= 0) {
        const rounded = Math.round(num * 100) / 100;
        setPortfolioCapital(rounded);
        setPortfolioInputValue(rounded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      } else {
        setPortfolioInputValue(portfolioCapital.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      }
    };
  
    const handlePortfolioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setPortfolioInputValue(e.target.value);
    };
  
    return (
      <Card className={`w-full p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full ${isDarkMode
        ? 'bg-gray-800 border-gray-700'
        : 'bg-white border-gray-200'
        }`}>
        <div className="space-y-4 flex-1">
          {/* Portfolio Section */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 items-end">
            {/* Portfolio Capital */}
            <div className="space-y-2">
              <Label className={`text-[10px] sm:text-xs uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>Portfolio Capital</Label>
              <div className="relative">
                <span className={`absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-base sm:text-lg font-medium transition-colors ${isDarkMode ? 'text-gray-600' : 'text-gray-300'
                  }`}>$</span>
                <Input
                  type="text"
                  value={isPortfolioFocused ? portfolioInputValue : portfolioCapital.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  onChange={handlePortfolioChange}
                  onFocus={handlePortfolioFocus}
                  onBlur={handlePortfolioBlur}
                  className={`text-lg sm:text-xl font-semibold h-auto py-2 sm:py-2.5 pl-6 sm:pl-8 transition-all ${isDarkMode
                    ? 'bg-gray-900 border-gray-600 text-white focus:border-blue-400'
                    : 'bg-white border-gray-200 text-gray-900 focus:border-blue-500'
                    }`}
                />
              </div>
            </div>
  
            {/* Risk Per Trade */}
            <div className="space-y-2">
              <Label className={`text-[10px] sm:text-xs uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>Risk Per Trade</Label>
  
              <div className="flex items-start gap-4">
                {/* Input Box - Full width on mobile, Compact on desktop */}
                <div className="relative w-full sm:w-28 shrink-0">
                  <Input
                    type="text"
                    value={riskPerTrade.toFixed(2)}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val >= 0.5 && val <= 1) {
                        setRiskPerTrade(val);
                      }
                    }}
                    className={`text-lg sm:text-xl font-semibold h-auto py-2 sm:py-2.5 pr-8 text-right transition-all ${isDarkMode
                      ? 'bg-gray-900 border-gray-600 text-blue-400 focus:border-blue-400'
                      : 'bg-white border-gray-200 text-blue-600 focus:border-blue-500'
                      }`}
                  />
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-base sm:text-lg font-medium transition-colors ${isDarkMode ? 'text-gray-600' : 'text-gray-400'
                    }`}>%</span>
                </div>
  
                {/* Slider - Hidden on mobile, Flexible on desktop */}
                <div className="hidden sm:block flex-1 space-y-1.5 pt-2">
                  <Slider
                    value={[riskPerTrade]}
                    onValueChange={(value) => setRiskPerTrade(value[0])}
                    min={0.5}
                    max={1}
                    step={0.05}
                    className="w-full"
                  />
                  <div className={`flex justify-between text-[10px] font-medium transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                    <span>0.5%</span>
                    <span>I</span>
                    <span>1.0%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
  
          {/* Divider */}
          <div className={`h-px transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
            }`}></div>
  
          {/* Ticker Symbol */}
          <div className="space-y-2">
            <Label className={`text-[10px] sm:text-xs uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>Ticker Symbol</Label>
              <Popover open={isTickerDropdownOpen} onOpenChange={setIsTickerDropdownOpen}>
                <PopoverAnchor>
                  <Input
                    type="text"
                    value={tickerSymbol}
                    onChange={handleTickerChange}
                    onBlur={() => {
                      if (/^[a-zA-Z]+$/.test(tickerSymbol)) {
                        setTickerSymbol(tickerSymbol.toUpperCase());
                      }
                      // Add a small delay to allow item selection
                      setTimeout(() => setIsTickerDropdownOpen(false), 100)
                    }}
                    onFocus={() => {
                      if(tickerSearchResults.length > 0)
                      setIsTickerDropdownOpen(true)
                    }}
                    className={`text-xl sm:text-2xl font-semibold h-auto py-2 sm:py-2.5 transition-all ${isDarkMode
                      ? 'bg-gray-900 border-gray-600 text-white focus:border-blue-400'
                      : 'bg-white border-gray-200 text-gray-900 focus:border-blue-500'
                      }`}
                  />
                </PopoverAnchor>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandList>
                      <CommandEmpty>No results found.</CommandEmpty>
                      <CommandGroup>
                        {tickerSearchResults.map((result) => (
                          <CommandItem
                            key={result.symbol}
                            value={result.symbol}
                            onSelect={() => {
                              setTickerSymbol(result.symbol);
                              setSelectedExchange(result.exchange);
                              setIsTickerDropdownOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                tickerSymbol === result.symbol ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <div className="flex justify-between w-full">
                              <span>{result.symbol}</span>
                              <span className="text-gray-500">{result.name}</span>
                              <span className="text-gray-500">{result.exchange}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
          </div>
  
          {/* Direction & Sentiment */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* Direction */}
            <div className="space-y-2">
              <Label className={`text-[10px] sm:text-xs uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>Direction</Label>
              <div className={`flex rounded-full p-0.5 sm:p-1 transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'
                }`}>
                <button
                  onClick={() => setDirection('long')}
                  className={`flex-1 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${direction === 'long'
                    ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-sm'
                    : isDarkMode
                      ? 'text-gray-400 hover:text-gray-200'
                      : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  Long
                </button>
                <button
                  onClick={() => setDirection('short')}
                  className={`flex-1 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${direction === 'short'
                    ? 'bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-sm'
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
            <div className="space-y-2">
              <Label className={`text-[10px] sm:text-xs uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>Sentiment</Label>
              <div className={`flex rounded-full p-0.5 sm:p-1 transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'
                }`}>
                <button
                  onClick={() => setSentiment('TREND')}
                  className={`flex-1 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${sentiment === 'TREND'
                    ? isDarkMode
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'bg-gray-900 text-white shadow-sm'
                    : isDarkMode
                      ? 'text-gray-400 hover:text-gray-200'
                      : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  Trend
                </button>
                <button
                  onClick={() => setSentiment('PROBE')}
                  className={`flex-1 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${sentiment === 'PROBE'
                    ? isDarkMode
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'bg-gray-900 text-white shadow-sm'
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
  
          {/* Divider */}
          <div className={`h-px transition-colors ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
            }`}></div>
  
          {/* Trade Parameters */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {/* Entry Price */}
            <div className="space-y-2">
              <Label className={`text-[10px] sm:text-xs uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>Entry</Label>
              <div className="relative">
                <span className={`absolute left-2 sm:left-2.5 top-1/2 -translate-y-1/2 text-sm sm:text-base font-semibold transition-colors ${isDarkMode ? 'text-gray-600' : 'text-gray-400'
                  }`}>$</span>
                <Input
                  type="number"
                  value={entryPrice || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setEntryPrice(0);
                    } else {
                      const num = parseFloat(value);
                      if (!isNaN(num)) {
                        setEntryPrice(parseFloat(num.toFixed(2)));
                      }
                    }
                  }}
                  className={`text-sm sm:text-base font-semibold h-auto py-2 sm:py-2.5 pl-5 sm:pl-6 transition-all ${isDarkMode
                    ? 'bg-gray-900 border-gray-600 text-white focus:border-blue-400'
                    : 'bg-white border-gray-200 text-gray-900 focus:border-blue-500'
                    }`}
                  step="0.01"
                />
                {isFetchingPrice && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <Loader />
                  </div>
                )}
              </div>
            </div>
  
            {/* Stop Loss */}
            <div className="space-y-2">
              <Label className={`text-[10px] sm:text-xs uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>Stop</Label>
              <div className="relative">
                <span className={`absolute left-2 sm:left-2.5 top-1/2 -translate-y-1/2 text-sm sm:text-base font-semibold transition-colors ${isDarkMode ? 'text-gray-600' : 'text-gray-400'
                  }`}>$</span>
                <Input
                  type="number"
                  value={stopLoss || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setStopLoss(0);
                    } else {
                      const num = parseFloat(value);
                      if (!isNaN(num)) {
                        setStopLoss(parseFloat(num.toFixed(2)));
                      }
                    }
                  }}
                  className={`text-sm sm:text-base font-semibold h-auto py-2 sm:py-2.5 pl-5 sm:pl-6 transition-all ${!isStopLossValid && hasRequiredInputs
                    ? isDarkMode
                      ? 'bg-gray-900 border-red-500 text-white focus:border-red-500'
                      : 'bg-white border-red-500 text-gray-900 focus:border-red-500'
                    : isDarkMode
                      ? 'bg-gray-900 border-gray-600 text-white focus:border-blue-400'
                      : 'bg-white border-gray-200 text-gray-900 focus:border-blue-500'
                    }`}
                  step="0.01"
                />
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-xs font-medium transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-400'
                  }`}>Risk:</span>
                <p className={`text-sm font-semibold text-rose-500`}>
                  {canCalculate ? `${Math.abs(entryPrice - stopLoss).toFixed(2)}` : '-'}
                </p>
              </div>
            </div>
  
            {/* Target */}
            <div className="space-y-2">
              <Label className={`text-[10px] sm:text-xs uppercase tracking-wider transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>Target</Label>
              <div className="relative">
                <span className={`absolute left-2 sm:left-2.5 top-1/2 -translate-y-1/2 text-sm sm:text-base font-semibold transition-colors ${isDarkMode ? 'text-gray-600' : 'text-gray-400'
                  }`}>$</span>
                <Input
                  type="number"
                  value={target}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setTarget('');
                    } else {
                      const num = parseFloat(value);
                      if (!isNaN(num)) {
                        setTarget(parseFloat(num.toFixed(2)).toString());
                      } else {
                        setTarget(value);
                      }
                    }
                  }}
                  className={`text-sm sm:text-base font-semibold h-auto py-2 sm:py-2.5 pl-5 sm:pl-6 transition-all ${!isTargetValid && targetNum
                    ? isDarkMode
                      ? 'bg-gray-900 border-red-500 text-white focus:border-red-500'
                      : 'bg-white border-red-500 text-gray-900 focus:border-red-500'
                    : isDarkMode
                      ? 'bg-gray-900 border-gray-600 text-white focus:border-blue-400'
                      : 'bg-white border-gray-200 text-gray-900 focus:border-blue-500'
                    }`}
                  step="0.01"
                />
              </div>
            </div>
          </div>
        </div>
  
        {/* Log Trade Button - at bottom with auto spacing - hidden on mobile */}
        <div className="mt-auto pt-4 hidden lg:block">
          <button
            onClick={onLogTrade}
            disabled={!canCalculate}
            className={`w-full py-3 sm:py-3.5 px-4 rounded-xl font-medium transition-all shadow-md flex items-center justify-center gap-2 group text-sm sm:text-base ${canCalculate
              ? isDarkMode
                ? 'bg-white text-gray-900 hover:bg-gray-50 hover:shadow-lg hover:-translate-y-0.5'
                : 'bg-gray-900 text-white hover:bg-gray-800 hover:shadow-lg hover:-translate-y-0.5'
              : isDarkMode
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
          >
            <span>Log Trade to Journal</span>
            <ArrowUpRight className={`w-4 h-4 transition-transform ${canCalculate ? 'group-hover:translate-x-0.5 group-hover:-translate-y-0.5' : ''
              }`} />
          </button>
        </div>
      </Card>
    );
  }
  