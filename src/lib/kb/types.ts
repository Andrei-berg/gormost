// Frozen cross-phase contract for the deterministic Russian entity resolver (D-07).
// Phase 9 (Excel ingest) and Phase 11 (dictation review) import these shapes
// verbatim; changing them is a one-way cross-phase break. Pure types only —
// no runtime imports, no server-only marker (D-08).

import type { WorkType } from '@/types'

export type CanonicalType = 'object' | 'construction' | 'work_type' | 'service'

// `score` is resolution confidence derived from match strength
// (exact alias > exact normalized name > lemma overlap > trigram). It is NOT a
// model's self-confidence — there is no model in this phase.
export type ResolveResult =
  | { status: 'resolved'; id: string; type: CanonicalType; score: number; method: 'alias' | 'exact' | 'fuzzy' }
  | { status: 'ambiguous'; candidates: Array<{ id: string; type: CanonicalType; score: number }> } // ranked desc
  | { status: 'unresolved'; normalized: string }

export interface KbConfig {
  low: number
  high: number
  tieMargin: number
}

export interface KbEntry {
  id: string
  type: CanonicalType
  nameNorm: string
  lemmas: string[]
  weight: number
}

export interface KbIndex {
  aliasBySurfaceNorm: Map<string, Array<{ id: string; type: CanonicalType; weight: number }>>
  exactNameNorm: Map<string, { id: string; type: CanonicalType }>
  // Per-entry postings for the fuzzy layer (Plan 08-05). Built now so 08-05 is additive.
  entries: KbEntry[]
  config: KbConfig
}

// Two config thresholds map score -> 🟢 resolved / 🟡 ambiguous / 🔴 unresolved.
// Values are Claude's Discretion; tests lock them.
export const DEFAULT_KB_CONFIG: KbConfig = { low: 0.6, high: 0.85, tieMargin: 0.08 }

// D-17: keys mirror src/components/journal/data.ts PlanItem (workers/foremen/itr/
// vehicles), NOT the daily_plan_items required_* column names. They are the
// human-facing crew counters the UI plan item already carries, so the key set is
// never renamed to match DB columns and no translation layer is invented later.
//   workers  -> daily_plan_items.required_workers
//   foremen  -> daily_plan_items.required_foremen
//   itr      -> daily_plan_items.required_itr
//   vehicles -> daily_plan_items.required_vehicles
export type TypicalCrew = { workers: number; foremen: number; itr: number; vehicles: number }

// Matches daily_plan_items.shift_type and journal/data.ts Period.
export type TypicalPeriod = 'DAY' | 'NIGHT' | 'AROUND'

// A work_types row widened with the Phase 8 enrichment columns (migration 053).
// buildKbIndex consumes this shape; only rows with service_id != null are loaded.
export interface KbWorkType extends WorkType {
  service_id: string | null
  unit: string | null
  typical_period: TypicalPeriod | null
  typical_crew: TypicalCrew | null
}

export interface EntityAlias {
  id: string
  surface_raw: string
  surface_norm: string
  canonical_type: CanonicalType
  canonical_id: string
  scope_object_id: string | null
  weight: number
  source: 'seed' | 'manual' | 'voice' | 'correction'
  created_by: string | null
  created_at: string
}
