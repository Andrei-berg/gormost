import { NextRequest, NextResponse } from 'next/server'
import * as api from '@/lib/api'

type ApiKey = keyof typeof api

function serialize(data: unknown): unknown {
  if (data instanceof Map) return { __map: true, entries: Array.from(data.entries()) }
  if (data instanceof Set) return { __set: true, values: Array.from(data) }
  return data
}

export async function POST(req: NextRequest) {
  try {
    const { fn, args } = await req.json() as { fn: string; args: unknown[] }
    if (!(fn in api)) {
      return NextResponse.json({ error: `Unknown function: ${fn}` }, { status: 400 })
    }
    const func = api[fn as ApiKey] as (...a: unknown[]) => Promise<unknown>
    const result = await func(...args)
    return NextResponse.json({ data: serialize(result) })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
