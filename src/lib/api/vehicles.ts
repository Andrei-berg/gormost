import { supabase } from '../supabase'
import type {
  User, WorkPlanItem, Vehicle, VehicleAssignment, VehicleWithAssignments, VehicleBreakdown,
  VehicleBreakdownWithVehicle, VehicleBreakdownSeverity, VehicleBreakdownStatus, VehicleStatus, EmployeeAssignmentWithScheduleCode, UserWithAssignment,
} from '@/types'

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
