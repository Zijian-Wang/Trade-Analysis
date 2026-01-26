import { Card } from './ui/card'
import { Download, Copy, Clock, Check, Trash2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useLanguage } from '../context/LanguageContext'
import { Trade } from '../services/tradeService'
import {
  calculateTradeRisk,
  calculateEffectiveStop,
} from '../services/riskCalculator'
import { getStockNames } from '../services/stockNameService'

/*
const _mockTrades: Trade[] = [
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
*/

interface TradeHistoryProps {
  currencySymbol: string
  loggedTrades: Trade[]
  isDarkMode: boolean
  onDeleteTrade: (id: string) => void
}

export function TradeHistory({
  currencySymbol,
  loggedTrades,
  isDarkMode,
  onDeleteTrade,
}: TradeHistoryProps) {
  const { t } = useLanguage()
  const [copied, setCopied] = useState(false)
  const [rowCopied, setRowCopied] = useState<string | null>(null)
  const [stockNames, setStockNames] = useState<Map<string, string>>(new Map())

  // Fetch company names for all trades
  useEffect(() => {
    const fetchNames = async () => {
      const symbols = loggedTrades.map((trade) => ({
        symbol: trade.symbol,
        market: trade.market || 'US',
      }))
      if (symbols.length > 0) {
        const names = await getStockNames(symbols)
        setStockNames(names)
      }
    }
    fetchNames()
  }, [loggedTrades])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(loggedTrades, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    /* ... existing download logic ... */
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(loggedTrades, null, 2))
    const downloadAnchorNode = document.createElement('a')
    downloadAnchorNode.setAttribute('href', dataStr)
    downloadAnchorNode.setAttribute(
      'download',
      `trade_log_${new Date().toISOString().split('T')[0]}.json`,
    )
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }

  const handleRowCopy = async (trade: Trade) => {
    await navigator.clipboard.writeText(JSON.stringify(trade, null, 2))
    setRowCopied(trade.id ?? null)
    setTimeout(() => setRowCopied(null), 2000)
  }

  return (
    <Card
      className={`p-4 sm:p-6 shadow-sm transition-all duration-300 ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <Clock
            className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors ${
              isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`}
          />
          <h2
            className={`text-base sm:text-lg font-semibold transition-colors ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            {t('tradeHistory.title')}
          </h2>
        </div>

        {loggedTrades.length > 0 && (
          <div className="flex gap-1 sm:gap-2">
            <button
              onClick={handleCopy}
              title="Copy All JSON"
              className={`p-1.5 sm:p-2 text-xs sm:text-sm rounded-lg transition-colors ${
                isDarkMode
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
            </button>
            <button
              onClick={handleDownload}
              title="Export All JSON"
              className={`p-1.5 sm:p-2 text-xs sm:text-sm rounded-lg transition-colors ${
                isDarkMode
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Empty State */}
      {loggedTrades.length === 0 ? (
        <div className="py-12 sm:py-16 text-center">
          <Clock
            className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 transition-colors ${
              isDarkMode ? 'text-gray-600' : 'text-gray-300'
            }`}
          />
          <p
            className={`text-sm sm:text-base transition-colors ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            {t('tradeHistory.noTrades')}
          </p>
          <p
            className={`text-xs sm:text-sm mt-1 transition-colors ${
              isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`}
          >
            {t('tradeHistory.startPrompt')}
          </p>
        </div>
      ) : (
        /* Table */
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full min-w-[800px] sm:min-w-full">
            <thead>
              <tr
                className={`border-b transition-colors ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                }`}
              >
                <th className="w-16 py-3 px-2 sm:px-4"></th>
                <th
                  className={`text-left py-3 px-2 sm:px-4 text-[10px] sm:text-xs uppercase tracking-wider font-medium transition-colors ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  {t('tradeHistory.col_date')}
                </th>
                <th
                  className={`text-left py-3 px-2 sm:px-4 text-[10px] sm:text-xs uppercase tracking-wider font-medium transition-colors ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  {t('tradeHistory.col_symbol')}
                </th>
                <th
                  className={`text-left py-3 px-2 sm:px-4 text-[10px] sm:text-xs uppercase tracking-wider font-medium transition-colors ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  {t('tradeHistory.col_direction')}
                </th>
                <th
                  className={`text-left py-3 px-2 sm:px-4 text-[10px] sm:text-xs uppercase tracking-wider font-medium transition-colors ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  {t('tradeHistory.col_setup')}
                </th>
                <th
                  className={`text-right py-3 px-2 sm:px-4 text-[10px] sm:text-xs uppercase tracking-wider font-medium transition-colors ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  {t('tradeHistory.col_entry')}
                </th>
                <th
                  className={`text-right py-3 px-2 sm:px-4 text-[10px] sm:text-xs uppercase tracking-wider font-medium transition-colors ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  {t('tradeHistory.col_stop')}
                </th>
                <th
                  className={`text-right py-3 px-2 sm:px-4 text-[10px] sm:text-xs uppercase tracking-wider font-medium transition-colors ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  {t('tradeHistory.col_target')}
                </th>
                <th
                  className={`text-right py-3 px-2 sm:px-4 text-[10px] sm:text-xs uppercase tracking-wider font-medium transition-colors ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  {t('tradeHistory.col_risk')}
                </th>
                <th
                  className={`text-right py-3 px-2 sm:px-4 text-[10px] sm:text-xs uppercase tracking-wider font-medium transition-colors ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  {t('tradeHistory.col_size')}
                </th>
                <th
                  className={`text-right py-3 px-2 sm:px-4 text-[10px] sm:text-xs uppercase tracking-wider font-medium transition-colors ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  {t('tradeHistory.col_risk_amount')}
                </th>
                <th
                  className={`text-right py-3 px-2 sm:px-4 text-[10px] sm:text-xs uppercase tracking-wider font-medium transition-colors ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  {t('tradeHistory.col_rr')}
                </th>
              </tr>
            </thead>
            <tbody
              className={`transition-colors ${
                isDarkMode ? 'divide-gray-700' : 'divide-gray-100'
              } divide-y`}
            >
              {loggedTrades.map((trade) => (
                <tr
                  key={trade.id}
                  className={`transition-colors group ${
                    isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => trade.id && onDeleteTrade(trade.id)}
                        className={`p-1.5 rounded-md transition-colors ${
                          isDarkMode
                            ? 'text-gray-500 hover:text-rose-400 hover:bg-gray-700'
                            : 'text-gray-400 hover:text-rose-600 hover:bg-rose-50'
                        }`}
                        title="Delete Trade"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRowCopy(trade)}
                        className={`p-1.5 rounded-md transition-colors ${
                          isDarkMode
                            ? 'text-gray-500 hover:text-gray-200 hover:bg-gray-700'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                        }`}
                        title="Copy Trade JSON"
                      >
                        {rowCopied === trade.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td
                    className={`py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm whitespace-nowrap transition-colors ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    {trade.date}
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4">
                    <div className="flex flex-col">
                      <span
                        className={`text-xs sm:text-sm font-semibold transition-colors ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        {trade.symbol}
                      </span>
                      {stockNames.get(trade.symbol) &&
                        stockNames.get(trade.symbol) !== trade.symbol && (
                          <span
                            className={`text-[10px] sm:text-xs transition-colors ${
                              isDarkMode ? 'text-gray-500' : 'text-gray-500'
                            }`}
                          >
                            {stockNames.get(trade.symbol)}
                          </span>
                        )}
                    </div>
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
                        trade.direction === 'long'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {trade.direction}
                    </span>
                  </td>
                  <td
                    className={`py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm whitespace-nowrap transition-colors ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    {trade.setup}
                  </td>
                  <td
                    className={`py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-right transition-colors ${
                      isDarkMode ? 'text-gray-200' : 'text-gray-900'
                    }`}
                  >
                    {(() => {
                      // If contracts exist, calculate average entry
                      if (trade.contracts && trade.contracts.length > 0) {
                        const totalValue = trade.contracts.reduce(
                          (sum, c) => sum + c.entryPrice * c.shares,
                          0,
                        )
                        const totalShares = trade.contracts.reduce(
                          (sum, c) => sum + c.shares,
                          0,
                        )
                        const avgEntry =
                          totalShares > 0
                            ? totalValue / totalShares
                            : trade.entry
                        return `${currencySymbol}${avgEntry.toFixed(2)}`
                      }
                      return `${currencySymbol}${trade.entry.toFixed(2)}`
                    })()}
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-right text-rose-600">
                    {(() => {
                      // Get stop (migrate from structureStop if needed)
                      let stop = trade.stop || (trade as any).structureStop

                      // Validate stop price
                      const isLong = trade.direction === 'long'
                      const stopValid = stop
                        ? isLong
                          ? stop < trade.entry
                          : stop > trade.entry
                        : false

                      // If contracts exist, show effective stop
                      if (trade.contracts && trade.contracts.length > 0) {
                        const effectiveStop = calculateEffectiveStop(
                          trade.contracts[0],
                          stop,
                        )
                        const effectiveStopValid = isLong
                          ? effectiveStop < trade.entry
                          : effectiveStop > trade.entry

                        if (!effectiveStopValid) {
                          return (
                            <span
                              className="text-yellow-600 dark:text-yellow-400"
                              title="Invalid stop price"
                            >
                              {currencySymbol}
                              {effectiveStop.toFixed(2)} ⚠️
                            </span>
                          )
                        }
                        return `${currencySymbol}${effectiveStop.toFixed(2)}`
                      }

                      // Validate final stop
                      if (!stopValid) {
                        return (
                          <span
                            className="text-yellow-600 dark:text-yellow-400"
                            title="Invalid stop price"
                          >
                            {currencySymbol}
                            {stop.toFixed(2)} ⚠️
                          </span>
                        )
                      }

                      return `${currencySymbol}${stop.toFixed(2)}`
                    })()}
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-right text-emerald-600">
                    {trade.target ? (
                      `${currencySymbol}${trade.target.toFixed(2)}`
                    ) : (
                      <span className="text-gray-400">/</span>
                    )}
                  </td>
                  <td
                    className={`py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-right transition-colors ${
                      isDarkMode ? 'text-gray-200' : 'text-gray-900'
                    }`}
                  >
                    {trade.riskPercent.toFixed(2)}%
                  </td>
                  <td
                    className={`py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-right transition-colors ${
                      isDarkMode ? 'text-gray-200' : 'text-gray-900'
                    }`}
                  >
                    {trade.positionSize.toLocaleString()}
                  </td>
                  <td
                    className={`py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-right transition-colors ${
                      isDarkMode ? 'text-gray-200' : 'text-gray-900'
                    }`}
                  >
                    {(() => {
                      // Calculate risk using the same logic as ActivePositions
                      const calculatedRisk = calculateTradeRisk(trade)
                      return `${currencySymbol}${calculatedRisk.toFixed(2)}`
                    })()}
                  </td>
                  <td
                    className={`py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-right transition-colors ${
                      isDarkMode ? 'text-blue-400' : 'text-blue-600'
                    }`}
                  >
                    {trade.rrRatio !== null ? (
                      trade.rrRatio.toFixed(2)
                    ) : (
                      <span className="text-gray-400">/</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
