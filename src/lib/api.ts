import { supabase } from './supabase'
import { logAction } from './logger'
import type {
  User, Service, Category, GObject, Construction, WorkType,
  Request, RequestAssignment, StaffRequest, Remark, ChangelogEntry,
  RequestStatus, Priority, Urgency, StaffRequestStatus,
  EmployeeStatusType, EmployeeStatus, EnrichedEmployee, StatusMetadata,
  WorkPlan, WorkPlanItem, WorkPlanWithItems, WorkPlanItemWithVehicles,
  Vehicle, VehicleAssignment, VehicleWithAssignments,
  VehicleBreakdown, VehicleBreakdownWithVehicle, VehicleBreakdownSeverity, VehicleBreakdownStatus,
  WorkPlanStatus, VehicleStatus,
  Profession, Schedule, ShiftPhase,
  EmployeePositionWithProfession, EmployeeAssignmentWithSchedule, EmployeeDetail,
  EmployeeAssignmentWithScheduleCode, UserWithAssignment, WorkAssignment, WorkAssignmentWithUser,
  CrossServiceRequest,
  WorkRedirect, WorkSource, OriginalPlanFate, ShiftType,
  Directive, DirectivePriority, DirectiveStatus,
  DirectiveWorkerAssignment, ServiceOrderType,
  CertType, EmployeeCert, CertRequirement,
  AuthSession, RoleLevel, AlertLevel, SystemAlert, HomeCounters,
} from '@/types'
import { certStatusFromDates } from '@/types'

export { logAction }

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

export async function updateUser(userId: string, updates: Partial<User>): Promise<{ data: User | null; errorMsg: string | null }> {
  const { data, error } = await supabase.from('users').update(updates).eq('user_id', userId).select().single()
  if (error) console.error('updateUser error:', error.code, error.message, error.details, error.hint)
  return { data: data as User | null, errorMsg: error ? `${error.code}: ${error.message}` : null }
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
// Before inserting, closes any open-ended records (date_to=null) for this user
// by setting their date_to to dateFrom - 1 day. This ensures that when an employee
// returns to work (or changes status), stale open records don't appear in reports.
// For single-day status (e.g. one-day Otgul): pass dateTo = dateFrom.
// For open-ended status: pass dateTo = null.
export async function setEmployeeStatus(
  userId: string,
  status: EmployeeStatusType,
  dateFrom: string,
  dateTo: string | null,
  reason: string | null,
  createdBy: string,
  dates?: {
    planned_departure?: string | null
    planned_return?: string | null
    actual_departure?: string | null
    actual_return?: string | null
  },
  metadata?: StatusMetadata | null
): Promise<EmployeeStatus | null> {
  // Close any open-ended records for this user that started before the new status
  const prevDayDate = new Date(dateFrom + 'T00:00:00')
  prevDayDate.setDate(prevDayDate.getDate() - 1)
  const closingDate = prevDayDate.toISOString().split('T')[0]
  await supabase
    .from('employee_status')
    .update({ date_to: closingDate })
    .eq('user_id', userId)
    .is('date_to', null)
    .lt('date_from', dateFrom)

  const row: Record<string, unknown> = {
    user_id: userId, status, date_from: dateFrom, date_to: dateTo,
    reason, created_by: createdBy,
  }
  if (dates) {
    if (dates.planned_departure !== undefined) row.planned_departure = dates.planned_departure || null
    if (dates.planned_return    !== undefined) row.planned_return    = dates.planned_return    || null
    if (dates.actual_departure  !== undefined) row.actual_departure  = dates.actual_departure  || null
    if (dates.actual_return     !== undefined) row.actual_return     = dates.actual_return     || null
  }
  if (metadata !== undefined) row.metadata = metadata ?? null
  const { data, error } = await supabase
    .from('employee_status')
    .insert(row)
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

// StatusWithUser: EmployeeStatus enriched with user fields for period reports
export interface StatusWithUser extends EmployeeStatus {
  user_full_name: string
  user_position: string | null
  user_service_id: string | null
}

export async function fetchStatusesForPeriodWithUsers(
  dateFrom: string,
  dateTo: string,
  serviceId?: string
): Promise<StatusWithUser[]> {
  // Two separate queries, merged client-side — avoids relying on PostgREST FK introspection
  const [{ data: statusData }, { data: userData }] = await Promise.all([
    supabase
      .from('employee_status')
      .select('*')
      .lte('date_from', dateTo)
      .or(`date_to.is.null,date_to.gte.${dateFrom}`)
      .order('date_from'),
    supabase
      .from('users')
      .select('user_id, full_name, position, service_id'),
  ])

  if (!statusData) return []

  const userMap = new Map<string, { full_name: string; position: string | null; service_id: string | null }>(
    (userData ?? []).map(u => [u.user_id, { full_name: u.full_name, position: u.position, service_id: u.service_id }])
  )

  return (statusData as EmployeeStatus[])
    .map(row => {
      const u = userMap.get(row.user_id)
      return {
        ...row,
        user_full_name: u?.full_name ?? '',
        user_position: u?.position ?? null,
        user_service_id: u?.service_id ?? null,
      }
    })
    .filter(row => !serviceId || row.user_service_id === serviceId)
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

export async function fetchVehicleByDriver(userId: string, date: string): Promise<VehicleWithAssignments | null> {
  const { data: vehicleData } = await supabase
    .from('vehicles')
    .select('*')
    .eq('assigned_driver_id', userId)
    .eq('is_active', true)
    .limit(1)
    .single()
  if (!vehicleData) return null
  const vehicle = vehicleData as Vehicle

  // Load today's plan items and assignments for this vehicle
  const { data: plans } = await supabase
    .from('work_plans').select('id').eq('plan_date', date)
  const planIds = (plans || []).map((p: { id: string }) => p.id)

  let assignments: Array<VehicleAssignment & { plan_item: WorkPlanItem }> = []
  if (planIds.length > 0) {
    const { data: itemsData } = await supabase
      .from('work_plan_items').select('*').in('plan_id', planIds)
    const items = (itemsData || []) as WorkPlanItem[]
    const itemIds = items.map(i => i.id)
    if (itemIds.length > 0) {
      const { data: assignmentsData } = await supabase
        .from('vehicle_assignments').select('*')
        .eq('vehicle_id', vehicle.id).in('plan_item_id', itemIds)
      assignments = ((assignmentsData || []) as VehicleAssignment[]).map(a => ({
        ...a,
        plan_item: items.find(i => i.id === a.plan_item_id) as WorkPlanItem,
      }))
    }
  }

  return { ...vehicle, assignments }
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

export async function updateVehicleAssignmentDriver(
  assignmentId: string,
  driverUserId: string | null
): Promise<boolean> {
  const { error } = await supabase
    .from('vehicle_assignments')
    .update({ driver_user_id: driverUserId })
    .eq('id', assignmentId)
  return !error
}

export async function fetchVehicleAssignmentsForItems(itemIds: string[]): Promise<VehicleAssignment[]> {
  if (itemIds.length === 0) return []
  const { data } = await supabase
    .from('vehicle_assignments')
    .select('*')
    .in('plan_item_id', itemIds)
  return (data || []) as VehicleAssignment[]
}

export async function unassignVehicle(vehicleId: string, planItemId: string): Promise<boolean> {
  const { error } = await supabase
    .from('vehicle_assignments')
    .delete()
    .eq('vehicle_id', vehicleId)
    .eq('plan_item_id', planItemId)
  return !error
}

// ============ VEHICLE BREAKDOWNS ============

export async function fetchVehicleBreakdowns(vehicleId?: string): Promise<VehicleBreakdownWithVehicle[]> {
  let q = supabase
    .from('vehicle_breakdowns')
    .select('*, vehicle:vehicles(id, name, plate, vehicle_type)')
    .order('reported_at', { ascending: false })
  if (vehicleId) q = q.eq('vehicle_id', vehicleId)
  const { data } = await q
  return (data || []) as VehicleBreakdownWithVehicle[]
}

export async function fetchOpenBreakdowns(): Promise<VehicleBreakdownWithVehicle[]> {
  const { data } = await supabase
    .from('vehicle_breakdowns')
    .select('*, vehicle:vehicles(id, name, plate, vehicle_type)')
    .in('status', ['OPEN', 'IN_REPAIR'])
    .order('reported_at', { ascending: false })
  return (data || []) as VehicleBreakdownWithVehicle[]
}

export async function createBreakdown(breakdown: {
  vehicle_id: string
  reported_by: string
  description: string
  severity: VehicleBreakdownSeverity
  mechanic_notes?: string | null
}): Promise<VehicleBreakdown | null> {
  const { data, error } = await supabase
    .from('vehicle_breakdowns')
    .insert({ ...breakdown, status: 'OPEN' })
    .select().single()
  if (error) throw new Error(error.message)
  return data as VehicleBreakdown | null
}

export async function updateBreakdownStatus(
  breakdownId: string,
  status: VehicleBreakdownStatus,
  resolutionNotes?: string | null,
  mechanicNotes?: string | null
): Promise<boolean> {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('vehicle_breakdowns')
    .update({
      status,
      resolved_at: status === 'RESOLVED' ? now : null,
      resolution_notes: resolutionNotes ?? null,
      mechanic_notes: mechanicNotes ?? null,
      updated_at: now,
    })
    .eq('id', breakdownId)
  return !error
}

// Fetch drivers — users whose position text matches driver keywords.
// Uses users.position (free text loaded from XLS) so no structured
// employee_positions data is required.
// Returns UserWithAssignment[] so DriverList can run isWorkerOnDuty() per driver.
export async function fetchDriverUsers(): Promise<UserWithAssignment[]> {
  // Keywords that identify driver professions in position text
  const DRIVER_KEYWORDS = ['водитель', 'тракторист', 'машинист']

  // Fetch all active users then filter client-side (Supabase doesn't support OR ILIKE)
  const [usersRes, assignRes] = await Promise.all([
    supabase.from('users').select('*').eq('is_active', true),
    supabase
      .from('employee_assignments')
      .select('*, schedules(code, name)')
      .is('ended_at', null),
  ])

  const allUsers = (usersRes.data || []) as User[]
  const rawAssigns = (assignRes.data || []) as Array<
    EmployeeAssignmentWithScheduleCode & { schedules?: { code: string; name: string } }
  >

  // Filter users whose position text contains a driver keyword
  const driverUsers = allUsers.filter(u => {
    const pos = (u.position ?? '').toLowerCase()
    return DRIVER_KEYWORDS.some(kw => pos.includes(kw))
  })

  const assignMap = new Map<string, EmployeeAssignmentWithScheduleCode>()
  rawAssigns.forEach(a => {
    assignMap.set(a.user_id, {
      ...a,
      schedule_code: a.schedules?.code,
      schedule_name: a.schedules?.name,
    })
  })

  return driverUsers
    .map(u => ({ ...u, assignment: assignMap.get(u.user_id) ?? null }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'ru'))
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

// ============ SHIFT ROSTER ============

/**
 * Fetch all active users with their current schedule assignment and active shift phase.
 * Joins: employee_assignments + schedules + shift_phases (active record for today).
 * Returns UserWithAssignment[]: each user with assignment=null if not assigned.
 * assignment.active_phase is populated for cyclic schedule employees (Variant 2).
 */
export async function fetchUsersWithAssignments(): Promise<UserWithAssignment[]> {
  const today = new Date().toISOString().split('T')[0]
  const [usersRes, assignRes, phasesRes] = await Promise.all([
    supabase.from('users').select('*').eq('is_active', true).order('full_name'),
    supabase
      .from('employee_assignments')
      .select('*, schedules(code, name)')
      .is('ended_at', null),
    supabase
      .from('shift_phases')
      .select('id, employee_id, phase, anchor_date, valid_from, valid_to, schedule_code')
      .lte('valid_from', today)
      .or(`valid_to.is.null,valid_to.gte.${today}`)
      .order('valid_from', { ascending: false }),
  ])

  const users = (usersRes.data || []) as User[]
  const rawAssigns = (assignRes.data || []) as Array<EmployeeAssignmentWithScheduleCode & { schedules?: { code: string; name: string } }>

  // Build phase map: employee_id → most recent active phase record
  const phaseMap = new Map<string, Pick<ShiftPhase, 'id' | 'phase' | 'anchor_date' | 'valid_from' | 'schedule_code' | 'is_alternating'>>()
  const rawPhases = (phasesRes.data || []) as Array<Pick<ShiftPhase, 'id' | 'employee_id' | 'phase' | 'anchor_date' | 'valid_from' | 'valid_to' | 'schedule_code' | 'is_alternating'>>
  for (const p of rawPhases) {
    if (!phaseMap.has(p.employee_id)) {
      phaseMap.set(p.employee_id, { id: p.id, phase: p.phase, anchor_date: p.anchor_date, valid_from: p.valid_from, schedule_code: p.schedule_code, is_alternating: p.is_alternating ?? false })
    }
  }

  const assignMap = new Map<string, EmployeeAssignmentWithScheduleCode>()
  rawAssigns.forEach(a => {
    assignMap.set(a.user_id, {
      ...a,
      schedule_code: a.schedules?.code,
      schedule_name: a.schedules?.name,
      active_phase: phaseMap.get(a.user_id) ?? null,
    })
  })

  return users.map(u => ({
    ...u,
    assignment: assignMap.get(u.user_id) ?? null,
  }))
}

/**
 * Upsert an employee's shift assignment (shift_num + schedule).
 * Ends any existing active assignment and creates a new one.
 */
export async function upsertEmployeeAssignment(
  userId: string,
  data: {
    schedule_id: string
    shift_num: 1 | 2 | 3 | 4 | null
    rotation_group: string | null
    shift_reference_date: string | null
    is_driver: boolean
    custom_work_days?: number | null
    custom_rest_days?: number | null
    driver_group_number?: number | null
  },
  performedBy: string
): Promise<boolean> {
  // End current active assignment
  await supabase
    .from('employee_assignments')
    .update({ ended_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('ended_at', null)

  const { error } = await supabase
    .from('employee_assignments')
    .insert({
      user_id: userId,
      schedule_id: data.schedule_id,
      shift_num: data.shift_num,
      rotation_group: data.rotation_group,
      shift_reference_date: data.shift_reference_date,
      is_driver: data.is_driver,
      custom_work_days: data.custom_work_days ?? null,
      custom_rest_days: data.custom_rest_days ?? null,
      driver_group_number: data.driver_group_number ?? null,
      started_at: new Date().toISOString().split('T')[0],
      created_by: performedBy,
    })

  if (!error) await logAction(performedBy, 'UPDATE_SHIFT_ASSIGNMENT', 'user', userId, data as Record<string, unknown>)
  return !error
}

// ============ SHIFT PHASES (Variant 2) ============

/**
 * Fetch all shift phase records for given employee(s).
 * Returns newest-first so callers can take [0] as current.
 */
export async function fetchShiftPhases(employeeIds: string[]): Promise<ShiftPhase[]> {
  if (!employeeIds.length) return []
  const { data } = await supabase
    .from('shift_phases')
    .select('*')
    .in('employee_id', employeeIds)
    .order('valid_from', { ascending: false })
  return (data || []) as ShiftPhase[]
}

/**
 * Fetch ALL shift phases (for admin full overview).
 */
export async function fetchAllShiftPhases(): Promise<ShiftPhase[]> {
  const { data } = await supabase
    .from('shift_phases')
    .select('*')
    .order('valid_from', { ascending: false })
  return (data || []) as ShiftPhase[]
}

/**
 * Open a new phase period for an employee.
 * Automatically closes the previous open phase (sets valid_to = valid_from - 1 day).
 */
export async function openShiftPhase(
  employeeId: string,
  data: {
    phase: 'day' | 'night'
    anchor_date: string   // ISO date — first workday of this phase block (or anchor month for 15/15-alt)
    valid_from: string    // ISO date — when this phase starts
    schedule_code: string
    is_alternating?: boolean
    notes?: string
  },
  createdBy: string
): Promise<{ ok: boolean; error?: string }> {
  // Close previous open phase one day before the new one starts
  const prevDay = new Date(data.valid_from)
  prevDay.setDate(prevDay.getDate() - 1)
  const prevDayStr = prevDay.toISOString().split('T')[0]

  await supabase
    .from('shift_phases')
    .update({ valid_to: prevDayStr })
    .eq('employee_id', employeeId)
    .is('valid_to', null)

  const { error } = await supabase
    .from('shift_phases')
    .insert({
      employee_id: employeeId,
      phase: data.phase,
      anchor_date: data.anchor_date,
      valid_from: data.valid_from,
      valid_to: null,
      schedule_code: data.schedule_code,
      is_alternating: data.is_alternating ?? false,
      notes: data.notes ?? null,
      created_by: createdBy,
    })

  if (error) {
    console.error('openShiftPhase error:', error)
    return { ok: false, error: error.message ?? 'Supabase insert failed' }
  }
  await logAction(createdBy, 'OPEN_SHIFT_PHASE', 'user', employeeId, data as Record<string, unknown>)
  return { ok: true }
}

/**
 * Manually close a phase record (set valid_to).
 */
export async function closeShiftPhase(id: string, validTo: string, closedBy: string): Promise<boolean> {
  const { error } = await supabase
    .from('shift_phases')
    .update({ valid_to: validTo })
    .eq('id', id)

  if (!error) await logAction(closedBy, 'CLOSE_SHIFT_PHASE', 'shift_phase', id, { valid_to: validTo })
  return !error
}

/**
 * Delete a phase record (admin only, for corrections).
 */
export async function deleteShiftPhase(id: string, deletedBy: string): Promise<boolean> {
  const { error } = await supabase.from('shift_phases').delete().eq('id', id)
  if (!error) await logAction(deletedBy, 'DELETE_SHIFT_PHASE', 'shift_phase', id, {})
  return !error
}

/**
 * Save a shift phase — create new or replace existing.
 * If existingPhaseId provided: deletes it first.
 * Auto-closes any other open phases before inserting.
 * Supports explicit valid_to (closed phase) unlike openShiftPhase.
 */
export async function saveShiftPhase(
  employeeId: string,
  data: {
    phase: 'day' | 'night'
    anchor_date: string
    valid_from: string
    valid_to: string | null
    schedule_code: string
    is_alternating?: boolean
    notes?: string
  },
  createdBy: string,
  existingPhaseId?: string,
): Promise<{ ok: boolean; error?: string }> {
  // Delete existing phase if editing
  if (existingPhaseId) {
    await supabase.from('shift_phases').delete().eq('id', existingPhaseId)
  }

  // Auto-close any open phase that would overlap
  const prevDay = new Date(data.valid_from)
  prevDay.setDate(prevDay.getDate() - 1)
  const prevDayStr = prevDay.toISOString().split('T')[0]

  await supabase
    .from('shift_phases')
    .update({ valid_to: prevDayStr })
    .eq('employee_id', employeeId)
    .is('valid_to', null)

  const { error } = await supabase.from('shift_phases').insert({
    employee_id: employeeId,
    phase: data.phase,
    anchor_date: data.anchor_date,
    valid_from: data.valid_from,
    valid_to: data.valid_to ?? null,
    schedule_code: data.schedule_code,
    is_alternating: data.is_alternating ?? false,
    notes: data.notes ?? null,
    created_by: createdBy,
  })

  if (error) return { ok: false, error: error.message }
  await logAction(createdBy, 'OPEN_SHIFT_PHASE', 'user', employeeId, data as Record<string, unknown>)
  return { ok: true }
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

// ============ DRIVER MANUAL SHIFTS ============

/**
 * Fetch all manual shift overrides in a date range.
 * Returns flat array; callers index by "userId_date" for O(1) lookup.
 */
export async function fetchDriverManualShifts(
  dateFrom: string,
  dateTo: string
): Promise<import('@/types').DriverManualShift[]> {
  const { data } = await supabase
    .from('driver_manual_shifts')
    .select('*')
    .gte('shift_date', dateFrom)
    .lte('shift_date', dateTo)
    .order('shift_date')
  return (data ?? []) as import('@/types').DriverManualShift[]
}

/**
 * Upsert a manual shift override for a single driver+date.
 * shiftType = 'I' | 'II' | 'OFF'
 */
export async function upsertDriverManualShift(
  userId: string,
  shiftDate: string,
  shiftType: 'I' | 'II' | 'OFF',
  createdBy: string,
  notes?: string
): Promise<boolean> {
  const { error } = await supabase
    .from('driver_manual_shifts')
    .upsert({
      user_id: userId,
      shift_date: shiftDate,
      shift_type: shiftType,
      notes: notes ?? null,
      created_by: createdBy,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,shift_date' })
  return !error
}

/**
 * Remove a manual override for a driver+date (restores auto-computed schedule).
 */
export async function deleteDriverManualShift(
  userId: string,
  shiftDate: string
): Promise<boolean> {
  const { error } = await supabase
    .from('driver_manual_shifts')
    .delete()
    .eq('user_id', userId)
    .eq('shift_date', shiftDate)
  return !error
}

// ============ SAFETY / ТБиОТ ============

export async function fetchCertTypes(activeOnly = false): Promise<CertType[]> {
  let q = supabase.from('cert_types').select('*').order('sort_order')
  if (activeOnly) q = q.eq('is_active', true)
  const { data } = await q
  return (data || []) as CertType[]
}

export async function upsertCertType(ct: Partial<CertType>): Promise<CertType | null> {
  const { data, error } = await supabase
    .from('cert_types')
    .upsert(ct, { onConflict: 'id' })
    .select()
    .single()
  if (error) console.error('upsertCertType:', error)
  return data as CertType | null
}

export async function deleteCertType(id: string): Promise<boolean> {
  const { error } = await supabase.from('cert_types').delete().eq('id', id)
  return !error
}

export async function fetchEmployeeCerts(employeeId?: string): Promise<EmployeeCert[]> {
  let q = supabase
    .from('employee_certs')
    .select('*, cert_type:cert_types(*)')
    .order('created_at', { ascending: false })
  if (employeeId) q = q.eq('employee_id', employeeId)
  const { data } = await q
  return (data || []) as EmployeeCert[]
}

export async function upsertEmployeeCert(cert: Partial<EmployeeCert>): Promise<EmployeeCert | null> {
  const payload = { ...cert }
  delete payload.cert_type
  delete payload.employee
  // employee_certs_linked_uniq index handles dedup for linked records
  const { data, error } = await supabase
    .from('employee_certs')
    .upsert(payload, { onConflict: 'id' })
    .select('*, cert_type:cert_types(*)')
    .single()
  if (error) console.error('upsertEmployeeCert:', error)
  return data as EmployeeCert | null
}

/** Insert a new cert record for a linked employee (creates or updates by employee+type) */
export async function upsertLinkedCert(cert: Partial<EmployeeCert>): Promise<EmployeeCert | null> {
  const payload = { ...cert }
  delete payload.cert_type
  delete payload.employee
  payload.employee_id = payload.employee_id ?? null
  payload.is_indefinite = payload.is_indefinite ?? false
  // Use id-based upsert if editing existing, otherwise insert fresh
  if (payload.id) {
    const { data, error } = await supabase
      .from('employee_certs')
      .update(payload)
      .eq('id', payload.id)
      .select('*, cert_type:cert_types(*)')
      .single()
    if (error) console.error('upsertLinkedCert update:', error)
    return data as EmployeeCert | null
  }
  const { data, error } = await supabase
    .from('employee_certs')
    .insert(payload)
    .select('*, cert_type:cert_types(*)')
    .single()
  if (error) console.error('upsertLinkedCert insert:', error)
  return data as EmployeeCert | null
}

/** Fetch all unlinked cert records (employee_id IS NULL) */
export async function fetchUnlinkedCerts(): Promise<EmployeeCert[]> {
  const { data } = await supabase
    .from('employee_certs')
    .select('*, cert_type:cert_types(*)')
    .is('employee_id', null)
    .order('full_name')
  return (data || []) as EmployeeCert[]
}

/** Link an unlinked cert record to a user */
export async function linkCertToEmployee(certId: string, employeeId: string): Promise<boolean> {
  const { error } = await supabase
    .from('employee_certs')
    .update({ employee_id: employeeId, full_name: null })
    .eq('id', certId)
  if (error) { console.error('linkCertToEmployee:', error); return false }
  return true
}

export async function deleteEmployeeCert(id: string): Promise<boolean> {
  const { error } = await supabase.from('employee_certs').delete().eq('id', id)
  return !error
}

export async function fetchCertRequirements(): Promise<CertRequirement[]> {
  const { data } = await supabase
    .from('cert_requirements')
    .select('*, cert_type:cert_types(*)')
    .order('created_at')
  return (data || []) as CertRequirement[]
}

export async function upsertCertRequirement(req: Partial<CertRequirement>): Promise<CertRequirement | null> {
  const payload = { ...req }
  delete payload.cert_type
  const { data, error } = await supabase
    .from('cert_requirements')
    .upsert(payload, { onConflict: 'id' })
    .select('*, cert_type:cert_types(*)')
    .single()
  if (error) console.error('upsertCertRequirement:', error)
  return data as CertRequirement | null
}

export async function deleteCertRequirement(id: string): Promise<boolean> {
  const { error } = await supabase.from('cert_requirements').delete().eq('id', id)
  return !error
}

/** Fetch all linked employee certs with employee data — for matrix + coverage overview */
export async function fetchAllCertsWithEmployees(): Promise<EmployeeCert[]> {
  const { data } = await supabase
    .from('employee_certs')
    .select('*, cert_type:cert_types(*), employee:users!employee_id(user_id,full_name,service_id,position,is_active)')
    .not('employee_id', 'is', null)
    .order('expires_at', { ascending: true, nullsFirst: false })
  return (data || []) as EmployeeCert[]
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

// ─── Auth (server-side PIN login) ────────────────────────────────────────────

export async function loginWithPin(tabNumber: string, pin: string): Promise<{ ok: boolean; session?: AuthSession; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('tab_number', tabNumber)
      .eq('is_active', true)
      .single()

    if (error || !data) return { ok: false, error: 'Пользователь не найден' }

    const user = data as User
    if (!user.pin_code) return { ok: false, error: 'PIN не назначен. Обратитесь к администратору.' }
    if (user.pin_code !== pin) return { ok: false, error: 'Неверный PIN-код' }

    const session: AuthSession = {
      user_id: user.user_id,
      tab_number: user.tab_number,
      full_name: user.full_name,
      role_level: user.role_level,
      service_id: user.service_id,
      position: user.position,
    }

    await logAction(user.user_id, 'LOGIN', 'user', user.user_id, {
      tab_number: user.tab_number,
      role_level: user.role_level,
    })

    return { ok: true, session }
  } catch (err) {
    console.error('Login error:', err)
    return { ok: false, error: 'Ошибка подключения к базе данных' }
  }
}

// ─── System Alerts ───────────────────────────────────────────────────────────

function hoursSince(ts: string | null): number {
  if (!ts) return 0
  return (Date.now() - new Date(ts).getTime()) / 3600000
}

export async function fetchSystemAlerts(opts: { role: RoleLevel; serviceId?: string | null }): Promise<SystemAlert[]> {
  const today = new Date().toISOString().split('T')[0]
  const h = new Date().getHours()

  const { data: plans } = await supabase.from('work_plans').select('*').eq('plan_date', today)
  if (!plans) return []

  const alerts: SystemAlert[] = []

  if (opts.role === 'HEAD' && opts.serviceId) {
    const myPlans = plans.filter((p) => p.service_id === opts.serviceId)
    const hasProgress = myPlans.some((p) =>
      ['SUBMITTED', 'APPROVED', 'PLANNED', 'BOSS_CONFIRMED', 'ASSIGNED', 'IN_PROGRESS', 'DONE'].includes(p.status)
    )
    if (!hasProgress) {
      if (h >= 15) alerts.push({ id: 'head-no-plan', level: 'critical', title: 'План не подан на согласование', detail: 'Срочно создайте и отправьте план до совещания' })
      else if (h >= 12) alerts.push({ id: 'head-no-plan', level: 'warning', title: 'План не создан', detail: `До совещания ${16 - h}ч — создайте план работ` })
    }
    const drafts = myPlans.filter((p) => p.status === 'DRAFT')
    if (drafts.length > 0 && h >= 14) alerts.push({ id: 'head-draft', level: 'warning', title: `${drafts.length} план(а) в черновике`, detail: 'Отправьте на согласование до 16:00' })
  }

  if (['CHIEF_ENGINEER', 'BOSS', 'ADMIN'].includes(opts.role)) {
    const submitted = plans.filter((p) => p.status === 'SUBMITTED')
    if (submitted.length > 0) {
      const oldest = submitted.reduce((a, b) => (a.submitted_at ?? '') < (b.submitted_at ?? '') ? a : b)
      const hrs = Math.floor(hoursSince(oldest.submitted_at))
      alerts.push({ id: 'chief-pending', level: hrs >= 2 ? 'critical' : 'warning', title: `${submitted.length} план(а) ждут согласования ГИ`, detail: hrs > 0 ? `Ожидание ${hrs}ч` : 'Требуется согласование' })
    }
  }

  if (['ZAMPORAB', 'BOSS', 'ADMIN'].includes(opts.role)) {
    const approved = plans.filter((p) => p.status === 'APPROVED')
    if (approved.length > 0) {
      const oldest = approved.reduce((a, b) => (a.approved_at ?? '') < (b.approved_at ?? '') ? a : b)
      const hrs = Math.floor(hoursSince(oldest.approved_at))
      alerts.push({ id: 'zamporab-pending', level: hrs >= 2 ? 'critical' : 'warning', title: `${approved.length} план(а) ждут подтверждения замзама`, detail: hrs > 0 ? `Ожидание ${hrs}ч` : 'Требуется подтверждение' })
    }
  }

  if (['BOSS', 'ADMIN'].includes(opts.role)) {
    const planned = plans.filter((p) => p.status === 'PLANNED')
    if (planned.length > 0) alerts.push({ id: 'boss-pending', level: h >= 17 ? 'critical' : 'warning', title: `${planned.length} план(а) ждут утверждения на совещании`, detail: h < 16 ? 'Совещание в 16:30' : 'Совещание прошло — утвердите планы' })
  }

  if (['FOREMAN', 'ZAMPORAB', 'BOSS', 'ADMIN'].includes(opts.role)) {
    const scope = opts.role === 'FOREMAN' && opts.serviceId ? plans.filter((p) => p.service_id === opts.serviceId) : plans
    const notAssigned = scope.filter((p) => p.status === 'BOSS_CONFIRMED')
    if (notAssigned.length > 0) alerts.push({ id: 'foreman-not-assigned', level: h >= 20 ? 'critical' : 'warning', title: `${notAssigned.length} план(а) без состава бригады`, detail: 'Назначьте работников до начала смены' })
    if (h >= 7) {
      const notStarted = scope.filter((p) => p.status === 'ASSIGNED')
      if (notStarted.length > 0) alerts.push({ id: 'foreman-not-started', level: 'warning', title: `${notStarted.length} план(а) не запущены`, detail: 'Запустите работы на объектах' })
    }
    const fastTrack = scope.filter((p) => p.status === 'FAST_TRACK')
    if (fastTrack.length > 0) alerts.push({ id: 'fast-track-unassigned', level: 'critical', title: `⚡ ${fastTrack.length} поручение(я) Fast Track — нужна бригада`, detail: 'Внеплановое задание от вышестоящей организации' })
    const needsReassign = scope.filter((p) => p.status === 'REDIRECTED')
    if (needsReassign.length > 0) alerts.push({ id: 'plan-needs-reassign', level: 'critical', title: `🚨 ${needsReassign.length} план(а) без бригады — снята по поручению`, detail: 'Назначьте замену или перенесите план' })
    const overdueResume = scope.filter((p) => p.status === 'SUSPENDED' && p.suspended_until && p.suspended_until <= today)
    if (overdueResume.length > 0) alerts.push({ id: 'plan-resume-overdue', level: 'warning', title: `${overdueResume.length} план(а) ожидают возобновления`, detail: 'Дата возобновления наступила — назначьте бригаду' })
  }

  if (['DISPATCHER', 'BOSS', 'ZAMPORAB', 'ADMIN'].includes(opts.role)) {
    const allFastTrack = plans.filter((p) => p.status === 'FAST_TRACK')
    const externalCount = allFastTrack.filter((p) => p.source !== 'INTERNAL').length
    if (externalCount > 0) {
      const sources = [...new Set(allFastTrack.map((p) => p.source).filter(Boolean))]
      alerts.push({ id: 'fast-track-external', level: 'critical', title: `⚡ ${externalCount} внешних поручений в работе сегодня`, detail: sources.includes('MAYOR') ? 'Есть поручения от Мэрии Москвы' : sources.includes('DJKH') ? 'Есть поручения от ДЖКХ' : 'Поручения от ГУ Гормост' })
    }
  }

  if (['SAFETY_ENGINEER', 'ADMIN', 'BOSS'].includes(opts.role)) {
    const { data: certs } = await supabase.from('employee_certs').select('id, expires_at').not('expires_at', 'is', null)
    if (certs && certs.length > 0) {
      let expired = 0, expiringSoon = 0
      for (const c of certs) {
        const st = certStatusFromDates(c.expires_at)
        if (st === 'EXPIRED') expired++
        else if (st === 'EXPIRING_SOON') expiringSoon++
      }
      if (expired > 0) alerts.push({ id: 'certs-expired', level: 'critical', title: `🛡️ ${expired} допуск(а) просрочено`, detail: 'Требуется переаттестация сотрудников' })
      else if (expiringSoon > 0) alerts.push({ id: 'certs-expiring', level: 'warning', title: `🛡️ ${expiringSoon} допуск(а) истекают в ближайшие 30 дней`, detail: 'Запланируйте переаттестацию' })
    }
  }

  return alerts
}

// ─── Home page live counters ─────────────────────────────────────────────────

export async function fetchHomeCounters(): Promise<HomeCounters> {
  const today = new Date().toISOString().split('T')[0]
  const [vehiclesRes, certsRes, remarksRes, plansRes] = await Promise.all([
    supabase.from('vehicles').select('status'),
    supabase.from('employee_certs').select('expires_at').not('expires_at', 'is', null),
    supabase.from('remarks').select('id', { count: 'exact', head: true }).eq('is_critical', true),
    supabase.from('work_plans').select('status').eq('plan_date', today),
  ])
  const vehicles = (vehiclesRes.data || []) as { status: string }[]
  const certs = (certsRes.data || []) as { expires_at: string | null }[]
  const plans = (plansRes.data || []) as { status: string }[]

  let expired = 0, expiringSoon = 0
  for (const c of certs) {
    const st = certStatusFromDates(c.expires_at)
    if (st === 'EXPIRED') expired++
    else if (st === 'EXPIRING_SOON') expiringSoon++
  }

  return {
    brokenVehicles: vehicles.filter(v => v.status === 'BROKEN').length,
    maintenanceVehicles: vehicles.filter(v => v.status === 'MAINTENANCE').length,
    expiredCerts: expired,
    expiringSoonCerts: expiringSoon,
    newComplaints: remarksRes.count || 0,
    plansSubmitted: plans.filter(p => p.status === 'SUBMITTED').length,
    plansApproved: plans.filter(p => p.status === 'APPROVED').length,
    plansPlanned: plans.filter(p => p.status === 'PLANNED').length,
  }
}

// ─── Simple raw helpers (used by migrated client components) ─────────────────

export async function updateRequestStatusRaw(requestId: string, status: string): Promise<boolean> {
  const { error } = await supabase.from('requests').update({ status }).eq('request_id', requestId)
  return !error
}

export async function fetchAllRemarks(): Promise<Remark[]> {
  const { data } = await supabase.from('remarks').select('*').order('created_at', { ascending: false })
  return (data || []) as Remark[]
}

export async function fetchUserRequestIds(userId: string): Promise<string[]> {
  const { data } = await supabase.from('request_assignments').select('request_id').eq('user_id', userId)
  return (data || []).map((a: { request_id: string }) => a.request_id)
}
