---
phase: 08-knowledge-base-schema-russian-resolver-catalog-vocabulary
verified: 2026-09-09T12:30:00Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: none
  previous_score: n/a
---

# Phase 8: Knowledge base — schema, Russian resolver, catalog vocabulary — Verification Report

**Phase Goal:** The agent has a grounded vocabulary of the Гормост-Лефортово участок — objects, work types with service binding, units, typical period and crew, plus an alias table — keyed to the journal catalog, and a deterministic resolver that maps a Russian phrase to a real catalog ID or explicitly nothing.
**Verified:** 2026-09-09T12:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth (ROADMAP Success Criteria) | Status | Evidence |
|---|--------------------------------|--------|----------|
| 1 | Every new KB table ships in a migration that also creates its `anon_all_<table>` RLS policy and a rollback section; grep shows no new table without a policy | ✓ VERIFIED | `054_entity_aliases.sql` is the only `CREATE TABLE` in 053–055. It contains `alter table public.entity_aliases enable row level security` + `create policy anon_all_entity_aliases ... for all to anon, authenticated using(true) with check(true)` + a `-- ── ROLLBACK ──` section. 053 (ALTER only) and 055 (seed only) add no table and both carry rollback blocks. Repo-wide grep for `CREATE TABLE` without a matching policy flags only pre-existing `046_journal_shift_headers.sql` — nothing from Phase 8. No staging/log tables were introduced (those are Phase 9/10). |
| 2 | ADMIN sets & saves a work type's service/unit/typical period/typical crew in «Виды работ» and values persist across reload | ✓ VERIFIED | `src/components/admin/WorkTypeAttributesTab.tsx` (507 lines) — dedicated per-row editor: service `<select>`, unit `<input list>` datalist, period segmented toggle storing `DAY/NIGHT/AROUND` via `SHIFT_HOURS`, 4 crew counters with locked keys `workers/foremen/itr/vehicles`. Persists via `updateWorkTypeAttributes` (`src/lib/api/knowledge.ts`) which whitelists exactly the 4 attribute keys, `sanitizeCrew` rebuilds the jsonb from the 4 locked keys, period validated against `['DAY','NIGHT','AROUND']`. Column store added by migration 053 with a `CHECK (typical_period in ('DAY','NIGHT','AROUND'))`. Wired: `src/app/admin/page.tsx` imports the tab, `{ id: 'work_types', label: 'Виды работ' }`, renders `{tab === 'work_types' && <WorkTypeAttributesTab />}`. ADMIN-gated in `ROLE_RESTRICTED` (`updateWorkTypeAttributes: ['ADMIN']`), typed wrapper in `api-client.ts`. Human UAT on gormost.vercel.app recorded APPROVED, no defects (08-08-SUMMARY.md); migration 053 applied in Supabase (STATE.md). |
| 3 | ADMIN opens the alias manager, searches, sees each alias `source`, gets a visible collision warning on a colliding surface form | ✓ VERIFIED | `src/components/admin/AliasManagerTab.tsx` (589 lines) — search box filters on `surface_raw` / `surface_norm` / canonical name; `SOURCE_LABELS` + `SOURCE_BADGE` render a badge for all four `source` values (seed/manual/voice/correction) plus `weight` and the resolved canonical entity name. Add flow calls `findAliasCollisions(surfaceNorm, type, id)` BEFORE the write and, on a hit, shows a `useConfirm()` soft warning "«…» уже привязан к «…». Всё равно добавить?"; on confirm both rows persist (no hard block, no `conflicted` column). Unique-expression-index rejection is surfaced as a readable Russian message. Pure predicate `src/lib/kb/collisions.ts` (`findAllAliasCollisions` / `findAliasConflicts`) mirrors the DB query. Wired: `{ id: 'aliases', label: 'Синонимы' }` in `src/app/admin/page.tsx`. Mutations ADMIN-gated in `ROLE_RESTRICTED`. Human UAT recorded APPROVED, no defects (08-09-SUMMARY.md). |
| 4 | Against real Russian variants ("на Лефортовском тоннеле", "борт. камень", "ЭВ №3") the pure resolver returns the correct ID via exact alias or normalized/lemmatized fuzzy match; unknown phrase → null reported unresolved — covered by `npm run test` | ✓ VERIFIED | `src/lib/kb/resolve.ts` (166 lines) — pure synchronous `resolveEntity(phrase, index, opts?)` returning exactly one of the D-07 shapes (`resolved` / `ambiguous` / `unresolved`), ladder alias → exact-name → fuzzy (lemma-overlap 0.65 + trigram-Dice 0.35, cap 0.94), config thresholds `low=0.6` / `tieMargin=0.08`, invented-entity guard (below-`low` → unresolved, never a synthesized id). `src/lib/kb/__fixtures__/resolve-cases.ru.ts` — 33 cases incl. all three named phrases (`на Лефортовском тоннеле` fuzzy declension, `борт. камень` abbreviation→alias, `ЭВ №3` abbreviation+marker), 5 unknown→null cases (`Серебряноборский тоннель`, `капитальный ремонт космодрома`, …), 2 ambiguous. `resolve.test.ts` asserts ≥30 cases / ≥3 unknown, method tags (`alias`/`exact`/`fuzzy`), invented-entity guard, threshold boundary flip, `opts.type` pre-scoring narrow, weight-orders-but-never-promotes. `npm run test` → **519 passed / 18 files**. `npm run build` → passes. |
| 5 | Resolver scope limited to Гормост-Лефортово участок; every resolved object identity is a `journal_objects` row (not a parallel tree); the catalog map is documented in `docs/catalog-map.md`, pointed to from CLAUDE.md | ✓ VERIFIED | `buildKbIndex` (`src/lib/kb/index.ts`) builds the object id set from `rows.objects: JournalObject[]`; `canonical_type='object'` → `journal_objects.id` (D-02). No `kb_locations` / parallel entity table exists. Migration 055 seeds 8 Гормост-Лефортово `journal_objects` rows (ЛТР L/R, Шереметьевский, Митьковский, Нижегородский, Пешеходный тоннель ТТК, ЗБ ЛТР, ЗБ ГТР) + a `BRIDGE` category + 28 `source='seed'` aliases, all участок-scoped. `docs/catalog-map.md` (233 lines) documents the 4 stores (admin tree / journal catalog / work-permit catalog / KB enrichment), cross-references, and names store 2 `journal_objects` as resolver object identity. `CLAUDE.md` Key Files lists `docs/catalog-map.md` — "living map of the 4 reference-data stores … and which store owns object identity for the resolver (`journal_objects.id`)". |

**Score:** 5/5 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/053_kb_work_type_attributes.sql` | ALTER work_types +4 cols, ALTER journal_objects +3 cols, CHECK on typical_period, rollback | ✓ VERIFIED | `add column if not exists` for `service_id` (FK services), `unit`, `typical_period` (CHECK DAY/NIGHT/AROUND), `typical_crew jsonb`; journal_objects `inv_no`/`area_m2`/`title_meta`; rollback block present. Header documents why no RLS block (work_types RLS disabled, journal_objects already policied). |
| `supabase/migrations/054_entity_aliases.sql` | entity_aliases table (D-14 DDL) + anon_all policy + unique/lookup indexes + rollback | ✓ VERIFIED | Full D-14 column set, polymorphic `canonical_id` (no FK, documented), `scope_object_id` FK→journal_objects ON DELETE CASCADE, unique expression index `(surface_norm, canonical_type, coalesce(scope_object_id::text,''))`, lookup index `(canonical_type, canonical_id)`, RLS enable + `anon_all_entity_aliases`, rollback block. |
| `supabase/migrations/055_kb_seed_lefortovo.sql` | Лефортово journal_objects + BRIDGE category + starter work_type attribution + ~28 seed aliases, idempotent, rollback | ✓ VERIFIED | `BRIDGE` category, 8 objects with deterministic uuids `ON CONFLICT DO NOTHING`, 5 live work_types attributed via `UPDATE ... WHERE work_type_id=`, 28 `entity_aliases` rows `source='seed'` `ON CONFLICT DO NOTHING`. `surface_norm` literals asserted equal to `preprocess(surface_raw).normalized` by `seed-aliases.test.ts`. Rollback keyed to seeded ids. |
| `src/lib/kb/resolve.ts` | pure `resolveEntity` — D-07 3-status contract, alias→exact→fuzzy ladder | ✓ VERIFIED | 166 lines, zero imports outside `src/lib/kb/`, synchronous, invented-entity guard. |
| `src/lib/kb/index.ts` | `buildKbIndex` — pure transform, filters work_types on `service_id != null`, drops dangling alias refs | ✓ VERIFIED | 80 lines; `idsByType` guard, D-01 maturity filter, scope ignored (D-16). |
| `src/lib/kb/{normalize,expandAbbreviations,stem,lemmatize,preprocess,similarity,collisions}.ts` | shared Russian pipeline + similarity primitives + collision predicate | ✓ VERIFIED | All present and substantive (42 / 57 / 191 / 11 / 34 / 93 / 75 lines); each has a `*.test.ts` beside it; all pass. |
| `src/lib/kb/__fixtures__/{resolve,lemma}-cases.ru.ts` | KB-04 fixture battery + D-12a lemma gate | ✓ VERIFIED | resolve-cases 33 entries, lemma-cases 68 lines; both are mandatory `npm run test` gates. |
| `src/lib/api/knowledge.ts` | CRUD for entity_aliases + narrow ADMIN-gated work-type attribute writer + collision query | ✓ VERIFIED | 128 lines: `fetch/create/update/deleteEntityAlias`, `findAliasCollisions`, `updateWorkTypeAttributes` (4-key whitelist, `sanitizeCrew`, period validation). `surface_norm` always derived server-side from `preprocess`. |
| `src/components/admin/WorkTypeAttributesTab.tsx` | dedicated «Виды работ» editor (D-17/D-18) | ✓ VERIFIED | 507 lines, wired into admin router, search + «Без службы»/«Не заполнено» chips + breadcrumb + bulk «Проставить службу выбранным». |
| `src/components/admin/AliasManagerTab.tsx` | «Синонимы» alias manager (D-19), D-13 soft collision warning | ✓ VERIFIED | 589 lines, wired into admin router, source badges, search, EntityPicker (ObjectCombobox pattern), pre-write collision check via `useConfirm`. |
| `docs/catalog-map.md` | KB-05 catalog reconciliation map | ✓ VERIFIED | 233 lines; 4-store table, cross-reference block, resolver object-identity call-out. Referenced from CLAUDE.md Key Files. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `src/app/admin/page.tsx` | `WorkTypeAttributesTab` | import + `tab === 'work_types'` render, `label: 'Виды работ'` | ✓ WIRED | lines 15, 56, 83 |
| `src/app/admin/page.tsx` | `AliasManagerTab` | import + `tab === 'aliases'` render, `label: 'Синонимы'` | ✓ WIRED | lines 16, 57, 84 |
| `WorkTypeAttributesTab` | `updateWorkTypeAttributes` | `@/lib/api-client` wrapper → `/api/db` → `knowledge.ts` | ✓ WIRED | api-client.ts:1015, route.ts ROLE_RESTRICTED line 23 |
| `AliasManagerTab` | `createEntityAlias` / `findAliasCollisions` | `@/lib/api-client` wrappers → `/api/db` → `knowledge.ts` | ✓ WIRED | api-client.ts:991–1012, route.ts ROLE_RESTRICTED lines 20–22 |
| `resolve.test.ts` | `resolveEntity` + `buildKbIndex` + fixture battery | direct import, 33 cases executed | ✓ WIRED | all pass in `npm run test` |
| `seed-aliases.test.ts` | `supabase/migrations/055_*.sql` | parses the migration file, re-derives every `surface_norm` via `preprocess` | ✓ WIRED | passes (part of 58-test kb/gating subset) |
| `knowledge.gating.test.ts` | `ROLE_RESTRICTED` in `route.ts` | asserts every `knowledge.ts` mutation is ADMIN-gated | ✓ WIRED | passes |
| `CLAUDE.md` | `docs/catalog-map.md` | Key Files pointer line | ✓ WIRED | present |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `WorkTypeAttributesTab` | `workTypes` | `fetchWorkTypes()` → `/api/db` → Supabase `work_types` | ✓ | ✓ FLOWING |
| `AliasManagerTab` | `aliases` | `fetchEntityAliases()` → Supabase `entity_aliases` (seeded by 055) | ✓ | ✓ FLOWING |
| `resolveEntity` | `index` | `buildKbIndex(journal_objects + work_types + entity_aliases + services)` | ✓ (pure, caller-fed; fixtures in tests) | ✓ FLOWING |
| `AliasManagerTab` collision banner | `collisions` | `findAliasCollisions()` → Supabase `.eq(surface_norm).eq(canonical_type).neq(canonical_id)` | ✓ | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite (SC#4 automated gate) | `npm run test` | `Test Files 18 passed (18) / Tests 519 passed (519)` | ✓ PASS |
| Production build (CLAUDE.md commit gate) | `npm run build` | `✓ Compiled successfully`, TypeScript OK, 23 routes generated | ✓ PASS |
| KB seed / purity / ADMIN-gating tests | `npx vitest run src/lib/kb/seed-aliases.test.ts src/lib/kb/purity.test.ts src/lib/api/knowledge.gating.test.ts` | `3 passed / 58 tests` | ✓ PASS |
| Migrations with a new table but no RLS policy | grep `CREATE TABLE` across `supabase/migrations/*.sql` | only pre-existing `046`; nothing from Phase 8 | ✓ PASS |
| Debt markers in phase files | grep `TODO\|FIXME\|XXX\|HACK\|PLACEHOLDER` in `src/lib/kb/`, `knowledge.ts`, both admin tabs, `catalog-map.md` (excl. tests/fixtures) | no matches | ✓ PASS |

### Probe Execution

No probes declared for this phase (no `scripts/*/tests/probe-*.sh`, not a migration-tooling phase in that sense). Skipped.

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|--------------|-------------|--------|----------|
| KB-01 | 08-01, 08-05, 08-06, 08-07 | `entity_aliases` table (surface/type/id/scope/weight/source/created_by) + `anon_all_entity_aliases` | ✓ SATISFIED | migration 054 (DDL + policy + indexes + rollback); `EntityAlias` type; `buildKbIndex` loads/guards alias rows; `seed-aliases.test.ts` |
| KB-02 | 08-04, 08-06, 08-07, 08-08 | `work_types` agent attributes (`service_id`/`unit`/`typical_period`/`typical_crew`) editable in `/admin` → «Виды работ» | ✓ SATISFIED | migration 053 (columns + CHECK); `updateWorkTypeAttributes`; `WorkTypeAttributesTab` wired; human UAT APPROVED |
| KB-03 | 08-04, 08-05, 08-09 | ADMIN alias CRUD: search, `source` visible, collision warning | ✓ SATISFIED | `AliasManagerTab` wired; `collisions.ts` pure predicate; `findAliasCollisions`; ADMIN-gated; human UAT APPROVED |
| KB-04 | 08-01, 08-02, 08-03, 08-05 | Resolver: exact alias + fuzzy via shared RU normalize/lemmatize pipeline; below threshold → unresolved, no invented entity | ✓ SATISFIED | `normalize`/`expandAbbreviations`/`stem`/`lemmatize`/`preprocess`/`resolve`/`index` + `resolve-cases.ru.ts` (33) + `lemma-cases.ru.ts`; 519 tests pass |
| KB-05 | 08-06, 08-07 | Scope = Гормост-Лефортово участок only; KB keyed to `journal_objects`, not a 4th island; catalog map documented | ✓ SATISFIED | `docs/catalog-map.md` + CLAUDE.md pointer; migration 055 seeds 8 участок `journal_objects`; resolver object identity = `journal_objects.id` (D-02); no parallel table |

All requirement IDs declared across the 9 plan frontmatters (KB-01…KB-05) are accounted for. `.planning/REQUIREMENTS.md` traceability marks all five **Complete** for Phase 8. No orphaned requirements — no other ID maps to Phase 8.

### Anti-Patterns Found

None. No `TODO`/`FIXME`/`XXX`/`HACK`/`PLACEHOLDER` in phase-modified source. `src/lib/kb/` purity is enforced by `purity.test.ts`; ADMIN-gating of KB mutations is enforced by `knowledge.gating.test.ts`; both pass.

### Human Verification Required

None outstanding. The two UI-behaviour success criteria (SC#2 «Виды работ» persistence, SC#3 «Синонимы» search + source + collision warning) were exercised by human UAT on the deployed site and recorded APPROVED with no defects in 08-08-SUMMARY.md and 08-09-SUMMARY.md. The resolver behaviour (SC#4) is exercised by the 33-case fixture battery in `npm run test`.

### Notes (informational, not gaps)

1. **Migration application is asserted, not verifier-observed.** The agent cannot run migrations or query the live DB; 053/054/055 being applied in Supabase is recorded in STATE.md and the task brief. Consistent with the project's human-runs-migrations workflow.
2. **`BRIDGE` category seeded with zero bridge object rows.** KB-05 scope names "мосты участка"; the authoritative bridge names were not available at seed time, so migration 055 creates the category ready and leaves a human to add the rows. This is deliberate starter-seed behaviour (D-21) — Phase 9 ingest refines the vocabulary. The phase goal (a grounded, resolvable участок vocabulary) is met by the 8 tunnel/ЗБ objects + 28 aliases already seeded.
3. **"Scope limited to участок" is enforced by seed content, not resolver code.** `resolveEntity` resolves against whatever `KbIndex` it is handed; scope-aware filtering (`scope_object_id`) is intentionally deferred to v3.x (D-16). The seeded index contains only участок entities, satisfying SC#5 as written.

### Gaps Summary

No gaps. All 5 ROADMAP success criteria are verified against the codebase, all 5 KB requirements are satisfied, `npm run test` (519 tests) and `npm run build` both pass, and the two UI success criteria carry recorded human-UAT approval.

### Post-Verification Addendum (2026-09-09) — code review CR-01

The `gsd-code-review` pass on the 36 phase-modified source files raised one blocker:

- **CR-01** — migration 054's `uq_entity_aliases_surface` unique index keyed only `(surface_norm, canonical_type, coalesce(scope_object_id::text,''))`, omitting `canonical_id`. This made the D-13 "confirmed collision → both rows persist" path impossible: the second `createEntityAlias` insert hit a `unique_violation`. Confirmed against the live DB. Partially undermined SC#3 (the warning showed, but "add anyway" failed).

**Resolution:** migration `056_entity_aliases_collision_unique_fix.sql` adds `canonical_id` to the index key. Applied by the human in the Supabase SQL Editor on 2026-09-09 and re-verified against the live DB:
- index is now `(surface_norm, canonical_type, coalesce(scope_object_id::text,''), canonical_id)`;
- two distinct canonicals for one surface now coexist (D-13 collision path ✓);
- an exact duplicate (same `canonical_id`) is still rejected (UAT step 5 ✓);
- 28 seed aliases intact.

SC#3 now fully verified. The 7 code-review WARNINGs are non-blocking and carried forward as a post-phase hardening pass (see STATE.md Blockers/Concerns).

---

_Verified: 2026-09-09T12:30:00Z_
_Verifier: Claude (gsd-verifier)_
_Addendum: 2026-09-09 — CR-01 resolved via migration 056, re-verified against live DB_
