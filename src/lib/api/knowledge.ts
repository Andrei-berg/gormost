import { supabase } from '../supabase'
import { preprocess } from '@/lib/kb/preprocess'
import type { EntityAlias, CanonicalType, TypicalCrew, TypicalPeriod } from '@/types'

// KB persistence layer (Phase 8). CRUD for `entity_aliases` plus the narrow
// ADMIN-gated `work_types` attribute writer. House style cloned from
// src/lib/api/journal.ts: `throw new Error` with a Russian message on the
// Supabase error. `/api/db` auto-exposes every barrel export by name, so every
// mutation here is also listed in ROLE_RESTRICTED (src/app/api/db/route.ts) —
// enforced by src/lib/api/knowledge.gating.test.ts.
//
// Import direction is api -> kb (permitted by the D-08 purity guard); the kb
// tree never imports back from here.

// ============ ENTITY ALIASES ============

export async function fetchEntityAliases(): Promise<EntityAlias[]> {
  const { data } = await supabase.from('entity_aliases').select('*').order('surface_norm')
  return (data ?? []) as EntityAlias[]
}

// `surface_norm` is ALWAYS derived from preprocess(surface_raw).normalized, never
// from a caller-supplied value, so seeded, manual and Phase 13 correction-sourced
// aliases share the resolver's exact index key (D-14, D-09, T-08-14).
export async function createEntityAlias(a: Partial<EntityAlias>): Promise<EntityAlias | null> {
  const surface_raw = (a.surface_raw ?? '').trim()
  if (!surface_raw) throw new Error('Не удалось создать синоним: пустая исходная форма')
  const row = { ...a, surface_raw, surface_norm: preprocess(surface_raw).normalized }
  const { data, error } = await supabase.from('entity_aliases').insert(row).select().single()
  if (error) throw new Error(`Не удалось создать синоним: ${error.message}`)
  return data as EntityAlias | null
}

// If the patch changes `surface_raw`, `surface_norm` is recomputed the same way.
export async function updateEntityAlias(id: string, patch: Partial<EntityAlias>): Promise<EntityAlias | null> {
  const next: Partial<EntityAlias> = { ...patch }
  if (typeof patch.surface_raw === 'string') {
    const surface_raw = patch.surface_raw.trim()
    if (!surface_raw) throw new Error('Не удалось обновить синоним: пустая исходная форма')
    next.surface_raw = surface_raw
    next.surface_norm = preprocess(surface_raw).normalized
  }
  const { data, error } = await supabase.from('entity_aliases').update(next).eq('id', id).select().single()
  if (error) throw new Error(`Не удалось обновить синоним: ${error.message}`)
  return data as EntityAlias | null
}

export async function deleteEntityAlias(id: string): Promise<boolean> {
  const { error } = await supabase.from('entity_aliases').delete().eq('id', id)
  if (error) throw new Error(`Не удалось удалить синоним: ${error.message}`)
  return true
}

// D-13 soft-collision lookup: existing rows with the same `surface_norm` and
// `canonical_type` but a DIFFERENT `canonical_id`. It is a read that reports —
// it never rejects or mutates. The alias-manager UI decides what to do with the
// result (inline "уже привязан к …" banner; ADMIN confirms; both rows live).
export async function findAliasCollisions(
  surfaceNorm: string,
  canonicalType: CanonicalType,
  canonicalId: string,
): Promise<EntityAlias[]> {
  const { data } = await supabase
    .from('entity_aliases')
    .select('*')
    .eq('surface_norm', surfaceNorm)
    .eq('canonical_type', canonicalType)
    .neq('canonical_id', canonicalId)
    .order('weight', { ascending: false })
  return (data ?? []) as EntityAlias[]
}

// ============ WORK TYPE ATTRIBUTES (KB enrichment, ADMIN-only) ============

export interface WorkTypeAttributes {
  service_id?: string | null
  unit?: string | null
  typical_period?: TypicalPeriod | null
  typical_crew?: TypicalCrew | null
}

const TYPICAL_PERIODS: readonly TypicalPeriod[] = ['DAY', 'NIGHT', 'AROUND']

// Rebuild `typical_crew` from exactly the four locked keys, each coerced to a
// non-negative integer. No `required_*` key (or any other stray key) can reach
// the jsonb column, regardless of what a /api/db caller sends (D-17, T-08-13,
// RESEARCH Pitfall 5).
function sanitizeCrew(crew: TypicalCrew | null | undefined): TypicalCrew | null {
  if (crew == null) return null
  const nonNegInt = (v: unknown): number => {
    const n = Math.trunc(Number(v))
    return Number.isFinite(n) && n >= 0 ? n : 0
  }
  return {
    workers: nonNegInt(crew.workers),
    foremen: nonNegInt(crew.foremen),
    itr: nonNegInt(crew.itr),
    vehicles: nonNegInt(crew.vehicles),
  }
}

// Narrow ADMIN-gated writer: updates ONLY service_id, unit, typical_period and
// typical_crew on `work_types`, keyed on work_type_id. Caller input is never
// spread — the four keys are whitelisted explicitly, so an extra key from a
// future caller cannot write an unintended column (T-08-13). Writing the same
// payload twice is a plain scalar overwrite and leaves the row byte-identical
// (KB-02 idempotency).
export async function updateWorkTypeAttributes(
  workTypeId: string,
  attrs: WorkTypeAttributes,
): Promise<boolean> {
  const patch: WorkTypeAttributes = {}
  if ('service_id' in attrs) patch.service_id = attrs.service_id ?? null
  if ('unit' in attrs) patch.unit = attrs.unit ?? null
  if ('typical_period' in attrs) {
    const p = attrs.typical_period
    if (p != null && !TYPICAL_PERIODS.includes(p)) {
      throw new Error(`Не удалось сохранить атрибуты вида работ: недопустимый период «${String(p)}»`)
    }
    patch.typical_period = p ?? null
  }
  if ('typical_crew' in attrs) patch.typical_crew = sanitizeCrew(attrs.typical_crew)

  const { error } = await supabase.from('work_types').update(patch).eq('work_type_id', workTypeId)
  if (error) throw new Error(`Не удалось сохранить атрибуты вида работ: ${error.message}`)
  return true
}
