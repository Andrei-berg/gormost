// Russian stemming algorithm — a direct transcription of the published Snowball
// "Russian stemming algorithm": https://snowballstem.org/algorithms/russian/stemmer.html
//
// Mirrors how src/lib/shifts.ts pins its base date to a cited source of truth:
// every ending group below is a named module-level constant taken verbatim from
// the Snowball spec, so a failing stem.test.ts pair maps straight back to a step.
//
// Regions (per the spec):
//   RV — the region after the first vowel (or the end of the word if none)
//   R2 — the region after the first non-vowel following a vowel in R1
// Steps, applied in order, each confined to its region:
//   1. perfective gerund   -> else: reflexive, then adjectival | verb | noun   (in RV)
//   2. remove a terminal и                                                      (in RV)
//   3. remove a derivational ост / ость, only when it lies in R2                (in R2)
//   4. tidy up: superlative ейш/ейше, undouble нн, drop a terminal ь            (in RV)
//
// Pure and synchronous. Zero imports. normalize() has already folded ё -> е and
// lower-cased the token before it reaches here; the guards below keep the region
// scan from indexing past the end on degenerate or non-Russian input.

const VOWELS = 'аеиоуыэюя'

const isVowel = (ch: string): boolean => VOWELS.includes(ch)

// --- ending groups (verbatim from the Snowball Russian spec) ----------------

// perfective gerund: group 1 is valid only after а or я and only its own letters
// are cut (the а/я stays); group 2 is unconditional.
const PG_GROUP1 = ['вшись', 'вши', 'в']
const PG_GROUP2 = ['ившись', 'ывшись', 'ивши', 'ывши', 'ив', 'ыв']

const REFLEXIVE = ['ся', 'сь']

const ADJECTIVE = [
  'ими', 'ыми', 'его', 'ого', 'ему', 'ому', 'ее', 'ие', 'ые', 'ое', 'ей', 'ий',
  'ый', 'ой', 'ем', 'им', 'ым', 'ом', 'их', 'ых', 'ую', 'юю', 'ая', 'яя', 'ою', 'ею',
]

// participle: group 1 valid only after а or я; group 2 unconditional.
const PARTICIPLE_GROUP1 = ['ем', 'нн', 'вш', 'ющ', 'щ']
const PARTICIPLE_GROUP2 = ['ивш', 'ывш', 'ующ']

// verb: group 1 valid only after а or я; group 2 unconditional.
const VERB_GROUP1 = [
  'ешь', 'нно', 'ете', 'йте', 'ла', 'на', 'ли', 'ем', 'ло', 'но', 'ет', 'ют',
  'ны', 'ть', 'й', 'л', 'н',
]
const VERB_GROUP2 = [
  'ейте', 'уйте', 'ила', 'ыла', 'ена', 'ите', 'или', 'ыли', 'ило', 'ыло', 'ено',
  'ует', 'уют', 'ены', 'ить', 'ыть', 'ишь', 'ей', 'уй', 'ил', 'ыл', 'им', 'ым',
  'ен', 'ят', 'ит', 'ыт', 'ую', 'ю',
]

const NOUN = [
  'иями', 'ями', 'ами', 'иях', 'ией', 'иям', 'ием', 'ев', 'ов', 'ие', 'ье', 'еи',
  'ии', 'ей', 'ой', 'ий', 'ям', 'ем', 'ам', 'ом', 'ах', 'ях', 'ию', 'ью', 'ия',
  'ья', 'а', 'е', 'и', 'й', 'о', 'у', 'ы', 'ь', 'ю', 'я',
]

const DERIVATIONAL = ['ость', 'ост']

// Longest suffix from `list` that `s` ends with, or null.
function longestSuffix(s: string, list: readonly string[]): string | null {
  let found: string | null = null
  for (const suf of list) {
    if (s.endsWith(suf) && (found === null || suf.length > found.length)) found = suf
  }
  return found
}

// True when the char immediately before a suffix of length `sufLen` is а or я.
function precededByAorYa(s: string, sufLen: number): boolean {
  const i = s.length - sufLen - 1
  return i >= 0 && (s[i] === 'а' || s[i] === 'я')
}

// RV start: index just after the first vowel.
function markRV(w: string): number {
  for (let i = 0; i < w.length; i++) {
    if (isVowel(w[i])) return i + 1
  }
  return w.length
}

// R2 start: gopast v, gopast non-v (=R1), gopast v, gopast non-v (=R2).
function markR2(w: string): number {
  const n = w.length
  let i = 0
  while (i < n && !isVowel(w[i])) i++
  if (i >= n) return n
  i++
  while (i < n && isVowel(w[i])) i++
  if (i >= n) return n
  i++
  while (i < n && !isVowel(w[i])) i++
  if (i >= n) return n
  i++
  while (i < n && isVowel(w[i])) i++
  if (i >= n) return n
  i++
  return i
}

function tryPerfectiveGerund(s: string): string | null {
  const g1 = longestSuffix(s, PG_GROUP1)
  const g2 = longestSuffix(s, PG_GROUP2)
  const g1len = g1 !== null && precededByAorYa(s, g1.length) ? g1.length : 0
  const g2len = g2 !== null ? g2.length : 0
  const cut = Math.max(g1len, g2len)
  return cut === 0 ? null : s.slice(0, s.length - cut)
}

function tryAdjectival(s: string): string | null {
  const adj = longestSuffix(s, ADJECTIVE)
  if (adj === null) return null
  const r = s.slice(0, s.length - adj.length)
  const p1 = longestSuffix(r, PARTICIPLE_GROUP1)
  const p2 = longestSuffix(r, PARTICIPLE_GROUP2)
  const p1len = p1 !== null && precededByAorYa(r, p1.length) ? p1.length : 0
  const p2len = p2 !== null ? p2.length : 0
  const cut = Math.max(p1len, p2len)
  return cut === 0 ? r : r.slice(0, r.length - cut)
}

function tryVerb(s: string): string | null {
  const v1 = longestSuffix(s, VERB_GROUP1)
  const v2 = longestSuffix(s, VERB_GROUP2)
  const v1len = v1 !== null && precededByAorYa(s, v1.length) ? v1.length : 0
  const v2len = v2 !== null ? v2.length : 0
  const cut = Math.max(v1len, v2len)
  return cut === 0 ? null : s.slice(0, s.length - cut)
}

function tryNoun(s: string): string | null {
  const n = longestSuffix(s, NOUN)
  return n === null ? null : s.slice(0, s.length - n.length)
}

// Step 1: perfective gerund; otherwise reflexive then adjectival | verb | noun.
function step1(rv: string): string {
  const pg = tryPerfectiveGerund(rv)
  if (pg !== null) return pg

  let s = rv
  const refl = longestSuffix(s, REFLEXIVE)
  if (refl !== null) s = s.slice(0, s.length - refl.length)

  return tryAdjectival(s) ?? tryVerb(s) ?? tryNoun(s) ?? s
}

export function stem(token: string): string {
  // Guards: leave short and non-Russian tokens untouched and keep the region
  // scan safe (a word with no vowel has an empty RV — nothing to strip).
  if (token.length < 2) return token
  const w = token.toLowerCase().replace(/ё/g, 'е')
  if (!/[а-я]/.test(w)) return token
  if (![...w].some(isVowel)) return token

  const rvStart = markRV(w)
  const r2Start = markR2(w)

  const head = w.slice(0, rvStart)
  let rv = w.slice(rvStart)

  // Step 1
  rv = step1(rv)

  // Step 2: terminal и
  if (rv.endsWith('и')) rv = rv.slice(0, -1)

  // Step 3: derivational ост / ость, only when the suffix begins inside R2
  const der = longestSuffix(rv, DERIVATIONAL)
  if (der !== null && head.length + rv.length - der.length >= r2Start) {
    rv = rv.slice(0, rv.length - der.length)
  }

  // Step 4: tidy up
  if (rv.endsWith('ейше')) {
    rv = rv.slice(0, -4)
    if (rv.endsWith('нн')) rv = rv.slice(0, -1)
  } else if (rv.endsWith('ейш')) {
    rv = rv.slice(0, -3)
    if (rv.endsWith('нн')) rv = rv.slice(0, -1)
  } else if (rv.endsWith('нн')) {
    rv = rv.slice(0, -1)
  } else if (rv.endsWith('ь')) {
    rv = rv.slice(0, -1)
  }

  return head + rv
}
