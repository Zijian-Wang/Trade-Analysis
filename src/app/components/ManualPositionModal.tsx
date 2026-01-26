import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { useState, useEffect } from 'react'
import { saveTrade } from '../services/tradeService'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { calculateTradeRisk } from '../services/riskCalculator'

interface ManualPositionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  market: 'US' | 'CN'
  onSuccess: () => void
}

export function ManualPositionModal({
  open,
  onOpenChange,
  market,
  onSuccess,
}: ManualPositionModalProps) {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [tickerSymbol, setTickerSymbol] = useState('')
  const [shares, setShares] = useState('')
  const [entryPrice, setEntryPrice] = useState('')
  const [stopPrice, setStopPrice] = useState('')
  const [direction, setDirection] = useState<'long' | 'short'>('long')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setTickerSymbol('')
      setShares('')
      setEntryPrice('')
      setStopPrice('')
      setDirection('long')
    }
  }, [open])

  // Helper function to round shares for CN market (100 share lots)
  const roundSharesForMarket = (shares: number): number => {
    if (market === 'CN') {
      return Math.round(shares / 100) * 100
    }
    return shares
  }

  const handleSubmit = async () => {
    // Validation
    if (!tickerSymbol.trim()) {
      toast.error('Please enter a ticker symbol')
      return
    }

    let sharesNum = parseFloat(shares)
    const entryNum = parseFloat(entryPrice)
    const stopNum = parseFloat(stopPrice)

    if (isNaN(sharesNum) || sharesNum <= 0) {
      toast.error('Please enter a valid number of shares')
      return
    }

    // Round shares for CN market
    sharesNum = roundSharesForMarket(sharesNum)

    if (isNaN(entryNum) || entryNum <= 0) {
      toast.error('Please enter a valid entry price')
      return
    }

    if (isNaN(stopNum) || stopNum <= 0) {
      toast.error('Please enter a valid stop price')
      return
    }

    // Validate stop price based on direction
    const isLong = direction === 'long'
    const isValidStop = isLong ? stopNum < entryNum : stopNum > entryNum

    if (!isValidStop) {
      toast.error(
        isLong
          ? `Invalid stop price: Stop must be below entry price for long positions`
          : `Invalid stop price: Stop must be above entry price for short positions`,
      )
      return
    }

    setIsSubmitting(true)

    try {
      // Calculate risk amount
      const riskPerShare = Math.abs(entryNum - stopNum)
      const riskAmount = riskPerShare * sharesNum

      const today = new Date().toISOString().split('T')[0]

      const newTradeData = {
        date: today,
        symbol: tickerSymbol.trim().toUpperCase(),
        direction,
        setup: 'Manual Entry',
        entry: entryNum,
        stop: stopNum,
        target: null,
        riskPercent: 0, // Not calculated for manual entries
        positionSize: sharesNum,
        riskAmount,
        rrRatio: null,
        market,
        status: 'ACTIVE' as const,
        contracts: [
          {
            id: crypto.randomUUID(),
            entryPrice: entryNum,
            shares: sharesNum,
            riskAmount,
            createdAt: Date.now(),
          },
        ],
      }

      await saveTrade(user?.uid || null, newTradeData)
      toast.success(t('manualPosition.success'))
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save position:', error)
      toast.error(t('manualPosition.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('manualPosition.title')}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="ticker" className="text-right">
              {t('manualPosition.tickerSymbol')}
            </Label>
            <Input
              id="ticker"
              value={tickerSymbol}
              onChange={(e) => setTickerSymbol(e.target.value.toUpperCase())}
              placeholder={market === 'CN' ? '510300' : 'AAPL'}
              className="col-span-3"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="direction" className="text-right">
              {t('manualPosition.direction')}
            </Label>
            <Select
              value={direction}
              onValueChange={(value) => setDirection(value as 'long' | 'short')}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="long">{t('manualPosition.long')}</SelectItem>
                <SelectItem value="short">{t('manualPosition.short')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="shares" className="text-right">
              {t('manualPosition.shares')}
            </Label>
            <Input
              id="shares"
              type="number"
              step={market === 'CN' ? '100' : '1'}
              min={market === 'CN' ? '100' : '1'}
              value={shares}
              onChange={(e) => {
                let value = e.target.value
                // For CN market, round to nearest 100 as user types
                if (market === 'CN' && value) {
                  const num = parseFloat(value)
                  if (!isNaN(num) && num > 0) {
                    const rounded = Math.round(num / 100) * 100
                    value = rounded.toString()
                  }
                }
                setShares(value)
              }}
              onBlur={() => {
                // Ensure shares are rounded on blur for CN market
                if (market === 'CN' && shares) {
                  const num = parseFloat(shares)
                  if (!isNaN(num) && num > 0) {
                    const rounded = Math.round(num / 100) * 100
                    setShares(rounded.toString())
                  }
                }
              }}
              placeholder={market === 'CN' ? '100' : '100'}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="entry" className="text-right">
              {t('manualPosition.entryPrice')}
            </Label>
            <Input
              id="entry"
              type="number"
              step="0.01"
              min="0.01"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              placeholder="150.00"
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="stop" className="text-right">
              {t('manualPosition.stopPrice')}
            </Label>
            <Input
              id="stop"
              type="number"
              step="0.01"
              min="0.01"
              value={stopPrice}
              onChange={(e) => setStopPrice(e.target.value)}
              placeholder={direction === 'long' ? '145.00' : '155.00'}
              className="col-span-3"
            />
          </div>

          {entryPrice && stopPrice && shares && (
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('manualPosition.riskPerShare')}:</span>
                <span className="font-medium">
                  ${Math.abs(parseFloat(entryPrice) - parseFloat(stopPrice)).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('manualPosition.totalRisk')}:</span>
                <span className="font-medium">
                  $
                  {(
                    Math.abs(parseFloat(entryPrice) - parseFloat(stopPrice)) *
                    parseFloat(shares || '0')
                  ).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('manualPosition.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? t('manualPosition.adding') : t('manualPosition.add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
