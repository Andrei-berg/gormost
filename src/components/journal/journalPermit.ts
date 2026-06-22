// Adapter: build a WorkPlanWithItems-shaped object from a journal plan item so
// the existing WorkPermitModal can generate a наряд-допуск straight from the
// Журнал планов. The journal is a separate lightweight tool (not work_plans),
// so the synthetic plan carries only what the permit needs — object, work,
// service, date, shift and headcount requirements. Состав исполнителей and
// транспорт are filled by hand in the permit (the journal has counts, not names).
//
// The synthetic id is the journal item id; markWorkPlanPermit() inside the modal
// simply no-ops (no work_plan with that id), which is fine — the document prints.

import type { AuthSession, WorkPlanWithItems, JournalShiftHeader } from '@/types'
import type { PlanItem } from './data'
import { specialtiesTotal } from './data'

// Defaults the шапка дня feeds into a наряд-допуск. Documented bridge:
// Отв. (issuer) → «наряд-допуск выдал» (issuedBy); водитель смены → vehicle note.
export interface PermitHeaderDefaults {
  issuedBy?: string
  vehicleNote?: string
}

export function shiftHeaderToPermitDefaults(h: JournalShiftHeader | null | undefined): PermitHeaderDefaults {
  if (!h) return {}
  const issuer = h.issuer?.trim()
  const driver = h.shift_driver?.trim()
  return {
    issuedBy: issuer || undefined,
    vehicleNote: driver ? `Водитель смены: ${driver}` : undefined,
  }
}

// Full permit defaults for a наряд launched from a journal row: header (Отв.,
// водитель смены) plus the item's own garage numbers. Vehicle note combines both.
export function buildPermitDefaults(
  header: JournalShiftHeader | null | undefined,
  item: PlanItem,
): PermitHeaderDefaults {
  const base = shiftHeaderToPermitDefaults(header)
  const numbers = (item.vehicleNumbers ?? []).filter(Boolean)
  const parts = [base.vehicleNote, numbers.length ? `Транспорт №: ${numbers.join(', ')}` : undefined].filter(Boolean)
  return {
    issuedBy: base.issuedBy,
    vehicleNote: parts.length ? parts.join('; ') : undefined,
  }
}

// Готовность наряда — checklist of the бланк's fields fillable before issue.
// место/работа/факторы → auto (row + catalog); Отв. → шапка дня; состав → row
// counts. Имена и № машин are deferred to the master and not counted here.
export interface PermitSegment { label: string; ok: boolean }
export interface PermitReadinessResult {
  segments: PermitSegment[]
  ready: number
  total: number
  done: boolean
  missing: string[]
}

export function permitReadiness(item: PlanItem, header: JournalShiftHeader | null | undefined): PermitReadinessResult {
  const segments: PermitSegment[] = [
    { label: 'место',   ok: !!item.objectId },
    { label: 'работа',  ok: !!item.work.trim() },
    { label: 'факторы', ok: true }, // из каталога видов работ (авто)
    { label: 'Отв.',    ok: !!header?.issuer?.trim() },
    { label: 'состав',  ok: item.workers + item.foremen + item.itr > 0 || specialtiesTotal(item.specialties) > 0 },
  ]
  const ready = segments.filter(s => s.ok).length
  const total = segments.length
  return { segments, ready, total, done: ready === total, missing: segments.filter(s => !s.ok).map(s => s.label) }
}

export function journalItemToWorkPlan(item: PlanItem, objectName: string, session: AuthSession): WorkPlanWithItems {
  const now = new Date().toISOString()
  // WorkPlanWithItems.shift_type is the funnel's binary ShiftType (DAY/NIGHT).
  // СУТКИ ('AROUND') is a journal-only period; for the permit it maps to DAY —
  // the 24h shift starts in the day-block (07:30, руководитель = мастер участка).
  const shiftType = item.period === 'NIGHT' ? 'NIGHT' : 'DAY'
  return {
    id: item.id,
    service_id: item.serviceId,
    plan_date: item.planDate,
    shift_type: shiftType,
    status: 'PLANNED',
    created_by: session.user_id,
    submitted_at: null,
    approved_by: null,
    approved_at: null,
    chief_notes: null,
    zamporab_approved_by: null,
    zamporab_approved_at: null,
    fact_start: null,
    fact_finish: null,
    created_at: now,
    updated_at: now,
    priority: 'ROUTINE',
    source: 'INTERNAL',
    source_ref: null,
    source_org: null,
    fast_track: false,
    fast_track_reason: null,
    started_at: null,
    started_by: null,
    paused_at: null,
    pause_reason: null,
    completed_at: null,
    completed_by: null,
    completion_note: null,
    suspended_until: null,
    parent_redirect_id: null,
    has_permit: null,
    permit_number: null,
    permit_issued_at: null,
    items: [{
      id: item.id,
      plan_id: item.id,
      location: objectName,
      work_description: item.work,
      workers: [],
      time_start: null,
      time_end: null,
      sort_order: 0,
      notes: item.note ?? null,
      required_workers: item.workers,
      required_brigadiers: 0,
      required_masters: item.foremen,
      required_foremen: item.itr,
      required_vehicles: item.vehicles,
      required_vehicle_types: [],
      is_redirected: false,
      redirect_reason: null,
      created_at: now,
      updated_at: now,
      vehicles: [],
      cross_requests: [],
    }],
  }
}
