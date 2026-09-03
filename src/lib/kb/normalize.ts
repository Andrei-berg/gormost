// Deterministic, dictionary-free string cleanup (D-11).
//
// Seed: src/components/journal/data.ts `norm` (lowercase / ё-fold / whitespace).
// This is the full D-11 rule set — the tracer slice (08-01) implemented only the
// first three rules; 08-03 appends the rest as further chained .replace() steps.
//
// Rule order (Claude's Discretion per 08-CONTEXT.md — normalize.test.ts locks it).
// The order is chosen so no rule can re-introduce input for an earlier rule, which
// normalize.test.ts proves with an idempotence assertion over the whole case table:
//   1. lowercase (Unicode code points)
//   2. ё -> е, while й is preserved (folded through the lowercase step for Ё)
//   3. NBSP (U+00A0) -> ASCII space
//   4. strip quote characters « » " ' `
//   5. number-marker canonicalization: №, #, latin N / NO immediately before a
//      digit -> a single canonical "№" glued to that digit, so «№3», «N3»,
//      «# 3», «no3» and «№ 3» all collapse to one form
//   6. strip a stray № / # that is NOT part of a marker+number
//   7. dash collapse: hyphen, non-breaking hyphen, figure dash, en dash, em dash
//      and horizontal bar -> a single '-' with surrounding whitespace removed
//   8. strip trailing punctuation . , ; : (before a space or end of string)
//   9. collapse any remaining whitespace run to one ASCII space
//  10. trim
//
// The equality this defines: two strings are the same entity surface when their
// lowercased Unicode code points match after these folds (KB-04 edge: encoding).
//
// Do NOT re-point src/components/journal/data.ts `norm` here — that is a visible
// behaviour change to the shipped /journal screen and belongs to Plan 08-09.

export function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/ё/g, 'е') // ё -> е (й untouched)
    .replace(/ /g, ' ') // NBSP -> ASCII space
    .replace(/[«»"'`]/g, '') // strip quote characters
    .replace(/(?:№|#|\bno|\bn)\s*(?=\d)/gi, '№') // №/N/#/no + digit -> one marker
    .replace(/[№#](?!\d)/g, '') // drop a stray marker not glued to a number
    .replace(/\s*[-‐-―]\s*/g, '-') // dash variants -> single '-'
    .replace(/[.,;:]+(?=\s|$)/g, '') // strip trailing . , ; :
    .replace(/\s+/g, ' ') // collapse whitespace runs
    .trim()
}
