import { supabase } from '../supabase'
import { logAction } from '../logger'
import type {
  User, AuthSession,
} from '@/types'

// ─── Auth (server-side PIN login) ────────────────────────────────────────────

export async function loginWithPin(tabNumber: string, pin: string): Promise<{ ok: boolean; session?: AuthSession; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('tab_number', tabNumber)
      .eq('is_active', true)
      .single()

    if (error || !data) return { ok: false, error: 'Пользователь не найден' }

    const user = data as User
    if (!user.pin_code) return { ok: false, error: 'PIN не назначен. Обратитесь к администратору.' }
    if (user.pin_code !== pin) return { ok: false, error: 'Неверный PIN-код' }

    const session: AuthSession = {
      user_id: user.user_id,
      tab_number: user.tab_number,
      full_name: user.full_name,
      role_level: user.role_level,
      service_id: user.service_id,
      position: user.position,
    }

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
