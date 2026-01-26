import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import {
  X,
  User,
  Settings as SettingsIcon,
  Shield,
  Loader2,
  Check,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  useUserPreferences,
  UserPreferences,
} from '../context/UserPreferencesContext'
import { useLanguage } from '../context/LanguageContext'
import { toast } from 'sonner'

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type MarketPreference = 'US' | 'CN' | 'both'
type LanguagePreference = 'en' | 'zh' | 'auto'

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { t, setLanguage } = useLanguage()
  const { user } = useAuth()
  const { preferences, updatePreferences } = useUserPreferences()

  const [activeTab, setActiveTab] = useState<
    'profile' | 'preferences' | 'account'
  >('preferences')
  const [loading, setLoading] = useState(false)
  const [localPrefs, setLocalPrefs] = useState<UserPreferences>(preferences)

  // Market preference state (derived from singleMarketMode)
  const [marketPreference, setMarketPreference] =
    useState<MarketPreference>('both')
  const [languagePreference, setLanguagePreference] =
    useState<LanguagePreference>('auto')

  // Profile update state
  const { updateDisplayName, updateUserEmail } = useAuth()
  const [displayNameInput, setDisplayNameInput] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState('')

  // Initialize inputs when user changes
  useEffect(() => {
    if (user) {
      setDisplayNameInput(user.displayName || '')
      setEmailInput(user.email || '')
    }
  }, [user])

  // Sync local state when preferences change
  useEffect(() => {
    setLocalPrefs(preferences)
    // Derive market preference
    if (preferences.singleMarketMode) {
      setMarketPreference('US') // Default to US for single market
    } else {
      setMarketPreference('both')
    }
  }, [preferences])

  const handleSave = async () => {
    setLoading(true)
    try {
      await updatePreferences(localPrefs)
      toast.success(t('settings.saved'))
    } catch (err) {
      toast.error('Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  const handlePortfolioChange = (market: 'US' | 'CN', value: string) => {
    const numValue = parseFloat(value.replace(/,/g, '')) || 0
    setLocalPrefs({
      ...localPrefs,
      defaultPortfolio: {
        ...localPrefs.defaultPortfolio,
        [market]: numValue,
      },
    })
  }

  const handleMarketPreferenceChange = (market: MarketPreference) => {
    setMarketPreference(market)
    setLocalPrefs({
      ...localPrefs,
      singleMarketMode: market !== 'both',
    })
  }

  const handleLanguagePreferenceChange = (lang: LanguagePreference) => {
    setLanguagePreference(lang)
    if (lang === 'auto') {
      setLocalPrefs({
        ...localPrefs,
        languageFollowsMarket: true,
      })
    } else {
      setLocalPrefs({
        ...localPrefs,
        languageFollowsMarket: false,
      })
      setLanguage(lang)
    }
  }

  const handleUpdateDisplayName = async () => {
    if (!displayNameInput.trim()) return

    setProfileLoading(true)
    setProfileError('')

    try {
      await updateDisplayName(displayNameInput.trim())
      toast.success('Display name updated successfully')
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update display name')
      toast.error('Failed to update display name')
    } finally {
      setProfileLoading(false)
    }
  }

  const handleUpdateEmail = async () => {
    if (!emailInput.trim() || !currentPassword.trim()) return

    setProfileLoading(true)
    setProfileError('')

    try {
      await updateUserEmail(emailInput.trim(), currentPassword)
      toast.success('Email updated successfully')
      setCurrentPassword('') // Clear password after success
    } catch (err: any) {
      let errorMessage = 'Failed to update email'

      if (err.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password'
      } else if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already in use'
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email format'
      } else if (err.code === 'auth/requires-recent-login') {
        errorMessage =
          'Please sign out and sign in again before changing your email'
      } else if (err.message) {
        errorMessage = err.message
      }

      setProfileError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setProfileLoading(false)
    }
  }

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

          <Tabs.Root
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as any)}
          >
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
              {/* Market Selection - Pill Shaped */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-900 dark:text-white">
                  Market Selection
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Choose which markets you want to trade in
                </p>
                <div className="inline-flex bg-gray-100 dark:bg-gray-700 p-1 rounded-full w-full">
                  <button
                    onClick={() => handleMarketPreferenceChange('US')}
                    className={`flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                      marketPreference === 'US'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    US
                  </button>
                  <button
                    onClick={() => handleMarketPreferenceChange('CN')}
                    className={`flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                      marketPreference === 'CN'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    China
                  </button>
                  <button
                    onClick={() => handleMarketPreferenceChange('both')}
                    className={`flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                      marketPreference === 'both'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    Both
                  </button>
                </div>
              </div>

              {/* Language Selection - Pill Shaped */}
              <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <label className="text-sm font-medium text-gray-900 dark:text-white">
                  Language
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Select your preferred language for the interface
                </p>
                <div className="inline-flex bg-gray-100 dark:bg-gray-700 p-1 rounded-full w-full">
                  <button
                    onClick={() => handleLanguagePreferenceChange('en')}
                    className={`flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                      languagePreference === 'en'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => handleLanguagePreferenceChange('zh')}
                    className={`flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                      languagePreference === 'zh'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    CH
                  </button>
                  <button
                    onClick={() => handleLanguagePreferenceChange('auto')}
                    className={`flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                      languagePreference === 'auto'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    Auto
                  </button>
                </div>
              </div>

              {/* Default Portfolio - Conditional by market */}
              <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <label className="text-sm font-medium text-gray-900 dark:text-white">
                  Default Portfolio Capital
                </label>

                {/* US Portfolio */}
                {(marketPreference === 'US' || marketPreference === 'both') && (
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1.5">
                      US Portfolio
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 font-medium">
                        $
                      </span>
                      <input
                        type="text"
                        value={localPrefs.defaultPortfolio.US.toLocaleString()}
                        onChange={(e) =>
                          handlePortfolioChange('US', e.target.value)
                        }
                        placeholder="0"
                        className="w-full pl-8 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* CN Portfolio */}
                {(marketPreference === 'CN' || marketPreference === 'both') && (
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1.5">
                      China Portfolio
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-500 font-medium">
                        ¥
                      </span>
                      <input
                        type="text"
                        value={localPrefs.defaultPortfolio.CN.toLocaleString()}
                        onChange={(e) =>
                          handlePortfolioChange('CN', e.target.value)
                        }
                        placeholder="0"
                        className="w-full pl-8 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      />
                    </div>
                  </div>
                )}
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
            <Tabs.Content value="profile" className="space-y-6">
              {user && (
                <>
                  {/* Display Name Section */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                      {t('settings.displayName')}
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      This is how your name will appear in the app
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={displayNameInput}
                        onChange={(e) => setDisplayNameInput(e.target.value)}
                        className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        placeholder="Enter display name"
                      />
                      <button
                        onClick={handleUpdateDisplayName}
                        disabled={
                          profileLoading ||
                          !displayNameInput.trim() ||
                          displayNameInput === user.displayName
                        }
                        className="px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                      >
                        {profileLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Save
                      </button>
                    </div>
                    {profileError && (
                      <p className="text-sm text-rose-600 dark:text-rose-400">
                        {profileError}
                      </p>
                    )}
                  </div>

                  {/* Email Section */}
                  <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                      {t('settings.email')}
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('settings.emailChangeWarning')}
                    </p>
                    <div className="space-y-2">
                      <input
                        type="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        placeholder="Enter new email"
                      />
                      {emailInput !== user.email && emailInput.trim() && (
                        <div className="flex gap-2">
                          <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                            placeholder="Current password (required)"
                          />
                          <button
                            onClick={handleUpdateEmail}
                            disabled={profileLoading || !currentPassword.trim()}
                            className="px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                          >
                            {profileLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            Update Email
                          </button>
                        </div>
                      )}
                    </div>
                    {profileError && emailInput !== user.email && (
                      <p className="text-sm text-rose-600 dark:text-rose-400">
                        {profileError}
                      </p>
                    )}
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
  )
}
