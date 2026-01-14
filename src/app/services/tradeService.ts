import {
  collection,
  doc,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export interface Trade {
  id?: string;
  date: string;
  symbol: string;
  direction: 'long' | 'short';
  setup: string;
  entry: number;
  stop: number;
  target: number | null;
  riskPercent: number;
  positionSize: number;
  riskAmount: number;
  rrRatio: number | null;
  market: 'US' | 'CN';
  createdAt?: Timestamp;
}

const GUEST_TRADES_KEY = 'trade_analysis_guest_trades';

// Get trades collection reference for a user
const getTradesCollection = (userId: string) =>
  collection(db, 'users', userId, 'trades');

// Save a trade
export const saveTrade = async (userId: string | null, trade: Omit<Trade, 'id' | 'createdAt'>): Promise<Trade> => {
  if (userId) {
    // Logged in user: save to Firestore
    const tradesRef = getTradesCollection(userId);
    const docRef = await addDoc(tradesRef, {
      ...trade,
      createdAt: serverTimestamp(),
    });
    return { ...trade, id: docRef.id };
  } else {
    // Guest: save to localStorage
    const trades = getGuestTrades();
    const newTrade: Trade = {
      ...trade,
      id: Date.now().toString(),
    };
    trades.unshift(newTrade);
    localStorage.setItem(GUEST_TRADES_KEY, JSON.stringify(trades));
    return newTrade;
  }
};

// Get all trades
export const getTrades = async (userId: string | null): Promise<Trade[]> => {
  if (userId) {
    // Logged in user: get from Firestore
    const tradesRef = getTradesCollection(userId);
    const q = query(tradesRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Trade[];
  } else {
    // Guest: get from localStorage
    return getGuestTrades();
  }
};

// Delete a trade
export const deleteTrade = async (userId: string | null, tradeId: string): Promise<void> => {
  if (userId) {
    // Logged in user: delete from Firestore
    const tradeRef = doc(db, 'users', userId, 'trades', tradeId);
    await deleteDoc(tradeRef);
  } else {
    // Guest: delete from localStorage
    const trades = getGuestTrades();
    const filtered = trades.filter((t) => t.id !== tradeId);
    localStorage.setItem(GUEST_TRADES_KEY, JSON.stringify(filtered));
  }
};

// Update a trade
export const updateTrade = async (
  userId: string | null,
  tradeId: string,
  updates: Partial<Trade>
): Promise<void> => {
  if (userId) {
    // Logged in user: update in Firestore
    const tradeRef = doc(db, 'users', userId, 'trades', tradeId);
    await updateDoc(tradeRef, updates);
  } else {
    // Guest: update in localStorage
    const trades = getGuestTrades();
    const index = trades.findIndex((t) => t.id === tradeId);
    if (index !== -1) {
      trades[index] = { ...trades[index], ...updates };
      localStorage.setItem(GUEST_TRADES_KEY, JSON.stringify(trades));
    }
  }
};

// Helper: get guest trades from localStorage
const getGuestTrades = (): Trade[] => {
  const stored = localStorage.getItem(GUEST_TRADES_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
};

// Migrate guest trades to user account
export const migrateGuestTrades = async (userId: string): Promise<number> => {
  const guestTrades = getGuestTrades();
  if (guestTrades.length === 0) return 0;

  const tradesRef = getTradesCollection(userId);
  
  for (const trade of guestTrades) {
    const { id, ...tradeData } = trade;
    await addDoc(tradesRef, {
      ...tradeData,
      createdAt: serverTimestamp(),
      migratedFromGuest: true,
    });
  }

  // Clear guest trades after migration
  localStorage.removeItem(GUEST_TRADES_KEY);
  
  return guestTrades.length;
};

// Get guest trade count (for showing migration prompt)
export const getGuestTradeCount = (): number => {
  return getGuestTrades().length;
};
