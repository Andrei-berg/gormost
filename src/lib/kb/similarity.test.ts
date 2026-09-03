import { describe, it, expect } from 'vitest'
import { dice, levenshtein } from './similarity'

// A one-character edit vs a two-character edit against the same Russian base.
const BASE = 'бортовой'
const ONE_EDIT = 'бортовои' // final й -> и
const TWO_EDIT = 'барховой' // о->а and т->х

const DICE_CASES: Array<[string, string]> = [
  ['', ''],
  ['x', ''],
  ['', 'y'],
  ['x', 'y'],
  ['abc', 'abc'],
  ['ночь', 'ночь'],
  [BASE, ONE_EDIT],
  [BASE, TWO_EDIT],
  ['лефортовский тоннель', 'митьковский тоннель'],
  ['лефортовский тоннель', 'капитальный ремонт космодрома'],
  ['камера затвора', 'камера затвора северная'],
  ['насосную', 'насосная'],
]

describe('dice — Sorensen-Dice over character trigrams', () => {
  it('returns 1 for identical non-empty strings', () => {
    expect(dice('ремонт', 'ремонт')).toBe(1)
    expect(dice('a', 'a')).toBe(1)
  })

  it('returns 0 when the two strings share no trigram', () => {
    expect(dice('x', 'y')).toBe(0)
    expect(dice('ааа', 'ббб')).toBe(0)
  })

  it('dice("", "") and dice("x", "") are defined and never NaN', () => {
    expect(Number.isNaN(dice('', ''))).toBe(false)
    expect(Number.isNaN(dice('x', ''))).toBe(false)
    expect(dice('', '')).toBe(1)
    expect(dice('x', '')).toBe(0)
  })

  it('every result across the case table is a float in [0, 1] and not NaN', () => {
    for (const [a, b] of DICE_CASES) {
      const v = dice(a, b)
      expect(Number.isNaN(v)).toBe(false)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it('is symmetric: dice(a, b) === dice(b, a) across the case table', () => {
    for (const [a, b] of DICE_CASES) {
      expect(dice(a, b)).toBe(dice(b, a))
    }
  })

  it('a one-character edit scores higher than a two-character edit against the same base', () => {
    expect(dice(BASE, ONE_EDIT)).toBeGreaterThan(dice(BASE, TWO_EDIT))
  })
})

describe('levenshtein — classic edit distance', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('тоннель', 'тоннель')).toBe(0)
    expect(levenshtein('', '')).toBe(0)
  })

  it('returns the length of the other string when one is empty', () => {
    expect(levenshtein('камень', '')).toBe(6)
    expect(levenshtein('', 'плита')).toBe(5)
  })

  it('returns 1 for a single substitution', () => {
    expect(levenshtein('кот', 'ком')).toBe(1)
    expect(levenshtein('бортовой', 'бортовои')).toBe(1)
  })

  it('counts one insertion / deletion as distance 1', () => {
    expect(levenshtein('тоннель', 'тоннель ')).toBe(1)
    expect(levenshtein('тоннеле', 'тоннель')).toBe(1)
  })
})
