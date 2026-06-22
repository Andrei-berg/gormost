// Aggregation of journal daily plan items for the boss dashboard (этап 1: the
// boss panel fills with real data entered in /journal). Pure + testable.

import type { DailyPlanItem, SpecialtyCount } from '@/types'
import { requiresWorkPermit } from './highRiskWorks'

export interface JournalServiceStat {
  serviceId: string
  items: number
  people: number    // coarse workers + foremen + itr
  vehicles: number  // coarse required_vehicles
  permits: number   // items requiring a наряд-допуск (п.15)
}

export interface JournalStats {
  totalItems: number
  objects: number
  services: number
  people: number
  vehiclesCount: number       // coarse sum of required_vehicles
  vehicleNumbers: string[]    // distinct garage numbers across the plan
  permitsRequired: number
  byShift: { DAY: number; NIGHT: number; AROUND: number }
  flags: { BY_ORDER: number; STANDBY: number; NOTICE: number }
  byService: JournalServiceStat[]
  specialties: SpecialtyCount[] // aggregated by code, descending
}

export function aggregateJournal(items: DailyPlanItem[]): JournalStats {
  const svc = new Map<string, JournalServiceStat>()
  const objects = new Set<string>()
  const numbers: string[] = []
  const specMap = new Map<string, number>()
  const byShift = { DAY: 0, NIGHT: 0, AROUND: 0 }
  const flags = { BY_ORDER: 0, STANDBY: 0, NOTICE: 0 }
  let people = 0
  let vehiclesCount = 0
  let permitsRequired = 0

  for (const it of items) {
    const ppl = (it.required_workers || 0) + (it.required_foremen || 0) + (it.required_itr || 0)
    const needsPermit = requiresWorkPermit(it.work_text)
    people += ppl
    vehiclesCount += it.required_vehicles || 0
    if (needsPermit) permitsRequired += 1
    objects.add(it.object_id)
    if (it.shift_type in byShift) byShift[it.shift_type] += 1
    if (it.item_flag && it.item_flag in flags) flags[it.item_flag] += 1

    for (const n of it.vehicle_numbers ?? []) if (n && !numbers.includes(n)) numbers.push(n)
    for (const s of it.specialties ?? []) {
      if (s.count > 0) specMap.set(s.code, (specMap.get(s.code) ?? 0) + s.count)
    }

    const cur = svc.get(it.service_id) ?? { serviceId: it.service_id, items: 0, people: 0, vehicles: 0, permits: 0 }
    cur.items += 1
    cur.people += ppl
    cur.vehicles += it.required_vehicles || 0
    if (needsPermit) cur.permits += 1
    svc.set(it.service_id, cur)
  }

  return {
    totalItems: items.length,
    objects: objects.size,
    services: svc.size,
    people,
    vehiclesCount,
    vehicleNumbers: numbers,
    permitsRequired,
    byShift,
    flags,
    byService: [...svc.values()].sort((a, b) => b.items - a.items),
    specialties: [...specMap.entries()].map(([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count),
  }
}
