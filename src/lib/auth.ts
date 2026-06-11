import { loginWithPin as loginWithPinServer, serverLogout, logAction } from './api-client'
import type { AuthSession, RoleLevel } from '@/types'

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
  const result = await loginWithPinServer(tabNumber, pin)
  if (!result.ok || !result.session) return { ok: false, error: result.error }
  setSession(result.session)
  return { ok: true, session: result.session }
}

export function logout(): void {
  const session = getSession()
  if (session) {
    logAction(session.user_id, 'LOGOUT', 'user', session.user_id, null)
  }
  serverLogout()
  clearSession()
}
