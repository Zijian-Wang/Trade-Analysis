import { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Settings, LogOut, History, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AuthModal } from './AuthModal';
import { toast } from 'sonner';

interface UserMenuProps {
  onNavigate?: (page: 'main' | 'history' | 'settings') => void;
}

export function UserMenu({ onNavigate }: UserMenuProps) {
  const { t } = useLanguage();
  const { user, signOut, loading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success(t('auth.signOutSuccess'));
    } catch (err) {
      toast.error(t('auth.signOutError'));
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
    );
  }

  // Guest user - show sign in button
  if (!user) {
    return (
      <>
        <button
          onClick={() => setAuthModalOpen(true)}
          className="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100"
        >
          {t('auth.signIn')}
        </button>
        <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
      </>
    );
  }

  // Logged in user - show avatar and dropdown
  const initials = user.displayName
    ? user.displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email?.[0].toUpperCase() || 'U';

  return (
    <>
      <DropdownMenu.Root open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenu.Trigger asChild>
          <button className="flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                {initials}
              </div>
            )}
            <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400 hidden sm:block" />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={8}
            className="w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50"
          >
            {/* User info */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user.displayName || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user.email}
              </p>
            </div>

            {/* Menu items */}
            <div className="py-1">
              <DropdownMenu.Item
                onSelect={() => onNavigate?.('history')}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700"
              >
                <History className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                {t('auth.tradeHistory')}
              </DropdownMenu.Item>

              <DropdownMenu.Item
                onSelect={() => onNavigate?.('settings')}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700"
              >
                <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                {t('auth.settings')}
              </DropdownMenu.Item>
            </div>

            <DropdownMenu.Separator className="h-px bg-gray-100 dark:bg-gray-700 my-1" />

            <DropdownMenu.Item
              onSelect={handleSignOut}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 cursor-pointer focus:outline-none focus:bg-rose-50 dark:focus:bg-rose-900/30"
            >
              <LogOut className="w-4 h-4" />
              {t('auth.signOut')}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </>
  );
}
