import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import * as Switch from '@radix-ui/react-switch';
import { X, User, Settings as SettingsIcon, Shield, Loader2, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUserPreferences, UserPreferences } from '../context/UserPreferencesContext';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'sonner';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { preferences, updatePreferences } = useUserPreferences();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'account'>('preferences');
  const [loading, setLoading] = useState(false);
  const [localPrefs, setLocalPrefs] = useState<UserPreferences>(preferences);

  // Sync local state when preferences change
  useEffect(() => {
    setLocalPrefs(preferences);
  }, [preferences]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updatePreferences(localPrefs);
      toast.success(t('settings.saved'));
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handlePortfolioChange = (market: 'US' | 'CN', value: string) => {
    const numValue = parseFloat(value.replace(/,/g, '')) || 0;
    setLocalPrefs({
      ...localPrefs,
      defaultPortfolio: {
        ...localPrefs.defaultPortfolio,
        [market]: numValue,
      },
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-xl z-50 p-6 focus:outline-none max-h-[85vh] overflow-y-auto">
          <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('settings.title')}
          </Dialog.Title>

          <Dialog.Close className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </Dialog.Close>

          <Tabs.Root value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <Tabs.List className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
              <Tabs.Trigger
                value="preferences"
                className="flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-600 text-gray-600 dark:text-gray-300 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white flex items-center justify-center gap-2"
              >
                <SettingsIcon className="w-4 h-4" />
                {t('settings.preferences')}
              </Tabs.Trigger>
              {user && (
                <>
                  <Tabs.Trigger
                    value="profile"
                    className="flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-600 text-gray-600 dark:text-gray-300 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white flex items-center justify-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    {t('settings.profile')}
                  </Tabs.Trigger>
                  <Tabs.Trigger
                    value="account"
                    className="flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-600 text-gray-600 dark:text-gray-300 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white flex items-center justify-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    {t('settings.account')}
                  </Tabs.Trigger>
                </>
              )}
            </Tabs.List>

            {/* Preferences Tab */}
            <Tabs.Content value="preferences" className="space-y-6">
              {/* Market Mode */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('settings.marketMode')}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setLocalPrefs({ ...localPrefs, singleMarketMode: true })}
                    className={`p-4 rounded-xl border-2 transition-colors text-left ${
                      localPrefs.singleMarketMode
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {t('settings.singleMarket')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {t('settings.singleMarketDesc')}
                    </p>
                  </button>
                  <button
                    onClick={() => setLocalPrefs({ ...localPrefs, singleMarketMode: false })}
                    className={`p-4 rounded-xl border-2 transition-colors text-left ${
                      !localPrefs.singleMarketMode
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {t('settings.multiMarket')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {t('settings.multiMarketDesc')}
                    </p>
                  </button>
                </div>
              </div>

              {/* Language Sync */}
              <div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-gray-700">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {t('settings.languageSync')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {t('settings.languageSyncDesc')}
                  </p>
                </div>
                <Switch.Root
                  checked={localPrefs.languageFollowsMarket}
                  onCheckedChange={(checked) =>
                    setLocalPrefs({ ...localPrefs, languageFollowsMarket: checked })
                  }
                  className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full relative data-[state=checked]:bg-blue-500 transition-colors"
                >
                  <Switch.Thumb className="block w-5 h-5 bg-white rounded-full shadow-md transition-transform translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px]" />
                </Switch.Root>
              </div>

              {/* Default Portfolio */}
              <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <label className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('settings.defaultPortfolio')}
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1.5">
                      {t('settings.usPortfolio')}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 font-medium">
                        $
                      </span>
                      <input
                        type="text"
                        value={localPrefs.defaultPortfolio.US.toLocaleString()}
                        onChange={(e) => handlePortfolioChange('US', e.target.value)}
                        className="w-full pl-8 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1.5">
                      {t('settings.cnPortfolio')}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-500 font-medium">
                        ¥
                      </span>
                      <input
                        type="text"
                        value={localPrefs.defaultPortfolio.CN.toLocaleString()}
                        onChange={(e) => handlePortfolioChange('CN', e.target.value)}
                        className="w-full pl-8 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full py-3 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mt-4"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
                {t('settings.save')}
              </button>
            </Tabs.Content>

            {/* Profile Tab */}
            <Tabs.Content value="profile" className="space-y-4">
              {user && (
                <>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1.5">
                      {t('settings.displayName')}
                    </label>
                    <input
                      type="text"
                      value={user.displayName || ''}
                      readOnly
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1.5">
                      {t('settings.email')}
                    </label>
                    <input
                      type="email"
                      value={user.email || ''}
                      readOnly
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm cursor-not-allowed"
                    />
                  </div>
                </>
              )}
            </Tabs.Content>

            {/* Account Tab */}
            <Tabs.Content value="account" className="space-y-4">
              <button
                disabled
                className="w-full py-3 px-4 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('settings.changePassword')}
              </button>
              <button
                disabled
                className="w-full py-3 px-4 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 font-medium rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('settings.deleteAccount')}
              </button>
              <p className="text-xs text-gray-400 text-center">
                Password change and account deletion coming soon
              </p>
            </Tabs.Content>
          </Tabs.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
