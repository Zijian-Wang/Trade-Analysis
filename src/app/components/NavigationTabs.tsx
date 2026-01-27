import { useLanguage } from "../context/LanguageContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface NavigationTabsProps {
  currentPage: 'main' | 'active' | 'portfolio' | 'settings';
  onNavigate: (page: 'main' | 'active' | 'portfolio' | 'settings') => void;
}

export function NavigationTabs({ currentPage, onNavigate }: NavigationTabsProps) {
  const { t } = useLanguage();

  return (
    <div className="w-full border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-[1260px] mx-auto px-4 sm:px-4 md:px-6">
        <nav className="flex items-center gap-6 overflow-x-auto no-scrollbar">
          <button
            onClick={() => onNavigate('main')}
            className={`py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              currentPage === 'main'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-700'
            }`}
          >
            {t('header.nav_entry')}
          </button>
          <button
            onClick={() => onNavigate('active')}
            className={`py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              currentPage === 'active'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-700'
            }`}
          >
            {t('header.nav_active')}
          </button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  disabled
                  className={`py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap cursor-not-allowed opacity-50 ${
                    currentPage === 'portfolio'
                      ? 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'
                      : 'border-transparent text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {t('header.nav_portfolio')}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('header.portfolioWip')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </nav>
      </div>
    </div>
  );
}
