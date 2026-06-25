import { supabase } from '../supabase'
import type {
  UrgentOrder, UrgentOrderWorker, UrgentOrderWithWorkers,
  UrgentOrderStatus, UrgentOrderFate, CreateUrgentOrderInput,
} from '@/types'

// ─── Read ───────────────────────────────────────────────────────────────────

export async function fetchUrgentOrders(): Promise<UrgentOrderWithWorkers[]> {
  const { data: orders, error } = await supabase
    .from('urgent_orders')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Не удалось загрузить поручения: ${error.message}`)
  const list = (orders ?? []) as UrgentOrder[]
  if (list.length === 0) return []

  const { data: workers } = await supabase
    .from('urgent_order_workers')
    .select('*')
    .in('order_id', list.map(o => o.id))
  const byOrder = new Map<string, UrgentOrderWorker[]>()
  for (const w of (workers ?? []) as UrgentOrderWorker[]) {
    const arr = byOrder.get(w.order_id) ?? []
    arr.push(w)
    byOrder.set(w.order_id, arr)
  }
  return list.map(o => ({ ...o, workers: byOrder.get(o.id) ?? [] }))
}

// Worker ids pulled onto still-active orders today — used to grey out tokens so
// the same person is not pulled twice.
export async function fetchPulledWorkerIds(planDate: string): Promise<string[]> {
  const { data: orders } = await supabase
    .from('urgent_orders')
    .select('id')
    .eq('plan_date', planDate)
    .eq('status', 'ACTIVE')
  const ids = (orders ?? []).map(o => o.id)
  if (ids.length === 0) return []
  const { data: workers } = await supabase
    .from('urgent_order_workers')
    .select('worker_id')
    .in('order_id', ids)
  return [...new Set((workers ?? []).map(w => w.worker_id).filter((x): x is string => !!x))]
}

// ─── Write ──────────────────────────────────────────────────────────────────

// Create the order, record its crew, then reform the source brigades: pull the
// named workers off their plans and apply the chosen fate to the affected plan.
export async function createUrgentOrder(input: CreateUrgentOrderInput): Promise<UrgentOrder | null> {
  const { data: order, error } = await supabase
    .from('urgent_orders')
    .insert({
      source: input.source, source_ref: input.sourceRef, source_org: input.sourceOrg,
      priority: input.priority, service_id: input.serviceId, order_type: input.orderType,
      location: input.location, work_text: input.workText, plan_date: input.planDate,
      shift_type: input.shiftType, pull_mode: input.pullMode,
      affected_plan_id: input.affectedPlanId, original_plan_fate: input.fate,
      suspended_until: input.suspendedUntil, partial_work_done: input.partialWorkDone,
      created_by: input.createdBy,
    })
    .select()
    .single()
  if (error || !order) throw new Error(`Не удалось создать поручение: ${error?.message ?? 'ошибка'}`)

  if (input.crew.length > 0) {
    const { error: cErr } = await supabase.from('urgent_order_workers').insert(
      input.crew.map(c => ({
        order_id: order.id, worker_id: c.workerId, worker_name: c.workerName,
        role: c.role, source_plan_id: c.sourcePlanId, source_plan_name: c.sourcePlanName,
      })),
    )
    if (cErr) throw new Error(`Поручение создано, но состав не сохранён: ${cErr.message}`)
  }

  // Reform brigades: remove pulled workers from their source plans' assignments.
  await pullWorkersFromPlans(input.crew)

  // Apply the fate to the affected source plan.
  if (input.affectedPlanId && input.fate) {
    await applyPlanFate(input.affectedPlanId, input.fate, input.suspendedUntil, input.workText)
  }

  return order as UrgentOrder
}

// Remove the pulled workers' assignments from their source plan items so the
// original brigade shows weakened. Free workers (no source plan) are skipped.
async function pullWorkersFromPlans(crew: CreateUrgentOrderInput['crew']): Promise<void> {
  const bySource = new Map<string, string[]>()
  for (const c of crew) {
    if (!c.sourcePlanId || !c.workerId) continue
    const arr = bySource.get(c.sourcePlanId) ?? []
    arr.push(c.workerId)
    bySource.set(c.sourcePlanId, arr)
  }
  for (const [planId, userIds] of bySource) {
    const { data: items } = await supabase.from('work_plan_items').select('id').eq('plan_id', planId)
    const itemIds = (items ?? []).map(i => i.id)
    if (itemIds.length === 0) continue
    await supabase.from('work_assignments').delete().in('plan_item_id', itemIds).in('user_id', userIds)
  }
}

async function applyPlanFate(
  planId: string, fate: UrgentOrderFate, suspendedUntil: string | null, reason: string,
): Promise<void> {
  const now = new Date().toISOString()
  if (fate === 'POSTPONE') {
    await supabase.from('work_plans')
      .update({ paused_at: now, pause_reason: `Поручение сверху: ${reason}`, suspended_until: suspendedUntil, updated_at: now })
      .eq('id', planId)
  } else if (fate === 'CANCEL') {
    await supabase.from('work_plans')
      .update({ status: 'REJECTED', chief_notes: `Отменён поручением сверху: ${reason}`, updated_at: now })
      .eq('id', planId)
  }
  // REASSIGN and WEAKENED leave the plan running; the foreman is alerted and
  // reassigns replacements. Pulled assignments are already removed above.
}

export async function updateUrgentOrderStatus(id: string, status: UrgentOrderStatus): Promise<boolean> {
  const { error } = await supabase
    .from('urgent_orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`Не удалось обновить статус поручения: ${error.message}`)
  return true
}
