import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

export interface UserPreferences {
  activeMarkets: ('US' | 'CN')[];
  singleMarketMode: boolean;
  languageFollowsMarket: boolean;
  defaultPortfolio: {
    US: number;
    CN: number;
  };
  // Schwab integration
  schwabLinked?: boolean;
  schwabLastSyncedAt?: number;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  activeMarkets: ['US', 'CN'],
  singleMarketMode: false,
  languageFollowsMarket: true,
  defaultPortfolio: {
    US: 0,
    CN: 0,
  },
};

const GUEST_STORAGE_KEY = 'trade_analysis_guest_preferences';

function coerceFiniteNumber(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value.replace(/,/g, '').trim());
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function normalizePreferences(raw: unknown): UserPreferences {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as any;

  const activeMarkets =
    Array.isArray(obj.activeMarkets) && obj.activeMarkets.length > 0
      ? (obj.activeMarkets.filter((m: unknown) => m === 'US' || m === 'CN') as (
          | 'US'
          | 'CN'
        )[])
      : DEFAULT_PREFERENCES.activeMarkets;

  const singleMarketMode =
    typeof obj.singleMarketMode === 'boolean'
      ? obj.singleMarketMode
      : DEFAULT_PREFERENCES.singleMarketMode;

  const languageFollowsMarket =
    typeof obj.languageFollowsMarket === 'boolean'
      ? obj.languageFollowsMarket
      : DEFAULT_PREFERENCES.languageFollowsMarket;

  const rawDefaultPortfolio = obj.defaultPortfolio ?? {};
  const defaultPortfolio = {
    US: coerceFiniteNumber(
      rawDefaultPortfolio.US,
      DEFAULT_PREFERENCES.defaultPortfolio.US,
    ),
    CN: coerceFiniteNumber(
      rawDefaultPortfolio.CN,
      DEFAULT_PREFERENCES.defaultPortfolio.CN,
    ),
  };

  return {
    ...DEFAULT_PREFERENCES,
    ...obj,
    activeMarkets,
    singleMarketMode,
    languageFollowsMarket,
    defaultPortfolio,
  };
}

interface UserPreferencesContextType {
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  loading: boolean;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

export const UserPreferencesProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  // Load preferences on mount or user change
  useEffect(() => {
    if (user) {
      // Logged in user: sync with Firestore
      const userPrefsRef = doc(db, 'users', user.uid, 'settings', 'preferences');
      
      const unsubscribe = onSnapshot(userPrefsRef, (snapshot) => {
        if (snapshot.exists()) {
          setPreferences(normalizePreferences(snapshot.data()));
        } else {
          // First time: check for guest preferences to migrate
          const guestPrefs = localStorage.getItem(GUEST_STORAGE_KEY);
          if (guestPrefs) {
            const parsed = normalizePreferences(JSON.parse(guestPrefs));
            // Save migrated preferences to Firestore
            setDoc(userPrefsRef, parsed);
            setPreferences(parsed);
            // Clear guest preferences after migration
            localStorage.removeItem(GUEST_STORAGE_KEY);
          } else {
            setPreferences(DEFAULT_PREFERENCES);
          }
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      // Guest user: use localStorage
      const stored = localStorage.getItem(GUEST_STORAGE_KEY);
      if (stored) {
        try {
          setPreferences(normalizePreferences(JSON.parse(stored)));
        } catch {
          setPreferences(DEFAULT_PREFERENCES);
        }
      } else {
        setPreferences(DEFAULT_PREFERENCES);
      }
      setLoading(false);
    }
  }, [user]);

  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    const merged = {
      ...preferences,
      ...updates,
      defaultPortfolio: {
        ...preferences.defaultPortfolio,
        ...(updates as any).defaultPortfolio,
      },
    };
    const newPrefs = normalizePreferences(merged);
    setPreferences(newPrefs);

    if (user) {
      // Save to Firestore
      const userPrefsRef = doc(db, 'users', user.uid, 'settings', 'preferences');
      await setDoc(userPrefsRef, newPrefs, { merge: true });
    } else {
      // Save to localStorage for guests
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(newPrefs));
    }
  }, [user, preferences]);

  return (
    <UserPreferencesContext.Provider value={{ preferences, updatePreferences, loading }}>
      {children}
    </UserPreferencesContext.Provider>
  );
};

export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext);
  if (context === undefined) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
};
