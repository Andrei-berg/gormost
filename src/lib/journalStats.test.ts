import { describe, it, expect } from 'vitest'
import { aggregateJournal } from './journalStats'
import type { DailyPlanItem } from '@/types'

const base: Omit<DailyPlanItem, 'id' | 'service_id' | 'object_id' | 'work_text'> = {
  plan_date: '2026-06-22', shift_type: 'DAY',
  required_workers: 0, required_foremen: 0, required_itr: 0, required_vehicles: 0,
}

const mk = (p: Partial<DailyPlanItem>): DailyPlanItem => ({
  id: Math.random().toString(36), service_id: 'SRV-ENG', object_id: 'o1', work_text: 'работа', ...base, ...p,
})

describe('aggregateJournal (дашборд начальника из журнала)', () => {
  it('counts items, distinct objects and services', () => {
    const s = aggregateJournal([
      mk({ service_id: 'SRV-ENG', object_id: 'o1' }),
      mk({ service_id: 'SRV-STR', object_id: 'o1' }),
      mk({ service_id: 'SRV-ENG', object_id: 'o2' }),
    ])
    expect(s.totalItems).toBe(3)
    expect(s.objects).toBe(2)
    expect(s.services).toBe(2)
  })

  it('sums coarse people and vehicles', () => {
    const s = aggregateJournal([
      mk({ required_workers: 3, required_foremen: 1, required_itr: 1, required_vehicles: 2 }),
      mk({ required_workers: 2, required_vehicles: 1 }),
    ])
    expect(s.people).toBe(7)
    expect(s.vehiclesCount).toBe(3)
  })

  it('collects distinct garage numbers across items', () => {
    const s = aggregateJournal([
      mk({ vehicle_numbers: ['335', '196'] }),
      mk({ vehicle_numbers: ['196', '091'] }),
    ])
    expect(s.vehicleNumbers).toEqual(['335', '196', '091'])
  })

  it('aggregates specialties by code, descending', () => {
    const s = aggregateJournal([
      mk({ specialties: [{ code: 'д', count: 11 }, { code: 'эл', count: 3 }] }),
      mk({ specialties: [{ code: 'эл', count: 2 }] }),
    ])
    expect(s.specialties).toEqual([{ code: 'д', count: 11 }, { code: 'эл', count: 5 }])
  })

  it('counts permit-required (п.15) items and shift / flag breakdown', () => {
    const s = aggregateJournal([
      mk({ work_text: 'Работа на высоте', shift_type: 'NIGHT', item_flag: 'BY_ORDER' }),
      mk({ work_text: 'покраска', shift_type: 'AROUND' }),
    ])
    expect(s.permitsRequired).toBe(1)
    expect(s.byShift).toEqual({ DAY: 0, NIGHT: 1, AROUND: 1 })
    expect(s.flags.BY_ORDER).toBe(1)
  })

  it('builds per-service breakdown sorted by item count', () => {
    const s = aggregateJournal([
      mk({ service_id: 'SRV-ENG', required_workers: 2 }),
      mk({ service_id: 'SRV-STR', required_workers: 1 }),
      mk({ service_id: 'SRV-ENG', required_workers: 3 }),
    ])
    expect(s.byService[0].serviceId).toBe('SRV-ENG')
    expect(s.byService[0].items).toBe(2)
    expect(s.byService[0].people).toBe(5)
  })
})
