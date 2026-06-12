import { supabase } from '../supabase'
import type {
  User,
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

export async function updateUser(userId: string, updates: Partial<User>): Promise<{ data: User | null; errorMsg: string | null }> {
  const { data, error } = await supabase.from('users').update(updates).eq('user_id', userId).select().single()
  if (error) console.error('updateUser error:', error.code, error.message, error.details, error.hint)
  return { data: data as User | null, errorMsg: error ? `${error.code}: ${error.message}` : null }
}

export async function deleteUser(userId: string): Promise<boolean> {
  const { error } = await supabase.from('users').update({ is_active: false }).eq('user_id', userId)
  return !error
}
