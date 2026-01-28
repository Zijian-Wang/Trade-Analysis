import { describe, expect, it } from 'vitest'
import { getMarketSessionStatus } from './useMarketSessionStatus'

describe('getMarketSessionStatus', () => {
  it('CN is OPEN during morning session (Shanghai)', () => {
    // 2026-01-28 03:00Z => 11:00 Asia/Shanghai (Wed)
    const d = new Date('2026-01-28T03:00:00.000Z')
    const s = getMarketSessionStatus('CN', d)
    expect(s.session).toBe('OPEN')
  })

  it('CN is CLOSED (Lunch break) between sessions', () => {
    // 2026-01-28 04:00Z => 12:00 Asia/Shanghai (Wed)
    const d = new Date('2026-01-28T04:00:00.000Z')
    const s = getMarketSessionStatus('CN', d)
    expect(s.session).toBe('CLOSED')
    expect(s.closedReason).toBe('LUNCH')
  })

  it('US is EXT (Pre-market) before 09:30 ET', () => {
    // 2026-01-28 13:00Z => 08:00 America/New_York (Wed)
    const d = new Date('2026-01-28T13:00:00.000Z')
    const s = getMarketSessionStatus('US', d)
    expect(s.session).toBe('EXT')
    expect(s.extendedSession).toBe('PRE')
  })

  it('US is CLOSED (Holiday) on New Year’s Day', () => {
    // 2026-01-01 15:00Z => 10:00 America/New_York (Thu)
    const d = new Date('2026-01-01T15:00:00.000Z')
    const s = getMarketSessionStatus('US', d)
    expect(s.session).toBe('CLOSED')
    expect(s.closedReason).toBe('HOLIDAY')
  })
})

