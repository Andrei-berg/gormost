import { supabase } from './supabase'
import { logAction } from './logger'
import type {
  User, Service, Category, GObject, Construction, WorkType,
  Request, RequestAssignment, StaffRequest, Remark, ChangelogEntry,
  RequestStatus, Priority, Urgency, StaffRequestStatus,
  EmployeeStatusType, EmployeeStatus, EnrichedEmployee,
  WorkPlan, WorkPlanItem, WorkPlanWithItems, WorkPlanItemWithVehicles,
  Vehicle, VehicleAssignment, VehicleWithAssignments,
  WorkPlanStatus, VehicleStatus,
  Profession, Schedule,
  EmployeePositionWithProfession, EmployeeAssignmentWithSchedule, EmployeeDetail,
} from '@/types'

// ============ USERS ============

export async function fetchUsers(activeOnly = true): Promise<User[]> {
  let q = supabase.from('users').select('*').order('full_name')
  if (activeOnly) q = q.eq('is_active', true)
  const { data } = await q
  return (data || []) as User[]
}

export async function fetchUsersByService(serviceId: string): Promise<User[]> {
  const { data } = await supabase.from('users').select('*')
    .eq('service_id', serviceId).eq('is_active', true).order('full_name')
  return (data || []) as User[]
}

export async function fetchUserById(userId: string): Promise<User | null> {
  const { data } = await supabase.from('users').select('*').eq('user_id', userId).single()
  return data as User | null
}

export async function createUser(user: Partial<User>): Promise<User | null> {
  const { data, error } = await supabase.from('users').insert(user).select().single()
  if (error) console.error('createUser error:', error)
  return data as User | null
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
  const { data, error } = await supabase.from('users').update(updates).eq('user_id', userId).select().single()
  if (error) console.error('updateUser error:', error)
  return data as User | null
}

export async function deleteUser(userId: string): Promise<boolean> {
  const { error } = await supabase.from('users').update({ is_active: false }).eq('user_id', userId)
  return !error
}

// ============ SERVICES ============

export async function fetchServices(): Promise<Service[]> {
  const { data } = await supabase.from('services').select('*').order('service_name')
  return (data || []) as Service[]
}

export async function createService(service: Partial<Service>): Promise<Service | null> {
  const { data } = await supabase.from('services').insert(service).select().single()
  return data as Service | null
}

export async function updateService(serviceId: string, updates: Partial<Service>): Promise<Service | null> {
  const { data } = await supabase.from('services').update(updates).eq('service_id', serviceId).select().single()
  return data as Service | null
}

export async function deleteService(serviceId: string): Promise<boolean> {
  const { error } = await supabase.from('services').delete().eq('service_id', serviceId)
  return !error
}

// ============ CATEGORIES ============

export async function fetchCategories(): Promise<Category[]> {
  const { data } = await supabase.from('categories').select('*').order('category_name')
  return (data || []) as Category[]
}

export async function createCategory(cat: Partial<Category>): Promise<Category | null> {
  const { data } = await supabase.from('categories').insert(cat).select().single()
  return data as Category | null
}

export async function updateCategory(catId: string, updates: Partial<Category>): Promise<Category | null> {
  const { data } = await supabase.from('categories').update(updates).eq('category_id', catId).select().single()
  return data as Category | null
}

export async function deleteCategory(catId: string): Promise<boolean> {
  const { error } = await supabase.from('categories').delete().eq('category_id', catId)
  return !error
}

// ============ OBJECTS ============

export async function fetchObjects(categoryId?: string): Promise<GObject[]> {
  let q = supabase.from('objects').select('*').order('object_name')
  if (categoryId) q = q.eq('category_id', categoryId)
  const { data } = await q
  return (data || []) as GObject[]
}

export async function createObject(obj: Partial<GObject>): Promise<GObject | null> {
  const { data } = await supabase.from('objects').insert(obj).select().single()
  return data as GObject | null
}

export async function updateObject(objId: string, updates: Partial<GObject>): Promise<GObject | null> {
  const { data } = await supabase.from('objects').update(updates).eq('object_id', objId).select().single()
  return data as GObject | null
}

export async function deleteObject(objId: string): Promise<boolean> {
  const { error } = await supabase.from('objects').delete().eq('object_id', objId)
  return !error
}

// ============ CONSTRUCTIONS ============

export async function fetchConstructions(objectId?: string): Promise<Construction[]> {
  let q = supabase.from('constructions').select('*').order('construction_name')
  if (objectId) q = q.eq('object_id', objectId)
  const { data } = await q
  return (data || []) as Construction[]
}

export async function createConstruction(c: Partial<Construction>): Promise<Construction | null> {
  const { data } = await supabase.from('constructions').insert(c).select().single()
  return data as Construction | null
}

export async function updateConstruction(cId: string, updates: Partial<Construction>): Promise<Construction | null> {
  const { data } = await supabase.from('constructions').update(updates).eq('construction_id', cId).select().single()
  return data as Construction | null
}

export async function deleteConstruction(cId: string): Promise<boolean> {
  const { error } = await supabase.from('constructions').delete().eq('construction_id', cId)
  return !error
}

// ============ WORK TYPES ============

export async function fetchWorkTypes(constructionId?: string): Promise<WorkType[]> {
  let q = supabase.from('work_types').select('*').order('work_name')
  if (constructionId) q = q.eq('construction_id', constructionId)
  const { data } = await q
  return (data || []) as WorkType[]
}

export async function createWorkType(wt: Partial<WorkType>): Promise<WorkType | null> {
  const { data } = await supabase.from('work_types').insert(wt).select().single()
  return data as WorkType | null
}

export async function updateWorkType(wtId: string, updates: Partial<WorkType>): Promise<WorkType | null> {
  const { data } = await supabase.from('work_types').update(updates).eq('work_type_id', wtId).select().single()
  return data as WorkType | null
}

export async function deleteWorkType(wtId: string): Promise<boolean> {
  const { error } = await supabase.from('work_types').delete().eq('work_type_id', wtId)
  return !error
}

// ============ REQUESTS ============

export async function fetchRequests(filters?: {
  serviceId?: string
  status?: RequestStatus
  dateWork?: string
  shiftNo?: number
  createdBy?: string
}): Promise<Request[]> {
  let q = supabase.from('requests').select('*').order('created_at', { ascending: false })
  if (filters?.serviceId) q = q.eq('service_id', filters.serviceId)
  if (filters?.status) q = q.eq('status', filters.status)
  if (filters?.dateWork) q = q.eq('date_work', filters.dateWork)
  if (filters?.shiftNo) q = q.eq('shift_no', filters.shiftNo)
  if (filters?.createdBy) q = q.eq('created_by', filters.createdBy)
  const { data } = await q
  return (data || []) as Request[]
}

export async function fetchRequestById(requestId: string): Promise<Request | null> {
  const { data } = await supabase.from('requests').select('*').eq('request_id', requestId).single()
  return data as Request | null
}

export async function createRequest(req: Partial<Request>, userId: string): Promise<Request | null> {
  const id = `RQ-${Date.now()}`
  const payload = { ...req, request_id: id, created_by: userId, created_at: new Date().toISOString() }
  const { data, error } = await supabase.from('requests').insert(payload).select().single()
  if (error) throw new Error(error.message)
  if (data) {
    await logAction(userId, 'CREATE_REQUEST', 'request', id, { status: req.status, service_id: req.service_id })
  }
  return data as Request | null
}

export async function updateRequest(requestId: string, updates: Partial<Request>, userId: string): Promise<Request | null> {
  const { data, error } = await supabase.from('requests').update({ ...updates, updated_at: new Date().toISOString() })
    .eq('request_id', requestId).select().single()
  if (error) throw new Error(error.message)
  if (data) {
    await logAction(userId, 'UPDATE_REQUEST', 'request', requestId, updates as Record<string, unknown>)
  }
  return data as Request | null
}

export async function updateRequestStatus(requestId: string, status: RequestStatus, userId: string): Promise<boolean> {
  const updates: Partial<Request> = { status }
  if (status === 'IN_PROGRESS' ) updates.fact_start = new Date().toISOString()
  if (status === 'DONE') updates.fact_finish = new Date().toISOString()
  const result = await updateRequest(requestId, updates, userId)
  return !!result
}

export async function approveRequest(requestId: string, role: 'head' | 'zamporab' | 'boss', userId: string): Promise<boolean> {
  let updates: Partial<Request>
  if (role === 'head') {
    updates = { approved_by_head: userId }
  } else if (role === 'zamporab') {
    // Boolean column + status moves to PLANNED so dispatcher sees it
    updates = { approved_by_zamporab: true, status: 'PLANNED' }
  } else {
    // boss — boolean column
    updates = { approved_by_boss: true }
  }
  const result = await updateRequest(requestId, updates, userId)
  if (result) {
    await logAction(userId, `APPROVE_${role.toUpperCase()}`, 'request', requestId, null)
  }
  return !!result
}

export async function deleteRequest(requestId: string, userId: string): Promise<boolean> {
  const { error } = await supabase.from('requests').delete().eq('request_id', requestId)
  if (!error) await logAction(userId, 'DELETE_REQUEST', 'request', requestId, null)
  return !error
}

// ============ REQUEST ASSIGNMENTS ============

export async function fetchAssignments(requestId: string): Promise<RequestAssignment[]> {
  const { data } = await supabase.from('request_assignments').select('*').eq('request_id', requestId)
  return (data || []) as RequestAssignment[]
}

export async function assignUsers(requestId: string, userIds: string[], assignedBy: string): Promise<boolean> {
  // Remove existing
  await supabase.from('request_assignments').delete().eq('request_id', requestId)
  if (userIds.length === 0) return true
  const rows = userIds.map(uid => ({
    request_id: requestId, user_id: uid, assigned_by: assignedBy, created_at: new Date().toISOString()
  }))
  const { error } = await supabase.from('request_assignments').insert(rows)
  if (!error) {
    await logAction(assignedBy, 'ASSIGN_USERS', 'request', requestId, { user_ids: userIds })
  }
  return !error
}

// ============ STAFF REQUESTS ============

export async function fetchStaffRequests(filters?: { fromServiceId?: string; toServiceId?: string; status?: StaffRequestStatus }): Promise<StaffRequest[]> {
  let q = supabase.from('staff_requests').select('*').order('created_at', { ascending: false })
  if (filters?.fromServiceId) q = q.eq('from_service_id', filters.fromServiceId)
  if (filters?.toServiceId) q = q.eq('to_service_id', filters.toServiceId)
  if (filters?.status) q = q.eq('status', filters.status)
  const { data } = await q
  return (data || []) as StaffRequest[]
}

export async function createStaffRequest(sr: Partial<StaffRequest>, userId: string): Promise<StaffRequest | null> {
  const { data } = await supabase.from('staff_requests')
    .insert({ ...sr, created_by: userId, created_at: new Date().toISOString() }).select().single()
  if (data) await logAction(userId, 'CREATE_STAFF_REQUEST', 'staff_request', data.id, sr as Record<string, unknown>)
  return data as StaffRequest | null
}

export async function updateStaffRequestStatus(id: string, status: StaffRequestStatus, approvedBy: string): Promise<boolean> {
  const { error } = await supabase.from('staff_requests').update({ status, approved_by: approvedBy }).eq('id', id)
  if (!error) await logAction(approvedBy, `STAFF_REQUEST_${status}`, 'staff_request', id, null)
  return !error
}

// ============ REMARKS ============

export async function fetchRemarks(requestId: string): Promise<Remark[]> {
  const { data } = await supabase.from('remarks').select('*').eq('request_id', requestId).order('created_at')
  return (data || []) as Remark[]
}

export async function createRemark(remark: Partial<Remark>): Promise<Remark | null> {
  const { data } = await supabase.from('remarks').insert({ ...remark, created_at: new Date().toISOString() }).select().single()
  return data as Remark | null
}

// ============ CHANGELOG ============

export async function fetchChangelog(limit = 50, entityType?: string, entityId?: string): Promise<ChangelogEntry[]> {
  let q = supabase.from('changelog').select('*').order('created_at', { ascending: false }).limit(limit)
  if (entityType) q = q.eq('entity_type', entityType)
  if (entityId) q = q.eq('entity_id', entityId)
  const { data } = await q
  return (data || []) as ChangelogEntry[]
}

// ============ PEOPLE STATS ============

export async function fetchPeopleStats(): Promise<{
  totalDeployed: number
  byService: Record<string, number>
  activeAssignments: Array<{ user_id: string; full_name: string; service_id: string | null; request_id: string; object_name?: string }>
}> {
  // Get all IN_PROGRESS requests with their assignments
  const { data: reqs } = await supabase
    .from('requests')
    .select('request_id, object_id, service_id')
    .eq('status', 'IN_PROGRESS')

  const requestIds = (reqs || []).map((r: { request_id: string }) => r.request_id)

  if (requestIds.length === 0) return { totalDeployed: 0, byService: {}, activeAssignments: [] }

  const { data: assignments } = await supabase
    .from('request_assignments')
    .select('user_id, request_id')
    .in('request_id', requestIds)

  const userIds = Array.from(new Set((assignments || []).map((a: { user_id: string }) => a.user_id)))

  if (userIds.length === 0) return { totalDeployed: 0, byService: {}, activeAssignments: [] }

  const { data: users } = await supabase
    .from('users')
    .select('user_id, full_name, service_id')
    .in('user_id', userIds)

  const { data: objects } = await supabase
    .from('objects')
    .select('object_id, object_name')

  const byService: Record<string, number> = {}
  const activeAssignments: Array<{ user_id: string; full_name: string; service_id: string | null; request_id: string; object_name?: string }> = []

  for (const a of (assignments || [])) {
    const user = (users || []).find((u: { user_id: string }) => u.user_id === a.user_id)
    const req = (reqs || []).find((r: { request_id: string }) => r.request_id === a.request_id)
    const obj = (objects || []).find((o: { object_id: string }) => o.object_id === req?.object_id)
    if (user) {
      const svcId = user.service_id || 'unknown'
      byService[svcId] = (byService[svcId] || 0) + 1
      activeAssignments.push({
        user_id: user.user_id,
        full_name: user.full_name,
        service_id: user.service_id,
        request_id: a.request_id,
        object_name: obj?.object_name,
      })
    }
  }

  return { totalDeployed: userIds.length, byService, activeAssignments }
}

// ============ STATS (for Boss dashboard) ============

export async function fetchRequestStats(): Promise<{
  total: number
  byStatus: Record<string, number>
  byService: Record<string, number>
  byPriority: Record<string, number>
}> {
  const { data } = await supabase.from('requests').select('status, service_id, priority')
  const rows = (data || []) as Pick<Request, 'status' | 'service_id' | 'priority'>[]
  const byStatus: Record<string, number> = {}
  const byService: Record<string, number> = {}
  const byPriority: Record<string, number> = {}
  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1
    if (r.service_id) byService[r.service_id] = (byService[r.service_id] || 0) + 1
    byPriority[r.priority] = (byPriority[r.priority] || 0) + 1
  }
  return { total: rows.length, byStatus, byService, byPriority }
}

// ============ HR MODULE ============

// Fetch all active employees with their current status for today.
// Presence-by-default: employees with no status row for today get currentStatus 'Na_rabote'.
// CRITICAL: always filter is_active=true so dismissed employees do not appear.
export async function fetchAllCurrentStatuses(): Promise<EnrichedEmployee[]> {
  const today = new Date().toISOString().split('T')[0] // 'YYYY-MM-DD'

  const [usersResult, statusesResult] = await Promise.all([
    supabase.from('users').select('*').eq('is_active', true).order('full_name'),
    supabase
      .from('employee_status')
      .select('*')
      .lte('date_from', today)
      .or(`date_to.is.null,date_to.gte.${today}`)
      .order('date_from', { ascending: false }),
  ])

  const users = (usersResult.data || []) as User[]
  const statuses = (statusesResult.data || []) as EmployeeStatus[]

  // Build map: user_id -> most recent status row (already ordered date_from DESC)
  const latestByUser = new Map<string, EmployeeStatus>()
  for (const s of statuses) {
    if (!latestByUser.has(s.user_id)) {
      latestByUser.set(s.user_id, s)
    }
  }

  return users.map(user => {
    const statusRecord = latestByUser.get(user.user_id) || null
    return {
      user,
      currentStatus: statusRecord ? (statusRecord.status as EmployeeStatusType) : 'Na_rabote',
      statusRecord,
    }
  })
}

// Fetch full status history for one employee, newest first.
export async function fetchEmployeeStatusHistory(userId: string): Promise<EmployeeStatus[]> {
  const { data } = await supabase
    .from('employee_status')
    .select('*')
    .eq('user_id', userId)
    .order('date_from', { ascending: false })
  return (data || []) as EmployeeStatus[]
}

// Set employee status — ALWAYS INSERT, never UPDATE (append-only log).
// For single-day status (e.g. one-day Otgul): pass dateTo = dateFrom.
// For open-ended status: pass dateTo = null.
export async function setEmployeeStatus(
  userId: string,
  status: EmployeeStatusType,
  dateFrom: string,
  dateTo: string | null,
  reason: string | null,
  createdBy: string
): Promise<EmployeeStatus | null> {
  const { data, error } = await supabase
    .from('employee_status')
    .insert({ user_id: userId, status, date_from: dateFrom, date_to: dateTo, reason, created_by: createdBy })
    .select()
    .single()
  if (error) {
    console.error('setEmployeeStatus Supabase error:', error)
    return null
  }
  if (data) {
    await logAction(createdBy, 'SET_EMPLOYEE_STATUS', 'employee_status', data.id, { userId, status, dateFrom })
  }
  return data as EmployeeStatus | null
}

// Fetch all status rows overlapping a date range (for Phase 05 period reports).
// serviceId filter is a no-op in Phase 02 — Phase 05 adds the join when needed.
export async function fetchStatusesForPeriod(
  dateFrom: string,
  dateTo: string,
  _serviceId?: string
): Promise<EmployeeStatus[]> {
  const { data } = await supabase
    .from('employee_status')
    .select('*')
    .lte('date_from', dateTo)
    .or(`date_to.is.null,date_to.gte.${dateFrom}`)
    .order('date_from')
  return (data || []) as EmployeeStatus[]
}

// Hire employee: set date_hired and ensure is_active=true.
export async function hireEmployee(
  userId: string,
  dateHired: string,
  performedBy: string
): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .update({ date_hired: dateHired, is_active: true })
    .eq('user_id', userId)
  if (!error) {
    await logAction(performedBy, 'HIRE_EMPLOYEE', 'user', userId, { date_hired: dateHired })
  }
  return !error
}

// Dismiss employee: set date_fired, soft-delete (is_active=false), insert Uvolen status row.
// The Uvolen status INSERT is best-effort — fireEmployee returns true based on the users update only.
export async function fireEmployee(
  userId: string,
  dateFired: string,
  performedBy: string
): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .update({ date_fired: dateFired, is_active: false })
    .eq('user_id', userId)
  if (!error) {
    await logAction(performedBy, 'FIRE_EMPLOYEE', 'user', userId, { date_fired: dateFired })
    // Best-effort: insert Uvolen status row into event log
    await setEmployeeStatus(userId, 'Uvolen', dateFired, null, 'Увольнение', performedBy)
  }
  return !error
}

// ============ WORK PLANS ============

export async function fetchWorkPlans(filters?: {
  serviceId?: string
  planDate?: string
  shiftType?: string
  status?: WorkPlanStatus
}): Promise<WorkPlan[]> {
  let q = supabase.from('work_plans').select('*').order('plan_date', { ascending: false })
  if (filters?.serviceId) q = q.eq('service_id', filters.serviceId)
  if (filters?.planDate)  q = q.eq('plan_date', filters.planDate)
  if (filters?.shiftType) q = q.eq('shift_type', filters.shiftType)
  if (filters?.status)    q = q.eq('status', filters.status)
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
  return {
    ...(planRes.data as WorkPlan),
    items: (itemsRes.data || []) as WorkPlanItem[],
  }
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
    .from('work_plans').delete().eq('id', planId).eq('status', 'DRAFT')  // guard: only DRAFT
  if (!error) await logAction(userId, 'DELETE_WORK_PLAN', 'work_plan', planId, null)
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
  }))
}

// ============ VEHICLES ============

export async function fetchVehicles(activeOnly = true): Promise<Vehicle[]> {
  let q = supabase.from('vehicles').select('*').order('name')
  if (activeOnly) q = q.eq('is_active', true)
  const { data } = await q
  return (data || []) as Vehicle[]
}

export async function createVehicle(vehicle: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>): Promise<Vehicle | null> {
  const { data, error } = await supabase.from('vehicles').insert(vehicle).select().single()
  if (error) throw new Error(error.message)
  return data as Vehicle | null
}

export async function updateVehicle(
  vehicleId: string,
  updates: Partial<Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>>
): Promise<Vehicle | null> {
  const { data, error } = await supabase
    .from('vehicles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', vehicleId).select().single()
  if (error) throw new Error(error.message)
  return data as Vehicle | null
}

export async function updateVehicleStatus(
  vehicleId: string,
  status: VehicleStatus,
  breakdownDetails: string | null,
  maintenanceUntil: string | null
): Promise<boolean> {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('vehicles')
    .update({
      status,
      breakdown_details: breakdownDetails,
      maintenance_until: status === 'MAINTENANCE' ? maintenanceUntil : null,
      status_changed_at: now,
      updated_at: now,
    })
    .eq('id', vehicleId)
  return !error
}

// Soft delete
export async function deleteVehicle(vehicleId: string): Promise<boolean> {
  const { error } = await supabase
    .from('vehicles').update({ is_active: false }).eq('id', vehicleId)
  return !error
}

// ============ VEHICLE ASSIGNMENTS ============

// All vehicle assignments for a specific plan item
export async function fetchVehicleAssignments(planItemId: string): Promise<VehicleAssignment[]> {
  const { data } = await supabase
    .from('vehicle_assignments').select('*').eq('plan_item_id', planItemId)
  return (data || []) as VehicleAssignment[]
}

// All vehicles + their assignments for a given date (mechanic combo view)
export async function fetchVehiclesWithDayAssignments(date: string): Promise<VehicleWithAssignments[]> {
  // Get all plan item ids for approved plans on this date
  const { data: plans } = await supabase
    .from('work_plans').select('id').eq('plan_date', date).eq('status', 'APPROVED')
  const planIds = (plans || []).map((p: { id: string }) => p.id)

  const [vehiclesRes, itemsRes] = await Promise.all([
    supabase.from('vehicles').select('*').eq('is_active', true).order('name'),
    planIds.length > 0
      ? supabase.from('work_plan_items').select('*').in('plan_id', planIds).order('time_start')
      : Promise.resolve({ data: [] }),
  ])

  const vehicles = (vehiclesRes.data || []) as Vehicle[]
  const items = (itemsRes.data || []) as WorkPlanItem[]
  const itemIds = items.map(i => i.id)

  const { data: assignmentsData } = itemIds.length > 0
    ? await supabase.from('vehicle_assignments').select('*').in('plan_item_id', itemIds)
    : { data: [] }
  const assignments = (assignmentsData || []) as VehicleAssignment[]

  return vehicles.map(vehicle => ({
    ...vehicle,
    assignments: assignments
      .filter(a => a.vehicle_id === vehicle.id)
      .map(a => ({
        ...a,
        plan_item: items.find(i => i.id === a.plan_item_id) as WorkPlanItem,
      })),
  }))
}

export async function assignVehicle(
  vehicleId: string,
  planItemId: string,
  assignedBy: string,
  notes?: string
): Promise<VehicleAssignment | null> {
  const { data, error } = await supabase
    .from('vehicle_assignments')
    .insert({ vehicle_id: vehicleId, plan_item_id: planItemId, assigned_by: assignedBy, notes: notes ?? null })
    .select().single()
  if (error) throw new Error(error.message)
  return data as VehicleAssignment | null
}

export async function unassignVehicle(vehicleId: string, planItemId: string): Promise<boolean> {
  const { error } = await supabase
    .from('vehicle_assignments')
    .delete()
    .eq('vehicle_id', vehicleId)
    .eq('plan_item_id', planItemId)
  return !error
}

// ============ HR — PHASE 04 ============

// Fetch all professions (for hire/transfer form dropdowns)
export async function fetchProfessions(): Promise<Profession[]> {
  const { data } = await supabase.from('professions').select('*').eq('is_active', true).order('name')
  return (data || []) as Profession[]
}

// Fetch all schedules (for hire form dropdown)
export async function fetchSchedules(): Promise<Schedule[]> {
  const { data } = await supabase.from('schedules').select('*').order('name')
  return (data || []) as Schedule[]
}

// Fetch current position for one employee (ended_at IS NULL)
export async function fetchCurrentPosition(userId: string): Promise<EmployeePositionWithProfession | null> {
  const { data } = await supabase
    .from('employee_positions')
    .select('*, profession:professions(*)')
    .eq('user_id', userId)
    .is('ended_at', null)
    .single()
  return data as EmployeePositionWithProfession | null
}

// Fetch full position history (all rows, newest first)
export async function fetchPositionHistory(userId: string): Promise<EmployeePositionWithProfession[]> {
  const { data } = await supabase
    .from('employee_positions')
    .select('*, profession:professions(*)')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
  return (data || []) as EmployeePositionWithProfession[]
}

// Fetch full employee detail for detail card
export async function fetchEmployeeDetail(userId: string): Promise<EmployeeDetail | null> {
  const today = new Date().toISOString().split('T')[0]

  const [userRes, currentStatusRes, positionRes, historyRes, assignmentRes, requestsRes] = await Promise.all([
    supabase.from('users').select('*').eq('user_id', userId).single(),
    supabase
      .from('employee_status')
      .select('*')
      .eq('user_id', userId)
      .lte('date_from', today)
      .or(`date_to.is.null,date_to.gte.${today}`)
      .order('date_from', { ascending: false })
      .limit(1),
    supabase
      .from('employee_positions')
      .select('*, profession:professions(*)')
      .eq('user_id', userId)
      .is('ended_at', null)
      .maybeSingle(),
    supabase
      .from('employee_positions')
      .select('*, profession:professions(*)')
      .eq('user_id', userId)
      .order('started_at', { ascending: false }),
    supabase
      .from('employee_assignments')
      .select('*, schedule:schedules(*)')
      .eq('user_id', userId)
      .is('ended_at', null)
      .maybeSingle(),
    supabase
      .from('request_assignments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  if (!userRes.data) return null

  const statusRow = (currentStatusRes.data || [])[0] || null
  const currentStatus: EmployeeStatusType = statusRow ? statusRow.status : 'Na_rabote'

  return {
    user: userRes.data as User,
    currentStatus,
    currentPosition: positionRes.data as EmployeePositionWithProfession | null,
    positionHistory: (historyRes.data || []) as EmployeePositionWithProfession[],
    currentAssignment: assignmentRes.data as EmployeeAssignmentWithSchedule | null,
    recentRequests: (requestsRes.data || []) as RequestAssignment[],
  }
}

// Create new employee — sets users record, employee_positions row, employee_assignments row.
// Wraps hireEmployee() which already handles date_hired + logAction.
export async function createEmployee(data: {
  last_name: string
  first_name: string
  middle_name: string
  full_name: string
  tab_number: string
  profession_id: string
  category: 'ИТР' | 'рабочий'
  schedule_id: string
  shift_num: number | null
  phone: string | null
  date_hired: string
  probation_start: string | null
  probation_end: string | null
  service_id: string | null
}, createdBy: string): Promise<User | null> {
  // 1. Create users row
  const { data: newUser, error: userError } = await supabase
    .from('users')
    .insert({
      user_id: crypto.randomUUID(),
      tab_number: data.tab_number,
      full_name: data.full_name,
      last_name: data.last_name,
      first_name: data.first_name,
      middle_name: data.middle_name,
      phone: data.phone,
      category: data.category,
      date_hired: data.date_hired,
      probation_start: data.probation_start,
      probation_end: data.probation_end,
      service_id: data.service_id,
      role_level: 'WORKER',
      is_active: true,
    })
    .select()
    .single()
  if (userError || !newUser) return null

  const userId = (newUser as User).user_id

  // 2. Create employee_positions row
  await supabase.from('employee_positions').insert({
    user_id: userId,
    profession_id: data.profession_id,
    started_at: data.date_hired,
    change_reason: 'прием',
    created_by: createdBy,
  })

  // 3. Create employee_assignments row
  await supabase.from('employee_assignments').insert({
    user_id: userId,
    schedule_id: data.schedule_id,
    shift_num: data.shift_num,
    started_at: data.date_hired,
    created_by: createdBy,
  })

  await logAction(createdBy, 'CREATE_EMPLOYEE', 'user', userId, {
    full_name: data.full_name,
    date_hired: data.date_hired,
  })
  return newUser as User
}

// Transfer employee to new position (SCD Type 2: close old row, open new row).
export async function transferEmployee(
  userId: string,
  newProfessionId: string,
  reason: string,
  date: string,
  performedBy: string
): Promise<boolean> {
  const { error: closeErr } = await supabase
    .from('employee_positions')
    .update({ ended_at: date })
    .eq('user_id', userId)
    .is('ended_at', null)
  if (closeErr) return false

  const { error: openErr } = await supabase
    .from('employee_positions')
    .insert({
      user_id: userId,
      profession_id: newProfessionId,
      started_at: date,
      ended_at: null,
      change_reason: reason,
      created_by: performedBy,
    })
  if (openErr) return false

  await logAction(performedBy, 'TRANSFER_EMPLOYEE', 'user', userId, {
    newProfessionId,
    reason,
    date,
  })
  return true
}
