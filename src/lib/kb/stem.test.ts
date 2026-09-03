import { describe, it, expect } from 'vitest'
import { stem } from './stem'

// Table-driven check of the vendored Snowball Russian stemmer against a subset of
// the official snowballstem.org sample vocabulary plus targeted per-step probes.
// Every pair below is a real Russian word paired with the stem the published
// algorithm (https://snowballstem.org/algorithms/russian/stemmer.html) produces.
// The families (all forms of one lexeme -> one stem) are the property Pitfall 2
// depends on: declensions must collapse together.

type Pair = [input: string, stem: string]

// --- Step 1: noun endings, whole declension families collapse ---------------
const nounFamilies: Pair[] = [
  ['вагон', 'вагон'],
  ['вагона', 'вагон'],
  ['вагону', 'вагон'],
  ['вагоном', 'вагон'],
  ['вагоне', 'вагон'],
  ['вагоны', 'вагон'],
  ['вагонов', 'вагон'],
  ['вагонам', 'вагон'],
  ['вагонами', 'вагон'],
  ['вагонах', 'вагон'],
  ['ремонт', 'ремонт'],
  ['ремонта', 'ремонт'],
  ['ремонту', 'ремонт'],
  ['ремонтом', 'ремонт'],
  ['ремонте', 'ремонт'],
  ['ремонты', 'ремонт'],
  ['ремонтов', 'ремонт'],
  ['тоннель', 'тоннел'],
  ['тоннеля', 'тоннел'],
  ['тоннелю', 'тоннел'],
  ['тоннелем', 'тоннел'],
  ['тоннеле', 'тоннел'],
  ['тоннели', 'тоннел'],
  ['тоннелей', 'тоннел'],
  ['переход', 'переход'],
  ['перехода', 'переход'],
  ['переходе', 'переход'],
  ['переходов', 'переход'],
  ['выход', 'выход'],
  ['выхода', 'выход'],
  ['выходе', 'выход'],
  ['выходы', 'выход'],
]

// --- Step 1: adjective endings, only within RV -----------------------------
const adjectiveFamilies: Pair[] = [
  ['красный', 'красн'],
  ['красная', 'красн'],
  ['красное', 'красн'],
  ['красные', 'красн'],
  ['красного', 'красн'],
  ['красной', 'красн'],
  ['красному', 'красн'],
  ['красным', 'красн'],
  ['красными', 'красн'],
  ['красных', 'красн'],
  ['бортовой', 'бортов'],
  ['бортового', 'бортов'],
  ['бортовом', 'бортов'],
  ['бортовым', 'бортов'],
  ['бортовых', 'бортов'],
  ['пешеходный', 'пешеходн'],
  ['пешеходного', 'пешеходн'],
  ['пешеходном', 'пешеходн'],
  ['лефортовский', 'лефортовск'],
  ['лефортовского', 'лефортовск'],
  ['лефортовском', 'лефортовск'],
  ['лефортовскому', 'лефортовск'],
  ['шереметьевский', 'шереметьевск'],
  ['шереметьевского', 'шереметьевск'],
  ['шереметьевском', 'шереметьевск'],
]

// --- Step 1: perfective gerund (в/вши/вшись after а/я; ив/ыв group) --------
const perfectiveGerund: Pair[] = [
  ['прочитав', 'прочита'],
  ['прочитавши', 'прочита'],
  ['прочитавшись', 'прочита'],
  ['сделав', 'сдела'],
]

// --- Step 1: reflexive ся/сь removed before the verb/noun attempt ---------
const reflexiveVerb: Pair[] = [
  ['учился', 'уч'],
  ['училась', 'уч'],
  ['учится', 'уч'],
]

// --- Step 1: verb endings, group 1 needs a preceding а/я -----------------
const verbFamilies: Pair[] = [
  ['делать', 'дела'],
  ['делал', 'дела'],
  ['делала', 'дела'],
  ['делали', 'дела'],
  ['делаю', 'дела'],
  ['делает', 'дела'],
  ['делаем', 'дела'],
  ['делают', 'дела'],
]

// --- Step 3: derivational ость/ост removed only when it sits in R2 -------
const derivational: Pair[] = [
  ['полезность', 'полезн'],
  ['полезный', 'полезн'],
  ['полезного', 'полезн'],
]

// --- Step 4: superlative ейш/ейше and нн undoubling ---------------------
const superlativeAndDouble: Pair[] = [
  ['красивейший', 'красив'],
  ['красивее', 'красив'],
  ['красивый', 'красив'],
  ['красивая', 'красив'],
  ['длинный', 'длин'],
  ['длинная', 'длин'],
  ['длинного', 'длин'],
]

// --- ё is folded to е upstream: same spelling stems identically --------
const yoFolding: Pair[] = [
  ['решётка', 'решетк'],
  ['решетка', 'решетк'],
  ['решётки', 'решетк'],
]

const allPairs: Pair[] = [
  ...nounFamilies,
  ...adjectiveFamilies,
  ...perfectiveGerund,
  ...reflexiveVerb,
  ...verbFamilies,
  ...derivational,
  ...superlativeAndDouble,
  ...yoFolding,
]

describe('stem() — official Snowball Russian sample subset', () => {
  it('covers at least 60 word/stem pairs', () => {
    expect(allPairs.length).toBeGreaterThanOrEqual(60)
  })

  for (const [input, expected] of allPairs) {
    it(`"${input}" -> "${expected}"`, () => {
      expect(stem(input)).toBe(expected)
    })
  }
})

describe('stem() — declension families collapse to one stem (Pitfall 2)', () => {
  const families: Record<string, string[]> = {
    вагон: ['вагон', 'вагона', 'вагону', 'вагоном', 'вагоне', 'вагоны', 'вагонов', 'вагонами'],
    красн: ['красный', 'красная', 'красного', 'красным', 'красных', 'красною'],
    лефортовск: ['лефортовский', 'лефортовского', 'лефортовском', 'лефортовскую', 'лефортовская'],
    тоннел: ['тоннель', 'тоннеля', 'тоннелю', 'тоннелем', 'тоннеле', 'тоннели'],
    бортов: ['бортовой', 'бортового', 'бортовому', 'бортовым', 'бортовых', 'бортовая'],
  }
  for (const [want, forms] of Object.entries(families)) {
    it(`${want}: ${forms.length} forms -> one stem`, () => {
      const stems = new Set(forms.map(stem))
      expect(stems).toEqual(new Set([want]))
    })
  }
})

describe('stem() — degenerate and non-Russian input is returned unchanged', () => {
  for (const t of ['', 'а', 'к', 'ok', 'hello', '3', '123', 'т3', 'бк']) {
    it(`"${t}" is returned unchanged`, () => {
      expect(stem(t)).toBe(t)
    })
  }
})
