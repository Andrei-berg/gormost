// Journal — UI types, reference constants, mappers and helpers.
// Live data (objects + plan items) comes from Supabase via api-client; this
// module maps DB rows (snake_case) to the journal's UI types (camelCase) and
// holds reference data (categories/services) that mirrors the seeded DB rows.

import type { JournalObject, DailyPlanItem } from '@/types'

export type Period = 'DAY' | 'NIGHT'

export interface Category {
  id: string
  name: string
  em: string
}

export interface ObjectRef {
  id: string
  name: string
  categoryId: string
  address: string
}

export interface ServiceRef {
  id: string
  name: string
  em: string
  color: string
}

export interface PlanItem {
  id: string
  planDate: string // ISO yyyy-mm-dd
  period: Period
  objectId: string
  serviceId: string
  work: string
  workers: number  // рабочие (оранжевая каска)
  foremen: number  // мастера (белая каска)
  itr: number      // ИТР (белая каска + знак)
  vehicles: number
  note?: string
}

// Contract from the add forms to the orchestrator. Object is either an existing
// id or a new object to create on the fly.
export interface AddInput {
  object: { id: string } | { newName: string; categoryId: string; address: string }
  serviceId: string
  work: string
  workers: number
  foremen: number
  itr: number
  vehicles: number
}

export const CATEGORIES: Category[] = [
  { id: 'TUN',   name: 'Туннели',                 em: '🚇' },
  { id: 'HOUSE', name: 'Кап. ремонт домов',       em: '🏠' },
  { id: 'SOC',   name: 'Соцобъекты',              em: '🏫' },
  { id: 'ROAD',  name: 'Дороги / благоустройство', em: '🛣️' },
  { id: 'PED',   name: 'Пешеходные переходы',     em: '🚶' },
  { id: 'OTHER', name: 'Прочее',                  em: '📍' },
]

// Category used for objects created on the fly (refine later in admin).
export const QUICK_CATEGORY = 'OTHER'

// Normalize for fuzzy object matching: lowercase, ё→е, collapse spaces.
export const norm = (s: string) =>
  s.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim()

// Names match the `services` table in the main program (canonical).
export const SERVICES: ServiceRef[] = [
  { id: 'SRV-ENG',  name: 'Служба Главного Энергетика', em: '⚡',  color: '#eab308' },
  { id: 'SRV-STR',  name: 'Служба СЭИС',                em: '🏗️', color: '#8b5cf6' },
  { id: 'SRV-FIRE', name: 'Служба пожарной безопасности', em: '🚒', color: '#ef4444' },
  { id: 'SRV-VENT', name: 'Служба ЭВС',                 em: '💨', color: '#06b6d4' },
  { id: 'SRV-CCTV', name: 'Служба ВН и СС',             em: '📹', color: '#22c55e' },
]

// ── DB row → UI type mappers ────────────────────────────────────────────────
export const toObjectRef = (o: JournalObject): ObjectRef => ({
  id: o.id, name: o.name, categoryId: o.category_id, address: o.address,
})

export const toPlanItem = (r: DailyPlanItem): PlanItem => ({
  id: r.id,
  planDate: r.plan_date,
  period: r.shift_type,
  objectId: r.object_id,
  serviceId: r.service_id,
  work: r.work_text,
  workers: r.required_workers,
  foremen: r.required_foremen,
  itr: r.required_itr,
  vehicles: r.required_vehicles,
  note: r.note ?? undefined,
})

// ── date helpers ────────────────────────────────────────────────────────────
export const isoOf = (d: Date) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return z.toISOString().slice(0, 10)
}
export const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return isoOf(d)
}
export const TODAY_ISO = isoOf(new Date())
export const TOMORROW_ISO = addDays(TODAY_ISO, 1)

export const fmtDateRu = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', weekday: 'long',
  })

export const PERIOD_META: Record<Period, { label: string; em: string; color: string; bg: string }> = {
  DAY:   { label: 'День',  em: '☀️', color: '#f59e0b', bg: 'rgba(245,158,11,0.16)' },
  NIGHT: { label: 'Ночь',  em: '🌙', color: '#818cf8', bg: 'rgba(99,102,241,0.20)' },
}
