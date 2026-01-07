import { Moon, Sun } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "next-themes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface HeaderProps {
  market: "US" | "CN";
  onMarketChange: (value: "US" | "CN") => void;
}

export function Header({ market, onMarketChange }: HeaderProps) {
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  
  // Determine if we are effectively in dark mode (handles 'system' preference)
  // Note: For simple UI toggles, usually checking theme === 'dark' is enough, 
  // but if we want to show the icon based on resolving system, we rely on standard behavior or user preference.
  const isDark = theme === "dark";

  return (
    <header className="border-b backdrop-blur-sm transition-colors duration-300 dark:border-gray-700 dark:bg-gray-900/80 border-gray-200 bg-white/80">
      <div className="max-w-[1260px] mx-auto px-4 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight transition-colors dark:text-white text-gray-900">
              {t("header.title")}
            </h1>
            <p className="text-xs sm:text-sm mt-0.5 sm:mt-1 transition-colors dark:text-gray-400 text-gray-500">
              {t("header.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={market} onValueChange={onMarketChange}>
              <SelectTrigger className="w-[110px] h-9 transition-colors dark:bg-gray-800 dark:border-gray-700 dark:text-white bg-white border-gray-200 text-gray-900">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700 dark:text-white bg-white">
                <SelectItem
                  value="US"
                  className="dark:focus:bg-gray-700 dark:focus:text-white"
                >
                  <div className="flex items-center">
                    <span className="w-5 text-center font-semibold text-emerald-500 mr-2">
                      $
                    </span>
                    <span>USD</span>
                  </div>
                </SelectItem>
                <SelectItem
                  value="CN"
                  className="dark:focus:bg-gray-700 dark:focus:text-white"
                >
                  <div className="flex items-center">
                    <span className="w-5 text-center font-semibold text-rose-500 mr-2">
                      ¥
                    </span>
                    <span>CNY</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="p-2 sm:p-2.5 md:p-3 rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
            >
              <span className="sr-only">Toggle theme</span>
              {isDark ? (
                <Sun className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Moon className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
