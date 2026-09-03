import { describe, it, expect } from 'vitest'
import type { JournalObject, Service } from '@/types'
import type { EntityAlias, KbWorkType } from './types'
import { DEFAULT_KB_CONFIG } from './types'
import { buildKbIndex } from './index'
import { preprocess } from './preprocess'

const objects: JournalObject[] = [
  { id: 'obj-lef', name: 'Лефортовский тоннель', category_id: 'TUN', address: '' },
]

const services: Service[] = [
  { service_id: 'SRV-ENG', service_name: 'Инженерные системы', created_at: '' },
]

const workTypes: KbWorkType[] = [
  {
    work_type_id: 'wt-mature',
    construction_id: 'c-1',
    work_name: 'Замена бортового камня',
    created_at: '',
    service_id: 'SRV-STR',
    unit: 'п.м.',
    typical_period: 'DAY',
    typical_crew: { workers: 4, foremen: 1, itr: 1, vehicles: 1 },
  },
  {
    work_type_id: 'wt-null-service',
    construction_id: 'c-1',
    work_name: 'Работа без службы',
    created_at: '',
    service_id: null,
    unit: null,
    typical_period: null,
    typical_crew: null,
  },
]

let seq = 0
function mkAlias(over: Partial<EntityAlias>): EntityAlias {
  return {
    id: `a-${++seq}`,
    surface_raw: 'x',
    surface_norm: 'x',
    canonical_type: 'object',
    canonical_id: 'obj-lef',
    scope_object_id: null,
    weight: 100,
    source: 'seed',
    created_by: null,
    created_at: '',
    ...over,
  }
}

describe('buildKbIndex — D-01 work_type filter', () => {
  const index = buildKbIndex({ objects, services, workTypes, aliases: [] })

  it('includes a work_type whose service_id is not null', () => {
    expect(index.entries.some((e) => e.type === 'work_type' && e.id === 'wt-mature')).toBe(true)
    expect(index.exactNameNorm.has(preprocess('Замена бортового камня').normalized)).toBe(true)
  })

  it('excludes a work_type whose service_id is null', () => {
    expect(index.entries.some((e) => e.id === 'wt-null-service')).toBe(false)
    expect(index.exactNameNorm.has(preprocess('Работа без службы').normalized)).toBe(false)
  })
})

describe('buildKbIndex — dangling alias skip (D-02)', () => {
  it('drops an alias whose canonical_id matches no loaded row of that type', () => {
    const index = buildKbIndex({
      objects,
      services,
      workTypes,
      aliases: [
        mkAlias({ surface_raw: 'фантом', surface_norm: 'фантом', canonical_id: 'obj-missing' }),
        mkAlias({ surface_raw: 'лт', surface_norm: 'лт', canonical_id: 'obj-lef' }),
      ],
    })
    expect(index.aliasBySurfaceNorm.has('фантом')).toBe(false)
    expect(index.aliasBySurfaceNorm.has('лт')).toBe(true)
    expect(index.entries.some((e) => e.id === 'obj-missing')).toBe(false)
  })
})

describe('buildKbIndex — scope_object_id is ignored (D-16)', () => {
  it('two aliases identical except for scope_object_id both land and behave identically', () => {
    const key = preprocess('северный вестибюль').normalized
    const index = buildKbIndex({
      objects,
      services,
      workTypes,
      aliases: [
        mkAlias({ surface_raw: 'северный вестибюль', canonical_id: 'obj-lef', scope_object_id: null }),
        mkAlias({ surface_raw: 'северный вестибюль', canonical_id: 'obj-lef', scope_object_id: 'obj-lef' }),
      ],
    })
    const bucket = index.aliasBySurfaceNorm.get(key)
    expect(bucket).toBeDefined()
    // Same (id, type) — collapsed to one posting, scope made no difference.
    expect(bucket).toHaveLength(1)
    expect(bucket?.[0]).toMatchObject({ id: 'obj-lef', type: 'object' })
  })
})

describe('buildKbIndex — entries are built with the query-time preprocess', () => {
  const index = buildKbIndex({
    objects,
    services,
    workTypes,
    aliases: [
      mkAlias({ surface_raw: 'борт. камень', weight: 70, canonical_id: 'wt-mature', canonical_type: 'work_type' }),
    ],
  })

  it('each catalog canonical name is present as an entry with matching nameNorm and lemmas', () => {
    for (const [id, src] of [
      ['obj-lef', 'Лефортовский тоннель'],
      ['wt-mature', 'Замена бортового камня'],
      ['SRV-ENG', 'Инженерные системы'],
    ] as const) {
      const p = preprocess(src)
      const e = index.entries.find((x) => x.id === id && x.nameNorm === p.normalized)
      expect(e, `entry for ${id}`).toBeDefined()
      expect(e?.lemmas).toEqual(p.lemmas)
    }
  })

  it('every entry is internally consistent with preprocess (no index/query divergence)', () => {
    for (const e of index.entries) {
      const self = preprocess(e.nameNorm)
      expect(self.normalized).toBe(e.nameNorm)
      expect(e.lemmas).toEqual(self.lemmas)
    }
  })

  it('the alias surface entry was run through preprocess (abbreviation expanded, weight carried)', () => {
    const aliasEntry = index.entries.find((e) => e.id === 'wt-mature' && e.weight === 70)
    expect(aliasEntry?.nameNorm).toBe(preprocess('борт. камень').normalized)
  })
})

describe('buildKbIndex — config thresholds', () => {
  it('carries the low / high / tieMargin defaults', () => {
    const index = buildKbIndex({ objects, services, workTypes, aliases: [] })
    expect(index.config).toEqual(DEFAULT_KB_CONFIG)
    expect(index.config.low).toBe(DEFAULT_KB_CONFIG.low)
    expect(index.config.high).toBe(DEFAULT_KB_CONFIG.high)
    expect(index.config.tieMargin).toBe(DEFAULT_KB_CONFIG.tieMargin)
  })

  it('accepts a partial override that lands in KbIndex.config', () => {
    const index = buildKbIndex({ objects, services, workTypes, aliases: [] }, { low: 0.42 })
    expect(index.config.low).toBe(0.42)
    expect(index.config.high).toBe(DEFAULT_KB_CONFIG.high)
    expect(index.config.tieMargin).toBe(DEFAULT_KB_CONFIG.tieMargin)
  })
})
