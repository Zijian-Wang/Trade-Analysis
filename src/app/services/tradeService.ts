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
} from 'firebase/firestore'
import { db } from '../firebase'

export type TradeStatus = 'PLANNED' | 'ACTIVE' | 'CLOSED'

export interface RiskContract {
  id: string
  entryPrice: number
  shares: number
  riskAmount: number
  contractStop?: number
  createdAt: number // Unix timestamp
}

export interface Trade {
  id?: string
  date: string
  symbol: string
  direction: 'long' | 'short'
  status: TradeStatus // NEW
  setup: string

  // Phase 1 fields (Compatible)
  entry: number // Avg entry if multiple contracts? Or initial?
  stop: number // Stop loss price (thesis invalidation point)
  target: number | null
  riskPercent: number
  positionSize: number // Total size
  riskAmount: number // Total risk
  rrRatio: number | null

  contracts: RiskContract[] // NEW: Executions

  market: 'US' | 'CN'

  // Broker integration fields
  instrumentType?:
    | 'EQUITY'
    | 'OPTION'
    | 'MULTI_LEG_OPTION'
    | 'FUTURE'
    | 'UNSUPPORTED'
  isSupported?: boolean // For broker-synced positions
  syncedFromBroker?: boolean // Indicates if synced from Schwab
  currentPrice?: number // Live price (for display)

  createdAt?: Timestamp
}

const GUEST_TRADES_KEY = 'trade_analysis_guest_trades'

// Get trades collection reference for a user
const getTradesCollection = (userId: string) =>
  collection(db, 'users', userId, 'trades')

// Save a trade
export const saveTrade = async (
  userId: string | null,
  trade: Omit<Trade, 'id' | 'createdAt'>,
): Promise<Trade> => {
  if (userId) {
    // Logged in user: save to Firestore
    const tradesRef = getTradesCollection(userId)
    const docRef = await addDoc(tradesRef, {
      ...trade,
      createdAt: serverTimestamp(),
    })
    return { ...trade, id: docRef.id }
  } else {
    // Guest: save to localStorage
    const trades = getGuestTrades()
    const newTrade: Trade = {
      ...trade,
      id: Date.now().toString(),
    }
    trades.unshift(newTrade)
    localStorage.setItem(GUEST_TRADES_KEY, JSON.stringify(trades))
    return newTrade
  }
}

// Get all trades
export const getTrades = async (userId: string | null): Promise<Trade[]> => {
  if (userId) {
    // Logged in user: get from Firestore
    const tradesRef = getTradesCollection(userId)
    const q = query(tradesRef, orderBy('createdAt', 'desc'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => {
      const data = doc.data() as Trade

      // Determine correct stop with validation
      // Migrate from structureStop to stop if needed
      let stop = data.stop || data.structureStop

      // Validate stop price - if structureStop exists and is invalid, prefer stop
      if (data.structureStop && data.stop) {
        const isLong = data.direction === 'long'
        const structureStopValid = isLong
          ? data.structureStop < data.entry
          : data.structureStop > data.entry
        const stopValid = isLong
          ? data.stop < data.entry
          : data.stop > data.entry

        // Prefer valid stop over invalid structureStop
        if (!structureStopValid && stopValid) {
          stop = data.stop
        } else if (structureStopValid) {
          stop = data.structureStop
        }
      }

      // Migration/Defaults for legacy data
      return {
        id: doc.id,
        ...data,
        status: data.status || 'ACTIVE', // Assume active for better visibility during transition
        stop, // Use validated/corrected stop (migrated from structureStop if needed)
        contracts: data.contracts || [
          {
            id: `legacy-${doc.id}`,
            entryPrice: data.entry,
            shares: data.positionSize,
            riskAmount: data.riskAmount,
            createdAt: data.createdAt
              ? (data.createdAt as any).toMillis?.() || Date.now()
              : Date.now(),
          },
        ],
      }
    }) as Trade[]
  } else {
    // Guest: get from localStorage
    return getGuestTrades()
  }
}

// Delete a trade
export const deleteTrade = async (
  userId: string | null,
  tradeId: string,
): Promise<void> => {
  if (userId) {
    // Logged in user: delete from Firestore
    const tradeRef = doc(db, 'users', userId, 'trades', tradeId)
    await deleteDoc(tradeRef)
  } else {
    // Guest: delete from localStorage
    const trades = getGuestTrades()
    const filtered = trades.filter((t) => t.id !== tradeId)
    localStorage.setItem(GUEST_TRADES_KEY, JSON.stringify(filtered))
  }
}

// Update a trade
export const updateTrade = async (
  userId: string | null,
  tradeId: string,
  updates: Partial<Trade>,
): Promise<void> => {
  if (userId) {
    // Logged in user: update in Firestore
    const tradeRef = doc(db, 'users', userId, 'trades', tradeId)
    await updateDoc(tradeRef, updates)
  } else {
    // Guest: update in localStorage
    const trades = getGuestTrades()
    const index = trades.findIndex((t) => t.id === tradeId)
    if (index !== -1) {
      trades[index] = { ...trades[index], ...updates }
      localStorage.setItem(GUEST_TRADES_KEY, JSON.stringify(trades))
    }
  }
}

// Helper: get guest trades from localStorag
const getGuestTrades = (): Trade[] => {
  const stored = localStorage.getItem(GUEST_TRADES_KEY)
  if (stored) {
    try {
      const trades = JSON.parse(stored)
      // Migration/Defaults for guest data with validation
      return trades.map((t: any) => {
        // Determine correct stop with validation
        // Migrate from structureStop to stop if needed
        let stop = t.stop || t.structureStop

        // Validate stop price - prefer valid stop
        if (t.structureStop && t.stop) {
          const isLong = t.direction === 'long'
          const structureStopValid = isLong
            ? t.structureStop < t.entry
            : t.structureStop > t.entry
          const stopValid = isLong ? t.stop < t.entry : t.stop > t.entry

          // Prefer valid stop
          if (!structureStopValid && stopValid) {
            stop = t.stop
          } else if (structureStopValid) {
            stop = t.structureStop
          }
        }

        return {
          ...t,
          status: t.status || 'ACTIVE',
          stop, // Use validated/corrected stop (migrated from structureStop if needed)
          contracts: t.contracts || [
            {
              id: `legacy-${t.id}`,
              entryPrice: t.entry,
              shares: t.positionSize,
              riskAmount: t.riskAmount,
              createdAt: t.createdAt || Date.now(),
            },
          ],
        }
      })
    } catch {
      return []
    }
  }
  return []
}

// Migrate guest trades to user account
export const migrateGuestTrades = async (userId: string): Promise<number> => {
  const guestTrades = getGuestTrades()
  if (guestTrades.length === 0) return 0

  const tradesRef = getTradesCollection(userId)

  for (const trade of guestTrades) {
    const { id, ...tradeData } = trade
    await addDoc(tradesRef, {
      ...tradeData,
      createdAt: serverTimestamp(),
      migratedFromGuest: true,
    })
  }

  // Clear guest trades after migration
  localStorage.removeItem(GUEST_TRADES_KEY)

  return guestTrades.length
}

// Get guest trade count (for showing migration prompt)
export const getGuestTradeCount = (): number => {
  return getGuestTrades().length
}
