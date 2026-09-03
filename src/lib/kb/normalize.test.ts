// D-11 rule set, table-driven. The cases ARE the specification: Phase 9 ingest
// and Phase 11 dictation reuse normalize() verbatim, so every rule below is a
// cross-phase invariant. Rule ordering inside normalize() is Claude's Discretion
// (08-CONTEXT.md) — the idempotence loop at the bottom is what proves the chosen
// order never lets one rule feed an earlier one.

import { describe, it, expect } from 'vitest'
import * as normalizeModule from './normalize'
import { normalize } from './normalize'

const NBSP = ' '

interface Case {
  name: string
  input: string
  expected: string
}

const cases: Case[] = [
  // --- lowercase + ё-fold, й preserved ---
  { name: 'lowercases + folds Ё through the lowercase step', input: 'Ёлка', expected: 'елка' },
  { name: 'lowercases plain Cyrillic', input: 'МОСТ', expected: 'мост' },
  { name: 'preserves a bare й', input: 'Й', expected: 'й' },
  { name: 'folds ё but keeps й in the same token', input: 'йёж', expected: 'йеж' },
  { name: 'lowercases a multi-word phrase', input: 'ЛЕФОРТОВСКИЙ ТОННЕЛЬ', expected: 'лефортовский тоннель' },

  // --- whitespace: NBSP, runs, trim ---
  { name: 'NBSP becomes one ASCII space', input: `a${NBSP}b`, expected: 'a b' },
  { name: 'a run of spaces collapses to one', input: 'a    b', expected: 'a b' },
  { name: 'mixed tabs and spaces collapse to one', input: '\tx\t\ty\t', expected: 'x y' },
  { name: 'leading and trailing whitespace is trimmed', input: '  раз два  ', expected: 'раз два' },
  { name: 'whitespace-only input becomes empty', input: '     ', expected: '' },
  { name: 'empty input stays empty', input: '', expected: '' },
  { name: 'NBSP run mixed with spaces collapses', input: `a${NBSP}${NBSP} b`, expected: 'a b' },

  // --- quote stripping ---
  { name: 'guillemets are removed', input: '«Лефортовский тоннель»', expected: 'лефортовский тоннель' },
  { name: 'straight double quotes are removed', input: '"кавычки"', expected: 'кавычки' },
  { name: 'straight single quotes are removed', input: "'апостроф'", expected: 'апостроф' },
  { name: 'backticks are removed', input: '`бэктик`', expected: 'бэктик' },

  // --- number-marker canonicalization ---
  { name: '№ glued to a digit', input: 'ЭВ №3', expected: 'эв №3' },
  { name: 'latin N before a digit', input: 'ЭВ N3', expected: 'эв №3' },
  { name: '# before a digit', input: 'ЭВ #3', expected: 'эв №3' },
  { name: '# with a space before a digit', input: 'ЭВ # 3', expected: 'эв №3' },
  { name: '№ with a space before a digit', input: 'ЭВ № 3', expected: 'эв №3' },
  { name: 'latin "no" before a digit', input: 'no3', expected: '№3' },
  { name: 'a bare trailing № produces no stray marker', input: 'цех №', expected: 'цех' },
  { name: 'a # that is not a marker is dropped', input: '#хэштег', expected: 'хэштег' },

  // --- dash collapse ---
  { name: 'em dash between words -> single hyphen, no spaces', input: 'ЛТР — левая труба', expected: 'лтр-левая труба' },
  { name: 'en dash between words -> single hyphen', input: 'улица – дом', expected: 'улица-дом' },
  { name: 'horizontal bar between words -> single hyphen', input: 'путь ― тупик', expected: 'путь-тупик' },
  { name: 'plain hyphen between words stays a single hyphen', input: 'слово-слово', expected: 'слово-слово' },
  { name: 'spaces around a hyphen are removed', input: 'слово  -  слово', expected: 'слово-слово' },

  // --- trailing punctuation ---
  { name: 'a trailing period is stripped', input: 'конец.', expected: 'конец' },
  { name: 'commas before a space and a trailing period are stripped', input: 'раз, два, три.', expected: 'раз два три' },
  { name: 'a trailing colon is stripped', input: 'пункт:', expected: 'пункт' },
  { name: 'a semicolon before a space is stripped', input: 'левый ; правый', expected: 'левый правый' },
  { name: 'an abbreviation dot before a space is stripped (standalone normalize)', input: 'борт. камень', expected: 'борт камень' },

  // --- real-world combined ---
  { name: 'quoted name with a trailing period', input: '«Лефортовский тоннель».', expected: 'лефортовский тоннель' },
  { name: 'ЛТР left-tube phrase, fully folded', input: '  ЛТР —  Левая Труба.  ', expected: 'лтр-левая труба' },
]

describe('normalize — full D-11 rule set', () => {
  for (const c of cases) {
    it(c.name, () => {
      expect(normalize(c.input)).toBe(c.expected)
    })
  }

  it('has at least 25 locked cases', () => {
    expect(cases.length).toBeGreaterThanOrEqual(25)
  })
})

describe('normalize — idempotence across the whole case table (D-11)', () => {
  for (const c of cases) {
    it(`normalize(normalize(x)) === normalize(x) for: ${c.name}`, () => {
      const once = normalize(c.input)
      expect(normalize(once)).toBe(once)
    })
  }
})

describe('normalize — cross-phase invariants the planner named explicitly', () => {
  it('folds №, N and # before a number to one identical form', () => {
    expect(normalize('ЭВ №3')).toBe(normalize('ЭВ N3'))
    expect(normalize('ЭВ №3')).toBe(normalize('ЭВ # 3'))
    expect(normalize('ЭВ №3')).toBe(normalize('ЭВ #3'))
  })

  it('replaces U+00A0 with an ASCII space and leaves no NBSP in the output', () => {
    const out = normalize(`первый${NBSP}второй${NBSP}третий`)
    expect(out).toBe('первый второй третий')
    expect(out).not.toContain(NBSP)
    expect(out).toMatch(/^[^ ]*$/)
  })

  it('is idempotent on a dash+marker+quote+punctuation mix', () => {
    const messy = '«ЭВ №3» — АВАРИЙНЫЙ выход.'
    const once = normalize(messy)
    expect(normalize(once)).toBe(once)
  })

  it('collapses every dash variant to the same result', () => {
    const hyphen = normalize('а-б')
    expect(normalize('а – б')).toBe(hyphen)
    expect(normalize('а — б')).toBe(hyphen)
    expect(normalize('а ― б')).toBe(hyphen)
    expect(normalize('а ‐ б')).toBe(hyphen)
  })
})

describe('normalize — module surface', () => {
  it('exports exactly one symbol', () => {
    expect(Object.keys(normalizeModule)).toEqual(['normalize'])
  })
})
