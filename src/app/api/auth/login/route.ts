import { NextRequest, NextResponse } from 'next/server'
import { loginWithPin } from '@/lib/api'
import { createSessionToken } from '@/lib/session-token'

export async function POST(req: NextRequest) {
  try {
    const { tabNumber, pin } = await req.json() as { tabNumber: string; pin: string }
    const result = await loginWithPin(tabNumber, pin)
    if (!result.ok || !result.session) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 401 })
    }
    const res = NextResponse.json({ ok: true, session: result.session })
    res.cookies.set('gormost_token', createSessionToken(result.session), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 7 * 24 * 3600,
    })
    return res
  } catch {
    return NextResponse.json({ ok: false, error: 'Ошибка входа' }, { status: 500 })
  }
}
