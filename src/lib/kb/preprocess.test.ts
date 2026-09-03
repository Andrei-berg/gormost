// D-09 composition contract. preprocess() is the ONE text entry point shared by
// index build time and query time; Phase 9 ingest and Phase 11 dictation reuse
// it verbatim. These assertions are the specification:
//   - stage order (expandAbbreviations BEFORE normalize)
//   - `normalized` is exactly normalize(expandAbbreviations(input)), never
//     independently computed
//   - identical output for the four consumer kinds (catalog name / alias surface
//     / dictation text / Excel cell) — the anti-variant assertion for D-09 / T-08-08
//   - empty / whitespace-only input -> { normalized: '', lemmas: [] }
//   - idempotent on its own `normalized` output

import { describe, it, expect } from 'vitest'
import * as preprocessModule from './preprocess'
import { preprocess } from './preprocess'
import { normalize } from './normalize'
import { expandAbbreviations } from './expandAbbreviations'

const inputs = [
  'борт. камень',
  'ж/б плита',
  'п/п',
  'ЭВ №3',
  'Лефортовский тоннель',
  'на Лефортовском тоннеле',
  '«Лефортовский тоннель».',
  'ЛТР — левая труба',
  'Замена бортового камня',
  'Инженерные системы',
  '',
  '   ',
]

describe('preprocess — stage order: expandAbbreviations runs before normalize (D-09/D-10)', () => {
  it('expands a key whose punctuation normalize would strip (борт.)', () => {
    expect(preprocess('борт. камень').normalized).toBe('бортовой камень')
  })

  it('expands a key whose slash normalize would rewrite (ж/б)', () => {
    expect(preprocess('ж/б плита').normalized).toBe('железобетонный плита')
  })

  it('expands a key that is pure punctuation-joined (п/п)', () => {
    expect(preprocess('п/п').normalized).toBe('пешеходный переход')
  })

  it('a normalize-only pass would NOT expand these — proving the order', () => {
    expect(normalize('борт. камень')).toBe('борт камень')
    expect(normalize('п/п')).toBe('п/п')
  })
})

describe('preprocess — `normalized` is not independently computed', () => {
  for (const input of inputs) {
    it(`normalized === normalize(expandAbbreviations(x)) for: ${JSON.stringify(input)}`, () => {
      expect(preprocess(input).normalized).toBe(normalize(expandAbbreviations(input)))
    })
  }
})

describe('preprocess — declension shares every content lemma (D-12a property)', () => {
  it('«на Лефортовском тоннеле» contains every lemma of «Лефортовский тоннель», differing only by the preposition', () => {
    const base = preprocess('Лефортовский тоннель').lemmas
    const declined = preprocess('на Лефортовском тоннеле').lemmas
    for (const lemma of base) {
      expect(declined).toContain(lemma)
    }
    const extra = declined.filter((l) => !base.includes(l))
    expect(extra).toEqual(['на']) // documented stop-token difference
  })
})

describe('preprocess — identical output for the four consumer kinds (D-09 anti-variant)', () => {
  it('catalog name, alias surface, dictation text and Excel cell take the same code path', () => {
    const phrase = 'ЭВ №3'
    const asCatalogName = preprocess(phrase)
    const asAliasSurface = preprocess(phrase)
    const asDictationText = preprocess(phrase)
    const asExcelCell = preprocess(phrase)

    expect(asAliasSurface).toEqual(asCatalogName)
    expect(asDictationText).toEqual(asCatalogName)
    expect(asExcelCell).toEqual(asCatalogName)
    expect(asCatalogName).toEqual({
      normalized: 'эвакуационный выход №3',
      lemmas: asCatalogName.lemmas,
    })
    expect(asCatalogName.lemmas.length).toBeGreaterThan(0)
  })
})

describe('preprocess — empty and whitespace-only input', () => {
  it("preprocess('') returns { normalized: '', lemmas: [] }", () => {
    expect(preprocess('')).toEqual({ normalized: '', lemmas: [] })
  })

  it("preprocess('   ') returns { normalized: '', lemmas: [] }", () => {
    expect(preprocess('   ')).toEqual({ normalized: '', lemmas: [] })
  })

  it('no empty-string token ever appears in lemmas', () => {
    for (const input of inputs) {
      expect(preprocess(input).lemmas).not.toContain('')
    }
  })
})

describe('preprocess — idempotent on its own normalized output', () => {
  for (const input of inputs) {
    it(`feeding normalized back produces the same lemmas for: ${JSON.stringify(input)}`, () => {
      const once = preprocess(input)
      const twice = preprocess(once.normalized)
      expect(twice.normalized).toBe(once.normalized)
      expect(twice.lemmas).toEqual(once.lemmas)
    })
  }
})

describe('preprocess — module surface', () => {
  it('exports exactly one symbol', () => {
    expect(Object.keys(preprocessModule)).toEqual(['preprocess'])
  })
})
