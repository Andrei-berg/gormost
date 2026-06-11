import 'server-only'
import { createHmac, timingSafeEqual } from 'crypto'
import type { AuthSession } from '@/types'

// HMAC key is derived from an existing server secret so no new env var is
// required on Vercel. Rotating SUPABASE_ANON_KEY invalidates all sessions.
function hmacKey(): string {
  const base = process.env.SESSION_SECRET || process.env.SUPABASE_ANON_KEY
  if (!base) throw new Error('No SESSION_SECRET or SUPABASE_ANON_KEY for session signing')
  return base + ':gormost-session-v1'
}

const SESSION_TTL_MS = 7 * 24 * 3600 * 1000 // 7 days

export interface TokenPayload {
  user_id: string
  role_level: AuthSession['role_level']
  service_id: string | null
  exp: number
}

function sign(data: string): string {
  return createHmac('sha256', hmacKey()).update(data).digest('base64url')
}

export function createSessionToken(session: AuthSession): string {
  const payload: TokenPayload = {
    user_id: session.user_id,
    role_level: session.role_level,
    service_id: session.service_id,
    exp: Date.now() + SESSION_TTL_MS,
  }
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${data}.${sign(data)}`
}

export function verifySessionToken(token: string | undefined): TokenPayload | null {
  if (!token) return null
  const dot = token.lastIndexOf('.')
  if (dot < 0) return null
  const data = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  try {
    const expected = sign(data)
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString()) as TokenPayload
    if (!payload.user_id || !payload.role_level || payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}
