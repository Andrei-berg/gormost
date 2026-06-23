import { describe, it, expect } from 'vitest'
import {
  getShiftForDate,
  getShiftNumberForDate,
  isWorkerOnDuty,
  resolveShiftStatus,
} from './shifts'

// ── Helpers ────────────────────────────────────────────────────────────────────

function d(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00')
}

// ── 1. Shift rotation (getShiftForDate) ────────────────────────────────────────
// Anchors verified in CLAUDE.md:
//   2025-01-02 = Shift 4   (BASE_DATE / BASE_SHIFT)
//   2026-03-14 = Shift 4
//   2026-03-15 = Shift 1

describe('getShiftForDate — verified anchor points', () => {
  it('2025-01-02 is Shift 4 (base anchor)', () => {
    expect(getShiftForDate(d('2025-01-02')).shiftNumber).toBe(4)
  })

  it('2026-03-14 is Shift 4', () => {
    expect(getShiftForDate(d('2026-03-14')).shiftNumber).toBe(4)
  })

  it('2026-03-15 is Shift 1 (day after Shift 4)', () => {
    expect(getShiftForDate(d('2026-03-15')).shiftNumber).toBe(1)
  })

  it('rotates through 1→2→3→4 over four consecutive days', () => {
    // 2026-03-15 = 1, then 2, 3, 4
    const shifts = [0, 1, 2, 3].map(offset => {
      const dt = new Date('2026-03-15T12:00:00')
      dt.setDate(dt.getDate() + offset)
      return getShiftNumberForDate(dt)
    })
    expect(shifts).toEqual([1, 2, 3, 4])
  })

  it('returns correct chief name for shift 4', () => {
    const info = getShiftForDate(d('2025-01-02'))
    expect(info.chiefName).toBe('Станишевский А.В.')
  })
})

// ── 2. isWorkerOnDuty — 1/3 schedule ──────────────────────────────────────────

describe('isWorkerOnDuty — 1/3 schedule', () => {
  // Shift 4 is on duty 2025-01-02. A worker assigned to shift 4 should work that day.
  const s4worker = { shift_num: 4, schedule_code: '1/3', shift_reference_date: null, rotation_group: null }
  const s1worker = { shift_num: 1, schedule_code: '1/3', shift_reference_date: null, rotation_group: null }

  it('shift 4 worker is on duty 2025-01-02', () => {
    expect(isWorkerOnDuty(s4worker, d('2025-01-02'))).toBe(true)
  })

  it('shift 1 worker is off duty 2025-01-02', () => {
    expect(isWorkerOnDuty(s1worker, d('2025-01-02'))).toBe(false)
  })

  it('shift 1 worker is on duty 2026-03-15', () => {
    expect(isWorkerOnDuty(s1worker, d('2026-03-15'))).toBe(true)
  })
})

// ── 3. isWorkerOnDuty — 5/2 schedule ──────────────────────────────────────────

describe('isWorkerOnDuty — 5/2 schedule', () => {
  const worker = { shift_num: null, schedule_code: '5/2', shift_reference_date: null, rotation_group: null }

  it('works Monday–Friday', () => {
    // 2026-03-16 is Monday
    expect(isWorkerOnDuty(worker, d('2026-03-16'))).toBe(true)
    expect(isWorkerOnDuty(worker, d('2026-03-20'))).toBe(true) // Friday
  })

  it('does not work on weekends', () => {
    expect(isWorkerOnDuty(worker, d('2026-03-21'))).toBe(false) // Saturday
    expect(isWorkerOnDuty(worker, d('2026-03-22'))).toBe(false) // Sunday
  })
})

// ── 4. isWorkerOnDuty — 15/15 schedule ────────────────────────────────────────

describe('isWorkerOnDuty — 15/15 schedule', () => {
  const grp1 = { shift_num: null, schedule_code: '15/15', shift_reference_date: null, rotation_group: '1' }
  const grp2 = { shift_num: null, schedule_code: '15/15', shift_reference_date: null, rotation_group: '2' }

  it('group 1 works days 1–15', () => {
    expect(isWorkerOnDuty(grp1, d('2026-03-01'))).toBe(true)
    expect(isWorkerOnDuty(grp1, d('2026-03-15'))).toBe(true)
  })

  it('group 1 is off days 16–end', () => {
    expect(isWorkerOnDuty(grp1, d('2026-03-16'))).toBe(false)
    expect(isWorkerOnDuty(grp1, d('2026-03-31'))).toBe(false)
  })

  it('group 2 works days 16–end', () => {
    expect(isWorkerOnDuty(grp2, d('2026-03-16'))).toBe(true)
    expect(isWorkerOnDuty(grp2, d('2026-03-31'))).toBe(true)
  })

  it('group 2 is off days 1–15', () => {
    expect(isWorkerOnDuty(grp2, d('2026-03-01'))).toBe(false)
    expect(isWorkerOnDuty(grp2, d('2026-03-15'))).toBe(false)
  })
})

// ── 5. isWorkerOnDuty — 3/3 rolling cycle ────────────────────────────────────

describe('isWorkerOnDuty — 3/3 rolling cycle', () => {
  // anchor 2026-03-01 → days 0,1,2 = work; days 3,4,5 = rest; day 6 = work again
  const worker = { shift_num: null, schedule_code: '3/3', shift_reference_date: '2026-03-01', rotation_group: null }

  it('works on anchor day (day 0)', () => {
    expect(isWorkerOnDuty(worker, d('2026-03-01'))).toBe(true)
  })

  it('works on days 1 and 2', () => {
    expect(isWorkerOnDuty(worker, d('2026-03-02'))).toBe(true)
    expect(isWorkerOnDuty(worker, d('2026-03-03'))).toBe(true)
  })

  it('rests on days 3, 4, 5', () => {
    expect(isWorkerOnDuty(worker, d('2026-03-04'))).toBe(false)
    expect(isWorkerOnDuty(worker, d('2026-03-05'))).toBe(false)
    expect(isWorkerOnDuty(worker, d('2026-03-06'))).toBe(false)
  })

  it('works again on day 6 (new cycle)', () => {
    expect(isWorkerOnDuty(worker, d('2026-03-07'))).toBe(true)
  })
})

// ── 6. resolveShiftStatus — cyclic schedule requires active_phase ──────────────

describe('resolveShiftStatus — cyclic schedules without phase return not working', () => {
  it('3/3 without active_phase returns working=false', () => {
    const result = resolveShiftStatus(
      { schedule_code: '3/3', shift_num: null, rotation_group: null, shift_reference_date: '2026-03-01', active_phase: null },
      d('2026-03-01'),
    )
    expect(result.working).toBe(false)
  })

  it('3/3 with active_phase resolves correctly', () => {
    const result = resolveShiftStatus(
      {
        schedule_code: '3/3',
        shift_num: null,
        rotation_group: null,
        shift_reference_date: null,
        active_phase: { phase: 'day', anchor_date: '2026-03-01', schedule_code: '3/3', is_alternating: false },
      },
      d('2026-03-01'), // day 0 → working
    )
    expect(result.working).toBe(true)
    expect(result.phase).toBe('day')
    expect(result.shift_start).toBe('07:30') // канон: день-блок 07:30–19:00
  })
})

// ── 7. isWorkerOnDuty — 15/15 mid-month rotation ─────────────────────────────
// anchor = 2026-01-16 → work: Jan 16–Feb 15, rest: Feb 16–Mar 15, work: Mar 16–Apr 15…

describe('isWorkerOnDuty — 15/15 mid rotation_group', () => {
  const worker = {
    shift_num: null,
    schedule_code: '15/15',
    shift_reference_date: '2026-01-16',
    rotation_group: 'mid',
  }

  it('works from anchor day (Jan 16)', () => {
    expect(isWorkerOnDuty(worker, d('2026-01-16'))).toBe(true)
  })

  it('works on Feb 15 (last day of first work period)', () => {
    expect(isWorkerOnDuty(worker, d('2026-02-15'))).toBe(true)
  })

  it('rests on Feb 16 (start of first rest period)', () => {
    expect(isWorkerOnDuty(worker, d('2026-02-16'))).toBe(false)
  })

  it('rests on Mar 15 (last day of rest period)', () => {
    expect(isWorkerOnDuty(worker, d('2026-03-15'))).toBe(false)
  })

  it('works again on Mar 16 (start of second work period)', () => {
    expect(isWorkerOnDuty(worker, d('2026-03-16'))).toBe(true)
  })

  it('works on Apr 15 (last day of second work period)', () => {
    expect(isWorkerOnDuty(worker, d('2026-04-15'))).toBe(true)
  })

  it('returns false for date before anchor', () => {
    expect(isWorkerOnDuty(worker, d('2026-01-15'))).toBe(false)
  })

  it('returns false without anchor date', () => {
    const noAnchor = { ...worker, shift_reference_date: null }
    expect(isWorkerOnDuty(noAnchor, d('2026-01-16'))).toBe(false)
  })
})

// ── 8. resolveShiftStatus — 1/3 shift times ────────────────────────────────────

describe('resolveShiftStatus — 1/3 shift times', () => {
  it('returns 07:30 handover times when working', () => {
    const result = resolveShiftStatus(
      { schedule_code: '1/3', shift_num: 4, rotation_group: null, shift_reference_date: null },
      d('2025-01-02'), // Shift 4 on duty
    )
    expect(result.working).toBe(true)
    expect(result.shift_start).toBe('07:30')
    expect(result.shift_end).toBe('07:30')
  })

  it('returns phase=null when not working', () => {
    const result = resolveShiftStatus(
      { schedule_code: '1/3', shift_num: 1, rotation_group: null, shift_reference_date: null },
      d('2025-01-02'), // Shift 4 on duty, not shift 1
    )
    expect(result.working).toBe(false)
    expect(result.phase).toBeNull()
  })
})
