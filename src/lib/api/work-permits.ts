import { supabase } from '../supabase'
import type { WorkPermitType, WorkPermitServiceType, ResolvedWorkPermitType } from '@/types'

// ============ WORK PERMIT CATALOG (наряд-допуск, миграция 043) ============

// ── Universal catalog ──────────────────────────────────────────────────────

export async function fetchWorkPermitTypes(): Promise<WorkPermitType[]> {
  const { data } = await supabase
    .from('work_permit_types')
    .select('*')
    .order('sort_order')
  return (data || []) as WorkPermitType[]
}

export async function createWorkPermitType(t: Partial<WorkPermitType>): Promise<WorkPermitType | null> {
  const { data } = await supabase.from('work_permit_types').insert(t).select().single()
  return data as WorkPermitType | null
}

export async function updateWorkPermitType(id: string, updates: Partial<WorkPermitType>): Promise<WorkPermitType | null> {
  const { data } = await supabase
    .from('work_permit_types')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id).select().single()
  return data as WorkPermitType | null
}

export async function deleteWorkPermitType(id: string): Promise<boolean> {
  const { error } = await supabase.from('work_permit_types').delete().eq('id', id)
  return !error
}

// ── Per-service curation ─────────────────────────────────────────────────────

export async function fetchWorkPermitServiceTypes(serviceId: string): Promise<WorkPermitServiceType[]> {
  const { data } = await supabase
    .from('work_permit_service_types')
    .select('*')
    .eq('service_id', serviceId)
  return (data || []) as WorkPermitServiceType[]
}

/** Enable a type for a service or update its overrides (upsert). */
export async function setServiceWorkPermitType(row: WorkPermitServiceType): Promise<boolean> {
  const { error } = await supabase
    .from('work_permit_service_types')
    .upsert(row, { onConflict: 'service_id,type_id' })
  return !error
}

/** Remove a type from a service's set (curation, not global delete). */
export async function removeServiceWorkPermitType(serviceId: string, typeId: string): Promise<boolean> {
  const { error } = await supabase
    .from('work_permit_service_types')
    .delete()
    .eq('service_id', serviceId)
    .eq('type_id', typeId)
  return !error
}

// ── Resolved list for a service (catalog + overrides, enabled, ordered) ───────
// Two-query merge (no Supabase FK join — introspection is unreliable here).

export async function fetchServiceWorkPermitTypes(serviceId: string): Promise<ResolvedWorkPermitType[]> {
  const [types, links] = await Promise.all([
    fetchWorkPermitTypes(),
    fetchWorkPermitServiceTypes(serviceId),
  ])
  const byId = new Map(types.map(t => [t.id, t]))
  return links
    .filter(l => l.enabled)
    .map(l => ({ link: l, type: byId.get(l.type_id) }))
    .filter((x): x is { link: WorkPermitServiceType; type: WorkPermitType } => !!x.type && x.type.is_active)
    .sort((a, b) => (a.link.sort_order - b.link.sort_order) || (a.type.sort_order - b.type.sort_order))
    .map(({ link, type }) => ({
      id: type.id,
      label: type.label,
      factors: link.factors_override ?? type.factors,
      instructionNums: link.instruction_nums_override ?? type.instruction_nums,
      isRoadWork: type.is_road_work,
      duringMeasure2: link.during_measure_2_override ?? type.during_measure_2,
    }))
}
