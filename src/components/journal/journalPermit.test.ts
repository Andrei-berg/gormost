import { describe, it, expect } from 'vitest'
import { journalItemToWorkPlan } from './journalPermit'
import type { PlanItem } from './data'
import type { AuthSession } from '@/types'

const session: AuthSession = {
  user_id: 'u1', tab_number: '0000', full_name: 'Иванов И.И.',
  role_level: 'BOSS', service_id: 'SRV-STR', position: 'начальник',
}

const item: PlanItem = {
  id: 'i1', planDate: '2026-06-20', period: 'NIGHT',
  objectId: 'o1', serviceId: 'SRV-ENG', work: 'Замена камеры на проезжей части',
  workers: 3, foremen: 2, itr: 1, vehicles: 1, note: 'примечание',
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
})
