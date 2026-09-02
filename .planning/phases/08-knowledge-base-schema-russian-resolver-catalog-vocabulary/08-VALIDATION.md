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

> Bound to plan tasks 2026-09-02. There is no separate Wave 0 plan: Vitest is already configured, so
> every test file below is authored **test-first inside the task that implements its module**
> (`tdd="true"` + a `<behavior>` block), which is the CLAUDE.md § Testing rule — tests before
> implementation code. The "Wave" column is the plan's execution wave.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-03 T1 | 08-03 | 2 | KB-04 | T-08-08 | `normalize()` deterministic: ё→е, №/N/#, dashes, quotes, NBSP, trailing punct, numeric token canonicalization, idempotent (D-11) | unit | `npx vitest run src/lib/kb/normalize.test.ts` | ❌ created by task | ⬜ pending |
| 08-03 T2 | 08-03 | 2 | KB-04 | T-08-10 | `expandAbbreviations()` curated dict expands `борт.`/`ж/б`/`эв`/`тт`/`п/п`/`ЛТР`… at token boundaries (D-10) | unit | `npx vitest run src/lib/kb/expandAbbreviations.test.ts` | ❌ created by task | ⬜ pending |
| 08-02 T1 | 08-02 | 2 | KB-04 | T-08-06 | `stem()` vendored Russian Porter/Snowball passes the official sample vocabulary; zero imports | unit | `npx vitest run src/lib/kb/stem.test.ts` | ❌ created by task | ⬜ pending |
| 08-02 T2 | 08-02 | 2 | KB-04 | T-08-07 | `lemmatize()` passes `__fixtures__/lemma-cases.ru.ts` — **D-12a mandatory gate**; any impl (spike or vendored stemmer) must pass | unit | `npx vitest run src/lib/kb/lemmatize.test.ts` | ❌ created by task | ⬜ pending |
| 08-02 T3 | 08-02 | 2 | KB-04 | T-08-SC | D-12 lemmatizer spike closed: sync + fixture-green + build-green + no new dependency; package adoption needs a blocking human sign-off | checkpoint | `npx vitest run src/lib/kb && npm run build` | n/a | ⬜ pending |
| 08-03 T3 | 08-03 | 2 | KB-04 | T-08-08 | `preprocess()` = expand → normalize → token-wise lemmatize, identical output for catalog/alias/dictation/Excel inputs (D-09) | unit | `npx vitest run src/lib/kb/preprocess.test.ts` | ❌ created by task | ⬜ pending |
| 08-01 T2 / 08-05 T1 | 08-01, 08-05 | 1, 3 | KB-01, KB-04 | T-08-02 | `buildKbIndex(rows)` pure transform: `journal_objects` + `work_types`(service_id≠null) + `entity_aliases` + `services` → `KbIndex`; skips aliases whose `canonical_id` is not in loaded rows; scope-agnostic (D-16) | unit | `npx vitest run src/lib/kb/index.test.ts` | ❌ created by task | ⬜ pending |
| 08-05 T1 | 08-05 | 3 | KB-04 | T-08-01 | `dice()` returns a float in [0,1], symmetric, never NaN; `levenshtein()` used only as an equal-score tiebreak; both vendored, zero deps | unit | `npx vitest run src/lib/kb/similarity.test.ts` | ❌ created by task | ⬜ pending |
| 08-01 T2 / 08-05 T2 | 08-01, 08-05 | 1, 3 | KB-04 | T-08-01, T-08-18 | `resolveEntity()` D-22 fixture set (~30): exact-alias, declension variant, abbrev expansion, multi-word object, **unknown → `unresolved` (not invented)**, empty → `unresolved` with `normalized: ''`, near-tie → `ambiguous`; 3-status contract (D-07); `opts.type` narrowing; threshold boundary pair; alias `weight` orders candidates & never promotes fuzzy (D-15) | unit | `npx vitest run src/lib/kb/resolve.test.ts` | ❌ created by task | ⬜ pending |
| 08-01 T3 | 08-01 | 1 | D-08 guard | T-08-03, T-08-04 | `src/lib/kb/*` imports nothing from `src/lib/api`, no supabase client, no server-only marker; no exported pipeline function is `async` | unit | `npx vitest run src/lib/kb/purity.test.ts` | ❌ created by task | ⬜ pending |
| 08-05 T3 | 08-05 | 3 | KB-03 | T-08-21 | alias collision predicate — a `surface_norm`+`canonical_type` with >1 distinct `canonical_id` is flagged; same-id duplicates and cross-type rows are not; a colliding surface resolves `ambiguous` (D-13) | unit | `npx vitest run src/lib/kb/collisions.test.ts` | ❌ created by task | ⬜ pending |
| 08-04 T3 | 08-04 | 2 | KB-02, KB-03 | T-08-12 | every `create`/`update`/`delete` export of `knowledge.ts` is ADMIN-gated in `ROLE_RESTRICTED` and has an `api-client.ts` wrapper (D-20, ASVS V4/V13) | unit | `npx vitest run src/lib/api/knowledge.gating.test.ts` | ❌ created by task | ⬜ pending |
| 08-07 T2 | 08-07 | 4 | KB-01 | T-08-28 | every seeded `entity_aliases` row's `surface_norm` literal equals `preprocess(surface_raw).normalized`; no duplicate surface+type tuple; ≥25 rows, all `source='seed'` (D-14, D-21) | unit | `npx vitest run src/lib/kb/seed-aliases.test.ts` | ❌ created by task | ⬜ pending |
| 08-06 T3 / 08-07 T2 | 08-06, 08-07 | 3, 4 | KB-01, KB-05 | T-08-22 | migration grep — no new table without `anon_all_<t>` (SC#1) | CI grep | `grep -l "create table" supabase/migrations/05[345]*.sql \| xargs -r grep -L anon_all` (expect no output) | ❌ created by task | ⬜ pending |
| 08-06 T1 | 08-06 | 3 | KB-02 | T-08-24 | live `work_types` / `journal_objects` shape dumped via `list_tables` and recorded BEFORE migration 053 is written (RESEARCH Pitfall 7) | checkpoint + file check | `test -f docs/catalog-map.md && grep -q work_types docs/catalog-map.md` | ❌ created by task | ⬜ pending |
| 08-06 T2 | 08-06 | 3 | KB-01, KB-02 | T-08-24 | one-way DDL (D-01, D-03, D-14) confirmed against the live shape by a human before any migration file is written | checkpoint | human decision recorded in SUMMARY | n/a | ⬜ pending |
| 08-07 T1 | 08-07 | 4 | KB-05 | T-08-30 | authoritative Гормост-Лефортово object list diffed against live `journal_objects` and confirmed with the user before seeding (D-21, RESEARCH Open Q #2) | checkpoint | human confirmation recorded in SUMMARY | n/a | ⬜ pending |
| 08-07 T3 | 08-07 | 4 | KB-01, KB-02 | T-08-27, T-08-31 | **[BLOCKING]** human applies 053 → 054 → 055 in the Supabase SQL Editor; `work_types` shows the four new columns, `entity_aliases` returns ≥25 rows through the anon-key client | manual + query | human runs the three confirmation queries; `npm run test && npm run build` | n/a | ⬜ pending |
| 08-08 T3 | 08-08 | 5 | KB-02 | T-08-32, T-08-33 | ADMIN sets service / unit / typical period / typical crew in «Виды работ», reloads, values persist (SC#2); counters reject negative and fractional input; create and delete preserved | manual UAT | `/gsd-verify-work`; `npm run build && npm run test` | n/a | ⬜ pending |
| 08-09 T3 | 08-09 | 6 | KB-03 | T-08-36, T-08-17 | ADMIN searches aliases, sees each `source`, gets a soft collision warning naming the existing canonical, confirms, and BOTH rows persist (SC#3); duplicate rejected with a readable message; `/journal` object combobox still correct after the `norm` re-point | manual UAT | `/gsd-verify-work`; `npm run build && npm run test` | n/a | ⬜ pending |
| 08-06 T1 / 08-07 T2 | 08-06, 08-07 | 3, 4 | KB-05 | — | `docs/catalog-map.md` exists and maps all four stores with cross-references, the polymorphic `canonical_id` targets, and the seeded object list (SC#5, D-05) | manual review + file check | `test -f docs/catalog-map.md && grep -q entity_aliases docs/catalog-map.md` | ❌ created by task | ⬜ pending |

---

## Wave 0 Requirements

Framework install: **none** — Vitest 4.1.2 is already configured in `vitest.config.ts`, so there is
no Wave 0 plan. Each test file below is authored test-first inside the task that implements its
module (CLAUDE.md § Testing), and the owning task is named beside it.

- [ ] `src/lib/kb/resolve.test.ts` + `src/lib/kb/__fixtures__/resolve-cases.ru.ts` — KB-04, D-22 — 08-01 T2 (starter), 08-05 T2 (~30 cases)
- [ ] `src/lib/kb/purity.test.ts` — D-08 guard — 08-01 T3
- [ ] `src/lib/kb/stem.test.ts` — KB-04 (cases from the snowballstem.org Russian sample vocabulary) — 08-02 T1
- [ ] `src/lib/kb/lemmatize.test.ts` + `src/lib/kb/__fixtures__/lemma-cases.ru.ts` — KB-04, D-12a — 08-02 T2
- [ ] `src/lib/kb/normalize.test.ts` — KB-04 — 08-03 T1
- [ ] `src/lib/kb/expandAbbreviations.test.ts` — KB-04 — 08-03 T2
- [ ] `src/lib/kb/preprocess.test.ts` — KB-04 — 08-03 T3
- [ ] `src/lib/api/knowledge.gating.test.ts` — KB-02/KB-03, D-20 — 08-04 T3
- [ ] `src/lib/kb/similarity.test.ts` — KB-04 — 08-05 T1
- [ ] `src/lib/kb/index.test.ts` — KB-01 — 08-01 T2 (created), 08-05 T1 (fuzzy postings)
- [ ] `src/lib/kb/collisions.test.ts` — KB-03, D-13 — 08-05 T3
- [ ] `src/lib/kb/seed-aliases.test.ts` — KB-01, D-14/D-21 — 08-07 T2

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

- [x] All tasks have `<automated>` verify or a `<human-check>` on a blocking checkpoint (every checkpoint task also carries an `<automated>` build/test command except the three pure-decision gates 08-01 T1, 08-06 T2 and 08-07 T1, whose output is a recorded decision)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify — every plan's tasks each run at least `npm run test` or `npm run build`
- [x] Wave 0 covers all MISSING references — no separate Wave 0 plan is needed (Vitest pre-configured); each missing test file is bound to the task that authors it test-first
- [x] No watch-mode flags (`vitest run` / `npx vitest run`, never bare `vitest`)
- [x] Feedback latency < 5s (quick run: `npx vitest run src/lib/kb`)
- [ ] `nyquist_compliant: true` set in frontmatter — set by `/gsd-validate-phase` after execution

**Approval:** bound to plan tasks 2026-09-02; pending execution
