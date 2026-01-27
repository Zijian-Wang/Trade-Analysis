import { Moon, Sun, SunMoon, Check } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "next-themes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { UserMenu } from "./UserMenu";

interface HeaderProps {
  market: "US" | "CN";
  onMarketChange: (value: "US" | "CN") => void;
  currentPage: 'main' | 'active' | 'portfolio' | 'settings';
  onNavigate: (page: 'main' | 'active' | 'portfolio' | 'settings') => void;
}

export function Header({ market, onMarketChange, currentPage, onNavigate }: HeaderProps) {
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
            <p className="hidden sm:block text-sm mt-1 transition-colors dark:text-gray-400 text-gray-500">
              {t("header.subtitle")}
            </p>
          </div>



          <div className="flex items-center gap-1 sm:gap-2">
            {/* Theme Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-2 rounded-lg transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 focus:outline-none"
                >
                  <span className="sr-only">Toggle theme</span>
                  {theme === 'dark' ? (
                    <Moon className="w-[18px] h-[18px]" />
                  ) : theme === 'light' ? (
                    <Sun className="w-[18px] h-[18px]" />
                  ) : (
                    <SunMoon className="w-[18px] h-[18px]" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 bg-white border-gray-200 min-w-[130px]">
                <DropdownMenuItem onClick={() => setTheme("light")} className="dark:focus:bg-gray-700 dark:focus:text-white cursor-pointer justify-between">
                  <div className="flex items-center">
                    <Sun className="mr-2 h-4 w-4" />
                    <span>Light</span>
                  </div>
                  {theme === 'light' && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")} className="dark:focus:bg-gray-700 dark:focus:text-white cursor-pointer justify-between">
                  <div className="flex items-center">
                    <Moon className="mr-2 h-4 w-4" />
                    <span>Dark</span>
                  </div>
                  {theme === 'dark' && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")} className="dark:focus:bg-gray-700 dark:focus:text-white cursor-pointer justify-between">
                  <div className="flex items-center">
                    <SunMoon className="mr-2 h-4 w-4" />
                    <span>Auto</span>
                  </div>
                  {theme === 'system' && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Market Selector */}
            <Select value={market} onValueChange={onMarketChange}>
              <SelectTrigger className="w-auto gap-1.5 h-9 px-3 rounded-lg border-0 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 text-gray-700 dark:text-gray-200 focus:ring-0 focus:ring-offset-0 shadow-none">
                <SelectValue placeholder="Market" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700 dark:text-white bg-white rounded-xl shadow-xl border border-gray-200">
                <SelectItem
                  value="US"
                  className="dark:focus:bg-gray-700 dark:focus:text-white rounded-lg"
                >
                  US
                </SelectItem>
                <SelectItem
                  value="CN"
                  className="dark:focus:bg-gray-700 dark:focus:text-white rounded-lg"
                >
                  CN
                </SelectItem>
              </SelectContent>
            </Select>

            {/* User Menu */}
            <UserMenu onNavigate={onNavigate} />
          </div>
        </div>
      </div>
    </header>
  );
}

