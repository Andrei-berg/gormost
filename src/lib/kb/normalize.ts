// Deterministic, dictionary-free string cleanup (D-11).
// Seed: src/components/journal/data.ts `norm`. This slice implements the
// code-point-level rules only:
//   - lowercase (Unicode code points)
//   - ё -> е, while й is preserved
//   - NBSP (U+00A0) and runs of whitespace collapse to a single ASCII space
//   - trim
// The №/dash/quote/trailing-punctuation/numeric-token rules land in Plan 08-03
// as further chained .replace() steps — this is written so they append, not
// restructure.

export function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/ё/g, 'е') // ё -> е (й untouched)
    .replace(/ /g, ' ') // NBSP -> ASCII space
    .replace(/\s+/g, ' ')
    .trim()
}
