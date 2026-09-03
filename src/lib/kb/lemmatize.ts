// Token normaliser behind a stable (token: string) => string boundary — the
// D-12 swap point. v3.0 delegates to the vendored Russian stemmer; a candidate
// pure-JS lemmatizer may replace the internals (Plan 08-02) only if it passes
// the __fixtures__/lemma-cases.ru.ts gate and stays SYNCHRONOUS — an async
// lemmatizer would break the frozen D-07 contract.

import { stem } from './stem'

export function lemmatize(token: string): string {
  return stem(token)
}
