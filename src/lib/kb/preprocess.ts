// The single text entry point (D-09): expandAbbreviations -> normalize ->
// token-wise lemmatize. Index build time and query time call the identical
// function — catalog names, alias surfaces, dictation text and Excel cells all
// pass through here, no variants.

import { expandAbbreviations } from './expandAbbreviations'
import { normalize } from './normalize'
import { lemmatize } from './lemmatize'

export interface PreprocessResult {
  normalized: string
  lemmas: string[]
}

export function preprocess(s: string): PreprocessResult {
  const normalized = normalize(expandAbbreviations(s))
  const lemmas = normalized.length > 0 ? normalized.split(' ').map(lemmatize) : []
  return { normalized, lemmas }
}
