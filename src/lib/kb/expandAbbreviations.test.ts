// D-10 curated abbreviation dictionary, table-driven. expandAbbreviations() runs
// BEFORE normalize() in preprocess() (D-09), so these cases feed raw punctuation
// (`борт.`, `ж/б`, `п/п`). The substring-safety cases lock threat T-08-10: a
// dictionary key that appears inside a longer real word must never be expanded.

import { describe, it, expect } from 'vitest'
import * as abbrevModule from './expandAbbreviations'
import { expandAbbreviations, ABBREVIATIONS } from './expandAbbreviations'

interface Case {
  name: string
  input: string
  expected: string
}

const cases: Case[] = [
  // --- material shorthands ---
  { name: 'борт. -> бортовой', input: 'борт.', expected: 'бортовой' },
  { name: 'борт. камень -> бортовой камень', input: 'борт. камень', expected: 'бортовой камень' },
  { name: 'ж/б -> железобетонный', input: 'ж/б', expected: 'железобетонный' },
  { name: 'ж/б in a phrase', input: 'ж/б плита', expected: 'железобетонный плита' },
  { name: 'а/б -> асфальтобетонный', input: 'а/б', expected: 'асфальтобетонный' },
  { name: 'м/к -> металлоконструкция', input: 'м/к', expected: 'металлоконструкция' },

  // --- tunnel-infrastructure shorthands ---
  { name: 'эв -> эвакуационный выход', input: 'эв', expected: 'эвакуационный выход' },
  { name: 'ЭВ (uppercase) -> эвакуационный выход', input: 'ЭВ', expected: 'эвакуационный выход' },
  { name: 'ЭВ №3 keeps its number', input: 'ЭВ №3', expected: 'эвакуационный выход №3' },
  { name: 'тт -> транспортный тоннель', input: 'тт', expected: 'транспортный тоннель' },
  { name: 'п/п -> пешеходный переход', input: 'п/п', expected: 'пешеходный переход' },
  { name: 'бк -> бортовой камень', input: 'бк', expected: 'бортовой камень' },

  // --- Гормост-Лефортово site abbreviations ---
  { name: 'зб -> защитный блок', input: 'зб', expected: 'защитный блок' },
  { name: 'ЛТР -> лефортовский тоннель', input: 'ЛТР', expected: 'лефортовский тоннель' },
  { name: 'лтр (lowercase) -> same expansion', input: 'лтр', expected: 'лефортовский тоннель' },
  { name: 'ГТР -> гагаринский тоннель', input: 'ГТР', expected: 'гагаринский тоннель' },
  { name: 'КТР -> кутузовский тоннель', input: 'КТР', expected: 'кутузовский тоннель' },
  { name: 'ТТК -> третье транспортное кольцо', input: 'ТТК', expected: 'третье транспортное кольцо' },
  { name: 'ЗБ ЛТР expands both tokens', input: 'ЗБ ЛТР', expected: 'защитный блок лефортовский тоннель' },

  // --- multi-key phrase ---
  {
    name: 'multiple keys in one phrase',
    input: 'ремонт ж/б плиты на п/п',
    expected: 'ремонт железобетонный плиты на пешеходный переход',
  },

  // --- whitespace is preserved verbatim ---
  { name: 'double space between tokens is preserved', input: 'борт.  камень', expected: 'бортовой  камень' },

  // --- no-op cases ---
  { name: 'empty string stays empty', input: '', expected: '' },
  { name: 'text with no dictionary key is unchanged', input: 'обычный текст без сокращений', expected: 'обычный текст без сокращений' },

  // --- substring safety (T-08-10) ---
  { name: 'тт inside аттракцион is NOT expanded', input: 'аттракцион', expected: 'аттракцион' },
  { name: 'тт inside светооттенок is NOT expanded', input: 'светооттенок', expected: 'светооттенок' },
  { name: 'зб prefix in зборка is NOT expanded', input: 'зборка', expected: 'зборка' },
  { name: 'эв prefix in эвкалипт is NOT expanded', input: 'эвкалипт', expected: 'эвкалипт' },
]

describe('expandAbbreviations — curated D-10 dictionary', () => {
  for (const c of cases) {
    it(c.name, () => {
      expect(expandAbbreviations(c.input)).toBe(c.expected)
    })
  }

  it('has at least 15 locked cases', () => {
    expect(cases.length).toBeGreaterThanOrEqual(15)
  })
})

describe('expandAbbreviations — case-insensitive matching', () => {
  it('the uppercase and lowercase spelling of a key expand identically', () => {
    expect(expandAbbreviations('ЭВ')).toBe(expandAbbreviations('эв'))
    expect(expandAbbreviations('Эв')).toBe(expandAbbreviations('эв'))
    expect(expandAbbreviations('ЛТР')).toBe(expandAbbreviations('лтр'))
  })
})

describe('expandAbbreviations — exported dictionary constant (эталон)', () => {
  it('exports the dictionary alongside the function', () => {
    expect(Object.keys(abbrevModule).sort()).toEqual(['ABBREVIATIONS', 'expandAbbreviations'])
  })

  it('contains a key for every literal the plan names', () => {
    for (const key of ['борт.', 'ж/б', 'эв', 'тт', 'п/п', 'лтр', 'гтр', 'ктр', 'ттк']) {
      expect(Object.prototype.hasOwnProperty.call(ABBREVIATIONS, key)).toBe(true)
    }
  })

  it('every expansion value is a non-empty lower-cased string', () => {
    for (const [key, value] of Object.entries(ABBREVIATIONS)) {
      expect(value.length, key).toBeGreaterThan(0)
      expect(value, key).toBe(value.toLowerCase())
    }
  })
})
