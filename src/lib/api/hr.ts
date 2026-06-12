import { supabase } from '../supabase'
import { logAction } from '../logger'
import type {
  User, RequestAssignment, EmployeeStatusType, EmployeeStatus, EnrichedEmployee, StatusMetadata,
  Profession, Schedule, EmployeePositionWithProfession, EmployeeAssignmentWithSchedule, EmployeeDetail,
} from '@/types'

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
