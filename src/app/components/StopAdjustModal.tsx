import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useState } from "react";
import { Trade } from "../services/tradeService";
import { useLanguage } from "../context/LanguageContext";

interface StopAdjustModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trade: Trade;
  onConfirm: (newStop: number) => void;
}

export function StopAdjustModal({ open, onOpenChange, trade, onConfirm }: StopAdjustModalProps) {
  const { t } = useLanguage();
  const [newStop, setNewStop] = useState(trade.structureStop.toString());

  const handleConfirm = () => {
    const stopVal = parseFloat(newStop);
    if (!isNaN(stopVal) && stopVal > 0) {
      onConfirm(stopVal);
      onOpenChange(false);
    }
  };

  const currentRisk = trade.riskAmount;
  // Calculate new projected risk (simplified for structure stop)
  const priceRisk = Math.abs(trade.entry - parseFloat(newStop || '0'));
  const newProjectedRisk = trade.positionSize * priceRisk;
  const riskChange = newProjectedRisk - currentRisk;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('stopAdjust.title')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="current-stop" className="text-right">
              {t('stopAdjust.current')}
            </Label>
            <Input id="current-stop" value={trade.structureStop} disabled className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="new-stop" className="text-right">
              {t('stopAdjust.newStop')}
            </Label>
            <Input
              id="new-stop"
              type="number"
              value={newStop}
              onChange={(e) => setNewStop(e.target.value)}
              className="col-span-3"
            />
          </div>
          
          {/* Risk Impact Preview */}
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg text-sm space-y-2">
             <div className="flex justify-between">
                <span className="text-gray-500">{t('stopAdjust.currentRisk')}:</span>
                <span className="font-medium">${currentRisk.toFixed(2)}</span>
             </div>
             <div className="flex justify-between">
                <span className="text-gray-500">{t('stopAdjust.newRisk')}:</span>
                <span className="font-medium">${newProjectedRisk.toFixed(2)}</span>
             </div>
             <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                <span>{t('stopAdjust.change')}:</span>
                <span className={riskChange < 0 ? "text-green-500" : "text-rose-500"}>
                  {riskChange > 0 ? '+' : ''}{riskChange.toFixed(2)}
                </span>
             </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('stopAdjust.cancel')}</Button>
          <Button onClick={handleConfirm}>{t('stopAdjust.confirm')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
