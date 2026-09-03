// The KB-04 SC#4 Russian fixture battery (D-22) — ~30 real-shaped cases proving:
//   - exact alias / exact normalized name resolve immediately (no fuzzy);
//   - declension variants, abbreviation expansions, numeric markers and
//     missing/extra descriptive words resolve through the fuzzy layer;
//   - unknown phrases resolve to `unresolved` with NO invented id (the
//     invented-entity guard, T-08-01);
//   - a near-tie pair resolves to `ambiguous` with ranked candidates.
//
// This file is ALSO the seed of the Phase 10 golden set — it grows by one row
// every time an operator corrects a mis-resolution (D-22).
//
// `expect`:
//   { type, canonicalName }  the phrase must `resolve` to that catalog row
//   null                     the phrase must be `unresolved` — no invented id
//   'ambiguous'              the phrase must be `ambiguous` with >= 2 candidates

import type { JournalObject, Service } from '@/types'
import type { CanonicalType, EntityAlias, KbWorkType } from '../types'

export const objects: JournalObject[] = [
  { id: 'obj-lefortovo-tun', name: 'Лефортовский тоннель', category_id: 'TUN', address: '' },
  { id: 'obj-sheremet-portal', name: 'Шереметьевский портал', category_id: 'POR', address: '' },
  { id: 'obj-mitkovo-tun', name: 'Митьковский тоннель', category_id: 'TUN', address: '' },
  { id: 'obj-ped-ttk', name: 'Пешеходный тоннель ТТК', category_id: 'TUN', address: '' },
  { id: 'obj-ev-3', name: 'Эвакуационный выход №3', category_id: 'EVA', address: '' },
  { id: 'obj-gate-north', name: 'Камера затвора северная', category_id: 'GAT', address: '' },
  { id: 'obj-gate-south', name: 'Камера затвора южная', category_id: 'GAT', address: '' },
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
    work_type_id: 'wt-jb-plita',
    construction_id: 'c-str-1',
    work_name: 'Монтаж железобетонной плиты',
    created_at: '',
    service_id: 'SRV-STR',
    unit: 'шт.',
    typical_period: 'NIGHT',
    typical_crew: { workers: 6, foremen: 1, itr: 1, vehicles: 2 },
  },
  {
    work_type_id: 'wt-pp',
    construction_id: 'c-str-1',
    work_name: 'Устройство пешеходного перехода',
    created_at: '',
    service_id: 'SRV-STR',
    unit: 'компл.',
    typical_period: 'DAY',
    typical_crew: { workers: 5, foremen: 1, itr: 1, vehicles: 1 },
  },
  {
    work_type_id: 'wt-tt3',
    construction_id: 'c-eng-1',
    work_name: 'Обслуживание транспортного тоннеля №3',
    created_at: '',
    service_id: 'SRV-ENG',
    unit: 'смена',
    typical_period: 'NIGHT',
    typical_crew: { workers: 3, foremen: 1, itr: 1, vehicles: 1 },
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
  mk('борт. камень', 'work_type', 'wt-bort'), // expands -> "бортовой камень"
  mk('ж/б плита', 'work_type', 'wt-jb-plita'), // expands -> "железобетонный плита"
  mk('п/п', 'work_type', 'wt-pp'), // expands -> "пешеходный переход"
  mk('тт №3', 'work_type', 'wt-tt3'), // expands -> "транспортный тоннель №3"
  mk('ЭВ №3', 'object', 'obj-ev-3'), // expands -> "эвакуационный выход №3"
  // One surface -> two distinct canonicals of the same type = a D-13 collision.
  // The surface then resolves `ambiguous`, ranked by alias weight desc.
  mk('спорный участок', 'object', 'obj-lefortovo-tun', 100),
  mk('спорный участок', 'object', 'obj-mitkovo-tun', 150),
  // canonical_id absent from the loaded rows -> must be skipped at index build.
  mk('фантомный объект', 'object', 'obj-does-not-exist'),
]

export interface ResolveCase {
  phrase: string
  expect: { type: CanonicalType; canonicalName: string } | null | 'ambiguous'
  note: string
}

export const cases: ResolveCase[] = [
  // --- exact alias / exact normalized name (ladder steps 1-2, no fuzzy) ---
  {
    phrase: 'Лефортовский тоннель',
    expect: { type: 'object', canonicalName: 'Лефортовский тоннель' },
    note: 'exact alias hit — method alias, fuzzy never entered',
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
    note: 'exact normalized catalog name, no alias row — method exact',
  },
  {
    phrase: 'Митьковский тоннель',
    expect: { type: 'object', canonicalName: 'Митьковский тоннель' },
    note: 'exact normalized catalog name',
  },
  {
    phrase: 'Шереметьевский портал',
    expect: { type: 'object', canonicalName: 'Шереметьевский портал' },
    note: 'exact normalized catalog name',
  },
  {
    phrase: 'Эвакуационный выход №3',
    expect: { type: 'object', canonicalName: 'Эвакуационный выход №3' },
    note: 'exact normalized catalog name with a number marker',
  },
  {
    phrase: 'Камера затвора северная',
    expect: { type: 'object', canonicalName: 'Камера затвора северная' },
    note: 'exact normalized catalog name (one of the near-tie pair)',
  },
  {
    phrase: 'Инженерные системы',
    expect: { type: 'service', canonicalName: 'Инженерные системы' },
    note: 'exact service name',
  },

  // --- abbreviation expansion feeding the alias / name surface ---
  {
    phrase: 'борт. камень',
    expect: { type: 'work_type', canonicalName: 'Замена бортового камня' },
    note: 'аббревиатура "борт." -> "бортовой", alias hit',
  },
  {
    phrase: 'ж/б плита',
    expect: { type: 'work_type', canonicalName: 'Монтаж железобетонной плиты' },
    note: 'аббревиатура "ж/б" -> "железобетонный", alias hit',
  },
  {
    phrase: 'п/п',
    expect: { type: 'work_type', canonicalName: 'Устройство пешеходного перехода' },
    note: 'аббревиатура "п/п" -> "пешеходный переход", alias hit',
  },
  {
    phrase: 'тт №3',
    expect: { type: 'work_type', canonicalName: 'Обслуживание транспортного тоннеля №3' },
    note: 'аббревиатура "тт" -> "транспортный тоннель" + marker, alias hit',
  },

  // --- numeric-marker equivalence: all three point at the same entity ---
  {
    phrase: 'ЭВ №3',
    expect: { type: 'object', canonicalName: 'Эвакуационный выход №3' },
    note: 'abbreviation + "№3"',
  },
  {
    phrase: 'ЭВ N3',
    expect: { type: 'object', canonicalName: 'Эвакуационный выход №3' },
    note: 'latin "N3" normalizes to "№3" — same entity',
  },
  {
    phrase: 'эвакуационный выход 3',
    expect: { type: 'object', canonicalName: 'Эвакуационный выход №3' },
    note: 'bare "3" with no marker — resolves via fuzzy to the same entity',
  },

  // --- declension variants via the fuzzy layer ---
  {
    phrase: 'на Лефортовском тоннеле',
    expect: { type: 'object', canonicalName: 'Лефортовский тоннель' },
    note: 'prepositional-case declension of the surface',
  },
  {
    phrase: 'Лефортовским тоннелем',
    expect: { type: 'object', canonicalName: 'Лефортовский тоннель' },
    note: 'instrumental-case declension',
  },
  {
    phrase: 'у Шереметьевского портала',
    expect: { type: 'object', canonicalName: 'Шереметьевский портал' },
    note: 'genitive-case declension with a preposition',
  },
  {
    phrase: 'Митьковского тоннеля',
    expect: { type: 'object', canonicalName: 'Митьковский тоннель' },
    note: 'genitive-case declension',
  },

  // --- multi-word object name with a missing / extra word ---
  {
    phrase: 'пешеходный тоннель',
    expect: { type: 'object', canonicalName: 'Пешеходный тоннель ТТК' },
    note: 'missing the "ТТК" qualifier — still resolves above low',
  },
  {
    phrase: 'Лефортовский автодорожный тоннель',
    expect: { type: 'object', canonicalName: 'Лефортовский тоннель' },
    note: 'extra descriptive word — still resolves above low',
  },

  // --- unknown phrases: MUST be unresolved, no invented entity (T-08-01) ---
  {
    phrase: 'капитальный ремонт космодрома',
    expect: null,
    note: 'pure garbage — unresolved',
  },
  {
    phrase: 'Серебряноборский тоннель',
    expect: null,
    note: 'plausible-sounding but absent tunnel — must NOT snap to a real tunnel',
  },
  {
    phrase: 'отгрузка бетона на складе',
    expect: null,
    note: 'different domain — unresolved',
  },
  {
    phrase: 'согласование графика отпусков',
    expect: null,
    note: 'different domain (HR) — unresolved',
  },
  {
    phrase: 'фантомный объект',
    expect: null,
    note: 'alias with a dangling canonical_id -> skipped at build -> unresolved',
  },

  // --- empty / whitespace ---
  {
    phrase: '',
    expect: null,
    note: 'empty input -> unresolved, normalized ""',
  },
  {
    phrase: '   \t  ',
    expect: null,
    note: 'whitespace-only input -> unresolved, normalized ""',
  },

  // --- ambiguous outcomes ---
  {
    phrase: 'спорный участок',
    expect: 'ambiguous',
    note: 'one surface -> two canonicals (D-13 collision) -> ambiguous via exact alias',
  },
  {
    phrase: 'камера затвора',
    expect: 'ambiguous',
    note: 'equidistant between "северная" and "южная" -> ambiguous via fuzzy, not a pick',
  },
]
