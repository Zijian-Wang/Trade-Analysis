import { Card } from './ui/card'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { Slider } from './ui/slider'
import { ArrowUpRight } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { Loader } from './ui/loader'
import { useLanguage } from '../context/LanguageContext'
import { Button } from './ui/button'
import { Typography } from './ui/typography'
import { CornerDownRight, X, BarChart3 } from 'lucide-react'
import { MarketChart } from './MarketChart'
import { Trade } from '../services/tradeService'
import { calculatePositionSize } from '../services/riskCalculator'
import { getStockName } from '../services/stockNameService'

interface TradeInputCardProps {
  market: 'US' | 'CN'
  currencySymbol: string
  tickerSymbol: string
  setTickerSymbol: (value: string) => void
  portfolioCapital: number
  setPortfolioCapital: (value: number) => void
  riskPerTrade: number
  setRiskPerTrade: (value: number) => void
  direction: 'long' | 'short'
  setDirection: (value: 'long' | 'short') => void
  sentiment: string
  setSentiment: (value: string) => void
  entryPrice: number
  setEntryPrice: (value: number) => void
  stopLoss: number
  setStopLoss: (value: number) => void
  target: string
  setTarget: (value: string) => void
  isDarkMode: boolean
  onLogTrade: () => void
  parentTrade?: Trade | null
  onClearContext?: () => void
}

export function TradeInputCard({
  market,
  currencySymbol,
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
  parentTrade,
  onClearContext,
}: TradeInputCardProps) {
  const { t } = useLanguage()
  const [portfolioInputValue, setPortfolioInputValue] = useState(
    portfolioCapital.toString(),
  )
  const [isPortfolioFocused, setIsPortfolioFocused] = useState(false)
  const [isFetchingPrice, setIsFetchingPrice] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [companyName, setCompanyName] = useState<string>('')

  const [riskInputValue, setRiskInputValue] = useState(riskPerTrade.toFixed(2))
  const [isRiskFocused, setIsRiskFocused] = useState(false)

  // Calculate new contract risk for context mode
  const newContractRisk = useMemo(() => {
    if (!parentTrade || !entryPrice || !stopLoss || entryPrice === stopLoss)
      return 0
    const position = calculatePositionSize(
      portfolioCapital,
      riskPerTrade,
      entryPrice,
      stopLoss,
      market,
    )
    return position.riskAmount
  }, [parentTrade, portfolioCapital, riskPerTrade, entryPrice, stopLoss, market])

  // Sync risk input value with prop when not focused (e.g. when slider moves)
  useEffect(() => {
    if (!isRiskFocused) {
      setRiskInputValue(riskPerTrade.toFixed(2))
    }
  }, [riskPerTrade, isRiskFocused])

  // Handle Parent Trade Context
  useEffect(() => {
    if (parentTrade) {
      setTickerSymbol(parentTrade.symbol)
      setDirection(parentTrade.direction)
      setSentiment(parentTrade.setup)
      // Optional: Set stop loss to existing stop
      setStopLoss(parentTrade.stop)
      setTarget(parentTrade.target ? parentTrade.target.toString() : '')
    }
  }, [
    parentTrade,
    setTickerSymbol,
    setDirection,
    setSentiment,
    setStopLoss,
    setTarget,
  ])

  // Auto-fetch price and company name when ticker changes and not typing
  useEffect(() => {
    const fetchPriceAndName = async () => {
      const symbol = tickerSymbol.trim()
      if (!symbol || isTyping) {
        setCompanyName('')
        return
      }

      const isUS = market === 'US' || /^[a-zA-Z]+$/.test(symbol)
      const isChinese = market === 'CN' || /^\d+$/.test(symbol)

      let chineseSuffix = ''
      if (isChinese) {
        if (/^[56]/.test(symbol)) {
          chineseSuffix = '.SHH'
        } else if (/^\d+$/.test(symbol) && !symbol.startsWith('920')) {
          chineseSuffix = '.SHZ'
        }
      }

      // Only proceed if it's a recognized US stock or a valid Chinese stock code
      if (!isUS && !chineseSuffix) {
        setCompanyName('')
        return
      }

      setIsFetchingPrice(true)
      try {
        // Fetch company name for Chinese stocks
        if (isChinese && chineseSuffix) {
          const name = await getStockName(symbol, market)
          setCompanyName(name !== symbol ? name : '')
        } else {
          setCompanyName('')
        }

        // Fetch price
        if (chineseSuffix) {
          const querySymbol = `${symbol}${chineseSuffix}`
          const apiKey = import.meta.env.VITE_ALPHAVANTAGE_API_KEY
          const response = await fetch(
            `/api/alphavantage/query?function=GLOBAL_QUOTE&symbol=${querySymbol}&apikey=${apiKey}`,
          )

          if (response.ok) {
            const data = await response.json()
            const price = parseFloat(data['Global Quote']?.['05. price'])
            if (!isNaN(price) && price > 0) {
              setEntryPrice(price)
            }
          }
        } else if (isUS) {
          const querySymbol = `${symbol}.US`
          // Use the local proxy /api/stooq which maps to https://stooq.com
          const response = await fetch(
            `/api/stooq/q/l/?s=${querySymbol}&f=sd2t2ohlcv&h&e=csv`,
          )

          if (response.ok) {
            const text = await response.text()
            const lines = text.trim().split('\n')

            if (lines.length >= 2) {
              const headers = lines[0].split(',')
              const values = lines[1].split(',')
              const closeIndex = headers.findIndex((h) => h.trim() === 'Close')

              if (closeIndex !== -1 && values[closeIndex]) {
                const price = parseFloat(values[closeIndex])
                if (!isNaN(price) && price > 0) {
                  setEntryPrice(price)
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch stock price:', error)
      } finally {
        setIsFetchingPrice(false)
      }
    }

    const timeoutId = setTimeout(fetchPriceAndName, 1000)
    return () => clearTimeout(timeoutId)
  }, [tickerSymbol, setEntryPrice, isTyping, market])

  const handleTickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setTickerSymbol(value)
    setIsTyping(true)
  }

  // Validation logic
  const hasRequiredInputs =
    tickerSymbol.trim() !== '' && entryPrice > 0 && stopLoss > 0

  const isStopLossValid =
    hasRequiredInputs &&
    ((direction === 'long' && entryPrice > stopLoss) ||
      (direction === 'short' && entryPrice < stopLoss))

  const targetNum = target ? parseFloat(target) : null
  const isTargetValid =
    !targetNum ||
    (direction === 'long' && entryPrice < targetNum) ||
    (direction === 'short' && entryPrice > targetNum)

  const canCalculate = hasRequiredInputs && isStopLossValid && isTargetValid

  const handlePortfolioFocus = () => {
    setIsPortfolioFocused(true)
    setPortfolioInputValue(portfolioCapital.toString())
  }

  const handlePortfolioBlur = () => {
    setIsPortfolioFocused(false)
    const num = parseFloat(portfolioInputValue)
    if (!isNaN(num) && num >= 0) {
      const rounded = Math.round(num * 100) / 100
      setPortfolioCapital(rounded)
      setPortfolioInputValue(
        rounded.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      )
    } else {
      setPortfolioInputValue(
        portfolioCapital.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      )
    }
  }

  const handlePortfolioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPortfolioInputValue(e.target.value)
  }

  const handleRiskFocus = () => {
    setIsRiskFocused(true)
    setRiskInputValue(riskPerTrade.toString())
  }

  const handleRiskBlur = () => {
    setIsRiskFocused(false)
    let val = parseFloat(riskInputValue)
    if (isNaN(val)) {
      setRiskInputValue(riskPerTrade.toFixed(2))
      return
    }

    // Clip between 0.5 and 1.0
    if (val < 0.5) val = 0.5
    if (val > 1.0) val = 1.0

    setRiskPerTrade(val)
    setRiskInputValue(val.toFixed(2))
  }

  const handleRiskChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRiskInputValue(e.target.value)
  }

  return (
    <Card
      className={`w-full p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}
    >
      {/* Context Mode Banner */}
      {parentTrade &&
        (() => {
          const parentRisk = parentTrade.riskAmount || 0
          const totalRiskAfter = parentRisk + newContractRisk
          const remainingBudget = Math.max(0, portfolioCapital - totalRiskAfter)

          return (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <CornerDownRight size={18} />
                  <div className="text-sm font-medium">
                    {t('tradeInput.addingToPosition').replace(
                      '{symbol}',
                      parentTrade.symbol,
                    )}
                  </div>
                </div>
                <button
                  onClick={onClearContext}
                  className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-full text-blue-500"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('tradeInput.freedRisk')}:
                  </span>
                  <span className="ml-1 font-medium text-gray-900 dark:text-white">
                    {currencySymbol}0.00
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('tradeInput.remainingRiskBudget')}:
                  </span>
                  <span
                    className={`ml-1 font-medium ${remainingBudget > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                  >
                    {currencySymbol}
                    {remainingBudget.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    New Risk:
                  </span>
                  <span className="ml-1 font-medium text-gray-900 dark:text-white">
                    {currencySymbol}
                    {newContractRisk.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )
        })()}

      <div className="space-y-4 flex-1">
        {/* Portfolio Section */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 items-end">
          {/* Portfolio Capital */}
          <div className="space-y-2">
            <Typography variant="label">
              {t('tradeInput.portfolioCapital')}
            </Typography>
            <div className="relative">
              <span
                className={`absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-base sm:text-lg font-medium transition-colors ${
                  isDarkMode ? 'text-gray-600' : 'text-gray-300'
                }
                                  `}
              >
                {currencySymbol}
              </span>
              <Input
                type="text"
                value={
                  isPortfolioFocused
                    ? portfolioInputValue
                    : portfolioCapital.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                }
                onChange={handlePortfolioChange}
                onFocus={handlePortfolioFocus}
                onBlur={handlePortfolioBlur}
                className={`text-lg sm:text-xl font-semibold h-auto py-2 sm:py-2.5 pl-6 sm:pl-8 transition-all ${
                  isDarkMode
                    ? 'bg-gray-900 border-gray-600 text-white focus:border-blue-400'
                    : 'bg-white border-gray-200 text-gray-900 focus:border-blue-500'
                }`}
              />
            </div>
          </div>

          {/* Risk Per Trade */}
          <div className="space-y-2">
            <Typography variant="label">
              {t('tradeInput.riskPerTrade')}
            </Typography>

            <div className="flex items-start gap-4">
              {/* Input Box - Full width on mobile, Compact on desktop */}
              <div className="relative w-full sm:w-28 shrink-0">
                <Input
                  type="text"
                  value={riskInputValue}
                  onChange={handleRiskChange}
                  onFocus={handleRiskFocus}
                  onBlur={handleRiskBlur}
                  className={`text-lg sm:text-xl font-semibold h-auto py-2 sm:py-2.5 pr-8 text-right transition-all ${
                    isDarkMode
                      ? 'bg-gray-900 border-gray-600 text-blue-400 focus:border-blue-400'
                      : 'bg-white border-gray-200 text-blue-600 focus:border-blue-500'
                  }`}
                />
                <span
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-base sm:text-lg font-medium transition-colors ${
                    isDarkMode ? 'text-gray-600' : 'text-gray-400'
                  }
                  `}
                >
                  %
                </span>
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
                <div
                  className={`flex justify-between text-[10px] font-medium transition-colors ${
                    isDarkMode ? 'text-gray-500' : 'text-gray-400'
                  }
                  `}
                >
                  <span>0.5%</span>
                  <span>I</span>
                  <span>1.0%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          className={`h-px transition-colors ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
          }
          `}
        ></div>

        {/* Ticker Symbol */}
        <div className="space-y-2">
          <Typography variant="label">
            {t('tradeInput.tickerSymbol')}
          </Typography>
          <Input
            type="text"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            autoComplete="off"
            value={tickerSymbol}
            onChange={handleTickerChange}
            onBlur={() => {
              if (/^[a-zA-Z]+$/.test(tickerSymbol)) {
                setTickerSymbol(tickerSymbol.toUpperCase())
              }
              setIsTyping(false)
            }}
            placeholder={market === 'CN' ? '510300' : undefined}
            className={`text-xl sm:text-2xl font-semibold h-auto py-2 sm:py-2.5 transition-all ${
              isDarkMode
                ? 'bg-gray-900 border-gray-600 text-white focus:border-blue-400'
                : 'bg-white border-gray-200 text-gray-900 focus:border-blue-500'
            }`}
          />
          {companyName && (
            <p
              className={`text-xs sm:text-sm transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
            >
              {companyName}
            </p>
          )}
        </div>

        {/* Direction & Sentiment */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Direction */}
          <div className="space-y-2">
            <Typography variant="label">{t('tradeInput.direction')}</Typography>
            <div
              className={`flex rounded-full p-0.5 sm:p-1 transition-colors ${
                isDarkMode ? 'bg-gray-900' : 'bg-gray-100'
              }
              `}
            >
              <button
                onClick={() => setDirection('long')}
                className={`flex-1 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                  direction === 'long'
                    ? market === 'CN'
                      ? 'bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-sm'
                      : 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-sm'
                    : isDarkMode
                      ? 'text-gray-400 hover:text-gray-200'
                      : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t('tradeInput.long')}
              </button>
              <button
                onClick={() => setDirection('short')}
                className={`flex-1 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                  direction === 'short'
                    ? market === 'CN'
                      ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-sm'
                      : 'bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-sm'
                    : isDarkMode
                      ? 'text-gray-400 hover:text-gray-200'
                      : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t('tradeInput.short')}
              </button>
            </div>
          </div>

          {/* Sentiment */}
          <div className="space-y-2">
            <Typography variant="label">{t('tradeInput.setup')}</Typography>
            <div
              className={`flex rounded-full p-0.5 sm:p-1 transition-colors ${
                isDarkMode ? 'bg-gray-900' : 'bg-gray-100'
              }
              `}
            >
              <button
                onClick={() => setSentiment('TREND')}
                className={`flex-1 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                  sentiment === 'TREND'
                    ? isDarkMode
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'bg-gray-900 text-white shadow-sm'
                    : isDarkMode
                      ? 'text-gray-400 hover:text-gray-200'
                      : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t('tradeInput.trend')}
              </button>
              <button
                onClick={() => setSentiment('PROBE')}
                className={`flex-1 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                  sentiment === 'PROBE'
                    ? isDarkMode
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'bg-gray-900 text-white shadow-sm'
                    : isDarkMode
                      ? 'text-gray-400 hover:text-gray-200'
                      : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t('tradeInput.probe')}
              </button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          className={`h-px transition-colors ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
          }
          `}
        ></div>

        {/* Trade Parameters */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {/* Entry Price */}
          <div className="space-y-2">
            <Typography variant="label">
              {t('tradeInput.entryPrice')}
            </Typography>
            <div className="relative">
              <span
                className={`absolute left-2 sm:left-2.5 top-1/2 -translate-y-1/2 text-sm sm:text-base font-semibold transition-colors ${
                  isDarkMode ? 'text-gray-600' : 'text-gray-400'
                }
                                  `}
              >
                {currencySymbol}
              </span>
              <Input
                type="number"
                value={entryPrice || ''}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '') {
                    setEntryPrice(0)
                  } else {
                    const num = parseFloat(value)
                    if (!isNaN(num)) {
                      const decimalPlaces = market === 'CN' ? 3 : 2
                      // Only apply rounding if we have more decimals than allowed to avoid fighting user input
                      const parts = value.split('.')
                      if (
                        parts.length === 2 &&
                        parts[1].length > decimalPlaces
                      ) {
                        setEntryPrice(parseFloat(num.toFixed(decimalPlaces)))
                      } else {
                        setEntryPrice(num)
                      }
                    }
                  }
                }}
                className={`text-sm sm:text-base font-semibold h-auto py-2 sm:py-2.5 pl-5 sm:pl-6 transition-all ${
                  isDarkMode
                    ? 'bg-gray-900 border-gray-600 text-white focus:border-blue-400'
                    : 'bg-white border-gray-200 text-gray-900 focus:border-blue-500'
                }`}
                step={market === 'CN' ? '0.001' : '0.01'}
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
            <Typography variant="label">{t('tradeInput.stopLoss')}</Typography>
            <div className="relative">
              <span
                className={`absolute left-2 sm:left-2.5 top-1/2 -translate-y-1/2 text-sm sm:text-base font-semibold transition-colors ${
                  isDarkMode ? 'text-gray-600' : 'text-gray-400'
                }
                                  `}
              >
                {currencySymbol}
              </span>
              <Input
                type="number"
                value={stopLoss || ''}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '') {
                    setStopLoss(0)
                  } else {
                    const num = parseFloat(value)
                    if (!isNaN(num)) {
                      const decimalPlaces = market === 'CN' ? 3 : 2
                      const parts = value.split('.')
                      if (
                        parts.length === 2 &&
                        parts[1].length > decimalPlaces
                      ) {
                        setStopLoss(parseFloat(num.toFixed(decimalPlaces)))
                      } else {
                        setStopLoss(num)
                      }
                    }
                  }
                }}
                className={`text-sm sm:text-base font-semibold h-auto py-2 sm:py-2.5 pl-5 sm:pl-6 transition-all ${
                  !isStopLossValid && hasRequiredInputs
                    ? isDarkMode
                      ? 'bg-gray-900 border-red-500 text-white focus:border-red-500'
                      : 'bg-white border-red-500 text-gray-900 focus:border-red-500'
                    : isDarkMode
                      ? 'bg-gray-900 border-gray-600 text-white focus:border-blue-400'
                      : 'bg-white border-gray-200 text-gray-900 focus:border-blue-500'
                }`}
                step={market === 'CN' ? '0.001' : '0.01'}
              />
            </div>
            <div className="flex items-baseline gap-1">
              <span
                className={`text-xs font-medium transition-colors ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-400'
                }
                `}
              >
                {t('tradeInput.riskLabel')}:
              </span>
              <p className={`text-sm font-semibold text-rose-500`}>
                {canCalculate ? (
                  <>
                    {Math.abs(entryPrice - stopLoss).toFixed(2)} (
                    {(
                      (Math.abs(entryPrice - stopLoss) / entryPrice) *
                      100
                    ).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    %)
                  </>
                ) : (
                  '-'
                )}
              </p>
            </div>
          </div>

          {/* Target */}
          <div className="space-y-2">
            <Typography variant="label">{t('tradeInput.target')}</Typography>
            <div className="relative">
              <span
                className={`absolute left-2 sm:left-2.5 top-1/2 -translate-y-1/2 text-sm sm:text-base font-semibold transition-colors ${
                  isDarkMode ? 'text-gray-600' : 'text-gray-400'
                }
                                  `}
              >
                {currencySymbol}
              </span>
              <Input
                type="number"
                value={target}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '') {
                    setTarget('')
                  } else {
                    const num = parseFloat(value)
                    if (!isNaN(num)) {
                      const decimalPlaces = market === 'CN' ? 3 : 2
                      const parts = value.split('.')
                      if (
                        parts.length === 2 &&
                        parts[1].length > decimalPlaces
                      ) {
                        setTarget(
                          parseFloat(num.toFixed(decimalPlaces)).toString(),
                        )
                      } else {
                        setTarget(value)
                      }
                    } else {
                      setTarget(value)
                    }
                  }
                }}
                className={`text-sm sm:text-base font-semibold h-auto py-2 sm:py-2.5 pl-5 sm:pl-6 transition-all ${
                  !isTargetValid && targetNum
                    ? isDarkMode
                      ? 'bg-gray-900 border-red-500 text-white focus:border-red-500'
                      : 'bg-white border-red-500 text-gray-900 focus:border-red-500'
                    : isDarkMode
                      ? 'bg-gray-900 border-gray-600 text-white focus:border-blue-400'
                      : 'bg-white border-gray-200 text-gray-900 focus:border-blue-500'
                }`}
                step={market === 'CN' ? '0.001' : '0.01'}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Log Trade Button - at bottom with auto spacing - hidden on mobile */}
      <div className="mt-auto pt-4 hidden lg:block">
        <Button
          onClick={onLogTrade}
          disabled={!canCalculate}
          className="w-full h-auto py-3 sm:py-3.5 px-4 rounded-xl text-sm sm:text-base shadow-md hover:shadow-lg hover:-translate-y-0.5"
        >
          <span>
            {parentTrade ? 'Add to Position' : t('tradeInput.logTrade')}
          </span>
          <ArrowUpRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}
