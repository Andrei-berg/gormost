// The single text entry point (D-09).
//
// preprocess() = expandAbbreviations -> normalize -> token-wise lemmatize, in
// that order. Index build time and query time call THIS EXACT function with the
// same arguments — the four consumer kinds all pass through here with no
// per-caller variant:
//   1. catalog names          (work_types.work_name, journal_objects.name, ...)
//   2. alias surfaces         (entity_aliases.surface_raw at index build)
//   3. dictation text         (Phase 11 pasted transcript fragments)
//   4. Excel cell values      (Phase 9 spreadsheet ingest)
//
// Any divergence between index-build-time and query-time preprocessing is the
// classic cause of aliases that never match (08-RESEARCH.md § "Pitfall 2"), so
// there are deliberately no options, overloads or variants. A caller that also
// needs the raw tokens derives them from `normalized` itself.
//
// Stage order matters: expandAbbreviations runs BEFORE normalize so dictionary
// keys can rely on raw punctuation (`борт.`, `ж/б`, `п/п`) that normalize would
// otherwise strip or rewrite (D-09, D-10).

import { expandAbbreviations } from './expandAbbreviations'
import { normalize } from './normalize'
import { lemmatize } from './lemmatize'

interface PreprocessResult {
  normalized: string
  lemmas: string[]
}

export function preprocess(s: string): PreprocessResult {
  const normalized = normalize(expandAbbreviations(s))
  const lemmas = normalized.length === 0 ? [] : normalized.split(' ').filter(Boolean).map(lemmatize)
  return { normalized, lemmas }
}
