import { supabase } from '../supabase'
import { logAction } from '../logger'
import type {
  EmployeeStatusType, WorkPlan, WorkPlanItem, WorkPlanWithItems, WorkPlanItemWithVehicles,
  Vehicle, VehicleAssignment, WorkPlanStatus, WorkAssignment, WorkAssignmentWithUser, CrossServiceRequest,
  WorkRedirect, WorkSource, OriginalPlanFate, ShiftType, Directive, DirectiveStatus,
  DirectiveWorkerAssignment, ServiceOrderType,
} from '@/types'

// ============ WORK PLANS ============

export async function fetchWorkPlans(filters?: {
  serviceId?: string
  planDate?: string
  dateFrom?: string   // inclusive lower bound 'YYYY-MM-DD'
  dateTo?: string     // inclusive upper bound 'YYYY-MM-DD'
  shiftType?: string
  status?: WorkPlanStatus
  statuses?: WorkPlanStatus[]
}): Promise<WorkPlan[]> {
  let q = supabase.from('work_plans').select('*').order('plan_date', { ascending: false })
  if (filters?.serviceId) q = q.eq('service_id', filters.serviceId)
  if (filters?.planDate)  q = q.eq('plan_date', filters.planDate)
  if (filters?.dateFrom)  q = q.gte('plan_date', filters.dateFrom)
  if (filters?.dateTo)    q = q.lte('plan_date', filters.dateTo)
  if (filters?.shiftType) q = q.eq('shift_type', filters.shiftType)
  if (filters?.status)    q = q.eq('status', filters.status)
  if (filters?.statuses && filters.statuses.length > 0) q = q.in('status', filters.statuses)
  const { data } = await q
  return (data || []) as WorkPlan[]
}

// Fetch a single plan with all its items
export async function fetchWorkPlanWithItems(planId: string): Promise<WorkPlanWithItems | null> {
  const [planRes, itemsRes] = await Promise.all([
    supabase.from('work_plans').select('*').eq('id', planId).single(),
    supabase.from('work_plan_items').select('*').eq('plan_id', planId).order('sort_order'),
  ])
  if (!planRes.data) return null
  const items = (itemsRes.data || []) as WorkPlanItem[]
  const itemIds = items.map(i => i.id)
  const [vaRes, csRes] = await Promise.all([
    itemIds.length > 0
      ? supabase.from('vehicle_assignments').select('*, vehicle:vehicles(*)').in('plan_item_id', itemIds)
      : Promise.resolve({ data: [] }),
    itemIds.length > 0
      ? supabase.from('cross_service_requests').select('*').in('from_plan_item_id', itemIds)
      : Promise.resolve({ data: [] }),
  ])
  const allAssignments = (vaRes.data || []) as Array<VehicleAssignment & { vehicle: Vehicle }>
  const allCrossReqs = (csRes.data || []) as CrossServiceRequest[]
  return {
    ...(planRes.data as WorkPlan),
    items: items.map(item => ({
      ...item,
      vehicles: allAssignments.filter(a => a.plan_item_id === item.id).map(a => a.vehicle),
      cross_requests: allCrossReqs.filter(r => r.from_plan_item_id === item.id),
    })),
  }
}

/** Batch variant of fetchWorkPlanWithItems: 4 queries total instead of 4 per plan */
export async function fetchWorkPlansWithItems(planIds: string[]): Promise<WorkPlanWithItems[]> {
  if (planIds.length === 0) return []
  const [plansRes, itemsRes] = await Promise.all([
    supabase.from('work_plans').select('*').in('id', planIds),
    supabase.from('work_plan_items').select('*').in('plan_id', planIds).order('sort_order'),
  ])
  const plans = (plansRes.data || []) as WorkPlan[]
  const items = (itemsRes.data || []) as WorkPlanItem[]
  const itemIds = items.map(i => i.id)
  const [vaRes, csRes] = await Promise.all([
    itemIds.length > 0
      ? supabase.from('vehicle_assignments').select('*, vehicle:vehicles(*)').in('plan_item_id', itemIds)
      : Promise.resolve({ data: [] }),
    itemIds.length > 0
      ? supabase.from('cross_service_requests').select('*').in('from_plan_item_id', itemIds)
      : Promise.resolve({ data: [] }),
  ])
  const allAssignments = (vaRes.data || []) as Array<VehicleAssignment & { vehicle: Vehicle }>
  const allCrossReqs = (csRes.data || []) as CrossServiceRequest[]
  const byId = new Map(plans.map(p => [p.id, p]))
  return planIds
    .map(id => byId.get(id))
    .filter((p): p is WorkPlan => p !== undefined)
    .map(plan => ({
      ...plan,
      items: items
        .filter(i => i.plan_id === plan.id)
        .map(item => ({
          ...item,
          vehicles: allAssignments.filter(a => a.plan_item_id === item.id).map(a => a.vehicle),
          cross_requests: allCrossReqs.filter(r => r.from_plan_item_id === item.id),
        })),
    }))
}

export async function createWorkPlan(
  data: Pick<WorkPlan, 'service_id' | 'plan_date' | 'shift_type'>,
  userId: string
): Promise<WorkPlan | null> {
  const { data: result, error } = await supabase
    .from('work_plans')
    .insert({ ...data, status: 'DRAFT', created_by: userId })
    .select().single()
  if (error) throw new Error(error.message)
  if (result) await logAction(userId, 'CREATE_WORK_PLAN', 'work_plan', result.id, data as Record<string, unknown>)
  return result as WorkPlan | null
}

export async function updateWorkPlan(
  planId: string,
  updates: Partial<Pick<WorkPlan, 'chief_notes'>>,
  userId: string
): Promise<WorkPlan | null> {
  const { data, error } = await supabase
    .from('work_plans')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', planId).select().single()
  if (error) throw new Error(error.message)
  if (data) await logAction(userId, 'UPDATE_WORK_PLAN', 'work_plan', planId, updates as Record<string, unknown>)
  return data as WorkPlan | null
}

// HEAD submits plan for chief engineer review (works for DRAFT and REJECTED plans)
export async function submitWorkPlan(planId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('work_plans')
    .update({ status: 'SUBMITTED', submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', planId)
    .in('status', ['DRAFT', 'REJECTED'])
  if (!error) await logAction(userId, 'SUBMIT_WORK_PLAN', 'work_plan', planId, null)
  return !error
}

// CHIEF_ENGINEER approves plan
export async function approveWorkPlan(planId: string, userId: string, notes?: string): Promise<boolean> {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('work_plans')
    .update({
      status: 'APPROVED',
      approved_by: userId,
      approved_at: now,
      chief_notes: notes ?? null,
      updated_at: now,
    })
    .eq('id', planId).eq('status', 'SUBMITTED')
  if (!error) await logAction(userId, 'APPROVE_WORK_PLAN', 'work_plan', planId, { notes })
  return !error
}

// ZAMPORAB directly approves own-service (SRV-STR) plan: SUBMITTED → PLANNED (bypasses chief engineer)
export async function approveWorkPlanDirect(planId: string, userId: string): Promise<boolean> {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('work_plans')
    .update({ status: 'PLANNED', zamporab_approved_by: userId, zamporab_approved_at: now, updated_at: now })
    .eq('id', planId).eq('status', 'SUBMITTED')
  if (!error) await logAction(userId, 'APPROVE_WORK_PLAN_DIRECT', 'work_plan', planId, null)
  return !error
}

// ZAMPORAB confirms chief-approved plan → PLANNED
export async function confirmWorkPlanZamporab(planId: string, userId: string): Promise<boolean> {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('work_plans')
    .update({ status: 'PLANNED', zamporab_approved_by: userId, zamporab_approved_at: now, updated_at: now })
    .eq('id', planId).eq('status', 'APPROVED')
  if (!error) await logAction(userId, 'CONFIRM_WORK_PLAN_ZAMPORAB', 'work_plan', planId, null)
  return !error
}

// ZAMPORAB returns plan for revision → REJECTED (back to service chief)
export async function returnWorkPlanZamporab(planId: string, userId: string, notes: string): Promise<boolean> {
  const now = new Date().toISOString()
  // Accept both APPROVED (other services) and SUBMITTED (SRV-STR own service)
  const { error } = await supabase
    .from('work_plans')
    .update({ status: 'REJECTED', chief_notes: notes, updated_at: now })
    .eq('id', planId).in('status', ['APPROVED', 'SUBMITTED'])
  if (!error) await logAction(userId, 'RETURN_WORK_PLAN_ZAMPORAB', 'work_plan', planId, { notes })
  return !error
}

// FOREMAN/MASTER starts work → IN_PROGRESS
export async function startWorkPlan(planId: string, userId: string): Promise<boolean> {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('work_plans')
    .update({ status: 'IN_PROGRESS', fact_start: now, updated_at: now })
    .eq('id', planId).in('status', ['PLANNED', 'ASSIGNED', 'BOSS_CONFIRMED', 'FAST_TRACK'])
  if (!error) await logAction(userId, 'START_WORK_PLAN', 'work_plan', planId, null)
  return !error
}

// FOREMAN/MASTER completes work → DONE
export async function completeWorkPlan(planId: string, userId: string): Promise<boolean> {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('work_plans')
    .update({ status: 'DONE', fact_finish: now, updated_at: now })
    .eq('id', planId).eq('status', 'IN_PROGRESS')
  if (!error) await logAction(userId, 'COMPLETE_WORK_PLAN', 'work_plan', planId, null)
  return !error
}

// CHIEF_ENGINEER rejects plan (returns it to DRAFT for revision)
export async function rejectWorkPlan(planId: string, userId: string, notes: string): Promise<boolean> {
  const { error } = await supabase
    .from('work_plans')
    .update({ status: 'REJECTED', chief_notes: notes, updated_at: new Date().toISOString() })
    .eq('id', planId).eq('status', 'SUBMITTED')
  if (!error) await logAction(userId, 'REJECT_WORK_PLAN', 'work_plan', planId, { notes })
  return !error
}

export async function deleteWorkPlan(planId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('work_plans').delete().eq('id', planId).eq('status', 'DRAFT')
  if (!error) await logAction(userId, 'DELETE_WORK_PLAN', 'work_plan', planId, null)
  return !error
}

// Recall submitted plan back to DRAFT for editing (SUBMITTED → DRAFT)
export async function recallWorkPlan(planId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('work_plans')
    .update({ status: 'DRAFT', updated_at: new Date().toISOString() })
    .eq('id', planId)
    .eq('status', 'SUBMITTED')
  if (!error) await logAction(userId, 'RECALL_WORK_PLAN', 'work_plan', planId, null)
  return !error
}

// ============ WORK PLAN ITEMS ============

export async function fetchWorkPlanItems(planId: string): Promise<WorkPlanItem[]> {
  const { data } = await supabase
    .from('work_plan_items').select('*').eq('plan_id', planId).order('sort_order')
  return (data || []) as WorkPlanItem[]
}

export async function createWorkPlanItem(
  item: Omit<WorkPlanItem, 'id' | 'created_at' | 'updated_at'>
): Promise<WorkPlanItem | null> {
  const { data, error } = await supabase.from('work_plan_items').insert(item).select().single()
  if (error) throw new Error(error.message)
  return data as WorkPlanItem | null
}

export async function updateWorkPlanItem(
  itemId: string,
  updates: Partial<Omit<WorkPlanItem, 'id' | 'plan_id' | 'created_at' | 'updated_at'>>
): Promise<WorkPlanItem | null> {
  const { data, error } = await supabase
    .from('work_plan_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', itemId).select().single()
  if (error) throw new Error(error.message)
  return data as WorkPlanItem | null
}

export async function deleteWorkPlanItem(itemId: string): Promise<boolean> {
  const { error } = await supabase.from('work_plan_items').delete().eq('id', itemId)
  return !error
}

// Fetch items with their assigned vehicles (for chief engineer / mechanic views)
export async function fetchItemsWithVehicles(planId: string): Promise<WorkPlanItemWithVehicles[]> {
  const [itemsRes, assignmentsRes] = await Promise.all([
    supabase.from('work_plan_items').select('*').eq('plan_id', planId).order('sort_order'),
    supabase
      .from('vehicle_assignments')
      .select('*, vehicle:vehicles(*)')
      .in(
        'plan_item_id',
        // subquery: get item ids for this plan
        (await supabase.from('work_plan_items').select('id').eq('plan_id', planId)).data?.map((r: { id: string }) => r.id) || []
      ),
  ])
  const items = (itemsRes.data || []) as WorkPlanItem[]
  const assignments = (assignmentsRes.data || []) as Array<VehicleAssignment & { vehicle: Vehicle }>

  return items.map(item => ({
    ...item,
    vehicles: assignments
      .filter(a => a.plan_item_id === item.id)
      .map(a => a.vehicle),
    cross_requests: [],
  }))
}

// ============ WORK ASSIGNMENTS (brigade formation) ============

/**
 * Fetch all work assignments for a plan item, with user details.
 */
export async function fetchWorkAssignments(planItemId: string): Promise<WorkAssignmentWithUser[]> {
  const { data } = await supabase
    .from('work_assignments')
    .select('*, user:users!work_assignments_user_id_fkey(user_id, full_name, position, tab_number)')
    .eq('plan_item_id', planItemId)
    .order('assigned_at')
  return (data || []) as WorkAssignmentWithUser[]
}

export async function fetchWorkAssignmentsForItems(itemIds: string[]): Promise<WorkAssignmentWithUser[]> {
  if (itemIds.length === 0) return []
  const { data, error } = await supabase
    .from('work_assignments')
    .select('*, user:users!work_assignments_user_id_fkey(user_id, full_name, position, tab_number)')
    .in('plan_item_id', itemIds)
    .order('assigned_at')
  if (error) console.error('fetchWorkAssignmentsForItems error:', error)
  return (data || []) as WorkAssignmentWithUser[]
}

/**
 * Assign an employee to a work plan item.
 */
export async function createWorkAssignment(
  planItemId: string,
  userId: string,
  role: WorkAssignment['role'],
  assignedBy: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('work_assignments').insert({
    plan_item_id: planItemId,
    user_id: userId,
    role,
    assigned_by: assignedBy,
  })
  if (error) {
    console.error('createWorkAssignment failed:', error)
    return { ok: false, error: error.message }
  }
  await logAction(assignedBy, 'ASSIGN_WORKER', 'work_assignment', planItemId, { userId, role })
  return { ok: true }
}

/**
 * Remove a work assignment.
 */
export async function deleteWorkAssignment(assignmentId: string): Promise<boolean> {
  const { error } = await supabase.from('work_assignments').delete().eq('id', assignmentId)
  return !error
}

/**
 * Mark a work plan as BOSS_CONFIRMED (подтверждено начальником на совещании).
 */
export async function confirmWorkPlanBoss(planId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('work_plans')
    .update({ status: 'BOSS_CONFIRMED', updated_at: new Date().toISOString() })
    .eq('id', planId)
    .eq('status', 'PLANNED')
  if (!error) await logAction(userId, 'BOSS_CONFIRM_WORK_PLAN', 'work_plan', planId, null)
  return !error
}

/**
 * Mark a work plan as ASSIGNED (all workers named, ready to start).
 */
export async function markWorkPlanAssigned(planId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('work_plans')
    .update({ status: 'ASSIGNED', updated_at: new Date().toISOString() })
    .eq('id', planId)
  if (!error) await logAction(userId, 'ASSIGN_WORK_PLAN', 'work_plan', planId, null)
  return !error
}

// ============ CROSS-SERVICE REQUESTS ============

export async function createCrossServiceRequest(
  data: Omit<CrossServiceRequest, 'id' | 'status' | 'response_note' | 'responded_by' | 'responded_at' | 'created_at'>
): Promise<CrossServiceRequest | null> {
  const { data: row, error } = await supabase
    .from('cross_service_requests')
    .insert(data)
    .select()
    .single()
  if (error) { console.error('createCrossServiceRequest:', error.message); return null }
  return row as CrossServiceRequest
}

export async function fetchCrossServiceRequests(filters: {
  toServiceId?: string
  fromServiceId?: string
  fromPlanId?: string
}): Promise<CrossServiceRequest[]> {
  let q = supabase.from('cross_service_requests').select('*').order('created_at', { ascending: false })
  if (filters.toServiceId)   q = q.eq('to_service_id', filters.toServiceId)
  if (filters.fromServiceId) q = q.eq('from_service_id', filters.fromServiceId)
  if (filters.fromPlanId)    q = q.eq('from_plan_id', filters.fromPlanId)
  const { data } = await q
  return (data || []) as CrossServiceRequest[]
}

export async function respondToCrossServiceRequest(
  id: string,
  status: 'CONFIRMED' | 'DECLINED',
  responseNote: string | null,
  respondedBy: string
): Promise<boolean> {
  const { error } = await supabase
    .from('cross_service_requests')
    .update({
      status,
      response_note: responseNote,
      responded_by: respondedBy,
      responded_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (!error) await logAction(respondedBy, 'RESPOND_CROSS_SERVICE_REQUEST', 'cross_service_requests', id, { status, responseNote })
  return !error
}

/**
 * Mark a work plan item as redirected (emergency).
 */
export async function redirectWorkPlanItem(
  itemId: string,
  reason: string,
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('work_plan_items')
    .update({ is_redirected: true, redirect_reason: reason })
    .eq('id', itemId)
  if (!error) await logAction(userId, 'REDIRECT_BRIGADE', 'work_plan_item', itemId, { reason })
  return !error
}

// ============ OVERRIDE / REDIRECT SYSTEM ============

/**
 * Create an override order: builds a FAST_TRACK work plan + optionally
 * creates a work_redirect record and marks the original plan as REDIRECTED/SUSPENDED.
 */
export async function createOverrideOrder(data: {
  serviceId: string
  planDate: string
  shiftType: ShiftType
  location: string
  workDescription: string
  source: WorkSource
  sourceRef: string | null
  sourceOrg: string | null
  fastTrackReason: string
  fromPlanId: string | null
  fromPlanStatus: string | null
  partialWorkDone: string | null
  originalPlanFate: OriginalPlanFate
  suspendedUntil: string | null
  orderedBySource: WorkSource
  orderReference: string | null
  orderText: string
  affectedUsers: string[]
  fullBrigade: boolean
  createdBy: string
}): Promise<{ plan: WorkPlan; redirect: WorkRedirect | null } | null> {
  // 1. Create the FAST_TRACK work plan
  const planPayload = {
    service_id: data.serviceId,
    plan_date: data.planDate,
    shift_type: data.shiftType,
    status: 'FAST_TRACK' as WorkPlanStatus,
    created_by: data.createdBy,
    priority: 'OVERRIDE',
    source: data.source,
    source_ref: data.sourceRef,
    source_org: data.sourceOrg,
    fast_track: true,
    fast_track_reason: data.fastTrackReason,
  }
  const { data: newPlan, error: planError } = await supabase
    .from('work_plans')
    .insert(planPayload)
    .select()
    .single()
  if (planError || !newPlan) {
    console.error('createOverrideOrder: plan creation failed', planError?.message)
    return null
  }

  // 2. Add work plan item
  await supabase.from('work_plan_items').insert({
    plan_id: newPlan.id,
    location: data.location,
    work_description: data.workDescription,
    workers: [],
    sort_order: 0,
  })

  let redirect: WorkRedirect | null = null

  // 3. If redirecting from an existing plan — create redirect record
  if (data.fromPlanId && data.fromPlanStatus) {
    const newStatus: WorkPlanStatus = data.originalPlanFate === 'CANCEL'
      ? 'REDIRECTED'
      : data.originalPlanFate === 'POSTPONE'
        ? 'SUSPENDED'
        : 'REDIRECTED'

    const redirectPayload = {
      from_plan_id: data.fromPlanId,
      from_status: data.fromPlanStatus,
      partial_work_done: data.partialWorkDone,
      to_plan_id: newPlan.id,
      ordered_by_source: data.orderedBySource,
      order_reference: data.orderReference,
      order_text: data.orderText,
      redirected_by: data.createdBy,
      affected_users: data.affectedUsers,
      full_brigade: data.fullBrigade,
      original_plan_fate: data.originalPlanFate,
    }

    const { data: redirectRow, error: rErr } = await supabase
      .from('work_redirects')
      .insert(redirectPayload)
      .select()
      .single()

    if (!rErr && redirectRow) {
      redirect = redirectRow as WorkRedirect

      // Update original plan status
      const originalUpdate: Record<string, unknown> = {
        status: newStatus,
        parent_redirect_id: redirect.id,
      }
      if (data.originalPlanFate === 'POSTPONE' && data.suspendedUntil) {
        originalUpdate.suspended_until = data.suspendedUntil
      }
      await supabase.from('work_plans').update(originalUpdate).eq('id', data.fromPlanId)

      // If fate is CANCEL, mark assignments as REDIRECTED
      if (data.affectedUsers.length > 0) {
        await supabase
          .from('work_assignments')
          .update({ assignment_status: 'REDIRECTED', redirect_id: redirect.id })
          .eq('plan_item_id', data.fromPlanId)
      }

      // Link override plan back to the redirect
      await supabase
        .from('work_plans')
        .update({ parent_redirect_id: redirect.id })
        .eq('id', newPlan.id)
    }
  }

  await logAction(data.createdBy, 'CREATE_OVERRIDE_ORDER', 'work_plans', newPlan.id, {
    source: data.source, fromPlanId: data.fromPlanId, fate: data.originalPlanFate,
  })

  return { plan: newPlan as WorkPlan, redirect }
}

/**
 * Pause a work plan (IN_PROGRESS → paused state still IN_PROGRESS but with pause_reason set).
 */
export async function pauseWorkPlan(planId: string, reason: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('work_plans')
    .update({ paused_at: new Date().toISOString(), pause_reason: reason })
    .eq('id', planId)
  if (!error) await logAction(userId, 'PAUSE_WORK_PLAN', 'work_plans', planId, { reason })
  return !error
}

/**
 * Fetch the redirect journal for a given plan (or all redirects).
 */
export async function fetchWorkRedirects(planId?: string): Promise<WorkRedirect[]> {
  let q = supabase.from('work_redirects').select('*').order('redirected_at', { ascending: false })
  if (planId) q = q.or(`from_plan_id.eq.${planId},to_plan_id.eq.${planId}`)
  const { data } = await q
  return (data || []) as WorkRedirect[]
}

/**
 * Fetch plans currently in SUSPENDED status, optionally filtered by service.
 */
export async function fetchSuspendedPlans(serviceId?: string): Promise<WorkPlan[]> {
  let q = supabase.from('work_plans').select('*').eq('status', 'SUSPENDED').order('suspended_until')
  if (serviceId) q = q.eq('service_id', serviceId)
  const { data } = await q
  return (data || []) as WorkPlan[]
}

/**
 * Fetch plans currently in FAST_TRACK status needing brigade assignment.
 */
export async function fetchFastTrackPlans(serviceId?: string): Promise<WorkPlan[]> {
  let q = supabase.from('work_plans').select('*').eq('status', 'FAST_TRACK').order('created_at', { ascending: false })
  if (serviceId) q = q.eq('service_id', serviceId)
  const { data } = await q
  return (data || []) as WorkPlan[]
}

// ============ CANCEL / BULK DELETE PLANS ============

export async function cancelWorkPlan(
  id: string,
  reason: string,
  userId: string
): Promise<void> {
  await supabase
    .from('work_plans')
    .update({ status: 'CANCELLED', completion_note: reason, updated_at: new Date().toISOString() })
    .eq('id', id)
  await logAction(userId, 'CANCEL_WORK_PLAN', 'work_plan', id, { reason })
}

export async function cancelWorkPlansBulk(
  ids: string[],
  reason: string,
  userId: string
): Promise<void> {
  if (ids.length === 0) return
  await supabase
    .from('work_plans')
    .update({ status: 'CANCELLED', completion_note: reason, updated_at: new Date().toISOString() })
    .in('id', ids)
  await logAction(userId, 'CANCEL_WORK_PLANS_BULK', 'work_plan', ids[0], { ids, reason })
}

// Delete stale demo/test plans (DRAFT/SUBMITTED/REJECTED older than N days)
export async function deleteStaleWorkPlans(olderThanDays: number): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]
  const { data } = await supabase
    .from('work_plans')
    .delete()
    .in('status', ['DRAFT', 'SUBMITTED', 'REJECTED'])
    .lt('plan_date', cutoff)
    .select('id')
  return (data || []).length
}

// ============ DIRECTIVES ============

export async function fetchDirectives(): Promise<Directive[]> {
  const { data } = await supabase
    .from('directives')
    .select('*')
    .order('created_at', { ascending: false })
  return (data || []) as Directive[]
}

export async function createDirective(
  data: Pick<Directive, 'title' | 'description' | 'priority' | 'plan_id' | 'suspend_plan' | 'service_id' | 'order_type' | 'location'>,
  userId: string
): Promise<Directive | null> {
  const { data: result, error } = await supabase
    .from('directives')
    .insert({ ...data, created_by: userId, status: 'NEW' })
    .select().single()
  if (error) throw new Error(error.message)
  return result as Directive
}

export async function updateDirectiveStatus(
  id: string,
  status: DirectiveStatus
): Promise<void> {
  await supabase
    .from('directives')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
}

// ── Directive worker assignments (migration 041) ─────────────────────────────

export async function createDirectiveWithWorkers(
  directiveData: Pick<Directive, 'title' | 'description' | 'priority' | 'plan_id' | 'suspend_plan' | 'service_id' | 'order_type' | 'location'>,
  workers: Pick<DirectiveWorkerAssignment, 'worker_id' | 'worker_name' | 'source_plan_id' | 'source_plan_name'>[],
  userId: string
): Promise<Directive | null> {
  const directive = await createDirective(directiveData, userId)
  if (!directive) return null
  if (workers.length > 0) {
    await supabase.from('directive_worker_assignments').insert(
      workers.map(w => ({ ...w, directive_id: directive.id, assigned_by: userId }))
    )
  }
  return directive
}

export async function fetchDirectiveWorkers(directiveId: string): Promise<DirectiveWorkerAssignment[]> {
  const { data } = await supabase
    .from('directive_worker_assignments')
    .select('*')
    .eq('directive_id', directiveId)
    .order('assigned_at')
  return (data || []) as DirectiveWorkerAssignment[]
}

export async function fetchDirectivesWithWorkers(): Promise<(Directive & { workers: DirectiveWorkerAssignment[] })[]> {
  const directives = await fetchDirectives()
  if (!directives.length) return []
  const { data: allWorkers } = await supabase
    .from('directive_worker_assignments')
    .select('*')
    .in('directive_id', directives.map(d => d.id))
  const workersByDirective = new Map<string, DirectiveWorkerAssignment[]>()
  ;(allWorkers || []).forEach((w: DirectiveWorkerAssignment) => {
    if (!workersByDirective.has(w.directive_id)) workersByDirective.set(w.directive_id, [])
    workersByDirective.get(w.directive_id)!.push(w)
  })
  return directives.map(d => ({ ...d, workers: workersByDirective.get(d.id) || [] }))
}

// Returns worker IDs that are currently assigned to active directives on a given date
export async function fetchPulledWorkerIds(planDate: string): Promise<Set<string>> {
  const startOfDay = planDate + 'T00:00:00'
  const endOfDay   = planDate + 'T23:59:59'
  const { data: dirs } = await supabase
    .from('directives')
    .select('id')
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)
    .not('status', 'in', '("DONE","CANCELLED")')
  if (!dirs || dirs.length === 0) return new Set()
  const { data: workers } = await supabase
    .from('directive_worker_assignments')
    .select('worker_id')
    .in('directive_id', dirs.map((d: { id: string }) => d.id))
  return new Set((workers || []).map((w: { worker_id: string }) => w.worker_id))
}

// ── Service order types catalog (migration 041) ──────────────────────────────

export async function fetchServiceOrderTypes(serviceId: string): Promise<ServiceOrderType[]> {
  const { data } = await supabase
    .from('service_order_types')
    .select('*')
    .eq('service_id', serviceId)
    .order('sort_order')
  return (data || []) as ServiceOrderType[]
}

// Returns a map userId → EmployeeStatusType for employees who are absent on a given date.
// Only non-working statuses are included (Na_rabote is excluded).
export async function fetchActiveStatusesOnDate(
  userIds: string[],
  dateStr: string
): Promise<Map<string, EmployeeStatusType>> {
  if (!userIds.length) return new Map()
  const { data } = await supabase
    .from('employee_status')
    .select('user_id, status')
    .in('user_id', userIds)
    .lte('date_from', dateStr)
    .or(`date_to.is.null,date_to.gte.${dateStr}`)
    .neq('status', 'Na_rabote')
  const map = new Map<string, EmployeeStatusType>()
  ;(data ?? []).forEach((r: { user_id: string; status: string }) => {
    if (!map.has(r.user_id)) map.set(r.user_id, r.status as EmployeeStatusType)
  })
  return map
}

// ─── Work permit flag ───────────────────────────────────────────────────────

/** Mark a work plan as having a printed permit */
export async function markWorkPlanPermit(
  planId: string,
  permitNumber: string,
): Promise<boolean> {
  const { error } = await supabase.from('work_plans').update({
    has_permit:       true,
    permit_number:    permitNumber || null,
    permit_issued_at: new Date().toISOString(),
  }).eq('id', planId)
  return !error
}
