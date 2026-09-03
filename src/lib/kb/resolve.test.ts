import { describe, it, expect } from 'vitest'
import type { EntityAlias } from './types'
import { buildKbIndex } from './index'
import { resolveEntity } from './resolve'
import { normalize } from './normalize'
import { preprocess } from './preprocess'
import { aliases, cases, objects, services, workTypes } from './__fixtures__/resolve-cases.ru'

const rows = { objects, services, workTypes, aliases }
const index = buildKbIndex(rows)

const nameById = new Map<string, string>([
  ...objects.map((o) => [o.id, o.name] as const),
  ...workTypes.map((w) => [w.work_type_id, w.work_name] as const),
  ...services.map((s) => [s.service_id, s.service_name] as const),
])
const fixtureIdSet = new Set(nameById.keys())
const objectIdSet = new Set(objects.map((o) => o.id))

describe('resolveEntity — the D-22 Russian fixture battery (KB-04 SC#4)', () => {
  it('runs at least 30 fixture cases, at least 3 of them unknown', () => {
    expect(cases.length).toBeGreaterThanOrEqual(30)
    expect(cases.filter((c) => c.expect === null).length).toBeGreaterThanOrEqual(3)
  })

  for (const c of cases) {
    it(`${c.note}: "${c.phrase}"`, () => {
      const r = resolveEntity(c.phrase, index)

      if (c.expect === null) {
        expect(r.status).toBe('unresolved')
        expect('id' in r).toBe(false)
        return
      }
      if (c.expect === 'ambiguous') {
        expect(r.status).toBe('ambiguous')
        if (r.status !== 'ambiguous') return
        expect(r.candidates.length).toBeGreaterThanOrEqual(2)
        const scores = r.candidates.map((x) => x.score)
        expect([...scores].sort((a, b) => b - a)).toEqual(scores) // ranked desc
        return
      }
      expect(r.status).toBe('resolved')
      if (r.status !== 'resolved') return
      expect(r.type).toBe(c.expect.type)
      expect(nameById.get(r.id)).toBe(c.expect.canonicalName)
    })
  }

  it('whole-fixture invariant: every resolved id is a real fixture id; every null expectation is unresolved', () => {
    for (const c of cases) {
      const r = resolveEntity(c.phrase, index)
      if (c.expect === null) {
        expect(r.status).toBe('unresolved')
        continue
      }
      if (r.status === 'resolved') expect(fixtureIdSet.has(r.id)).toBe(true)
      if (r.status === 'ambiguous') {
        for (const cand of r.candidates) expect(fixtureIdSet.has(cand.id)).toBe(true)
      }
    }
  })
})

describe('resolveEntity — ladder short-circuits (D-15)', () => {
  it('an exact alias hit returns method "alias" and never enters the fuzzy layer', () => {
    const r = resolveEntity('Лефортовский тоннель', index)
    expect(r).toMatchObject({ status: 'resolved', method: 'alias', score: 1, type: 'object' })
    if (r.status === 'resolved') expect(objectIdSet.has(r.id)).toBe(true)
  })

  it('an alias-free catalog name returns method "exact"', () => {
    const r = resolveEntity('Пешеходный тоннель ТТК', index)
    expect(r).toMatchObject({ status: 'resolved', method: 'exact' })
  })

  it('a declension variant returns method "fuzzy"', () => {
    const r = resolveEntity('на Лефортовском тоннеле', index)
    expect(r).toMatchObject({ status: 'resolved', method: 'fuzzy', type: 'object' })
    if (r.status === 'resolved') {
      expect(nameById.get(r.id)).toBe('Лефортовский тоннель')
      expect(r.score).toBeLessThan(0.95) // fuzzy never outranks an exact hit
    }
  })

  it('empty and whitespace-only input return { status: "unresolved", normalized: "" }', () => {
    for (const p of ['', '   ', ' \t ']) {
      expect(resolveEntity(p, index)).toEqual({ status: 'unresolved', normalized: '' })
    }
  })
})

describe('resolveEntity — the invented-entity guard (T-08-01, KB-04 SC#4)', () => {
  it('a plausible-sounding but absent tunnel name does NOT snap to a real tunnel', () => {
    const r = resolveEntity('Серебряноборский тоннель', index)
    expect(r.status).toBe('unresolved')
    expect(JSON.stringify(r)).not.toContain('"id"')
  })

  it('pure garbage returns unresolved with no id', () => {
    const r = resolveEntity('капитальный ремонт космодрома', index)
    expect(r.status).toBe('unresolved')
  })

  it('an alias whose canonical_id is absent from the index is skipped (no dangling id)', () => {
    expect(resolveEntity('фантомный объект', index).status).toBe('unresolved')
  })

  it('every "resolved" fixture id is a member of the loaded id set', () => {
    for (const c of cases) {
      if (!c.expect || c.expect === 'ambiguous') continue
      const r = resolveEntity(c.phrase, index)
      if (r.status === 'resolved') expect(fixtureIdSet.has(r.id)).toBe(true)
    }
  })
})

describe('resolveEntity — threshold boundary (KB-04 edge: boundary)', () => {
  it('one step either side of config.low flips the outcome', () => {
    const phrase = 'пешеходный тоннель' // a fuzzy match, missing the "ТТК" word
    const r0 = resolveEntity(phrase, index)
    expect(r0.status).toBe('resolved')
    const score = r0.status === 'resolved' ? r0.score : 0

    // low exactly at the score -> still resolves (comparison is >= low)
    const atLow = buildKbIndex(rows, { low: score })
    expect(atLow.config.low).toBe(score)
    expect(resolveEntity(phrase, atLow).status).toBe('resolved')

    // low a hair above the score -> the same phrase is now unresolved
    const aboveLow = buildKbIndex(rows, { low: score + 1e-6 })
    expect(resolveEntity(phrase, aboveLow).status).toBe('unresolved')
  })

  it('the near-tie pair is only ambiguous while both candidates clear low', () => {
    const r = resolveEntity('камера затвора', index)
    expect(r.status).toBe('ambiguous')

    // Raise low above the pair's score -> ambiguous collapses to unresolved,
    // never to an arbitrary pick.
    const strict = buildKbIndex(rows, { low: 0.99 })
    expect(resolveEntity('камера затвора', strict).status).toBe('unresolved')
  })
})

describe('resolveEntity — opts.type narrows BEFORE scoring', () => {
  it('an object phrase does not resolve when the search is narrowed to work_type', () => {
    const r = resolveEntity('Лефортовский тоннель', index, { type: 'work_type' })
    expect(r.status).toBe('unresolved')
  })

  it('a service phrase does not resolve when narrowed to work_type', () => {
    expect(resolveEntity('Инженерные системы', index, { type: 'work_type' }).status).toBe('unresolved')
  })

  it('a work_type phrase still resolves when narrowed to work_type', () => {
    const r = resolveEntity('борт. камень', index, { type: 'work_type' })
    expect(r).toMatchObject({ status: 'resolved', type: 'work_type' })
  })
})

describe('resolveEntity — alias weight orders but never promotes (D-15, T-08-18)', () => {
  // Two aliases, identical fuzzy-matchable surface, different canonicals + weights.
  const mk = (surface: string, id: string, weight: number): EntityAlias => ({
    id: `w-${id}`,
    surface_raw: surface,
    surface_norm: surface,
    canonical_type: 'object',
    canonical_id: id,
    scope_object_id: null,
    weight,
    source: 'seed',
    created_by: null,
    created_at: '',
  })
  const wObjects = [
    { id: 'o-low', name: 'Объект низковесный', category_id: 'X', address: '' },
    { id: 'o-high', name: 'Объект высоковесный', category_id: 'X', address: '' },
  ]
  const wIndex = buildKbIndex({
    objects: wObjects,
    services: [],
    workTypes: [],
    aliases: [mk('насосная', 'o-low', 20), mk('насосная', 'o-high', 900)],
  })

  it('equal fuzzy scores are ordered by alias weight descending', () => {
    // "насосную" != "насосная" -> not exact; fuzzy scores both alias entries equal.
    const r = resolveEntity('насосную', wIndex)
    expect(r.status).toBe('ambiguous')
    if (r.status === 'ambiguous') {
      expect(r.candidates.map((c) => c.id)).toEqual(['o-high', 'o-low'])
      expect(r.candidates[0].score).toBe(r.candidates[1].score) // truly equal — order came from weight
    }
  })

  it('a high-weight alias does NOT lift a below-low fuzzy score to resolved', () => {
    // A phrase that barely shares anything with the weight-900 surface.
    const r = resolveEntity('зелёный водопад в тумане ночью', wIndex)
    expect(r.status).toBe('unresolved')
  })
})

describe('resolveEntity — the D-13 collision surface resolves ambiguous', () => {
  it('one surface mapping to two canonicals is ambiguous, ranked by alias weight desc', () => {
    const r = resolveEntity('спорный участок', index)
    expect(r.status).toBe('ambiguous')
    if (r.status === 'ambiguous') {
      // weights 150 (mitkovo) > 100 (lefortovo)
      expect(r.candidates.map((x) => x.id)).toEqual(['obj-mitkovo-tun', 'obj-lefortovo-tun'])
    }
  })
})

describe('buildKbIndex — input filtering (KB-01, D-01)', () => {
  it('loads only work_types rows whose service_id is not null', () => {
    expect(resolveEntity('Работа без службы', index).status).toBe('unresolved')
    const r = resolveEntity('Замена бортового камня', index)
    expect(r).toMatchObject({ status: 'resolved', type: 'work_type', method: 'exact' })
  })
})

describe('normalize — D-11 code-point rules (regression)', () => {
  it('lowercases, folds ё→е and preserves й', () => {
    expect(normalize('Ёлка')).toBe('елка')
    expect(normalize('Й')).toBe('й')
  })
  it('collapses NBSP and whitespace runs to one ASCII space and trims', () => {
    expect(normalize('  x   y  ')).toBe('x y')
    expect(normalize('   ')).toBe('')
  })
})

describe('preprocess — single text entry point (regression)', () => {
  it('expands abbreviations before normalizing', () => {
    expect(preprocess('борт. камень').normalized).toBe('бортовой камень')
  })
  it('returns no lemmas for empty / whitespace input', () => {
    expect(preprocess('   ')).toEqual({ normalized: '', lemmas: [] })
  })
})
