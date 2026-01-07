import { useState, useCallback } from "react";
import { useLanguage } from "../context/LanguageContext";

export function useMarketSettings() {
  const { setLanguage } = useLanguage();
  
  const [market, setMarket] = useState<"US" | "CN">(() => {
    try {
      if (typeof window === 'undefined') return "US";
      
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      // Simple check for China timezones
      if (
        timeZone === "Asia/Shanghai" ||
        timeZone === "Asia/Chongqing" ||
        timeZone === "Asia/Harbin" ||
        timeZone === "Asia/Urumqi" ||
        timeZone === "PRC"
      ) {
        const now = new Date();
        // Get hour in Beijing time
        const hour = parseInt(
          new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Shanghai",
            hour: "numeric",
            hour12: false,
          }).format(now),
          10
        );

        if (hour >= 9 && hour < 16) {
          return "CN";
        }
      }
    } catch (e) {
      console.error("Error detecting timezone/market preference", e);
    }
    return "US";
  });

  const [portfolioCapital, setPortfolioCapital] = useState(
    market === "CN" ? 1500000 : 300000
  );

  const handleMarketChange = useCallback((value: "US" | "CN") => {
    setMarket(value);
    if (value === "US") {
      setPortfolioCapital(300000);
      setLanguage('en');
    } else {
      setPortfolioCapital(1500000);
      setLanguage('zh');
    }
  }, [setLanguage]);

  const detectMarketFromSymbol = useCallback((symbol: string) => {
    const trimmed = symbol.trim();
    if (!trimmed) return;

    const isLetter = /^[a-zA-Z]/.test(trimmed);
    const isDigit = /^\d/.test(trimmed);

    if (isLetter && market !== 'US') {
      handleMarketChange('US');
      setLanguage('en'); // Sync language with market
    } else if (isDigit && market !== 'CN') {
      handleMarketChange('CN');
      setLanguage('zh'); // Sync language with market
    }
  }, [market, handleMarketChange, setLanguage]);

  return {
    market,
    setMarket: handleMarketChange,
    portfolioCapital,
    setPortfolioCapital,
    detectMarketFromSymbol,
    currencySymbol: market === "US" ? "$" : "¥"
  };
}
