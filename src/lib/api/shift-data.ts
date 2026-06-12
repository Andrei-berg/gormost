import { supabase } from '../supabase'
import { logAction } from '../logger'
import type {
  User, ShiftPhase, EmployeeAssignmentWithScheduleCode, UserWithAssignment,
} from '@/types'

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
