import { describe, it, expect } from 'vitest'
import type { JournalObject } from '@/types'
import type { EntityAlias } from './types'
import { findAllAliasCollisions, findAliasConflicts } from './collisions'
import { buildKbIndex } from './index'
import { resolveEntity } from './resolve'

let seq = 0
function mk(over: Partial<EntityAlias>): EntityAlias {
  return {
    id: `a-${++seq}`,
    surface_raw: 'x',
    surface_norm: 'x',
    canonical_type: 'object',
    canonical_id: 'obj-1',
    scope_object_id: null,
    weight: 100,
    source: 'seed',
    created_by: null,
    created_at: '',
    ...over,
  }
}

describe('findAllAliasCollisions — the KB-health form', () => {
  it('reports same surface_norm + type + different canonical_id as one collision group', () => {
    const groups = findAllAliasCollisions([
      mk({ surface_norm: 'лт', canonical_id: 'obj-a' }),
      mk({ surface_norm: 'лт', canonical_id: 'obj-b' }),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].surfaceNorm).toBe('лт')
    expect(groups[0].canonicalType).toBe('object')
    expect(new Set(groups[0].canonicalIds)).toEqual(new Set(['obj-a', 'obj-b']))
    expect(groups[0].aliases).toHaveLength(2)
  })

  it('same surface_norm + same canonical_id is a duplicate, NOT a collision', () => {
    const groups = findAllAliasCollisions([
      mk({ surface_norm: 'лт', canonical_id: 'obj-a' }),
      mk({ surface_norm: 'лт', canonical_id: 'obj-a', weight: 50 }),
    ])
    expect(groups).toHaveLength(0)
  })

  it('same surface_norm + different canonical_type is NOT a collision', () => {
    const groups = findAllAliasCollisions([
      mk({ surface_norm: 'эв', canonical_type: 'object', canonical_id: 'obj-a' }),
      mk({ surface_norm: 'эв', canonical_type: 'work_type', canonical_id: 'wt-a' }),
    ])
    expect(groups).toHaveLength(0)
  })

  it('a single alias is never a collision', () => {
    expect(findAllAliasCollisions([mk({ surface_norm: 'лт' })])).toHaveLength(0)
  })

  it('an empty alias list returns an empty result', () => {
    expect(findAllAliasCollisions([])).toEqual([])
  })

  it('returns every colliding group across the whole list', () => {
    const groups = findAllAliasCollisions([
      mk({ surface_norm: 'лт', canonical_id: 'obj-a' }),
      mk({ surface_norm: 'лт', canonical_id: 'obj-b' }),
      mk({ surface_norm: 'пп', canonical_type: 'work_type', canonical_id: 'wt-a' }),
      mk({ surface_norm: 'пп', canonical_type: 'work_type', canonical_id: 'wt-b' }),
      mk({ surface_norm: 'уникальный', canonical_id: 'obj-c' }),
    ])
    expect(groups).toHaveLength(2)
    expect(groups.map((g) => g.surfaceNorm).sort()).toEqual(['лт', 'пп'])
  })

  it('orders the group rows by weight descending', () => {
    const groups = findAllAliasCollisions([
      mk({ surface_norm: 'лт', canonical_id: 'obj-a', weight: 10 }),
      mk({ surface_norm: 'лт', canonical_id: 'obj-b', weight: 900 }),
    ])
    expect(groups[0].aliases.map((a) => a.weight)).toEqual([900, 10])
  })
})

describe('findAliasConflicts — the admin add-form soft-warning input', () => {
  const existing = [
    mk({ surface_norm: 'лт', canonical_type: 'object', canonical_id: 'obj-a', weight: 100 }),
    mk({ surface_norm: 'лт', canonical_type: 'object', canonical_id: 'obj-b', weight: 300 }),
    mk({ surface_norm: 'лт', canonical_type: 'work_type', canonical_id: 'wt-a' }),
  ]

  it('reports the conflicting rows for a prospective new alias, weight desc', () => {
    const hits = findAliasConflicts(
      { surfaceNorm: 'лт', canonicalType: 'object', canonicalId: 'obj-new' },
      existing,
    )
    expect(hits.map((h) => h.canonical_id)).toEqual(['obj-b', 'obj-a'])
  })

  it('does not report a row with the same canonical_id (re-adding an existing pair)', () => {
    const hits = findAliasConflicts(
      { surfaceNorm: 'лт', canonicalType: 'object', canonicalId: 'obj-a' },
      existing,
    )
    expect(hits.map((h) => h.canonical_id)).toEqual(['obj-b'])
  })

  it('does not report a row of a different canonical_type', () => {
    const hits = findAliasConflicts(
      { surfaceNorm: 'лт', canonicalType: 'service', canonicalId: 'srv-x' },
      existing,
    )
    expect(hits).toEqual([])
  })

  it('does not mutate the input list', () => {
    const snapshot = existing.map((a) => ({ ...a }))
    findAliasConflicts({ surfaceNorm: 'лт', canonicalType: 'object', canonicalId: 'z' }, existing)
    expect(existing).toEqual(snapshot)
  })

  it('empty existing list -> no conflicts', () => {
    expect(
      findAliasConflicts({ surfaceNorm: 'лт', canonicalType: 'object', canonicalId: 'x' }, []),
    ).toEqual([])
  })
})

describe('a colliding surface provably resolves ambiguous (D-13 cross-check)', () => {
  it('a KbIndex built from a colliding alias pair returns status "ambiguous" for that surface', () => {
    const objects: JournalObject[] = [
      { id: 'obj-north', name: 'Насосная станция северная', category_id: 'PMP', address: '' },
      { id: 'obj-south', name: 'Насосная станция южная', category_id: 'PMP', address: '' },
    ]
    const colliding = [
      mk({ surface_raw: 'насосная станция', surface_norm: 'насосная станция', canonical_id: 'obj-north', weight: 100 }),
      mk({ surface_raw: 'насосная станция', surface_norm: 'насосная станция', canonical_id: 'obj-south', weight: 200 }),
    ]

    // The predicate reports it.
    const groups = findAllAliasCollisions(colliding)
    expect(groups).toHaveLength(1)

    // And the resolver refuses to pick one.
    const index = buildKbIndex({ objects, services: [], workTypes: [], aliases: colliding })
    const r = resolveEntity('насосная станция', index)
    expect(r.status).toBe('ambiguous')
    if (r.status === 'ambiguous') {
      expect(r.candidates.map((c) => c.id)).toEqual(['obj-south', 'obj-north']) // weight desc
    }
  })
})
