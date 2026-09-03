import { NextRequest, NextResponse } from 'next/server'
import * as api from '@/lib/api'
import { verifySessionToken } from '@/lib/session-token'
import type { RoleLevel } from '@/types'

type ApiKey = keyof typeof api

// Functions that must never be reachable through the generic dispatcher
const BLOCKED = new Set(['loginWithPin'])

// Functions restricted to specific roles; everything else requires any valid session
const ROLE_RESTRICTED: Record<string, RoleLevel[]> = {
  createUser: ['ADMIN', 'BOSS', 'HR', 'ZAMPORAB'],
  updateUser: ['ADMIN', 'BOSS', 'HR', 'ZAMPORAB'],
  deleteUser: ['ADMIN', 'BOSS', 'HR', 'ZAMPORAB'],
  // ── KB (Phase 8, D-20) — ADMIN-only mutations. src/lib/api/knowledge.ts is
  //    barrel-exported so /api/db reaches every function by name; the reads
  //    (fetchEntityAliases, findAliasCollisions) stay open like fetchWorkTypes.
  //    knowledge.gating.test.ts fails the build if a mutation is added ungated.
  createEntityAlias: ['ADMIN'],
  updateEntityAlias: ['ADMIN'],
  deleteEntityAlias: ['ADMIN'],
  updateWorkTypeAttributes: ['ADMIN'],
}

function serialize(data: unknown): unknown {
  if (data instanceof Map) return { __map: true, entries: Array.from(data.entries()) }
  if (data instanceof Set) return { __set: true, values: Array.from(data) }
  return data
}

export async function POST(req: NextRequest) {
  try {
    const auth = verifySessionToken(req.cookies.get('gormost_token')?.value)
    if (!auth) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { fn, args } = await req.json() as { fn: string; args: unknown[] }
    if (BLOCKED.has(fn) || !(fn in api)) {
      return NextResponse.json({ error: `Unknown function: ${fn}` }, { status: 400 })
    }
    const allowedRoles = ROLE_RESTRICTED[fn]
    if (allowedRoles && !allowedRoles.includes(auth.role_level)) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const func = api[fn as ApiKey] as (...a: unknown[]) => Promise<unknown>
    const result = await func(...args)
    return NextResponse.json({ data: serialize(result) })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
