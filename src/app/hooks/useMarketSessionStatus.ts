import { useEffect, useMemo, useState } from 'react'

export type MarketKey = 'US' | 'CN'
export type MarketSession = 'OPEN' | 'EXT' | 'CLOSED'
export type ExtendedSession = 'PRE' | 'AFTER'
export type ClosedReason = 'OVERNIGHT' | 'LUNCH' | 'WEEKEND' | 'HOLIDAY'

export type MarketSessionStatus = {
  market: MarketKey
  session: MarketSession
  extendedSession?: ExtendedSession
  closedReason?: ClosedReason
}

function getZonedTimeInfo(date: Date, timeZone: string): {
  minutes: number
  weekdayShort: string
  year: number
  month: number // 1-12
  day: number // 1-31
} {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)

  let weekdayShort = ''
  let year = 1970
  let month = 1
  let day = 1
  let hour = 0
  let minute = 0

  for (const p of parts) {
    if (p.type === 'weekday') weekdayShort = p.value
    if (p.type === 'year') year = parseInt(p.value, 10)
    if (p.type === 'month') month = parseInt(p.value, 10)
    if (p.type === 'day') day = parseInt(p.value, 10)
    if (p.type === 'hour') hour = parseInt(p.value, 10)
    if (p.type === 'minute') minute = parseInt(p.value, 10)
  }

  return { minutes: hour * 60 + minute, weekdayShort, year, month, day }
}

function isWeekend(weekdayShort: string) {
  return weekdayShort === 'Sat' || weekdayShort === 'Sun'
}

function ymdKey(year: number, month: number, day: number) {
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

function nthWeekdayOfMonthUTC(
  year: number,
  monthIndex0: number, // 0-11
  weekday0: number, // 0=Sun..6=Sat
  n: number,
) {
  const first = new Date(Date.UTC(year, monthIndex0, 1))
  const firstDay = first.getUTCDay()
  const delta = (weekday0 - firstDay + 7) % 7
  const day = 1 + delta + (n - 1) * 7
  return new Date(Date.UTC(year, monthIndex0, day))
}

function lastWeekdayOfMonthUTC(
  year: number,
  monthIndex0: number, // 0-11
  weekday0: number, // 0=Sun..6=Sat
) {
  const last = new Date(Date.UTC(year, monthIndex0 + 1, 0))
  const lastDay = last.getUTCDay()
  const delta = (lastDay - weekday0 + 7) % 7
  return new Date(Date.UTC(year, monthIndex0, last.getUTCDate() - delta))
}

function addDaysUTC(d: Date, days: number) {
  const copy = new Date(d.getTime())
  copy.setUTCDate(copy.getUTCDate() + days)
  return copy
}

// Meeus/Jones/Butcher Gregorian Easter (UTC calendar date)
function easterSundayUTC(year: number) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) // 3=Mar, 4=Apr
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(year, month - 1, day))
}

function observedFixedHolidayUTC(year: number, monthIndex0: number, dayOfMonth: number) {
  const d = new Date(Date.UTC(year, monthIndex0, dayOfMonth))
  const dow = d.getUTCDay()
  // Saturday -> observed Friday; Sunday -> observed Monday
  if (dow === 6) return addDaysUTC(d, -1)
  if (dow === 0) return addDaysUTC(d, 1)
  return d
}

function usNyseHolidayKeys(year: number) {
  const keys = new Set<string>()

  const addUTC = (d: Date) =>
    keys.add(ymdKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()))

  // New Year's Day (observed)
  addUTC(observedFixedHolidayUTC(year, 0, 1))
  // Martin Luther King Jr. Day: 3rd Monday in Jan
  addUTC(nthWeekdayOfMonthUTC(year, 0, 1, 3))
  // Washington's Birthday (Presidents Day): 3rd Monday in Feb
  addUTC(nthWeekdayOfMonthUTC(year, 1, 1, 3))
  // Good Friday: 2 days before Easter Sunday
  addUTC(addDaysUTC(easterSundayUTC(year), -2))
  // Memorial Day: last Monday in May
  addUTC(lastWeekdayOfMonthUTC(year, 4, 1))
  // Juneteenth: June 19 (observed)
  addUTC(observedFixedHolidayUTC(year, 5, 19))
  // Independence Day: July 4 (observed)
  addUTC(observedFixedHolidayUTC(year, 6, 4))
  // Labor Day: 1st Monday in Sep
  addUTC(nthWeekdayOfMonthUTC(year, 8, 1, 1))
  // Thanksgiving Day: 4th Thursday in Nov
  addUTC(nthWeekdayOfMonthUTC(year, 10, 4, 4))
  // Christmas Day: Dec 25 (observed)
  addUTC(observedFixedHolidayUTC(year, 11, 25))

  return keys
}

function isUsNyseHoliday(nyYear: number, nyMonth: number, nyDay: number) {
  const key = ymdKey(nyYear, nyMonth, nyDay)
  // Include next year's set to catch observed New Year's Day on Dec 31.
  const setThis = usNyseHolidayKeys(nyYear)
  const setNext = usNyseHolidayKeys(nyYear + 1)
  return setThis.has(key) || setNext.has(key)
}

export function getMarketSessionStatus(
  market: MarketKey,
  now: Date = new Date(),
): MarketSessionStatus {
  if (market === 'US') {
    const { minutes, weekdayShort, year, month, day } = getZonedTimeInfo(
      now,
      'America/New_York',
    )
    if (isWeekend(weekdayShort)) {
      return { market, session: 'CLOSED', closedReason: 'WEEKEND' }
    }
    if (isUsNyseHoliday(year, month, day)) {
      return { market, session: 'CLOSED', closedReason: 'HOLIDAY' }
    }

    const regularOpen = 9 * 60 + 30
    const regularClose = 16 * 60
    const extPreOpen = 4 * 60
    const extAfterClose = 20 * 60

    if (minutes >= regularOpen && minutes < regularClose) {
      return { market, session: 'OPEN' }
    }

    if (minutes >= extPreOpen && minutes < regularOpen) {
      return { market, session: 'EXT', extendedSession: 'PRE' }
    }

    if (minutes >= regularClose && minutes < extAfterClose) {
      return { market, session: 'EXT', extendedSession: 'AFTER' }
    }

    return { market, session: 'CLOSED', closedReason: 'OVERNIGHT' }
  }

  // CN (Shanghai) – simple open vs closed.
  const { minutes, weekdayShort } = getZonedTimeInfo(now, 'Asia/Shanghai')
  if (isWeekend(weekdayShort)) {
    return { market, session: 'CLOSED', closedReason: 'WEEKEND' }
  }

  // 09:30–11:30 and 13:00–15:00
  const open1Start = 9 * 60 + 30
  const open1End = 11 * 60 + 30
  const open2Start = 13 * 60
  const open2End = 15 * 60

  const isOpen =
    (minutes >= open1Start && minutes < open1End) ||
    (minutes >= open2Start && minutes < open2End)

  if (isOpen) return { market, session: 'OPEN' }

  // Midday break (11:30–13:00) should not read as "overnight".
  const isLunchBreak = minutes >= open1End && minutes < open2Start
  return {
    market,
    session: 'CLOSED',
    closedReason: isLunchBreak ? 'LUNCH' : 'OVERNIGHT',
  }
}

export function useMarketSessionStatus(market: MarketKey, refreshMs = 60_000) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const id = window.setInterval(() => setTick((t) => t + 1), refreshMs)
    return () => window.clearInterval(id)
  }, [refreshMs])

  return useMemo(() => getMarketSessionStatus(market), [market, tick])
}

