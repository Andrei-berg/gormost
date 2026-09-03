// D-08 guard: every module under src/lib/kb/ must stay pure and client-safe so
// Phase 11 can import resolveEntity into a client component. No server-only
// marker, no src/lib/api import, no supabase client — those live in
// src/lib/api/knowledge.ts. The pipeline also stays synchronous (an async
// lemmatize would ripple into the frozen D-07 contract).
//
// Files are enumerated from the filesystem at run time, so a future file added
// to src/lib/kb/ is covered without editing this test.

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const KB_DIR = dirname(fileURLToPath(import.meta.url))
const GUARD_FILE = 'purity.test.ts'

// One list, exported so a failure message can name the specifier that matched.
export const FORBIDDEN_IMPORT_SPECIFIERS = [
  'server-only',
  '@/lib/api',
  '@/lib/supabase',
  '../api',
  '../supabase',
  './api',
  './supabase',
]

const PIPELINE_EXPORTS = ['preprocess', 'normalize', 'lemmatize', 'stem', 'resolveEntity', 'expandAbbreviations', 'buildKbIndex']

function collectTsFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...collectTsFiles(full))
    } else if ((entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) && entry.name !== GUARD_FILE) {
      out.push(full)
    }
  }
  return out
}

const files = collectTsFiles(KB_DIR)

describe('src/lib/kb purity guard (D-08)', () => {
  it('enumerates kb source files from the filesystem', () => {
    expect(files.length).toBeGreaterThan(5)
  })

  for (const file of files) {
    const rel = relative(KB_DIR, file)
    const src = readFileSync(file, 'utf8')
    const importLines = src
      .split('\n')
      .filter((line) => /\bfrom\s+['"]/.test(line) || /\brequire\(\s*['"]/.test(line) || /\bimport\s*\(\s*['"]/.test(line))

    it(`${rel} imports nothing server- or API-bound`, () => {
      for (const spec of FORBIDDEN_IMPORT_SPECIFIERS) {
        const hit = importLines.find((line) => line.includes(`'${spec}'`) || line.includes(`"${spec}"`))
        expect(hit, `${rel} must not import ${spec}`).toBeUndefined()
      }
    })

    it(`${rel} keeps the preprocess pipeline synchronous`, () => {
      for (const name of PIPELINE_EXPORTS) {
        const asyncFn = new RegExp(`export\\s+async\\s+function\\s+${name}\\b`)
        const asyncConst = new RegExp(`export\\s+const\\s+${name}\\s*[:=][^\\n]*\\basync\\b`)
        expect(asyncFn.test(src), `${rel}: ${name} must not be async`).toBe(false)
        expect(asyncConst.test(src), `${rel}: ${name} must not be async`).toBe(false)
      }
    })
  }
})
