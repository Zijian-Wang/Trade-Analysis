import { useState, useEffect } from "react";
import { Trade, getTrades } from "../services/tradeService";
import { calculatePortfolioRisk } from "../services/riskCalculator";
import { useAuth } from "../context/AuthContext";
import { useMarketSettings } from "../hooks/useMarketSettings";
import { useLanguage } from "../context/LanguageContext";
import { Loader } from "../components/ui/loader";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Donut } from "recharts";
import { MarketFlag } from "../components/MarketFlag";
import { MarketSessionIcon } from "../components/MarketSessionIcon";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export function PortfolioOverviewPage() {
  const { user } = useAuth();
  const { market, currencySymbol, portfolioCapital } = useMarketSettings();
  const { t } = useLanguage(); // Added useLanguage hook
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTrades = async () => {
      setLoading(true);
      try {
        const allTrades = await getTrades(user?.uid || null);
        // Filter for Active trades
        const activeDefaults = allTrades.filter(t => t.status === 'ACTIVE');
        setTrades(activeDefaults);
      } catch (error) {
        console.error("Failed to load trades", error);
      } finally {
        setLoading(false);
      }
    };
    loadTrades();
  }, [user]);

  const totalRisk = calculatePortfolioRisk(trades);
  
  // Data for Risk by Symbol
  const riskBySymbolData = trades.map(t => ({
    name: t.symbol,
    value: t.riskAmount
  })).sort((a, b) => b.value - a.value);

  // Data for Cash vs Risk
  // Assuming portfolioCapital is total account value
  // If risk is just "risk at play", it's not the same as "value deployed".
  // But let's visualize "Risk Usage".
  
  // Actually, let's show "Exposure" (Position Value) vs "Cash" (Approx) if we tracked it.
  // Since we don't track live cash adjustments perfectly without a ledger, 
  // let's visualize "Risk Budget Usage".
  
  // Limit max risk to say 2% of capital per trade? Or just show % of capital at risk.
  const capitalAtRisk = totalRisk;
  const safeCapital = Math.max(0, portfolioCapital - capitalAtRisk);
  
  const riskVsCapitalData = [
    { name: t('portfolioSummary.capitalAtRisk'), value: capitalAtRisk }, // Replaced hardcoded string
    { name: t('portfolioSummary.safeCapital'), value: safeCapital }, // Replaced hardcoded string
  ];

  if (loading) return <div className="p-12 flex justify-center"><Loader /></div>;

  // Group trades by market
  const markets = ['US', 'CN'] as const;
  
  // A helper component for the charts to avoid duplication
  const MarketPortfolioCard = ({ marketKey }: { marketKey: 'US' | 'CN' }) => {
     const marketTrades = trades.filter(t => t.market === marketKey || (!t.market && marketKey === 'US'));
     
     // Determine capital for this market (if split)
     // For now, if we have single portfolioCapital, we might allocate it??
     // Or, we should have used the US/CN split in settings. 
     // `portfolioCapital` from hook is the *current active* one if single mode?
     // Actually useMarketSettings hook returns the *current* market's capital or selected.
     // But for OVERVIEW, we want to see ALL.
     // So we need to access the full preferences potentially?
     // For simplified MVP, let's assume `portfolioCapital` passed from hook matches the market if we swtich context??
     // Wait, the page needs to show BOTH if they have data.
     
     // If we are in "Multi Market" mode, we might want to show both.
     if (marketTrades.length === 0) return null;

     const marketRisk = calculatePortfolioRisk(marketTrades);
     
     // Risk by Symbol Data
     const riskBySymbolData = marketTrades.map(t => ({
        name: t.symbol,
        value: t.riskAmount
      })).sort((a, b) => b.value - a.value);

     // Capital Risk Data
     // NOTE: This assumes `portfolioCapital` is correct for THIS market. 
     // Since we don't have easy access to the "other" market capital from the simple hook without context:
     // We will calculate "Risk Exposure" only for now, or just use the global capital if user treats it as one pot.
     // Ideally, we'd fetch specific capital per market. 
     // Let's rely on the passed capital for the *current* market, but for the *other* market, we might lack data if not switched.
     // **Correction**: The user asked to show them separately.
     // For now, let's just render the Risk Allocation chart for each market.
     
     return (
       <div className="space-y-4">
         <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
          <span className="inline-flex items-center gap-2">
            <MarketFlag
              market={marketKey}
              className="h-4 w-6 rounded-[2px] shadow-sm ring-1 ring-black/5"
            />
            <span>{marketKey === 'US' ? 'US Market' : 'CN Market'}</span>
            <MarketSessionIcon market={marketKey} />
          </span>
         </h2>
         
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chart 1: Risk Allocation */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">{t('portfolioSummary.riskAllocation')}</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskBySymbolData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {riskBySymbolData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${currencySymbol}${value.toFixed(2)}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Stats (Simple for now since Capital might be ambiguous in multi-view) */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col justify-center items-center text-center space-y-6">
                <div>
                   <p className="text-sm text-gray-500 mb-1">{t('portfolioSummary.deployedRisk')}</p>
                   <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {currencySymbol}{marketRisk.toFixed(2)}
                   </p>
                </div>
                <div>
                   <p className="text-sm text-gray-500 mb-1">{t('activePositions.positionCount')}</p>
                   <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {marketTrades.length}
                   </p>
                </div>
            </div>
         </div>
       </div>
     );
  };

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('portfolioSummary.overview')}</h1>
      </div>
      
      {markets.map(m => (
        <MarketPortfolioCard key={m} marketKey={m} />
      ))}
      
      {trades.length === 0 && (
         <div className="text-center py-20 text-gray-500">
            {t('portfolioSummary.noActivePositions')}
         </div>
      )}
    </div>
  );
}
