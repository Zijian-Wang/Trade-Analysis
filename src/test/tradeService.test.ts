import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveTrade, getTrades, deleteTrade, getGuestTradeCount } from '../app/services/tradeService';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock Firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  deleteDoc: vi.fn(),
  updateDoc: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => ({ seconds: Date.now() / 1000 })),
  Timestamp: {},
}));

describe('tradeService - Guest Mode (localStorage)', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  const sampleTrade = {
    date: '2026-01-14',
    symbol: 'AAPL',
    direction: 'long' as const,
    setup: 'Trend',
    entry: 150,
    stop: 145,
    target: 160,
    riskPercent: 0.75,
    positionSize: 150,
    riskAmount: 750,
    rrRatio: 2,
    market: 'US' as const,
  };

  it('should save trade to localStorage for guest user', async () => {
    const savedTrade = await saveTrade(null, sampleTrade);

    expect(savedTrade.id).toBeDefined();
    expect(savedTrade.symbol).toBe('AAPL');
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should get trades from localStorage for guest user', async () => {
    // Setup: save a trade first
    await saveTrade(null, sampleTrade);

    const trades = await getTrades(null);

    expect(trades.length).toBe(1);
    expect(trades[0].symbol).toBe('AAPL');
  });

  it('should delete trade from localStorage for guest user', async () => {
    const savedTrade = await saveTrade(null, sampleTrade);
    await deleteTrade(null, savedTrade.id!);

    const trades = await getTrades(null);
    expect(trades.length).toBe(0);
  });

  it('should return guest trade count', async () => {
    await saveTrade(null, sampleTrade);
    await saveTrade(null, { ...sampleTrade, symbol: 'TSLA' });

    const count = getGuestTradeCount();
    expect(count).toBe(2);
  });

  it('should prepend new trades (most recent first)', async () => {
    await saveTrade(null, { ...sampleTrade, symbol: 'AAPL' });
    await saveTrade(null, { ...sampleTrade, symbol: 'TSLA' });

    const trades = await getTrades(null);
    expect(trades[0].symbol).toBe('TSLA'); // Most recent first
    expect(trades[1].symbol).toBe('AAPL');
  });
});
