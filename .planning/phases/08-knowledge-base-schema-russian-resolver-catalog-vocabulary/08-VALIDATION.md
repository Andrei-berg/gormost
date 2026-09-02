---
phase: 8
slug: knowledge-base-schema-russian-resolver-catalog-vocabulary
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-02
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `08-RESEARCH.md` § "Validation Architecture" + § "Security Domain".

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 (`environment: 'node'`, `vite-tsconfig-paths` for `@/` aliases) |
| **Config file** | `vitest.config.ts` (already configured — no Wave 0 install) |
| **Quick run command** | `npx vitest run src/lib/kb` |
| **Full suite command** | `npm run test` (`vitest run` — 98 tests today, must stay green) |
| **Estimated runtime** | ~5s quick (`src/lib/kb`), ~15s full suite |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/kb` + `npm run lint` + `npx tsc --noEmit`
- **After every plan wave:** Run `npm run test` (full 98 + new) + `npm run build`
- **Before `/gsd-verify-work`:** Full suite green, `npm run build` green, migration grep clean (`grep -L anon_all supabase/migrations/054*.sql` → no output)
- **Max feedback latency:** ~5 seconds (quick run)

---

## Per-Task Verification Map

> Task IDs are assigned by the planner. Rows below are the requirement→test contract the
> planner must bind tasks to; every KB-04 unit row is a Wave 0 stub (test-first per CLAUDE.md TDD).

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | KB-04 | — | `normalize()` deterministic: ё→е, №/N/#, dashes, quotes, NBSP, trailing punct, numeric token canonicalization (D-11) | unit | `npx vitest run src/lib/kb/normalize.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | KB-04 | — | `expandAbbreviations()` curated dict expands `борт.`/`ж/б`/`эв`/`тт`/`п/п`/`ЛТР`… (D-10) | unit | `npx vitest run src/lib/kb/expandAbbreviations.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | KB-04 | — | `stem()` vendored Russian Porter/Snowball passes the official sample vocabulary | unit | `npx vitest run src/lib/kb/stem.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | KB-04 | T (data integrity) | `lemmatize()` passes `__fixtures__/lemma-cases.ru.ts` — **D-12a mandatory gate**; any impl (spike or vendored stemmer) must pass | unit | `npx vitest run src/lib/kb/lemmatize.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | KB-04 | — | `preprocess()` = expand → normalize → token-wise lemmatize, applied identically to catalog/alias/dictation/Excel inputs (D-09) | unit | `npx vitest run src/lib/kb/preprocess.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | KB-01, KB-04 | — | `buildKbIndex(rows)` pure transform: `journal_objects` + `work_types`(service_id≠null) + `entity_aliases` + `services` → `KbIndex`; skips aliases whose `canonical_id` is not in loaded rows | unit | `npx vitest run src/lib/kb/index.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | KB-04 | T (hallucination) | `resolveEntity()` D-22 fixture set (~30): exact-alias, declension variant, abbrev expansion, multi-word object, **unknown → `unresolved` (not invented)**, near-tie → `ambiguous`; 3-status contract (D-07); `opts.type` narrowing; alias `weight` orders candidates & never promotes fuzzy (D-15) | unit | `npx vitest run src/lib/kb/resolve.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | KB-08 guard | V1/V4 | `src/lib/kb/*` imports nothing from `src/lib/api`, no `server-only` (D-08) | unit/lint | `grep -rn "server-only\|@/lib/api\|from '\.\./api" src/lib/kb` → no output | ❌ W0 | ⬜ pending |
| TBD | TBD | — | KB-01, KB-05 | RLS-on-without-policy | migration grep — no new table without `anon_all_<t>` (SC#1) | CI grep | `grep -L anon_all supabase/migrations/054*.sql` (expect no output) | manual | ⬜ pending |
| TBD | TBD | — | KB-03 | integrity | alias collision predicate — a `surface_norm`+`canonical_type` with >1 distinct `canonical_id` is flagged | unit | `npx vitest run src/lib/kb` | ❌ W0 | ⬜ pending |

---

## Wave 0 Requirements

- [ ] `src/lib/kb/normalize.test.ts` — KB-04
- [ ] `src/lib/kb/expandAbbreviations.test.ts` — KB-04
- [ ] `src/lib/kb/stem.test.ts` — KB-04 (seed cases from snowballstem.org Russian sample vocabulary)
- [ ] `src/lib/kb/lemmatize.test.ts` + `src/lib/kb/__fixtures__/lemma-cases.ru.ts` — KB-04, D-12a
- [ ] `src/lib/kb/preprocess.test.ts` — KB-04
- [ ] `src/lib/kb/index.test.ts` — KB-01
- [ ] `src/lib/kb/resolve.test.ts` + `src/lib/kb/__fixtures__/resolve-cases.ru.ts` — KB-04, D-22
- [ ] `src/lib/kb/purity.test.ts` (or an ESLint `no-restricted-imports` rule scoped to `src/lib/kb/`) — D-08 guard
- [ ] Framework install: **none** — Vitest already configured in `vitest.config.ts`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ADMIN opens `/admin` → «Виды работ», sets service / unit / typical period (день/ночь/сутки) / typical crew (workers/foremen/itr/vehicles), saves, values persist across reload | KB-02 (SC#2) | Full-stack UI + Supabase round-trip; not pure logic (CLAUDE.md: tests cover business logic only) | `/gsd-verify-work` conversational UAT against the deployed/local `/admin` |
| ADMIN opens «Синонимы» tab, searches by surface or canonical, sees each row's `source` badge (seed/manual/voice/correction), gets an inline collision warning when adding a surface that already resolves to a different canonical of the same type; confirms; both rows persist | KB-03 (SC#3) | UI interaction + confirm dialog + DB write | `/gsd-verify-work` — add a colliding alias, confirm banner text «…» уже привязан к <X>, verify both rows survive and that surface then resolves `ambiguous` |
| `docs/catalog-map.md` exists and maps the admin tree ↔ `journal_objects`/`journal_object_categories` ↔ `work_permit_catalog` ↔ KB enrichment (`work_types` new columns + `entity_aliases`), including FKs / join keys and which store is canonical for what | KB-05 (SC#5) | Prose deliverable — correctness is a human review judgment | File present; reviewer confirms all four stores + cross-references documented, matches `08-RESEARCH.md` § "Catalog Map" |
| Migration `053_kb_work_type_attributes.sql` ALTERs match the **live** `work_types` shape | KB-01, KB-02 | `work_types` has no repo migration — created directly in Supabase; live column list must be dumped via `mcp__supabase-gormost__list_tables` before writing the ALTER | Executor runs `list_tables` first; human runs the migration in the Supabase SQL Editor and confirms no error |
| `entity_aliases` uniqueness enforced (D-14) | KB-03 | D-14 `UNIQUE NULLS NOT DISTINCT` is rejected by the Supabase SQL Editor validator (Pitfall 1) — fallback is a unique expression index on `coalesce(scope_object_id::text,'')` | Human pastes migration 054 into the SQL Editor; confirms the expression index is created without a syntax error |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags (`vitest run`, never `vitest` bare)
- [ ] Feedback latency < 5s (quick run: `npx vitest run src/lib/kb`)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
