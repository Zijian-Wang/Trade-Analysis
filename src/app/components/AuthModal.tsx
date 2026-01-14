import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { X, Mail, Lock, User, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'sonner';
import { migrateGuestTrades, getGuestTradeCount } from '../services/tradeService';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Email validation helper
const validateEmail = (email: string): string | null => {
  if (!email) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  return null;
};

// Password validation helper
const validatePassword = (password: string, isSignUp: boolean = false): string | null => {
  if (!password) return null;
  if (password.length < 6) {
    return isSignUp ? 'Password must be at least 6 characters' : 'Invalid password';
  }
  return null;
};

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const { t } = useLanguage();
  const { signIn, signUp, signInWithGoogle, user } = useAuth();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Validation states
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [displayNameTouched, setDisplayNameTouched] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);

  // Real-time email validation
  useEffect(() => {
    if (emailTouched) {
      setEmailError(validateEmail(email));
    }
  }, [email, emailTouched]);

  // Real-time password validation
  useEffect(() => {
    if (passwordTouched) {
      setPasswordError(validatePassword(password, activeTab === 'register'));
    }
  }, [password, passwordTouched, activeTab]);

  // Real-time display name validation
  useEffect(() => {
    if (displayNameTouched && activeTab === 'register') {
      if (!displayName || displayName.trim().length === 0) {
        setDisplayNameError('Display name is required');
      } else {
        setDisplayNameError(null);
      }
    }
  }, [displayName, displayNameTouched, activeTab]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setError('');
    setShowPassword(false);
    setEmailTouched(false);
    setPasswordTouched(false);
    setDisplayNameTouched(false);
    setEmailError(null);
    setPasswordError(null);
    setDisplayNameError(null);
  };

  const handleMigrateTrades = async () => {
    if (user) {
      const guestCount = getGuestTradeCount();
      if (guestCount > 0) {
        try {
          const migrated = await migrateGuestTrades(user.uid);
          toast.success(`Migrated ${migrated} trades from guest session`);
        } catch (err) {
          console.error('Migration error:', err);
        }
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate before submit
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password, false);

    if (emailErr || passwordErr) {
      setEmailTouched(true);
      setPasswordTouched(true);
      setEmailError(emailErr);
      setPasswordError(passwordErr);
      return;
    }

    setLoading(true);

    try {
      await signIn(email, password);
      await handleMigrateTrades();
      onOpenChange(false);
      resetForm();
      toast.success(t('auth.loginSuccess'));
    } catch (err: any) {
      // Handle Firebase-specific errors with user-friendly messages
      let errorMessage = t('auth.loginError');

      if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email. Please sign up first.';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      } else if (err.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate before submit
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password, true);

    if (emailErr || passwordErr) {
      setEmailTouched(true);
      setPasswordTouched(true);
      setEmailError(emailErr);
      setPasswordError(passwordErr);
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password, displayName);
      await handleMigrateTrades();
      onOpenChange(false);
      resetForm();
      toast.success('Account created! Please check your email to verify your account.');
    } catch (err: any) {
      // Handle Firebase-specific errors with user-friendly messages
      let errorMessage = t('auth.registerError');

      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please sign in instead.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use at least 6 characters.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      await signInWithGoogle();
      await handleMigrateTrades();
      onOpenChange(false);
      resetForm();
      toast.success(t('auth.loginSuccess'));
    } catch (err: any) {
      setError(err.message || t('auth.googleError'));
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'login' | 'register');
    setError('');
    setEmailError(null);
    setPasswordError(null);
    setDisplayNameError(null);
    setEmailTouched(false);
    setPasswordTouched(false);
    setDisplayNameTouched(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl z-50 p-6 focus:outline-none">
          <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {activeTab === 'login' ? t('auth.signIn') : t('auth.signUp')}
          </Dialog.Title>

          <Dialog.Close className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </Dialog.Close>

          <Tabs.Root value={activeTab} onValueChange={handleTabChange}>
            <Tabs.List className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
              <Tabs.Trigger
                value="login"
                className="flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-600 text-gray-600 dark:text-gray-300 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white"
              >
                {t('auth.signIn')}
              </Tabs.Trigger>
              <Tabs.Trigger
                value="register"
                className="flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-600 text-gray-600 dark:text-gray-300 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white"
              >
                {t('auth.signUp')}
              </Tabs.Trigger>
            </Tabs.List>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-rose-700 dark:text-rose-300">{error}</span>
              </div>
            )}

            <Tabs.Content value="login">
              <form onSubmit={handleLogin} className="space-y-4" noValidate>
                <div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => setEmailTouched(true)}
                      placeholder={t('auth.email')}
                      className={`w-full pl-11 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${emailError && emailTouched
                        ? 'border-rose-500 dark:border-rose-500'
                        : 'border-gray-200 dark:border-gray-600'
                        }`}
                    />
                  </div>
                  {emailError && emailTouched && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{emailError}</span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => setPasswordTouched(true)}
                      placeholder={t('auth.password')}
                      className={`w-full pl-11 pr-11 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${passwordError && passwordTouched
                        ? 'border-rose-500 dark:border-rose-500'
                        : 'border-gray-200 dark:border-gray-600'
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {passwordError && passwordTouched && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{passwordError}</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                  {t('auth.signIn')}
                </button>
              </form>
            </Tabs.Content>

            <Tabs.Content value="register">
              <form onSubmit={handleRegister} className="space-y-4" noValidate>
                <div>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      onBlur={() => setDisplayNameTouched(true)}
                      placeholder={t('auth.displayName')}
                      className={`w-full pl-11 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${displayNameError && displayNameTouched
                        ? 'border-rose-500 dark:border-rose-500'
                        : 'border-gray-200 dark:border-gray-600'
                        }`}
                    />
                  </div>
                  {displayNameError && displayNameTouched && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{displayNameError}</span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => setEmailTouched(true)}
                      placeholder={t('auth.email')}
                      className={`w-full pl-11 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${emailError && emailTouched
                        ? 'border-rose-500 dark:border-rose-500'
                        : 'border-gray-200 dark:border-gray-600'
                        }`}
                    />
                  </div>
                  {emailError && emailTouched && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{emailError}</span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => setPasswordTouched(true)}
                      placeholder={t('auth.password')}
                      minLength={6}
                      className={`w-full pl-11 pr-11 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${passwordError && passwordTouched
                        ? 'border-rose-500 dark:border-rose-500'
                        : 'border-gray-200 dark:border-gray-600'
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {passwordError && passwordTouched && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{passwordError}</span>
                    </div>
                  )}
                  {!passwordError && activeTab === 'register' && (
                    <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                      Password must be at least 6 characters
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                  {t('auth.signUp')}
                </button>
              </form>
            </Tabs.Content>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-gray-800 text-gray-500">{t('auth.or')}</span>
              </div>
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 px-4 border border-gray-200 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {t('auth.continueWithGoogle')}
            </button>
          </Tabs.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
