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
import { Trade, RiskContract, updateTrade } from '../services/tradeService'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import {
  calculateEffectiveStop,
  calculateTradeRisk,
} from '../services/riskCalculator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

interface StopAdjustModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trade: Trade
  onConfirm: (newStop: number) => void
  onContractStopUpdate?: () => void
}

export function StopAdjustModal({
  open,
  onOpenChange,
  trade,
  onConfirm,
  onContractStopUpdate,
}: StopAdjustModalProps) {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [mode, setMode] = useState<'stop' | 'contract'>('stop')
  const [newStop, setNewStop] = useState(trade.stop.toString())
  const [selectedContractId, setSelectedContractId] = useState<string>('')
  const [contractStop, setContractStop] = useState<string>('')

  // Reset state when modal opens/closes or trade changes
  useEffect(() => {
    if (open) {
      setNewStop(trade.stop.toString())
      if (trade.contracts && trade.contracts.length > 0) {
        setSelectedContractId(trade.contracts[0].id)
        const firstContract = trade.contracts[0]
        setContractStop(firstContract.contractStop?.toString() || '')
      }
    }
  }, [open, trade])

  const selectedContract = trade.contracts?.find(
    (c) => c.id === selectedContractId,
  )

  const handleStopConfirm = () => {
    const stopVal = parseFloat(newStop)
    if (!isNaN(stopVal) && stopVal > 0) {
      // Validate stop price
      const isLong = trade.direction === 'long'
      const isValid = isLong ? stopVal < trade.entry : stopVal > trade.entry

      if (!isValid) {
        // Error will be shown by parent component
        return
      }

      onConfirm(stopVal)
      onOpenChange(false)
    }
  }

  const handleContractStopConfirm = async () => {
    if (!selectedContractId || !trade.id) return

    const stopVal = contractStop ? parseFloat(contractStop) : null
    if (stopVal !== null && (isNaN(stopVal) || stopVal <= 0)) {
      return
    }

    try {
      // If stopVal is null (empty input), remove contractStop; otherwise set it
      const updatedContracts = trade.contracts.map((c) => {
        if (c.id === selectedContractId) {
          if (stopVal === null) {
            // Remove contractStop (Firestore doesn't allow undefined)
            const { contractStop: _, ...rest } = c
            return rest
          }
          return { ...c, contractStop: stopVal }
        }
        return c
      })

      await updateTrade(user?.uid || null, trade.id, {
        contracts: updatedContracts,
        // Recalculate risk amount
        riskAmount: calculateTradeRisk({
          ...trade,
          contracts: updatedContracts,
        }),
      })

      if (onContractStopUpdate) {
        onContractStopUpdate()
      }
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to update contract stop:', error)
    }
  }

  const handleRemoveContractStop = async () => {
    if (!selectedContractId || !trade.id) return

    try {
      // Remove contractStop by destructuring it out (Firestore doesn't allow undefined)
      const updatedContracts = trade.contracts.map((c) => {
        if (c.id === selectedContractId) {
          const { contractStop: _, ...rest } = c
          return rest
        }
        return c
      })

      await updateTrade(user?.uid || null, trade.id, {
        contracts: updatedContracts,
        riskAmount: calculateTradeRisk({
          ...trade,
          contracts: updatedContracts,
        }),
      })

      if (onContractStopUpdate) {
        onContractStopUpdate()
      }
      setContractStop('')
    } catch (error) {
      console.error('Failed to remove contract stop:', error)
    }
  }

  const currentRisk = trade.riskAmount
  const effectiveStop = selectedContract
    ? calculateEffectiveStop(selectedContract, trade.stop)
    : trade.stop

  // Calculate risk for structure stop mode
  const priceRisk = Math.abs(trade.entry - parseFloat(newStop || '0'))
  const newProjectedRisk = trade.positionSize * priceRisk
  const riskChange = newProjectedRisk - currentRisk

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'stop'
              ? t('stopAdjust.title')
              : t('stopAdjust.contractStopTitle')}
          </DialogTitle>
        </DialogHeader>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={mode === 'stop' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('stop')}
          >
            {t('stopAdjust.title')}
          </Button>
          <Button
            variant={mode === 'contract' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('contract')}
            disabled={!trade.contracts || trade.contracts.length === 0}
          >
            {t('stopAdjust.contractStop')}
          </Button>
        </div>

        <div className="grid gap-4 py-4">
          {mode === 'stop' ? (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="current-stop" className="text-right">
                  {t('stopAdjust.current')}
                </Label>
                <Input
                  id="current-stop"
                  value={trade.stop.toFixed(2)}
                  disabled
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="new-stop" className="text-right">
                  {t('stopAdjust.newStop')}
                </Label>
                <Input
                  id="new-stop"
                  type="number"
                  step="0.01"
                  value={newStop}
                  onChange={(e) => setNewStop(e.target.value)}
                  className="col-span-3"
                />
              </div>

              {/* Risk Impact Preview */}
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {t('stopAdjust.currentRisk')}:
                  </span>
                  <span className="font-medium">${currentRisk.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {t('stopAdjust.newRisk')}:
                  </span>
                  <span className="font-medium">
                    ${newProjectedRisk.toFixed(2)}
                  </span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                  <span>{t('stopAdjust.change')}:</span>
                  <span
                    className={
                      riskChange < 0 ? 'text-green-500' : 'text-rose-500'
                    }
                  >
                    {riskChange > 0 ? '+' : ''}
                    {riskChange.toFixed(2)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">
                  {t('stopAdjust.selectContract')}
                </Label>
                <Select
                  value={selectedContractId}
                  onValueChange={(value) => {
                    setSelectedContractId(value)
                    const contract = trade.contracts?.find(
                      (c) => c.id === value,
                    )
                    setContractStop(contract?.contractStop?.toString() || '')
                  }}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {trade.contracts?.map((contract, idx) => (
                      <SelectItem key={contract.id} value={contract.id}>
                        Contract {idx + 1}: {contract.shares} shares @ $
                        {contract.entryPrice.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedContract && (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Stop</Label>
                    <Input
                      value={trade.stop.toFixed(2)}
                      disabled
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">
                      {t('stopAdjust.effectiveStop')}
                    </Label>
                    <Input
                      value={effectiveStop.toFixed(2)}
                      disabled
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="contract-stop" className="text-right">
                      {t('stopAdjust.contractStop')}
                    </Label>
                    <div className="col-span-3 flex gap-2">
                      <Input
                        id="contract-stop"
                        type="number"
                        step="0.01"
                        value={contractStop}
                        onChange={(e) => setContractStop(e.target.value)}
                        placeholder={trade.stop.toFixed(2)}
                      />
                      {selectedContract.contractStop && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveContractStop}
                        >
                          {t('stopAdjust.removeOverride')}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                    {contractStop
                      ? `Contract stop override: ${parseFloat(contractStop || '0').toFixed(2)}`
                      : `Using stop: ${trade.stop.toFixed(2)}`}
                  </div>
                </>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('stopAdjust.cancel')}
          </Button>
          <Button
            onClick={
              mode === 'stop' ? handleStopConfirm : handleContractStopConfirm
            }
          >
            {t('stopAdjust.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
