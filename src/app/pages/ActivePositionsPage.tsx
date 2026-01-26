import { useState, useEffect } from "react";
import { Trade, getTrades, updateTrade } from "../services/tradeService";
import { calculatePortfolioRisk } from "../services/riskCalculator";
import { useAuth } from "../context/AuthContext";
import { useMarketSettings } from "../hooks/useMarketSettings";
import { Loader } from "../components/ui/loader";

import { StopAdjustModal } from "../components/StopAdjustModal";
import { ChevronDown, ChevronUp, BarChart2, ShieldAlert, PlusCircle, XCircle } from "lucide-react";
import { MarketChart } from "../components/MarketChart";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { toast } from "sonner";
import { useLanguage } from "../context/LanguageContext";

interface ActivePositionsPageProps {
  onAddToPosition?: (trade: Trade) => void;
}

export function ActivePositionsPage({ onAddToPosition }: ActivePositionsPageProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { market, currencySymbol } = useMarketSettings();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTradeId, setExpandedTradeId] = useState<string | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [stopModalOpen, setStopModalOpen] = useState(false);
  
  // Close Confirmation State
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [tradeToClose, setTradeToClose] = useState<Trade | null>(null);

  const fetchTrades = async () => {
      try {
        const allTrades = await getTrades(user?.uid || null);
        const activeDefaults = allTrades.filter(t => t.status === 'ACTIVE');
        setTrades(activeDefaults);
      } catch (error) {
        console.error("Failed to load active trades", error);
      }
  };

  useEffect(() => {
    const loadTrades = async () => {
      setLoading(true);
      await fetchTrades();
      setLoading(false);
    };
    loadTrades();
  }, [user]);


  const handleStopUpdate = async (newStop: number) => {
    if (!selectedTrade || !selectedTrade.id) return;
    
    try {
      await updateTrade(user?.uid || null, selectedTrade.id, {
        structureStop: newStop
      });
      toast.success(t('stopAdjust.success'));
      fetchTrades(); // Refresh
    } catch (e) {
      toast.error(t('stopAdjust.error'));
    }
  };

  const handleClosePosition = async () => {
    if (!tradeToClose || !tradeToClose.id) return;

    try {
      await updateTrade(user?.uid || null, tradeToClose.id, { status: 'CLOSED' });
      toast.success("Position closed");
      fetchTrades();
    } catch (e) {
      console.error("Failed to close position", e);
      toast.error("Failed to close position");
    }
  };

  const totalRisk = calculatePortfolioRisk(trades);

  if (loading) {
    return <div className="flex justify-center p-8"><Loader /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Risk Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <div>
           <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('activePositions.totalRisk')}</h2>
           <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
             {currencySymbol}{totalRisk.toLocaleString('en-US', { minimumFractionDigits: 2 })}
           </p>
        </div>
        <div className="text-right">
           <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('activePositions.positionCount')}</h2>
           <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
             {trades.length}
           </p>
        </div>
      </div>

      {/* Positions Grouped by Market */}
      {trades.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
           {t('activePositions.noPositions')}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Helper to render a table for a set of trades */}
          {['US', 'CN'].map((groupMarket) => {
            const groupTrades = trades.filter(t => t.market === groupMarket || (!t.market && groupMarket === 'US'));
            if (groupTrades.length === 0) return null;

            return (
              <div key={groupMarket} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 font-medium flex items-center gap-2">
                   <span>{groupMarket === 'US' ? '🇺🇸 US Market' : '🇨🇳 CN Market'}</span>
                   <span className="text-xs text-gray-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">
                     {groupTrades.length}
                   </span>
                </div>
                <table className="w-full text-sm text-left">
                 <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700">
                   <tr>
                     <th className="px-4 py-3">{t('activePositions.col_symbol')}</th>
                     <th className="px-4 py-3">{t('activePositions.col_entry')}</th>
                     <th className="px-4 py-3">{t('activePositions.col_stop')}</th>
                     <th className="px-4 py-3">{t('activePositions.col_shares')}</th>
                     <th className="px-4 py-3">{t('activePositions.col_risk')}</th>
                     <th className="px-4 py-3 text-right">{t('activePositions.col_actions')}</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                   {groupTrades.map(trade => (
                     <>
                       <tr key={trade.id} 
                           className={`hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer transition-colors ${expandedTradeId === trade.id ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                           onClick={() => setExpandedTradeId(expandedTradeId === trade.id ? null : trade.id!)}
                       >
                         <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            {expandedTradeId === trade.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            {trade.symbol}
                         </td>
                         <td className="px-4 py-3">{trade.entry}</td>
                         <td className="px-4 py-3 text-rose-500">{trade.structureStop}</td>
                         <td className="px-4 py-3">{trade.positionSize}</td>
                         <td className="px-4 py-3">{trade.riskAmount.toFixed(2)}</td>
                         <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                           <button 
                             className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full" 
                             title="Chart"
                             onClick={(e) => {
                               e.stopPropagation();
                               setExpandedTradeId(expandedTradeId === trade.id ? null : trade.id!);
                             }}
                           >
                             <BarChart2 size={18} className="text-gray-500" />
                           </button>
                           <button 
                             className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                             title="Adjust Stop"
                             onClick={(e) => {
                               e.stopPropagation();
                               setSelectedTrade(trade);
                               setStopModalOpen(true);
                             }}
                           >
                             <ShieldAlert size={18} className="text-gray-500" />
                           </button>
                           <button 
                             className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                             title="Add to Position"
                             onClick={(e) => {
                                e.stopPropagation();
                                if (onAddToPosition) {
                                  onAddToPosition(trade);
                                }
                             }}
                           >
                             <PlusCircle size={18} className="text-gray-500" />
                           </button>
                           <button 
                             className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                             title="Close Position"
                             onClick={(e) => {
                                e.stopPropagation();
                                setTradeToClose(trade);
                                setCloseConfirmOpen(true);
                             }}
                           >
                             <XCircle size={18} className="text-gray-500" />
                           </button>
                         </td>
                       </tr>
                       {expandedTradeId === trade.id && (
                         <tr>
                           <td colSpan={6} className="p-0">
                             <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
                               <MarketChart
                                 symbol={trade.symbol}
                                 market={trade.market}
                                 height={320}
                                 levels={[
                                   { price: trade.entry, label: 'ENTRY', color: '#3b82f6' },
                                   { price: trade.structureStop, label: 'STOP', color: '#ef4444' },
                                   ...(trade.target ? [{ price: trade.target, label: 'TARGET', color: '#10b981', lineStyle: 2 }] : [])
                                 ] as any}
                               />
                             </div>
                           </td>
                         </tr>
                       )}
                     </>
                   ))}
                 </tbody>
               </table>
              </div>
            );
          })}
        </div>
      )}

      {selectedTrade && (
        <StopAdjustModal 
          open={stopModalOpen} 
          onOpenChange={setStopModalOpen}
          trade={selectedTrade}
          onConfirm={handleStopUpdate}
        />
      )}

      <ConfirmDialog
        open={closeConfirmOpen}
        onOpenChange={setCloseConfirmOpen}
        title={t('activePositions.actions.close')}
        description={t('activePositions.actions.confirmClose')}
        confirmLabel={t('activePositions.actions.close')}
        variant="destructive"
        onConfirm={handleClosePosition}
      />
    </div>
  );
}
