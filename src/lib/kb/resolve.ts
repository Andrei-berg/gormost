// resolveEntity(phrase, index, opts?) — pure, synchronous, zero imports outside
// src/lib/kb/. Returns exactly one of the three D-07 shapes. Never throws for
// "not found"; never returns a synthesized id or name.
//
// `score` is resolution confidence from match strength only
// (alias > exact > fuzzy) — NOT a model probability. Phase 11 renders the
// 🟢/🟡/🔴 chip from `score` vs the two config thresholds; the resolver itself
// only distinguishes resolved / ambiguous / unresolved.
//
// This slice implements ladder steps 1 (exact alias) and 2 (exact normalized
// name). Step 3 (fuzzy: lemma overlap + trigram Dice) is added by Plan 08-05 —
// until then, anything that reaches it is an honest `unresolved`.

import type { CanonicalType, KbIndex, ResolveResult } from './types'
import { preprocess } from './preprocess'

export function resolveEntity(
  phrase: string,
  index: KbIndex,
  opts?: { type?: CanonicalType },
): ResolveResult {
  const { normalized } = preprocess(phrase)

  if (normalized.length === 0) {
    return { status: 'unresolved', normalized }
  }

  // 1. exact alias hit
  const aliasHits = (index.aliasBySurfaceNorm.get(normalized) ?? []).filter(
    (h) => !opts?.type || h.type === opts.type,
  )
  if (aliasHits.length === 1) {
    return { status: 'resolved', method: 'alias', score: 1, id: aliasHits[0].id, type: aliasHits[0].type }
  }
  if (aliasHits.length > 1) {
    // D-13/D-15: one surface -> several canonicals, ranked by alias weight desc.
    const candidates = [...aliasHits]
      .sort((a, b) => b.weight - a.weight)
      .map((h) => ({ id: h.id, type: h.type, score: 1 }))
    return { status: 'ambiguous', candidates }
  }

  // 2. exact normalized catalog name
  const exact = index.exactNameNorm.get(normalized)
  if (exact && (!opts?.type || exact.type === opts.type)) {
    return { status: 'resolved', method: 'exact', score: 0.95, id: exact.id, type: exact.type }
  }

  // 3. fuzzy layer — Plan 08-05.
  return { status: 'unresolved', normalized }
}
