import { supabase } from '../supabase'
import type {
  CertType, EmployeeCert, CertRequirement,
} from '@/types'

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
