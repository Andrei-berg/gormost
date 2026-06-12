import { supabase } from '../supabase'
import type {
  Request, HomeCounters,
} from '@/types'
import { certStatusFromDates } from '@/types'

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
