import { describe, it, expect } from 'vitest'
import { buildKbIndex } from './index'
import { resolveEntity } from './resolve'
import { normalize } from './normalize'
import { preprocess } from './preprocess'
import { aliases, cases, objects, services, workTypes } from './__fixtures__/resolve-cases.ru'

const index = buildKbIndex({ objects, services, workTypes, aliases })

const nameById = new Map<string, string>([
  ...objects.map((o) => [o.id, o.name] as const),
  ...workTypes.map((w) => [w.work_type_id, w.work_name] as const),
  ...services.map((s) => [s.service_id, s.service_name] as const),
])
const objectIdSet = new Set(objects.map((o) => o.id))

describe('resolveEntity — fixture cases (KB-04 SC#4)', () => {
  for (const c of cases) {
    it(`${c.note}: "${c.phrase}"`, () => {
      const r = resolveEntity(c.phrase, index)
      if (c.expect === null) {
        expect(r.status).toBe('unresolved')
        expect('id' in r).toBe(false)
        return
      }
      expect(r.status).toBe('resolved')
      if (r.status !== 'resolved') return
      expect(r.type).toBe(c.expect.type)
      expect(nameById.get(r.id)).toBe(c.expect.canonicalName)
    })
  }
})

describe('resolveEntity — contract guarantees (D-07)', () => {
  it('resolves the exact alias via method "alias" to a real journal_objects id', () => {
    const r = resolveEntity('Лефортовский тоннель', index)
    expect(r).toMatchObject({ status: 'resolved', method: 'alias', type: 'object' })
    if (r.status === 'resolved') expect(objectIdSet.has(r.id)).toBe(true)
  })

  it('resolves an alias-free catalog name via method "exact"', () => {
    const r = resolveEntity('Пешеходный тоннель ТТК', index)
    expect(r).toMatchObject({ status: 'resolved', method: 'exact' })
  })

  it('narrows by opts.type — the object phrase does not resolve as work_type', () => {
    const r = resolveEntity('Лефортовский тоннель', index, { type: 'work_type' })
    expect(r.status).toBe('unresolved')
  })

  it('every resolved fixture result carries an id from the fixture id set', () => {
    const allIds = new Set(nameById.keys())
    for (const c of cases) {
      if (c.expect === null) continue
      const r = resolveEntity(c.phrase, index)
      if (r.status === 'resolved') expect(allIds.has(r.id)).toBe(true)
    }
  })

  it('unknown phrase returns unresolved with no invented id', () => {
    const r = resolveEntity('капитальный ремонт космодрома', index)
    expect(r.status).toBe('unresolved')
    expect(JSON.stringify(r)).not.toContain('"id"')
  })

  it('empty and whitespace-only input return { status: "unresolved", normalized: "" }', () => {
    for (const p of ['', '   ', ' \t ']) {
      expect(resolveEntity(p, index)).toEqual({ status: 'unresolved', normalized: '' })
    }
  })

  it('an alias whose canonical_id is absent from the index is skipped (no dangling id)', () => {
    expect(resolveEntity('фантомный объект', index).status).toBe('unresolved')
  })

  it('one surface mapping to two canonicals is ambiguous, ranked by alias weight desc', () => {
    const r = resolveEntity('спорный', index)
    expect(r.status).toBe('ambiguous')
    if (r.status === 'ambiguous') {
      expect(r.candidates.map((x) => x.id)).toEqual(['obj-ped-ttk', 'obj-lefortovo-tun'])
    }
  })
})

describe('buildKbIndex — input filtering (KB-01, D-01)', () => {
  it('loads only work_types rows whose service_id is not null', () => {
    // "wt-immature" has service_id === null and must not be resolvable by name.
    expect(resolveEntity('Работа без службы', index).status).toBe('unresolved')
    // "wt-bort" is mature and resolves by its exact name.
    const r = resolveEntity('Замена бортового камня', index)
    expect(r).toMatchObject({ status: 'resolved', type: 'work_type', method: 'exact' })
  })
})

describe('normalize — D-11 code-point rules (this slice)', () => {
  it('lowercases, folds ё→е and preserves й', () => {
    expect(normalize('Ёлка')).toBe('елка')
    expect(normalize('МОСТ')).toBe('мост')
    expect(normalize('Й')).toBe('й')
  })

  it('collapses NBSP and whitespace runs to one ASCII space and trims', () => {
    expect(normalize('a  b')).toBe('a b')
    expect(normalize('  x   y  ')).toBe('x y')
    expect(normalize('   ')).toBe('')
  })
})

describe('preprocess — single text entry point (D-09)', () => {
  it('expands abbreviations before normalizing', () => {
    expect(preprocess('борт. камень').normalized).toBe('бортовой камень')
  })

  it('returns no lemmas for empty / whitespace input', () => {
    expect(preprocess('   ')).toEqual({ normalized: '', lemmas: [] })
  })
})
