// Vendored string-similarity primitives for the resolver fuzzy layer (Plan 08-05).
//
// Why vendored and not an npm package (D-12b, 08-RESEARCH.md § "Standard Stack"
// rows 3-4 + § "Don't Hand-Roll"):
//   - `string-similarity` — the obvious pick — is DEPRECATED and unmaintained by
//     its author; adding it now is a known dead dependency.
//   - `dice-coefficient` pulls `n-gram` as a transitive dependency for ~15 lines
//     of logic.
//   - Both are trivial, stable, well-specified algorithms with no edge cases we
//     cannot cover with a case table. A zero-import local module keeps
//     src/lib/kb/ pure (D-08), keeps `git diff package.json` empty (a phase
//     prohibition), and removes a supply-chain surface for no cost.
//
// Both functions are pure, synchronous, and free of imports.

/**
 * Sorensen-Dice similarity over character trigrams, in the closed interval
 * [0, 1]. 1 = identical, 0 = no shared trigram.
 *
 * Strings are padded with two leading and one trailing space (the pg_trgm
 * convention) so that words shorter than three characters still yield trigrams
 * and never produce a 0/0 = NaN. Comparison is a multiset intersection, so a
 * repeated trigram only matches as many times as it occurs in both strings.
 */
export function dice(a: string, b: string): number {
  if (a === b) return 1 // covers dice('', '') === 1 and every identical pair

  const gramsA = trigrams(a)
  const gramsB = trigrams(b)
  if (gramsA.length === 0 || gramsB.length === 0) return 0

  const counts = new Map<string, number>()
  for (const g of gramsA) counts.set(g, (counts.get(g) ?? 0) + 1)

  let shared = 0
  for (const g of gramsB) {
    const left = counts.get(g)
    if (left !== undefined && left > 0) {
      shared += 1
      counts.set(g, left - 1)
    }
  }

  const value = (2 * shared) / (gramsA.length + gramsB.length)
  // Clamp for defensive safety — the maths already lands in [0, 1].
  return value < 0 ? 0 : value > 1 ? 1 : value
}

function trigrams(s: string): string[] {
  if (s.length === 0) return []
  const padded = `  ${s} `
  const out: string[] = []
  for (let i = 0; i + 3 <= padded.length; i++) {
    out.push(padded.slice(i, i + 3))
  }
  return out
}

/**
 * Classic Levenshtein edit distance (insert / delete / substitute all cost 1),
 * two-row dynamic programming. Used ONLY as an equal-score tiebreak in the
 * resolver — never as a primary match signal.
 *
 *   levenshtein(x, x)  === 0
 *   levenshtein(x, '') === x.length
 *   one substitution   === 1
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  let prev = new Array<number>(b.length + 1)
  let curr = new Array<number>(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost, // substitution
      )
    }
    const swap = prev
    prev = curr
    curr = swap
  }

  return prev[b.length]
}
