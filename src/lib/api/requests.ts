import { supabase } from '../supabase'
import { logAction } from '../logger'
import type {
  Request, RequestAssignment, StaffRequest, Remark, ChangelogEntry, RequestStatus,
  StaffRequestStatus,
} from '@/types'

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
