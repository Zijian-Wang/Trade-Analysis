import { useState, useCallback } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { useUserPreferences } from "../context/UserPreferencesContext";

export function useMarketSettings() {
  const { setLanguage } = useLanguage();
  const { user } = useAuth();
  const { preferences } = useUserPreferences();

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

  // Default to 0 for guests (will be overridden by App.tsx if user has preferences)
  const [portfolioCapital, setPortfolioCapital] = useState(0);

  const handleMarketChange = useCallback((value: "US" | "CN") => {
    setMarket(value);

    // Only sync language if:
    // 1. User is not logged in (guest), OR
    // 2. User has languageFollowsMarket preference enabled
    const shouldSyncLanguage = !user || preferences.languageFollowsMarket;

    if (shouldSyncLanguage) {
      if (value === "US") {
        setLanguage('en');
      } else {
        setLanguage('zh');
      }
    }
  }, [setLanguage, user, preferences.languageFollowsMarket]);

  const detectMarketFromSymbol = useCallback((symbol: string) => {
    const trimmed = symbol.trim();
    if (!trimmed) return;

    const isLetter = /^[a-zA-Z]/.test(trimmed);
    const isDigit = /^\d/.test(trimmed);

    if (isLetter && market !== 'US') {
      handleMarketChange('US');
    } else if (isDigit && market !== 'CN') {
      handleMarketChange('CN');
    }
  }, [market, handleMarketChange]);

  return {
    market,
    setMarket: handleMarketChange,
    portfolioCapital,
    setPortfolioCapital,
    detectMarketFromSymbol,
    currencySymbol: market === "US" ? "$" : "¥"
  };
}

