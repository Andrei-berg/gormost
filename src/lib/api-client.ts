// Routes all Supabase calls through /api/db so they execute server-side.
// Drop-in replacement for api.ts in client components.

import type {
  User, Service, Category, GObject, Construction, WorkType,
  Request, RequestAssignment, StaffRequest, Remark, ChangelogEntry,
  RequestStatus, StaffRequestStatus,
  EmployeeStatusType, EmployeeStatus, EnrichedEmployee, StatusMetadata,
  WorkPlan, WorkPlanItem, WorkPlanWithItems, WorkPlanItemWithVehicles,
  Vehicle, VehicleAssignment, VehicleWithAssignments,
  VehicleBreakdown, VehicleBreakdownWithVehicle, VehicleBreakdownSeverity, VehicleBreakdownStatus,
  WorkPlanStatus, VehicleStatus,
  Profession, Schedule, ShiftPhase,
  EmployeePositionWithProfession, EmployeeDetail,
  UserWithAssignment, WorkAssignment, WorkAssignmentWithUser,
  CrossServiceRequest,
  WorkRedirect, WorkSource, OriginalPlanFate, ShiftType,
  Directive, DirectiveStatus,
  DirectiveWorkerAssignment, ServiceOrderType,
  CertType, EmployeeCert, CertRequirement,
  DriverManualShift,
  AuthSession, RoleLevel, AlertLevel, SystemAlert, HomeCounters,
  JournalObjectCategory, JournalObject, DailyPlanItem,
  WorkPermitType, WorkPermitServiceType, ResolvedWorkPermitType,
} from '@/types'

export interface StatusWithUser extends EmployeeStatus {
  user_full_name: string
  user_position: string | null
  user_service_id: string | null
}

async function call<T>(fn: string, args: unknown[]): Promise<T> {
  const res = await fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fn, args }),
  })
  if (res.status === 401 && typeof window !== 'undefined') {
    // Session cookie missing/expired — force re-login
    localStorage.removeItem('gormost_session')
    window.location.href = '/login'
    throw new Error('Сессия истекла')
  }
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  const data = json.data
  if (data && typeof data === 'object' && '__map' in data) {
    return new Map(data.entries) as T
  }
  if (data && typeof data === 'object' && '__set' in data) {
    return new Set(data.values) as T
  }
  return data as T
}

// ============ USERS ============

export function fetchUsers(activeOnly = true): Promise<User[]> {
  return call('fetchUsers', [activeOnly])
}

export function fetchUsersByService(serviceId: string): Promise<User[]> {
  return call('fetchUsersByService', [serviceId])
}

export function fetchUserById(userId: string): Promise<User | null> {
  return call('fetchUserById', [userId])
}

export function createUser(user: Partial<User>): Promise<User | null> {
  return call('createUser', [user])
}

export function updateUser(userId: string, updates: Partial<User>): Promise<{ data: User | null; errorMsg: string | null }> {
  return call('updateUser', [userId, updates])
}

export function deleteUser(userId: string): Promise<boolean> {
  return call('deleteUser', [userId])
}

// ============ SERVICES ============

export function fetchServices(): Promise<Service[]> {
  return call('fetchServices', [])
}

export function createService(service: Partial<Service>): Promise<Service | null> {
  return call('createService', [service])
}

export function updateService(serviceId: string, updates: Partial<Service>): Promise<Service | null> {
  return call('updateService', [serviceId, updates])
}

export function deleteService(serviceId: string): Promise<boolean> {
  return call('deleteService', [serviceId])
}

// ============ CATEGORIES ============

export function fetchCategories(): Promise<Category[]> {
  return call('fetchCategories', [])
}

export function createCategory(cat: Partial<Category>): Promise<Category | null> {
  return call('createCategory', [cat])
}

export function updateCategory(catId: string, updates: Partial<Category>): Promise<Category | null> {
  return call('updateCategory', [catId, updates])
}

export function deleteCategory(catId: string): Promise<boolean> {
  return call('deleteCategory', [catId])
}

// ============ OBJECTS ============

export function fetchObjects(categoryId?: string): Promise<GObject[]> {
  return call('fetchObjects', [categoryId])
}

export function createObject(obj: Partial<GObject>): Promise<GObject | null> {
  return call('createObject', [obj])
}

export function updateObject(objId: string, updates: Partial<GObject>): Promise<GObject | null> {
  return call('updateObject', [objId, updates])
}

export function deleteObject(objId: string): Promise<boolean> {
  return call('deleteObject', [objId])
}

// ============ CONSTRUCTIONS ============

export function fetchConstructions(objectId?: string): Promise<Construction[]> {
  return call('fetchConstructions', [objectId])
}

export function createConstruction(c: Partial<Construction>): Promise<Construction | null> {
  return call('createConstruction', [c])
}

export function updateConstruction(cId: string, updates: Partial<Construction>): Promise<Construction | null> {
  return call('updateConstruction', [cId, updates])
}

export function deleteConstruction(cId: string): Promise<boolean> {
  return call('deleteConstruction', [cId])
}

// ============ WORK TYPES ============

export function fetchWorkTypes(constructionId?: string): Promise<WorkType[]> {
  return call('fetchWorkTypes', [constructionId])
}

export function createWorkType(wt: Partial<WorkType>): Promise<WorkType | null> {
  return call('createWorkType', [wt])
}

export function updateWorkType(wtId: string, updates: Partial<WorkType>): Promise<WorkType | null> {
  return call('updateWorkType', [wtId, updates])
}

export function deleteWorkType(wtId: string): Promise<boolean> {
  return call('deleteWorkType', [wtId])
}

// ============ REQUESTS ============

export function fetchRequests(filters?: {
  serviceId?: string
  status?: RequestStatus
  dateWork?: string
  shiftNo?: number
  createdBy?: string
}): Promise<Request[]> {
  return call('fetchRequests', [filters])
}

export function fetchRequestById(requestId: string): Promise<Request | null> {
  return call('fetchRequestById', [requestId])
}

export function createRequest(req: Partial<Request>, userId: string): Promise<Request | null> {
  return call('createRequest', [req, userId])
}

export function updateRequest(requestId: string, updates: Partial<Request>, userId: string): Promise<Request | null> {
  return call('updateRequest', [requestId, updates, userId])
}

export function updateRequestStatus(requestId: string, status: RequestStatus, userId: string): Promise<boolean> {
  return call('updateRequestStatus', [requestId, status, userId])
}

export function approveRequest(requestId: string, role: 'head' | 'zamporab' | 'boss', userId: string): Promise<boolean> {
  return call('approveRequest', [requestId, role, userId])
}

export function deleteRequest(requestId: string, userId: string): Promise<boolean> {
  return call('deleteRequest', [requestId, userId])
}

// ============ REQUEST ASSIGNMENTS ============

export function fetchAssignments(requestId: string): Promise<RequestAssignment[]> {
  return call('fetchAssignments', [requestId])
}

export function assignUsers(requestId: string, userIds: string[], assignedBy: string): Promise<boolean> {
  return call('assignUsers', [requestId, userIds, assignedBy])
}

// ============ STAFF REQUESTS ============

export function fetchStaffRequests(filters?: { fromServiceId?: string; toServiceId?: string; status?: StaffRequestStatus }): Promise<StaffRequest[]> {
  return call('fetchStaffRequests', [filters])
}

export function createStaffRequest(sr: Partial<StaffRequest>, userId: string): Promise<StaffRequest | null> {
  return call('createStaffRequest', [sr, userId])
}

export function updateStaffRequestStatus(id: string, status: StaffRequestStatus, approvedBy: string): Promise<boolean> {
  return call('updateStaffRequestStatus', [id, status, approvedBy])
}

// ============ REMARKS ============

export function fetchRemarks(requestId: string): Promise<Remark[]> {
  return call('fetchRemarks', [requestId])
}

export function createRemark(remark: Partial<Remark>): Promise<Remark | null> {
  return call('createRemark', [remark])
}

// ============ CHANGELOG ============

export function fetchChangelog(limit = 50, entityType?: string, entityId?: string): Promise<ChangelogEntry[]> {
  return call('fetchChangelog', [limit, entityType, entityId])
}

// ============ PEOPLE STATS ============

export function fetchPeopleStats(): Promise<{
  totalDeployed: number
  byService: Record<string, number>
  activeAssignments: Array<{ user_id: string; full_name: string; service_id: string | null; request_id: string; object_name?: string }>
}> {
  return call('fetchPeopleStats', [])
}

// ============ STATS ============

export function fetchRequestStats(): Promise<{
  total: number
  byStatus: Record<string, number>
  byService: Record<string, number>
  byPriority: Record<string, number>
}> {
  return call('fetchRequestStats', [])
}

// ============ HR MODULE ============

export function fetchAllCurrentStatuses(): Promise<EnrichedEmployee[]> {
  return call('fetchAllCurrentStatuses', [])
}

export function fetchEmployeeStatusHistory(userId: string): Promise<EmployeeStatus[]> {
  return call('fetchEmployeeStatusHistory', [userId])
}

export function setEmployeeStatus(
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
  return call('setEmployeeStatus', [userId, status, dateFrom, dateTo, reason, createdBy, dates, metadata])
}

export function fetchStatusesForPeriod(
  dateFrom: string,
  dateTo: string,
  _serviceId?: string
): Promise<EmployeeStatus[]> {
  return call('fetchStatusesForPeriod', [dateFrom, dateTo, _serviceId])
}

export function fetchStatusesForPeriodWithUsers(
  dateFrom: string,
  dateTo: string,
  serviceId?: string
): Promise<StatusWithUser[]> {
  return call('fetchStatusesForPeriodWithUsers', [dateFrom, dateTo, serviceId])
}

export function hireEmployee(userId: string, dateHired: string, performedBy: string): Promise<boolean> {
  return call('hireEmployee', [userId, dateHired, performedBy])
}

export function fireEmployee(userId: string, dateFired: string, performedBy: string): Promise<boolean> {
  return call('fireEmployee', [userId, dateFired, performedBy])
}

// ============ WORK PLANS ============

export function fetchWorkPlans(filters?: {
  serviceId?: string
  planDate?: string
  dateFrom?: string
  dateTo?: string
  shiftType?: string
  status?: WorkPlanStatus
  statuses?: WorkPlanStatus[]
}): Promise<WorkPlan[]> {
  return call('fetchWorkPlans', [filters])
}

export function fetchWorkPlanWithItems(planId: string): Promise<WorkPlanWithItems | null> {
  return call('fetchWorkPlanWithItems', [planId])
}

/** Batch variant: one round trip and 4 DB queries for any number of plans */
export function fetchWorkPlansWithItems(planIds: string[]): Promise<WorkPlanWithItems[]> {
  return call('fetchWorkPlansWithItems', [planIds])
}

export function createWorkPlan(
  data: Pick<WorkPlan, 'service_id' | 'plan_date' | 'shift_type'>,
  userId: string
): Promise<WorkPlan | null> {
  return call('createWorkPlan', [data, userId])
}

export function updateWorkPlan(
  planId: string,
  updates: Partial<Pick<WorkPlan, 'chief_notes'>>,
  userId: string
): Promise<WorkPlan | null> {
  return call('updateWorkPlan', [planId, updates, userId])
}

export function submitWorkPlan(planId: string, userId: string): Promise<boolean> {
  return call('submitWorkPlan', [planId, userId])
}

export function approveWorkPlan(planId: string, userId: string, notes?: string): Promise<boolean> {
  return call('approveWorkPlan', [planId, userId, notes])
}

export function approveWorkPlanDirect(planId: string, userId: string): Promise<boolean> {
  return call('approveWorkPlanDirect', [planId, userId])
}

export function confirmWorkPlanZamporab(planId: string, userId: string): Promise<boolean> {
  return call('confirmWorkPlanZamporab', [planId, userId])
}

export function returnWorkPlanZamporab(planId: string, userId: string, notes: string): Promise<boolean> {
  return call('returnWorkPlanZamporab', [planId, userId, notes])
}

export function startWorkPlan(planId: string, userId: string): Promise<boolean> {
  return call('startWorkPlan', [planId, userId])
}

export function completeWorkPlan(planId: string, userId: string): Promise<boolean> {
  return call('completeWorkPlan', [planId, userId])
}

export function rejectWorkPlan(planId: string, userId: string, notes: string): Promise<boolean> {
  return call('rejectWorkPlan', [planId, userId, notes])
}

export function deleteWorkPlan(planId: string, userId: string): Promise<boolean> {
  return call('deleteWorkPlan', [planId, userId])
}

export function recallWorkPlan(planId: string, userId: string): Promise<boolean> {
  return call('recallWorkPlan', [planId, userId])
}

// ============ WORK PLAN ITEMS ============

export function fetchWorkPlanItems(planId: string): Promise<WorkPlanItem[]> {
  return call('fetchWorkPlanItems', [planId])
}

export function createWorkPlanItem(
  item: Omit<WorkPlanItem, 'id' | 'created_at' | 'updated_at'>
): Promise<WorkPlanItem | null> {
  return call('createWorkPlanItem', [item])
}

export function updateWorkPlanItem(
  itemId: string,
  updates: Partial<Omit<WorkPlanItem, 'id' | 'plan_id' | 'created_at' | 'updated_at'>>
): Promise<WorkPlanItem | null> {
  return call('updateWorkPlanItem', [itemId, updates])
}

export function deleteWorkPlanItem(itemId: string): Promise<boolean> {
  return call('deleteWorkPlanItem', [itemId])
}

export function fetchItemsWithVehicles(planId: string): Promise<WorkPlanItemWithVehicles[]> {
  return call('fetchItemsWithVehicles', [planId])
}

// ============ VEHICLES ============

export function fetchVehicles(activeOnly = true): Promise<Vehicle[]> {
  return call('fetchVehicles', [activeOnly])
}

export function createVehicle(vehicle: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>): Promise<Vehicle | null> {
  return call('createVehicle', [vehicle])
}

export function updateVehicle(
  vehicleId: string,
  updates: Partial<Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>>
): Promise<Vehicle | null> {
  return call('updateVehicle', [vehicleId, updates])
}

export function updateVehicleStatus(
  vehicleId: string,
  status: VehicleStatus,
  breakdownDetails: string | null,
  maintenanceUntil: string | null
): Promise<boolean> {
  return call('updateVehicleStatus', [vehicleId, status, breakdownDetails, maintenanceUntil])
}

export function deleteVehicle(vehicleId: string): Promise<boolean> {
  return call('deleteVehicle', [vehicleId])
}

// ============ VEHICLE ASSIGNMENTS ============

export function fetchVehicleAssignments(planItemId: string): Promise<VehicleAssignment[]> {
  return call('fetchVehicleAssignments', [planItemId])
}

export function fetchVehiclesWithDayAssignments(date: string): Promise<VehicleWithAssignments[]> {
  return call('fetchVehiclesWithDayAssignments', [date])
}

export function fetchVehicleByDriver(userId: string, date: string): Promise<VehicleWithAssignments | null> {
  return call('fetchVehicleByDriver', [userId, date])
}

export function assignVehicle(
  vehicleId: string,
  planItemId: string,
  assignedBy: string,
  notes?: string
): Promise<VehicleAssignment | null> {
  return call('assignVehicle', [vehicleId, planItemId, assignedBy, notes])
}

export function updateVehicleAssignmentDriver(
  assignmentId: string,
  driverUserId: string | null
): Promise<boolean> {
  return call('updateVehicleAssignmentDriver', [assignmentId, driverUserId])
}

export function fetchVehicleAssignmentsForItems(itemIds: string[]): Promise<VehicleAssignment[]> {
  return call('fetchVehicleAssignmentsForItems', [itemIds])
}

export function unassignVehicle(vehicleId: string, planItemId: string): Promise<boolean> {
  return call('unassignVehicle', [vehicleId, planItemId])
}

// ============ VEHICLE BREAKDOWNS ============

export function fetchVehicleBreakdowns(vehicleId?: string): Promise<VehicleBreakdownWithVehicle[]> {
  return call('fetchVehicleBreakdowns', [vehicleId])
}

export function fetchOpenBreakdowns(): Promise<VehicleBreakdownWithVehicle[]> {
  return call('fetchOpenBreakdowns', [])
}

export function createBreakdown(breakdown: {
  vehicle_id: string
  reported_by: string
  description: string
  severity: VehicleBreakdownSeverity
  mechanic_notes?: string | null
}): Promise<VehicleBreakdown | null> {
  return call('createBreakdown', [breakdown])
}

export function updateBreakdownStatus(
  breakdownId: string,
  status: VehicleBreakdownStatus,
  resolutionNotes?: string | null,
  mechanicNotes?: string | null
): Promise<boolean> {
  return call('updateBreakdownStatus', [breakdownId, status, resolutionNotes, mechanicNotes])
}

export function fetchDriverUsers(): Promise<UserWithAssignment[]> {
  return call('fetchDriverUsers', [])
}

// ============ HR — PHASE 04 ============

export function fetchProfessions(): Promise<Profession[]> {
  return call('fetchProfessions', [])
}

export function fetchSchedules(): Promise<Schedule[]> {
  return call('fetchSchedules', [])
}

export function fetchCurrentPosition(userId: string): Promise<EmployeePositionWithProfession | null> {
  return call('fetchCurrentPosition', [userId])
}

export function fetchPositionHistory(userId: string): Promise<EmployeePositionWithProfession[]> {
  return call('fetchPositionHistory', [userId])
}

export function fetchEmployeeDetail(userId: string): Promise<EmployeeDetail | null> {
  return call('fetchEmployeeDetail', [userId])
}

export function createEmployee(data: {
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
  return call('createEmployee', [data, createdBy])
}

export function transferEmployee(
  userId: string,
  newProfessionId: string,
  reason: string,
  date: string,
  performedBy: string
): Promise<boolean> {
  return call('transferEmployee', [userId, newProfessionId, reason, date, performedBy])
}

// ============ SHIFT ROSTER ============

export function fetchUsersWithAssignments(): Promise<UserWithAssignment[]> {
  return call('fetchUsersWithAssignments', [])
}

export function upsertEmployeeAssignment(
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
  return call('upsertEmployeeAssignment', [userId, data, performedBy])
}

// ============ SHIFT PHASES ============

export function fetchShiftPhases(employeeIds: string[]): Promise<ShiftPhase[]> {
  return call('fetchShiftPhases', [employeeIds])
}

export function fetchAllShiftPhases(): Promise<ShiftPhase[]> {
  return call('fetchAllShiftPhases', [])
}

export function openShiftPhase(
  employeeId: string,
  data: {
    phase: 'day' | 'night'
    anchor_date: string
    valid_from: string
    schedule_code: string
    is_alternating?: boolean
    notes?: string
  },
  createdBy: string
): Promise<{ ok: boolean; error?: string }> {
  return call('openShiftPhase', [employeeId, data, createdBy])
}

export function closeShiftPhase(id: string, validTo: string, closedBy: string): Promise<boolean> {
  return call('closeShiftPhase', [id, validTo, closedBy])
}

export function deleteShiftPhase(id: string, deletedBy: string): Promise<boolean> {
  return call('deleteShiftPhase', [id, deletedBy])
}

export function saveShiftPhase(
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
  return call('saveShiftPhase', [employeeId, data, createdBy, existingPhaseId])
}

// ============ WORK ASSIGNMENTS ============

export function fetchWorkAssignments(planItemId: string): Promise<WorkAssignmentWithUser[]> {
  return call('fetchWorkAssignments', [planItemId])
}

export function fetchWorkAssignmentsForItems(itemIds: string[]): Promise<WorkAssignmentWithUser[]> {
  return call('fetchWorkAssignmentsForItems', [itemIds])
}

export function createWorkAssignment(
  planItemId: string,
  userId: string,
  role: WorkAssignment['role'],
  assignedBy: string
): Promise<{ ok: boolean; error?: string }> {
  return call('createWorkAssignment', [planItemId, userId, role, assignedBy])
}

export function deleteWorkAssignment(assignmentId: string): Promise<boolean> {
  return call('deleteWorkAssignment', [assignmentId])
}

export function confirmWorkPlanBoss(planId: string, userId: string): Promise<boolean> {
  return call('confirmWorkPlanBoss', [planId, userId])
}

export function markWorkPlanAssigned(planId: string, userId: string): Promise<boolean> {
  return call('markWorkPlanAssigned', [planId, userId])
}

// ============ CROSS-SERVICE REQUESTS ============

export function createCrossServiceRequest(
  data: Omit<CrossServiceRequest, 'id' | 'status' | 'response_note' | 'responded_by' | 'responded_at' | 'created_at'>
): Promise<CrossServiceRequest | null> {
  return call('createCrossServiceRequest', [data])
}

export function fetchCrossServiceRequests(filters: {
  toServiceId?: string
  fromServiceId?: string
  fromPlanId?: string
}): Promise<CrossServiceRequest[]> {
  return call('fetchCrossServiceRequests', [filters])
}

export function respondToCrossServiceRequest(
  id: string,
  status: 'CONFIRMED' | 'DECLINED',
  responseNote: string | null,
  respondedBy: string
): Promise<boolean> {
  return call('respondToCrossServiceRequest', [id, status, responseNote, respondedBy])
}

export function redirectWorkPlanItem(itemId: string, reason: string, userId: string): Promise<boolean> {
  return call('redirectWorkPlanItem', [itemId, reason, userId])
}

// ============ OVERRIDE / REDIRECT SYSTEM ============

export function createOverrideOrder(data: {
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
  return call('createOverrideOrder', [data])
}

export function pauseWorkPlan(planId: string, reason: string, userId: string): Promise<boolean> {
  return call('pauseWorkPlan', [planId, reason, userId])
}

export function fetchWorkRedirects(planId?: string): Promise<WorkRedirect[]> {
  return call('fetchWorkRedirects', [planId])
}

export function fetchSuspendedPlans(serviceId?: string): Promise<WorkPlan[]> {
  return call('fetchSuspendedPlans', [serviceId])
}

export function fetchFastTrackPlans(serviceId?: string): Promise<WorkPlan[]> {
  return call('fetchFastTrackPlans', [serviceId])
}

// ============ CANCEL / BULK DELETE ============

export function cancelWorkPlan(id: string, reason: string, userId: string): Promise<void> {
  return call('cancelWorkPlan', [id, reason, userId])
}

export function cancelWorkPlansBulk(ids: string[], reason: string, userId: string): Promise<void> {
  return call('cancelWorkPlansBulk', [ids, reason, userId])
}

export function deleteStaleWorkPlans(olderThanDays: number): Promise<number> {
  return call('deleteStaleWorkPlans', [olderThanDays])
}

// ============ DIRECTIVES ============

export function fetchDirectives(): Promise<Directive[]> {
  return call('fetchDirectives', [])
}

export function createDirective(
  data: Pick<Directive, 'title' | 'description' | 'priority' | 'plan_id' | 'suspend_plan' | 'service_id' | 'order_type' | 'location'>,
  userId: string
): Promise<Directive | null> {
  return call('createDirective', [data, userId])
}

export function updateDirectiveStatus(id: string, status: DirectiveStatus): Promise<void> {
  return call('updateDirectiveStatus', [id, status])
}

export function createDirectiveWithWorkers(
  directiveData: Pick<Directive, 'title' | 'description' | 'priority' | 'plan_id' | 'suspend_plan' | 'service_id' | 'order_type' | 'location'>,
  workers: Pick<DirectiveWorkerAssignment, 'worker_id' | 'worker_name' | 'source_plan_id' | 'source_plan_name'>[],
  userId: string
): Promise<Directive | null> {
  return call('createDirectiveWithWorkers', [directiveData, workers, userId])
}

export function fetchDirectiveWorkers(directiveId: string): Promise<DirectiveWorkerAssignment[]> {
  return call('fetchDirectiveWorkers', [directiveId])
}

export function fetchDirectivesWithWorkers(): Promise<(Directive & { workers: DirectiveWorkerAssignment[] })[]> {
  return call('fetchDirectivesWithWorkers', [])
}

export function fetchPulledWorkerIds(planDate: string): Promise<Set<string>> {
  return call('fetchPulledWorkerIds', [planDate])
}

export function fetchServiceOrderTypes(serviceId: string): Promise<ServiceOrderType[]> {
  return call('fetchServiceOrderTypes', [serviceId])
}

export function fetchActiveStatusesOnDate(
  userIds: string[],
  dateStr: string
): Promise<Map<string, EmployeeStatusType>> {
  return call('fetchActiveStatusesOnDate', [userIds, dateStr])
}

// ============ DRIVER MANUAL SHIFTS ============

export function fetchDriverManualShifts(dateFrom: string, dateTo: string): Promise<DriverManualShift[]> {
  return call('fetchDriverManualShifts', [dateFrom, dateTo])
}

export function upsertDriverManualShift(
  userId: string,
  shiftDate: string,
  shiftType: 'I' | 'II' | 'OFF',
  createdBy: string,
  notes?: string
): Promise<boolean> {
  return call('upsertDriverManualShift', [userId, shiftDate, shiftType, createdBy, notes])
}

export function deleteDriverManualShift(userId: string, shiftDate: string): Promise<boolean> {
  return call('deleteDriverManualShift', [userId, shiftDate])
}

// ============ SAFETY / ТБиОТ ============

export function fetchCertTypes(activeOnly = false): Promise<CertType[]> {
  return call('fetchCertTypes', [activeOnly])
}

export function upsertCertType(ct: Partial<CertType>): Promise<CertType | null> {
  return call('upsertCertType', [ct])
}

export function deleteCertType(id: string): Promise<boolean> {
  return call('deleteCertType', [id])
}

export function fetchEmployeeCerts(employeeId?: string): Promise<EmployeeCert[]> {
  return call('fetchEmployeeCerts', [employeeId])
}

export function upsertEmployeeCert(cert: Partial<EmployeeCert>): Promise<EmployeeCert | null> {
  return call('upsertEmployeeCert', [cert])
}

export function upsertLinkedCert(cert: Partial<EmployeeCert>): Promise<EmployeeCert | null> {
  return call('upsertLinkedCert', [cert])
}

export function fetchUnlinkedCerts(): Promise<EmployeeCert[]> {
  return call('fetchUnlinkedCerts', [])
}

export function linkCertToEmployee(certId: string, employeeId: string): Promise<boolean> {
  return call('linkCertToEmployee', [certId, employeeId])
}

export function deleteEmployeeCert(id: string): Promise<boolean> {
  return call('deleteEmployeeCert', [id])
}

export function fetchCertRequirements(): Promise<CertRequirement[]> {
  return call('fetchCertRequirements', [])
}

export function upsertCertRequirement(req: Partial<CertRequirement>): Promise<CertRequirement | null> {
  return call('upsertCertRequirement', [req])
}

export function deleteCertRequirement(id: string): Promise<boolean> {
  return call('deleteCertRequirement', [id])
}

export function fetchAllCertsWithEmployees(): Promise<EmployeeCert[]> {
  return call('fetchAllCertsWithEmployees', [])
}

export function markWorkPlanPermit(planId: string, permitNumber: string): Promise<boolean> {
  return call('markWorkPlanPermit', [planId, permitNumber])
}

// ─── Auth + Logging ──────────────────────────────────────────────────────────

export async function loginWithPin(tabNumber: string, pin: string): Promise<{ ok: boolean; session?: AuthSession; error?: string }> {
  // Dedicated route: sets the httpOnly session cookie used by /api/db
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tabNumber, pin }),
  })
  return res.json()
}

export function serverLogout(): void {
  // Fire-and-forget: clears the httpOnly session cookie
  void fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
}

export function logAction(userId: string, actionType: string, entityType?: string | null, entityId?: string | null, details?: Record<string, unknown> | null): Promise<void> {
  return call('logAction', [userId, actionType, entityType, entityId, details])
}

// ─── System Alerts ───────────────────────────────────────────────────────────

export function fetchSystemAlerts(opts: { role: RoleLevel; serviceId?: string | null }): Promise<SystemAlert[]> {
  return call('fetchSystemAlerts', [opts])
}

// ─── Home page live counters ─────────────────────────────────────────────────

export function fetchHomeCounters(): Promise<HomeCounters> {
  return call('fetchHomeCounters', [])
}

// ─── Raw helpers ─────────────────────────────────────────────────────────────

export function updateRequestStatusRaw(requestId: string, status: string): Promise<boolean> {
  return call('updateRequestStatusRaw', [requestId, status])
}

export function fetchAllRemarks(): Promise<Remark[]> {
  return call('fetchAllRemarks', [])
}

export function fetchUserRequestIds(userId: string): Promise<string[]> {
  return call('fetchUserRequestIds', [userId])
}

export type { AlertLevel, SystemAlert }

// ============ JOURNAL — daily plans (миграция 042) ============

export function fetchJournalObjectCategories(): Promise<JournalObjectCategory[]> {
  return call('fetchJournalObjectCategories', [])
}

export function fetchJournalObjects(): Promise<JournalObject[]> {
  return call('fetchJournalObjects', [])
}

export function createJournalObject(obj: Partial<JournalObject>): Promise<JournalObject | null> {
  return call('createJournalObject', [obj])
}

export function updateJournalObject(id: string, updates: Partial<JournalObject>): Promise<JournalObject | null> {
  return call('updateJournalObject', [id, updates])
}

export function deleteJournalObject(id: string): Promise<boolean> {
  return call('deleteJournalObject', [id])
}

export function fetchDailyPlanItems(planDate: string): Promise<DailyPlanItem[]> {
  return call('fetchDailyPlanItems', [planDate])
}

export function createDailyPlanItem(item: Partial<DailyPlanItem>): Promise<DailyPlanItem | null> {
  return call('createDailyPlanItem', [item])
}

export function updateDailyPlanItem(id: string, updates: Partial<DailyPlanItem>): Promise<DailyPlanItem | null> {
  return call('updateDailyPlanItem', [id, updates])
}

export function deleteDailyPlanItem(id: string): Promise<boolean> {
  return call('deleteDailyPlanItem', [id])
}

// ============ WORK PERMIT CATALOG — наряд-допуск (миграция 043) ============

export function fetchWorkPermitTypes(): Promise<WorkPermitType[]> {
  return call('fetchWorkPermitTypes', [])
}

export function createWorkPermitType(t: Partial<WorkPermitType>): Promise<WorkPermitType | null> {
  return call('createWorkPermitType', [t])
}

export function updateWorkPermitType(id: string, updates: Partial<WorkPermitType>): Promise<WorkPermitType | null> {
  return call('updateWorkPermitType', [id, updates])
}

export function deleteWorkPermitType(id: string): Promise<boolean> {
  return call('deleteWorkPermitType', [id])
}

export function fetchWorkPermitServiceTypes(serviceId: string): Promise<WorkPermitServiceType[]> {
  return call('fetchWorkPermitServiceTypes', [serviceId])
}

export function setServiceWorkPermitType(row: WorkPermitServiceType): Promise<boolean> {
  return call('setServiceWorkPermitType', [row])
}

export function removeServiceWorkPermitType(serviceId: string, typeId: string): Promise<boolean> {
  return call('removeServiceWorkPermitType', [serviceId, typeId])
}

export function fetchServiceWorkPermitTypes(serviceId: string): Promise<ResolvedWorkPermitType[]> {
  return call('fetchServiceWorkPermitTypes', [serviceId])
}
