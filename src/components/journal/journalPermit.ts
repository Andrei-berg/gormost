// Adapter: build a WorkPlanWithItems-shaped object from a journal plan item so
// the existing WorkPermitModal can generate a наряд-допуск straight from the
// Журнал планов. The journal is a separate lightweight tool (not work_plans),
// so the synthetic plan carries only what the permit needs — object, work,
// service, date, shift and headcount requirements. Состав исполнителей and
// транспорт are filled by hand in the permit (the journal has counts, not names).
//
// The synthetic id is the journal item id; markWorkPlanPermit() inside the modal
// simply no-ops (no work_plan with that id), which is fine — the document prints.

import type { AuthSession, WorkPlanWithItems } from '@/types'
import type { PlanItem } from './data'

export function journalItemToWorkPlan(item: PlanItem, objectName: string, session: AuthSession): WorkPlanWithItems {
  const now = new Date().toISOString()
  return {
    id: item.id,
    service_id: item.serviceId,
    plan_date: item.planDate,
    shift_type: item.period,
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
