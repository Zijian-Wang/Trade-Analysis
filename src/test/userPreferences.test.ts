import { describe, it, expect } from 'vitest';

// Type definitions for UserPreferences
interface UserPreferences {
  activeMarkets: ('US' | 'CN')[];
  singleMarketMode: boolean;
  languageFollowsMarket: boolean;
  defaultPortfolio: {
    US: number;
    CN: number;
  };
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

describe('UserPreferences', () => {
  it('should have correct default values for guests', () => {
    expect(DEFAULT_PREFERENCES.defaultPortfolio.US).toBe(0);
    expect(DEFAULT_PREFERENCES.defaultPortfolio.CN).toBe(0);
    expect(DEFAULT_PREFERENCES.singleMarketMode).toBe(false);
    expect(DEFAULT_PREFERENCES.languageFollowsMarket).toBe(true);
  });

  it('should validate market mode options', () => {
    const singleMode: UserPreferences = {
      ...DEFAULT_PREFERENCES,
      singleMarketMode: true,
    };
    expect(singleMode.singleMarketMode).toBe(true);

    const multiMode: UserPreferences = {
      ...DEFAULT_PREFERENCES,
      singleMarketMode: false,
    };
    expect(multiMode.singleMarketMode).toBe(false);
  });

  it('should allow custom portfolio values', () => {
    const customPrefs: UserPreferences = {
      ...DEFAULT_PREFERENCES,
      defaultPortfolio: {
        US: 300000,
        CN: 1500000,
      },
    };

    expect(customPrefs.defaultPortfolio.US).toBe(300000);
    expect(customPrefs.defaultPortfolio.CN).toBe(1500000);
  });

  it('should support language sync toggle', () => {
    const syncEnabled: UserPreferences = {
      ...DEFAULT_PREFERENCES,
      languageFollowsMarket: true,
    };
    expect(syncEnabled.languageFollowsMarket).toBe(true);

    const syncDisabled: UserPreferences = {
      ...DEFAULT_PREFERENCES,
      languageFollowsMarket: false,
    };
    expect(syncDisabled.languageFollowsMarket).toBe(false);
  });
});
