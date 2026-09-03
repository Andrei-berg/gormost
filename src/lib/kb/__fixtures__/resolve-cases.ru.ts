// Starter Russian fixture set for the resolver (D-22). ~8 cases covering the
// Task 2 <behavior> list; Plan 08-05 grows this to the ~30-case golden set that
// also seeds the Phase 10 eval.
//
// `expect: null` means the phrase must resolve to `unresolved` — the resolver
// must NOT invent an entity.

import type { JournalObject, Service } from '@/types'
import type { CanonicalType, EntityAlias, KbWorkType } from '../types'

export const objects: JournalObject[] = [
  { id: 'obj-lefortovo-tun', name: 'Лефортовский тоннель', category_id: 'TUN', address: '' },
  { id: 'obj-ped-ttk', name: 'Пешеходный тоннель ТТК', category_id: 'TUN', address: '' },
]

export const services: Service[] = [
  { service_id: 'SRV-ENG', service_name: 'Инженерные системы', created_at: '' },
]

export const workTypes: KbWorkType[] = [
  {
    work_type_id: 'wt-bort',
    construction_id: 'c-str-1',
    work_name: 'Замена бортового камня',
    created_at: '',
    service_id: 'SRV-STR',
    unit: 'п.м.',
    typical_period: 'DAY',
    typical_crew: { workers: 4, foremen: 1, itr: 1, vehicles: 1 },
  },
  {
    // service_id === null -> buildKbIndex must NOT load this row (D-01)
    work_type_id: 'wt-immature',
    construction_id: 'c-str-1',
    work_name: 'Работа без службы',
    created_at: '',
    service_id: null,
    unit: null,
    typical_period: null,
    typical_crew: null,
  },
]

let seq = 0
function mk(
  surface_raw: string,
  canonical_type: CanonicalType,
  canonical_id: string,
  weight = 100,
): EntityAlias {
  return {
    id: `alias-${++seq}`,
    surface_raw,
    surface_norm: surface_raw.toLowerCase(),
    canonical_type,
    canonical_id,
    scope_object_id: null,
    weight,
    source: 'seed',
    created_by: null,
    created_at: '',
  }
}

export const aliases: EntityAlias[] = [
  mk('Лефортовский тоннель', 'object', 'obj-lefortovo-tun'),
  mk('ЛТ', 'object', 'obj-lefortovo-tun'),
  mk('борт. камень', 'work_type', 'wt-bort'), // abbreviation expands -> "бортовой камень"
  // Two canonicals for one surface -> ambiguous, ordered by weight desc.
  mk('спорный', 'object', 'obj-lefortovo-tun', 100),
  mk('спорный', 'object', 'obj-ped-ttk', 150),
  // canonical_id absent from the loaded rows -> must be skipped at index build.
  mk('фантомный объект', 'object', 'obj-does-not-exist'),
]

export interface ResolveCase {
  phrase: string
  expect: { type: CanonicalType; canonicalName: string } | null
  note: string
}

export const cases: ResolveCase[] = [
  {
    phrase: 'Лефортовский тоннель',
    expect: { type: 'object', canonicalName: 'Лефортовский тоннель' },
    note: 'exact alias hit',
  },
  {
    phrase: '  ЛЕФОРТОВСКИЙ   тоннель ',
    expect: { type: 'object', canonicalName: 'Лефортовский тоннель' },
    note: 'uppercase + doubled spaces variant of the same surface',
  },
  {
    phrase: 'Лефортовский тоннель',
    expect: { type: 'object', canonicalName: 'Лефортовский тоннель' },
    note: 'NBSP variant of the same surface',
  },
  {
    phrase: 'ЛТ',
    expect: { type: 'object', canonicalName: 'Лефортовский тоннель' },
    note: 'short-form alias',
  },
  {
    phrase: 'Пешеходный тоннель ТТК',
    expect: { type: 'object', canonicalName: 'Пешеходный тоннель ТТК' },
    note: 'exact normalized catalog name, no alias row',
  },
  {
    phrase: 'борт. камень',
    expect: { type: 'work_type', canonicalName: 'Замена бортового камня' },
    note: 'abbreviation expansion feeds the alias surface',
  },
  {
    phrase: 'Инженерные системы',
    expect: { type: 'service', canonicalName: 'Инженерные системы' },
    note: 'exact service name',
  },
  {
    phrase: 'капитальный ремонт космодрома',
    expect: null,
    note: 'unknown phrase -> unresolved, no invented entity',
  },
  {
    phrase: 'фантомный объект',
    expect: null,
    note: 'alias with a dangling canonical_id -> unresolved',
  },
]
