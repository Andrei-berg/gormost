import { describe, it, expect } from 'vitest'
import {
  splitCrossMonthShift,
  calcMonthNormHours,
  buildMonthlyTimesheet,
  calcNightPay,
} from './timesheet'
import { resolveShiftStatus } from './shifts'
import type { UserWithAssignment } from '@/types'

// ─── Fixtures ────────────────────────────────────────────────

function makeUser(assignment: Partial<UserWithAssignment['assignment']> | null): UserWithAssignment {
  return {
    user_id: 'u1',
    tab_number: '0001',
    full_name: 'Тестов Тест Тестович',
    position: null,
    role_level: 'WORKER',
    service_id: 'SRV-ENG',
    is_active: true,
    phone: null,
    pin_code: null,
    created_at: '2025-01-01',
    date_hired: null,
    date_fired: null,
    last_name: null,
    first_name: null,
    middle_name: null,
    email: null,
    category: null,
    probation_start: null,
    probation_end: null,
    assignment: assignment === null ? null : {
      id: 'a1',
      user_id: 'u1',
      schedule_id: 's1',
      shift_num: null,
      rotation_group: null,
      foreman_name: null,
      shift_reference_date: null,
      is_driver: false,
      custom_work_days: null,
      custom_rest_days: null,
      driver_group_number: null,
      started_at: '2025-01-01',
      ended_at: null,
      created_by: null,
      created_at: '2025-01-01',
      ...assignment,
    },
  } as UserWithAssignment
}

/** shift_num whose crew is on duty on the given date (1/3 rotation) */
function shiftWorkingOn(date: Date): number {
  for (let n = 1; n <= 4; n++) {
    const st = resolveShiftStatus(
      { schedule_code: '1/3', shift_num: n, rotation_group: null, shift_reference_date: null },
      date,
    )
    if (st.working) return n
  }
  throw new Error('no crew works that day?!')
}

// ─── splitCrossMonthShift ────────────────────────────────────

describe('splitCrossMonthShift', () => {
  const split = splitCrossMonthShift(new Date(2026, 0, 31)) // 31 января 2026, 07:30

  it('делит 24ч смену на 16.5 + 7.5', () => {
    expect(split.month1.hoursTotal).toBe(16.5)
    expect(split.month2.hoursTotal).toBe(7.5)
    expect(split.month1.hoursTotal + split.month2.hoursTotal).toBe(24)
  })

  it('компоненты M1: 10.5 дн + 4 веч + 2 ноч', () => {
    expect(split.month1.hoursDay).toBe(10.5)
    expect(split.month1.hoursEvening).toBe(4)
    expect(split.month1.hoursNight).toBe(2)
  })

  it('компоненты M2: 6 ноч + 1.5 дн, вечерних нет', () => {
    expect(split.month2.hoursNight).toBe(6)
    expect(split.month2.hoursDay).toBe(1.5)
    expect(split.month2.hoursEvening).toBe(0)
  })

  it('M2 датирован следующим днём (1 февраля)', () => {
    expect(split.month2.date.getMonth()).toBe(1)
    expect(split.month2.date.getDate()).toBe(1)
  })
})

// ─── calcMonthNormHours ──────────────────────────────────────

describe('calcMonthNormHours', () => {
  it('январь 2026: 22 будних дня → 176ч', () => {
    expect(calcMonthNormHours(2026, 1)).toBe(176)
  })

  it('февраль 2026: 20 будних дней → 160ч', () => {
    expect(calcMonthNormHours(2026, 2)).toBe(160)
  })
})

// ─── buildMonthlyTimesheet: 1/3 (суточная) ───────────────────

describe('buildMonthlyTimesheet — график 1/3 (24ч)', () => {
  // Бригада, дежурящая 31 января 2026 — её смена переходит в февраль
  const shiftNum = shiftWorkingOn(new Date(2026, 0, 31))
  const user = makeUser({ schedule_code: '1/3', shift_num: shiftNum })
  const jan = buildMonthlyTimesheet(user, 2026, 1)
  const feb = buildMonthlyTimesheet(user, 2026, 2)

  it('одна запись на каждый день месяца', () => {
    expect(jan.entries).toHaveLength(31)
    expect(feb.entries).toHaveLength(28)
  })

  it('обычный рабочий день: 24ч = 12 дн + 4 веч + 8 ноч, код Я', () => {
    const regular = jan.entries.find(e => e.code === 'Я' && e.date.getDate() !== 31)
    expect(regular).toBeDefined()
    expect(regular!.hoursTotal).toBe(24)
    expect(regular!.hoursDay).toBe(12)
    expect(regular!.hoursEvening).toBe(4)
    expect(regular!.hoursNight).toBe(8)
  })

  it('последний день месяца: только M1-часть (16.5ч), код Я', () => {
    const last = jan.entries[30]
    expect(last.code).toBe('Я')
    expect(last.hoursTotal).toBe(16.5)
    expect(last.isCrossMonthTail).toBe(false)
  })

  it('1 февраля: хвост смены — код ЯХ, 7.5ч, 6 ночных', () => {
    const first = feb.entries[0]
    expect(first.code).toBe('ЯХ')
    expect(first.hoursTotal).toBe(7.5)
    expect(first.hoursNight).toBe(6)
    expect(first.isCrossMonthTail).toBe(true)
  })

  it('summary февраля учитывает хвост', () => {
    expect(feb.summary.crossMonthTailHours).toBe(7.5)
    expect(feb.summary.workDays).toBeGreaterThan(0)
  })

  it('summary: hoursTotal = сумма часов рабочих записей', () => {
    const manual = jan.entries
      .filter(e => e.code === 'Я' || e.code === 'ЯХ')
      .reduce((s, e) => s + e.hoursTotal, 0)
    expect(jan.summary.hoursTotal).toBe(Math.round(manual * 100) / 100)
  })

  it('нерабочие дни — код В, 0 часов', () => {
    const rest = jan.entries.find(e => e.code === 'В')
    expect(rest).toBeDefined()
    expect(rest!.hoursTotal).toBe(0)
  })
})

// ─── buildMonthlyTimesheet: 5/2 ──────────────────────────────

describe('buildMonthlyTimesheet — график 5/2', () => {
  const user = makeUser({ schedule_code: '5/2', shift_num: 1 })
  const jan = buildMonthlyTimesheet(user, 2026, 1)

  it('будни — 8ч без ночных, выходные — В', () => {
    const monday = jan.entries.find(e => e.date.getDay() === 1)!
    const sunday = jan.entries.find(e => e.date.getDay() === 0)!
    expect(monday.code).toBe('Я')
    expect(monday.hoursTotal).toBe(8)
    expect(monday.hoursNight).toBe(0)
    expect(sunday.code).toBe('В')
  })

  it('нет переходящих смен (не 24ч график)', () => {
    expect(jan.summary.crossMonthTailHours).toBe(0)
    expect(jan.entries.every(e => !e.isCrossMonthTail)).toBe(true)
  })

  it('22 рабочих дня в январе 2026 → 176ч, баланс 0', () => {
    expect(jan.summary.workDays).toBe(22)
    expect(jan.summary.hoursTotal).toBe(176)
    expect(jan.summary.balance).toBe(0)
  })
})

// ─── buildMonthlyTimesheet: без назначения ───────────────────

describe('buildMonthlyTimesheet — без графика', () => {
  it('все дни — В', () => {
    const ts = buildMonthlyTimesheet(makeUser(null), 2026, 1)
    expect(ts.entries.every(e => e.code === 'В' && e.hoursTotal === 0)).toBe(true)
    expect(ts.summary.workDays).toBe(0)
  })
})

// ─── calcNightPay ────────────────────────────────────────────

describe('calcNightPay', () => {
  const shiftNum = shiftWorkingOn(new Date(2026, 0, 31))
  const user = makeUser({ schedule_code: '1/3', shift_num: shiftNum })
  const feb = buildMonthlyTimesheet(user, 2026, 2)

  it('доплата = ночные × ставка × 35%', () => {
    const pay = calcNightPay(feb, 200)
    expect(pay.nightSupplementRub).toBe(Math.round(feb.summary.hoursNight * 200 * 0.35 * 100) / 100)
    expect(pay.nightHours).toBe(feb.summary.hoursNight)
  })

  it('ночные из хвоста переходящей смены = 6ч', () => {
    const pay = calcNightPay(feb, 200)
    expect(pay.crossMonthNightHours).toBe(6)
  })

  it('кастомный процент надбавки', () => {
    const pay = calcNightPay(feb, 100, 0.2)
    expect(pay.nightSupplementRub).toBe(Math.round(feb.summary.hoursNight * 100 * 0.2 * 100) / 100)
  })
})
