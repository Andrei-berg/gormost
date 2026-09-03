// Russian Porter / Snowball stemmer — swap target for Plan 08-02.
// Algorithm to transcribe: https://snowballstem.org/algorithms/russian/stemmer.html
// (RV/R1/R2 regions + perfective gerund / reflexive+adjective/verb/noun steps,
// terminal и, derivational ост/ость in R2, undouble н / superlative / soft sign).
//
// This slice ships the identity function: the signature and every call site are
// final, only the body is a known gap. `stem.test.ts` (seeded from the official
// sample vocabulary) arrives with the real implementation in Plan 08-02.

export function stem(token: string): string {
  return token
}
