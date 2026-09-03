import { describe, it, expect } from 'vitest'
import { lemmatize } from './lemmatize'
import { preprocess } from './preprocess'
import { lemmaCases } from './__fixtures__/lemma-cases.ru'

// D-12a MANDATORY GATE. Any lemmatize() implementation — the vendored Snowball
// stemmer or a spiked replacement — MUST pass this file. It imports only
// lemmatize (and preprocess for the abbreviation pairs), never ./stem, so an
// implementation swap is tested identically. Do not weaken a pair to make the
// gate green: a real declined/abbreviated variant that cannot pass is a stemmer
// limitation to record, not a fixture to delete (08-02-PLAN.md Task 2).

const STOPWORDS = new Set([
  'на', 'в', 'во', 'у', 'по', 'с', 'со', 'о', 'об', 'из', 'от', 'до', 'к', 'ко',
  'за', 'над', 'под', 'при', 'для',
])

// Lemma set of a raw phrase: split on whitespace, drop prepositions/particles,
// lemmatize each remaining token, dedupe, sort. A set (not a sequence) because
// real-world variants also reorder words; the preposition drop is what lets
// «на Лефортовском тоннеле» share a lemma set with «Лефортовский тоннель».
function lemmaSet(phrase: string): string[] {
  const lemmas = phrase
    .split(/\s+/)
    .map((t) => t.toLowerCase())
    .filter((t) => t.length > 0 && !STOPWORDS.has(t))
    .map(lemmatize)
  return [...new Set(lemmas)].sort()
}

describe('lemmatize — D-12a fixture gate (variant ⇔ canonical)', () => {
  it('covers at least 25 real Russian variant/canonical pairs', () => {
    expect(lemmaCases.length).toBeGreaterThanOrEqual(25)
  })

  for (const c of lemmaCases) {
    it(`${c.note}: "${c.variant}" ⇔ "${c.canonical}"`, () => {
      if (c.viaPreprocess) {
        // Composed path (D-09): expandAbbreviations → normalize → lemmatize.
        expect(preprocess(c.variant).lemmas).toEqual(preprocess(c.canonical).lemmas)
      } else {
        expect(lemmaSet(c.variant)).toEqual(lemmaSet(c.canonical))
      }
    })
  }
})

describe('lemmatize — stays a synchronous single-argument string function (D-07/D-12)', () => {
  it('returns a string, not a promise', () => {
    const out = lemmatize('тоннеля')
    expect(typeof out).toBe('string')
    expect(out).not.toBeInstanceOf(Promise)
  })

  it('reduces a declension family to one lemma', () => {
    const forms = ['тоннель', 'тоннеля', 'тоннелю', 'тоннелем', 'тоннеле', 'тоннели']
    expect(new Set(forms.map(lemmatize))).toEqual(new Set(['тоннел']))
  })
})
