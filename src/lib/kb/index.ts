// buildKbIndex(rows) -> KbIndex — a pure transform (structural template:
// src/lib/journalStats.ts `aggregateJournal`). Already-fetched arrays in, one
// index object out; Map accumulators; no I/O, no @/lib/api import (D-06/D-08).
//
// The caller fetches journal_objects + work_types + entity_aliases + services
// and hands them here once. resolveEntity then reads only this index (D-06).

import type { JournalObject, Service } from '@/types'
import type { CanonicalType, EntityAlias, KbConfig, KbEntry, KbIndex, KbWorkType } from './types'
import { DEFAULT_KB_CONFIG } from './types'
import { preprocess } from './preprocess'

export interface KbRows {
  objects: JournalObject[]
  workTypes: KbWorkType[]
  aliases: EntityAlias[]
  services: Service[]
}

// Second parameter is an optional partial threshold override that lands in
// KbIndex.config. Phase 11 renders the 🟢/🟡/🔴 chip from the SAME three numbers
// (D-07, D-15), so they travel with the index rather than being re-derived.
export function buildKbIndex(rows: KbRows, configOverrides?: Partial<KbConfig>): KbIndex {
  const config: KbConfig = { ...DEFAULT_KB_CONFIG, ...configOverrides }
  const aliasBySurfaceNorm: KbIndex['aliasBySurfaceNorm'] = new Map()
  const exactNameNorm: KbIndex['exactNameNorm'] = new Map()
  const entries: KbEntry[] = []

  // Real ids per canonical type — the guard against dangling polymorphic
  // entity_aliases.canonical_id references. work_types only count when
  // service_id != null (D-01); construction has no storage in v3.0 (D-04).
  const idsByType: Record<CanonicalType, Set<string>> = {
    object: new Set(rows.objects.map((o) => o.id)),
    work_type: new Set(rows.workTypes.filter((w) => w.service_id != null).map((w) => w.work_type_id)),
    service: new Set(rows.services.map((s) => s.service_id)),
    construction: new Set(),
  }

  // Catalog rows: the canonical name is both an exact-name posting AND a fuzzy
  // entry. weight 100 is the neutral catalog baseline — alias entries below
  // carry the ADMIN-set weight so a curated surface can out-rank a bare name on
  // an equal fuzzy score (never promote a below-`low` score — that rule lives in
  // resolve.ts, D-15).
  const addEntry = (id: string, type: CanonicalType, rawName: string): void => {
    const { normalized, lemmas } = preprocess(rawName)
    if (normalized.length === 0) return
    if (!exactNameNorm.has(normalized)) exactNameNorm.set(normalized, { id, type })
    entries.push({ id, type, nameNorm: normalized, lemmas, weight: 100 })
  }

  for (const o of rows.objects) addEntry(o.id, 'object', o.name)
  for (const w of rows.workTypes) {
    if (w.service_id == null) continue // D-01: only the "mature" subset
    addEntry(w.work_type_id, 'work_type', w.work_name)
  }
  for (const s of rows.services) addEntry(s.service_id, 'service', s.service_name)

  for (const a of rows.aliases) {
    if (!idsByType[a.canonical_type].has(a.canonical_id)) continue // drop dangling ref
    // scope_object_id is deliberately NOT read — the resolver ignores scope in
    // v3.0 (D-16), so two aliases differing only in scope index identically.
    const { normalized: surfaceNorm, lemmas } = preprocess(a.surface_raw)
    if (surfaceNorm.length === 0) continue
    const bucket = aliasBySurfaceNorm.get(surfaceNorm) ?? []
    const existing = bucket.find((b) => b.id === a.canonical_id && b.type === a.canonical_type)
    if (existing) {
      existing.weight = Math.max(existing.weight, a.weight)
    } else {
      bucket.push({ id: a.canonical_id, type: a.canonical_type, weight: a.weight })
    }
    aliasBySurfaceNorm.set(surfaceNorm, bucket)
    // Alias surfaces are also fuzzy entries so a declension of a curated surface
    // ("на Лефортовском тоннеле" vs alias "Лефортовский тоннель") scores through
    // the same path a catalog name does. Duplicate (id, type) rows are collapsed
    // by resolveEntity.
    entries.push({ id: a.canonical_id, type: a.canonical_type, nameNorm: surfaceNorm, lemmas, weight: a.weight })
  }

  return { aliasBySurfaceNorm, exactNameNorm, entries, config }
}
