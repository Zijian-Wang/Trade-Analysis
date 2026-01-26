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
import { Trade, updateTrade } from '../services/tradeService'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { toast } from 'sonner'
import { calculateTradeRisk } from '../services/riskCalculator'

interface EditSharesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trade: Trade | null
  onSuccess: () => void
}

export function EditSharesModal({
  open,
  onOpenChange,
  trade,
  onSuccess,
}: EditSharesModalProps) {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [newShares, setNewShares] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when modal opens/closes or trade changes
  useEffect(() => {
    if (open && trade) {
      // For CN market, ensure shares are rounded to 100
      let shares = trade.positionSize
      if (trade.market === 'CN') {
        shares = Math.round(shares / 100) * 100
      }
      setNewShares(shares.toString())
    }
  }, [open, trade])

  // Helper function to round shares for CN market (100 share lots)
  const roundSharesForMarket = (shares: number): number => {
    if (trade?.market === 'CN') {
      return Math.round(shares / 100) * 100
    }
    return shares
  }

  const handleSubmit = async () => {
    if (!trade || !trade.id) return

    let sharesNum = parseFloat(newShares)

    if (isNaN(sharesNum) || sharesNum <= 0) {
      toast.error('Please enter a valid number of shares')
      return
    }

    // Round shares for CN market
    sharesNum = roundSharesForMarket(sharesNum)

    if (sharesNum === trade.positionSize) {
      onOpenChange(false)
      return
    }

    setIsSubmitting(true)

    try {
      // Update contracts proportionally (or create a new one if none exist)
      let updatedContracts = trade.contracts || []
      
      if (updatedContracts.length === 0) {
        // Create a new contract if none exist
        const riskPerShare = Math.abs(trade.entry - trade.stop)
        const riskAmount = riskPerShare * sharesNum
        updatedContracts = [
          {
            id: crypto.randomUUID(),
            entryPrice: trade.entry,
            shares: sharesNum,
            riskAmount,
            createdAt: Date.now(),
          },
        ]
      } else {
        // Update all contracts proportionally
        const ratio = sharesNum / trade.positionSize
        updatedContracts = updatedContracts.map((contract) => {
          const updatedShares = Math.round(contract.shares * ratio)
          const effectiveStop = contract.contractStop || trade.stop
          const riskPerShare = Math.abs(contract.entryPrice - effectiveStop)
          const riskAmount = riskPerShare * updatedShares

          return {
            ...contract,
            shares: updatedShares,
            riskAmount,
          }
        })
      }

      // Recalculate total position size and risk
      const totalShares = updatedContracts.reduce((sum, c) => sum + c.shares, 0)
      const totalRisk = calculateTradeRisk({
        ...trade,
        contracts: updatedContracts,
      })

      await updateTrade(user?.uid || null, trade.id, {
        contracts: updatedContracts,
        positionSize: totalShares,
        riskAmount: totalRisk,
      })

      toast.success(t('editShares.success'))
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to update shares:', error)
      toast.error(t('editShares.error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!trade) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('editShares.title')} - {trade.symbol}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="current-shares" className="text-right">
              {t('editShares.currentShares')}
            </Label>
            <Input
              id="current-shares"
              value={trade.positionSize}
              disabled
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="new-shares" className="text-right">
              {t('editShares.newShares')}
            </Label>
            <Input
              id="new-shares"
              type="number"
              step={trade.market === 'CN' ? '100' : '1'}
              min={trade.market === 'CN' ? '100' : '1'}
              value={newShares}
              onChange={(e) => {
                let value = e.target.value
                // For CN market, round to nearest 100 as user types
                if (trade.market === 'CN' && value) {
                  const num = parseFloat(value)
                  if (!isNaN(num) && num > 0) {
                    const rounded = Math.round(num / 100) * 100
                    value = rounded.toString()
                  }
                }
                setNewShares(value)
              }}
              onBlur={() => {
                // Ensure shares are rounded on blur for CN market
                if (trade.market === 'CN' && newShares) {
                  const num = parseFloat(newShares)
                  if (!isNaN(num) && num > 0) {
                    const rounded = Math.round(num / 100) * 100
                    setNewShares(rounded.toString())
                  }
                }
              }}
              className="col-span-3"
              autoFocus
            />
          </div>

          {newShares && parseFloat(newShares) !== trade.positionSize && (
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('editShares.change')}:</span>
                <span
                  className={`font-medium ${
                    parseFloat(newShares) > trade.positionSize
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {parseFloat(newShares) > trade.positionSize ? '+' : ''}
                  {parseFloat(newShares) - trade.positionSize} shares
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('editShares.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? t('editShares.updating') : t('editShares.update')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
