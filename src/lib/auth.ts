import { supabase } from './supabase'
import { logAction } from './logger'
import type { AuthSession, User, RoleLevel } from '@/types'

const SESSION_KEY = 'gormost_session'

export function getSession(): AuthSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AuthSession
  } catch {
    return null
  }
}

export function setSession(session: AuthSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

export function hasRole(session: AuthSession | null, allowed: RoleLevel[]): boolean {
  if (!session) return false
  return allowed.includes(session.role_level)
}

export async function loginWithPin(tabNumber: string, pin: string): Promise<{ ok: boolean; session?: AuthSession; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('tab_number', tabNumber)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      return { ok: false, error: 'Пользователь не найден' }
    }

    const user = data as User

    if (!user.pin_code) {
      return { ok: false, error: 'PIN не назначен. Обратитесь к администратору.' }
    }

    if (user.pin_code !== pin) {
      return { ok: false, error: 'Неверный PIN-код' }
    }

    const session: AuthSession = {
      user_id: user.user_id,
      tab_number: user.tab_number,
      full_name: user.full_name,
      role_level: user.role_level,
      service_id: user.service_id,
      position: user.position,
    }

    setSession(session)

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

export function logout(): void {
  const session = getSession()
  if (session) {
    logAction(session.user_id, 'LOGOUT', 'user', session.user_id, null)
  }
  clearSession()
}
