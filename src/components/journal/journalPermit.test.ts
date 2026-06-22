import { describe, it, expect } from 'vitest'
import { journalItemToWorkPlan, shiftHeaderToPermitDefaults, buildPermitDefaults, permitReadiness } from './journalPermit'
import { formatSpecialties, specialtiesTotal, type PlanItem } from './data'
import type { AuthSession, JournalShiftHeader } from '@/types'

const session: AuthSession = {
  user_id: 'u1', tab_number: '0000', full_name: 'Иванов И.И.',
  role_level: 'BOSS', service_id: 'SRV-STR', position: 'начальник',
}

const item: PlanItem = {
  id: 'i1', planDate: '2026-06-20', period: 'NIGHT',
  objectId: 'o1', serviceId: 'SRV-ENG', work: 'Замена камеры на проезжей части',
  workers: 3, foremen: 2, itr: 1, vehicles: 1, specialties: [], vehicleNumbers: [], flag: null, note: 'примечание',
}

describe('journalItemToWorkPlan (журнал → наряд)', () => {
  const plan = journalItemToWorkPlan(item, 'Туннель №3', session)

  it('carries service, date and shift from the journal item', () => {
    expect(plan.service_id).toBe('SRV-ENG')
    expect(plan.plan_date).toBe('2026-06-20')
    expect(plan.shift_type).toBe('NIGHT')
    expect(plan.created_by).toBe('u1')
  })

  it('produces exactly one item with object name as location and the work text', () => {
    expect(plan.items).toHaveLength(1)
    expect(plan.items[0].location).toBe('Туннель №3')
    expect(plan.items[0].work_description).toBe('Замена камеры на проезжей части')
  })

  it('maps headcount roles to the work-plan fields (мастера→masters, ИТР→foremen)', () => {
    const it0 = plan.items[0]
    expect(it0.required_workers).toBe(3)
    expect(it0.required_masters).toBe(2)   // журнал.foremen = мастера
    expect(it0.required_foremen).toBe(1)   // журнал.itr = ИТР
    expect(it0.required_vehicles).toBe(1)
  })

  it('leaves состав/транспорт empty (journal has counts, not names)', () => {
    expect(plan.items[0].workers).toEqual([])
    expect(plan.items[0].vehicles).toEqual([])
    expect(plan.items[0].cross_requests).toEqual([])
  })

  it('produces a printable plan with no permit recorded yet', () => {
    expect(plan.has_permit).toBeNull()
    expect(plan.status).toBe('PLANNED')
  })

  it('maps the сутки (AROUND) period to a DAY permit (24h shift starts in the day-block)', () => {
    const around = journalItemToWorkPlan({ ...item, period: 'AROUND' }, 'Туннель №3', session)
    expect(around.shift_type).toBe('DAY')
  })
})

describe('shiftHeaderToPermitDefaults (шапка дня → наряд)', () => {
  const base: JournalShiftHeader = {
    id: 'h1', plan_date: '2026-06-22', shift_type: 'DAY',
    duty_master: 'Тишин А.С.', shift_driver: '8/11', issuer: 'Оборин К.Н.',
  }

  it('feeds Отв. → issuedBy and водитель смены → vehicle note', () => {
    const d = shiftHeaderToPermitDefaults(base)
    expect(d.issuedBy).toBe('Оборин К.Н.')
    expect(d.vehicleNote).toBe('Водитель смены: 8/11')
  })

  it('returns empty for no header', () => {
    expect(shiftHeaderToPermitDefaults(null)).toEqual({})
  })

  it('omits blank fields', () => {
    const d = shiftHeaderToPermitDefaults({ ...base, issuer: '  ', shift_driver: '' })
    expect(d.issuedBy).toBeUndefined()
    expect(d.vehicleNote).toBeUndefined()
  })

  it('buildPermitDefaults combines водитель смены and the item garage numbers', () => {
    const d = buildPermitDefaults(base, { ...item, vehicleNumbers: ['335', '196'] })
    expect(d.issuedBy).toBe('Оборин К.Н.')
    expect(d.vehicleNote).toBe('Водитель смены: 8/11; Транспорт №: 335, 196')
  })

  it('buildPermitDefaults uses only garage numbers when no header', () => {
    const d = buildPermitDefaults(null, { ...item, vehicleNumbers: ['091'] })
    expect(d.issuedBy).toBeUndefined()
    expect(d.vehicleNote).toBe('Транспорт №: 091')
  })
})

describe('permitReadiness (полоса готовности наряда)', () => {
  const header: JournalShiftHeader = {
    id: 'h1', plan_date: '2026-06-22', shift_type: 'DAY', issuer: 'Оборин К.Н.',
  }

  it('место/работа/факторы are auto-satisfied; Отв. from шапка, состав from counts', () => {
    const r = permitReadiness(item, header) // item has workers/foremen/itr > 0
    expect(r.done).toBe(true)
    expect(r.ready).toBe(5)
    expect(r.missing).toEqual([])
  })

  it('flags missing Отв. when шапка has no issuer', () => {
    const r = permitReadiness(item, null)
    expect(r.done).toBe(false)
    expect(r.missing).toContain('Отв.')
    expect(r.ready).toBe(4)
  })

  it('flags missing состав when no headcount entered', () => {
    const r = permitReadiness({ ...item, workers: 0, foremen: 0, itr: 0 }, header)
    expect(r.missing).toContain('состав')
  })

  it('counts состав as satisfied when specialties are filled even with zero coarse counts', () => {
    const r = permitReadiness(
      { ...item, workers: 0, foremen: 0, itr: 0, specialties: [{ code: 'эл', count: 3 }] },
      header,
    )
    expect(r.missing).not.toContain('состав')
    expect(r.done).toBe(true)
  })
})

describe('состав по специальностям helpers', () => {
  it('formats a compact summary, skipping zero counts', () => {
    expect(formatSpecialties([{ code: 'д', count: 11 }, { code: 'эл', count: 3 }, { code: 'итр', count: 0 }]))
      .toBe('11д · 3эл')
  })

  it('returns empty string for no breakdown', () => {
    expect(formatSpecialties([])).toBe('')
    expect(formatSpecialties(null)).toBe('')
  })

  it('totals positive counts only', () => {
    expect(specialtiesTotal([{ code: 'д', count: 11 }, { code: 'эл', count: 3 }])).toBe(14)
    expect(specialtiesTotal(null)).toBe(0)
  })
})
