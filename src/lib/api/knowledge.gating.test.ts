// Guard test (D-20, T-08-12, ASVS V4/V13): every mutation exported from
// src/lib/api/knowledge.ts is auto-reachable through /api/db by name, so each
// must be ADMIN-gated in ROLE_RESTRICTED and must have a hand-kept typed wrapper
// in api-client.ts. This test derives the function list FROM the source file, so
// a seventh function added later is covered without editing the test.
//
// It is a text-level assertion (node:fs reads only) — not an API test — so it
// stays inside CLAUDE.md's "tests cover pure logic" rule. It imports neither
// supabase, next/server nor the route module.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, '..', '..', '..')

const knowledgeSrc = readFileSync(join(HERE, 'knowledge.ts'), 'utf8')
const routeSrc = readFileSync(join(REPO, 'src/app/api/db/route.ts'), 'utf8')
const clientSrc = readFileSync(join(REPO, 'src/lib/api-client.ts'), 'utf8')

// Every `export async function <name>` in knowledge.ts.
const exportedFns = [...knowledgeSrc.matchAll(/export\s+async\s+function\s+([A-Za-z0-9_]+)/g)].map((m) => m[1])

const MUTATION_PREFIX = /^(create|update|delete)/
const READONLY_PREFIX = /^(fetch|find)/

const mutations = exportedFns.filter((n) => MUTATION_PREFIX.test(n))
const readOnly = exportedFns.filter((n) => READONLY_PREFIX.test(n))

// The read-only functions that are intentionally left open to any valid session
// (matching how fetchWorkTypes is open today — aliases carry no personal data).
// Spelled out so a future sensitive read cannot slip in unnoticed: if someone
// adds another fetch*/find* to knowledge.ts, this list no longer matches the
// derived set and the test fails until the addition is reviewed here.
const INTENTIONALLY_UNGATED_READS = ['fetchEntityAliases', 'findAliasCollisions']

// Isolate the `const ROLE_RESTRICTED: Record<...> = { ... }` object literal.
function roleRestrictedBlock(): string {
  const start = routeSrc.indexOf('ROLE_RESTRICTED')
  expect(start, 'route.ts must declare ROLE_RESTRICTED').toBeGreaterThan(-1)
  const open = routeSrc.indexOf('{', start)
  const close = routeSrc.indexOf('}', open)
  return routeSrc.slice(open, close + 1)
}

describe('knowledge.ts /api/db exposure guard (D-20, T-08-12)', () => {
  it('finds the six KB API functions in the source', () => {
    expect(exportedFns).toEqual(
      expect.arrayContaining([
        'fetchEntityAliases',
        'createEntityAlias',
        'updateEntityAlias',
        'deleteEntityAlias',
        'findAliasCollisions',
        'updateWorkTypeAttributes',
      ]),
    )
  })

  it('classifies every exported function as either a mutation or a read', () => {
    const unclassified = exportedFns.filter((n) => !MUTATION_PREFIX.test(n) && !READONLY_PREFIX.test(n))
    expect(unclassified, `unclassified knowledge.ts exports: ${unclassified.join(', ')}`).toEqual([])
  })

  it('gates every create/update/delete mutation to ADMIN only in ROLE_RESTRICTED', () => {
    const block = roleRestrictedBlock()
    expect(mutations.length).toBeGreaterThanOrEqual(4)
    for (const name of mutations) {
      const gated = new RegExp(`${name}\\s*:\\s*\\[\\s*'ADMIN'\\s*\\]`)
      expect(gated.test(block), `${name} must be mapped to exactly ['ADMIN'] in ROLE_RESTRICTED`).toBe(true)
    }
  })

  it('leaves only the explicitly-reviewed read-only functions ungated', () => {
    expect([...readOnly].sort()).toEqual([...INTENTIONALLY_UNGATED_READS].sort())
    const block = roleRestrictedBlock()
    for (const name of INTENTIONALLY_UNGATED_READS) {
      expect(block.includes(`${name}:`), `${name} is a read — it must NOT appear in ROLE_RESTRICTED`).toBe(false)
    }
  })

  it('has a hand-kept typed client wrapper for every exported function', () => {
    for (const name of exportedFns) {
      const wrapper = new RegExp(`export\\s+function\\s+${name}\\s*\\(`)
      expect(wrapper.test(clientSrc), `api-client.ts must export a wrapper for ${name}`).toBe(true)
    }
  })
})
