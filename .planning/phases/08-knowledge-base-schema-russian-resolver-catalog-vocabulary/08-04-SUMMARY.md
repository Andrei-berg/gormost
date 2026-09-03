---
phase: 08-knowledge-base-schema-russian-resolver-catalog-vocabulary
plan: 04
subsystem: api
tags: [knowledge-base, entity-aliases, api-db, role-restricted, typescript, security-gate]

# Dependency graph
requires:
  - phase: 08-01
    provides: "src/lib/kb/types.ts frozen contract (CanonicalType, TypicalCrew, TypicalPeriod, EntityAlias, KbWorkType), src/lib/kb/preprocess.ts"
provides:
  - "src/lib/api/knowledge.ts — entity_aliases CRUD (fetchEntityAliases, createEntityAlias, updateEntityAlias, deleteEntityAlias), findAliasCollisions (D-13 soft read), updateWorkTypeAttributes (narrow ADMIN-gated work_types writer)"
  - "6 typed client wrappers in src/lib/api-client.ts under a KNOWLEDGE BASE section"
  - "4 ROLE_RESTRICTED entries (createEntityAlias, updateEntityAlias, deleteEntityAlias, updateWorkTypeAttributes) -> ['ADMIN'] in src/app/api/db/route.ts"
  - "src/lib/api/knowledge.gating.test.ts — source-derived drift guard: mutation gating + wrapper presence + reviewed-reads whitelist"
  - "src/types/index.ts re-exports CanonicalType/TypicalCrew/TypicalPeriod/EntityAlias from the kb tree; WorkType +4 D-01 fields; JournalObject +3 D-03 fields"
affects: [08-06, 08-07, 08-09, phase-09, phase-11]

actuals:
  tokens: 3441
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Three-edit house pattern for a new /api/db domain module: barrel export in src/lib/api.ts + ROLE_RESTRICTED gate in route.ts + hand-kept api-client.ts wrappers, shipped atomically"
    - "Source-derived guard test: function names extracted from the module text (not a hardcoded list) so a later 7th function is covered automatically"
    - "Narrow attribute writer: explicit key whitelist + per-field sanitizer instead of spreading caller input into a Supabase update (T-08-13)"
    - "KB contract types defined once in src/lib/kb/types.ts, re-exported from @/types (kb -> types direction only, D-08 purity preserved)"

key-files:
  created:
    - src/lib/api/knowledge.ts
    - src/lib/api/knowledge.gating.test.ts
  modified:
    - src/types/index.ts
    - src/lib/api.ts
    - src/app/api/db/route.ts
    - src/lib/api-client.ts

key-decisions:
  - "TDD RED not committed (CLAUDE.md precedence, same as 08-01): guard test written + run RED locally (2 failing: missing ROLE_RESTRICTED gate, missing wrappers), then implemented to GREEN and committed as one `test(...)` commit. Bite re-verified by removing one ROLE_RESTRICTED entry."
  - "updateWorkTypeAttributes hardens beyond the RESEARCH sketch: explicit 4-key whitelist, typical_crew rebuilt from exactly {workers,foremen,itr,vehicles} as non-negative integers, typical_period runtime-validated against DAY|NIGHT|AROUND|null. Defense-in-depth for the /api/db boundary where TS types are erased (Rule 2)."
  - "New WorkType / JournalObject enrichment fields declared optional + nullable (service_id?: string | null, …) so pre-migration rows keep compiling through fetchWorkTypes/fetchJournalObjects (select *)."
  - "No import/no-cycle lint rule present; the type-only @/types <-> @/lib/kb/types cycle is inert (both edges `import type`, fully erased) — tsc and build clean."

patterns-established:
  - "knowledge.gating.test.ts is the drift guard for the KB slice — any future knowledge.ts mutation without an ADMIN gate or a client wrapper fails `npm run test`."

requirements-completed: [KB-02, KB-03]

coverage:
  - id: T-08-12
    description: "Every KB create/update/delete mutation is ADMIN-only in ROLE_RESTRICTED; guard test derives the list from source and fails the build on an ungated mutation"
    requirement: KB-03
    verification:
      - kind: unit
        ref: "src/lib/api/knowledge.gating.test.ts#gates every create/update/delete mutation to ADMIN only in ROLE_RESTRICTED"
        status: pass
      - kind: other
        ref: "manual bite check — removed updateWorkTypeAttributes entry -> test failed; restored -> green"
        status: pass
    human_judgment: false
  - id: T-08-13
    description: "updateWorkTypeAttributes writes only service_id/unit/typical_period/typical_crew keyed on work_type_id; caller input never spread; typical_crew rebuilt from the four locked keys; no required_* key reaches jsonb"
    requirement: KB-02
    verification:
      - kind: other
        ref: "code: explicit `if ('key' in attrs)` whitelist + sanitizeCrew() rebuild in src/lib/api/knowledge.ts; npx tsc --noEmit strict clean"
        status: pass
    human_judgment: false
  - id: T-08-14
    description: "createEntityAlias / updateEntityAlias derive surface_norm from preprocess(surface_raw).normalized, never from a caller-supplied value"
    requirement: KB-03
    verification:
      - kind: other
        ref: "code: `{ ...a, surface_raw, surface_norm: preprocess(surface_raw).normalized }` overrides any caller surface_norm; recompute guarded on `typeof patch.surface_raw === 'string'`"
        status: pass
    human_judgment: false
  - id: KB-02-idempotency
    description: "updateWorkTypeAttributes is a plain scalar overwrite — calling twice with the same payload leaves the row byte-identical (no accumulating field)"
    requirement: KB-02
    verification:
      - kind: other
        ref: "code review: single `.update(patch)` with no updated_at / version / append; unlike journal.ts updateDailyPlanItem which stamps updated_at"
        status: pass
    human_judgment: false
  - id: KB-03-wrappers
    description: "Exactly one typed api-client.ts wrapper per exported knowledge.ts function, kept in sync by hand; guard fails the build if one is missing"
    requirement: KB-03
    verification:
      - kind: unit
        ref: "src/lib/api/knowledge.gating.test.ts#has a hand-kept typed client wrapper for every exported function"
        status: pass
    human_judgment: false

duration: ~6min
completed: 2026-09-03
status: complete
---

# Phase 8 Plan 04: KB persistence layer + ADMIN gate Summary

**`entity_aliases` CRUD, the D-13 soft-collision lookup and a narrow ADMIN-gated `work_types` attribute writer now exist as a barrel-exported `src/lib/api/knowledge.ts` domain module, wired through the three-edit house pattern (barrel / `ROLE_RESTRICTED` / hand-kept `api-client.ts` wrappers) and locked by a source-derived guard test that fails the build if the module, the gate and the wrappers ever drift apart.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-09-03T09:25:15Z
- **Completed:** 2026-09-03T09:31:04Z
- **Tasks:** 3, each committed individually
- **Files:** 2 created, 4 modified, 298 insertions

## Accomplishments

- **Task 1 — shared types (`eadce0c`).** Re-exported `CanonicalType`, `TypicalCrew`, `TypicalPeriod`, `EntityAlias` from `src/lib/kb/types.ts` through `src/types/index.ts` (one definition; kb -> types direction only, D-08 preserved). Widened `WorkType` with the four nullable D-01 fields (`service_id`, `unit`, `typical_period`, `typical_crew`) and `JournalObject` with the three nullable D-03 fields (`inv_no`, `area_m2`, `title_meta`). All optional + nullable so `select *` rows read before migration 053 keep compiling. Comment on the re-export freezes the `TypicalCrew` key set to the journal `PlanItem` counters, not `daily_plan_items` column names.
- **Task 2 — `src/lib/api/knowledge.ts` (`0c6dcc9`).** Six functions in the `journal.ts` house style (throw-on-error, Russian message): `fetchEntityAliases`, `createEntityAlias`, `updateEntityAlias`, `deleteEntityAlias`, `findAliasCollisions`, `updateWorkTypeAttributes`. `surface_norm` is always derived from `preprocess(surface_raw).normalized` (T-08-14). `findAliasCollisions` is a read that reports and never blocks (D-13). `updateWorkTypeAttributes` whitelists exactly four keys, rebuilds `typical_crew` from `{workers,foremen,itr,vehicles}` as non-negative integers, and runtime-validates `typical_period` (T-08-13, KB-02 idempotency). Barrel line `export * from './api/knowledge'` added to `src/lib/api.ts`.
- **Task 3 — gate + wrappers + guard (`beee4d0`).** Four `ROLE_RESTRICTED` entries mapped to `['ADMIN']` in `src/app/api/db/route.ts`; reads left open (like `fetchWorkTypes`). Six hand-written `call(...)` wrappers under a new `KNOWLEDGE BASE` section in `src/lib/api-client.ts` with `EntityAlias`/`CanonicalType`/`TypicalPeriod`/`TypicalCrew` added to the `@/types` import. `src/lib/api/knowledge.gating.test.ts` reads the three files as text, extracts exported function names from `knowledge.ts`, and asserts: every `create`/`update`/`delete` is mapped to exactly `['ADMIN']`; every function has an exported wrapper; the only ungated reads are the two explicitly-reviewed `fetch`/`find` functions; every export is classified. Guard verified to bite (removed one entry -> fail; restored -> green).
- Full suite **434 passing** (429 baseline + 5 gating), `npm run build` green, `npx tsc --noEmit` clean, `npm run lint` 0 errors / 47 warnings (baseline unchanged), `git diff package.json package-lock.json` empty.

## Task Commits

1. **Task 1: Shared types — EntityAlias, CanonicalType, and the new column fields** — `eadce0c` (feat)
2. **Task 2: src/lib/api/knowledge.ts — entity_aliases CRUD + work-type attribute writer** — `0c6dcc9` (feat)
3. **Task 3: ADMIN gating + client wrappers + a guard that keeps them in sync** — `beee4d0` (test)

**Plan metadata:** _(this docs commit)_

## Files Created/Modified

- `src/lib/api/knowledge.ts` — **created.** 6 exported functions + `WorkTypeAttributes` interface + non-exported `sanitizeCrew` / `TYPICAL_PERIODS`. `import { preprocess } from '@/lib/kb/preprocess'` (api -> kb, permitted).
- `src/lib/api/knowledge.gating.test.ts` — **created.** `node:fs` text assertions only; no import of `supabase`, `next/server` or the route module. 5 `it` blocks.
- `src/types/index.ts` — **modified.** +19-line re-export/comment block near the header; `WorkType` +4 fields; `JournalObject` +3 fields.
- `src/lib/api.ts` — **modified.** +1 barrel line `export * from './api/knowledge'`.
- `src/app/api/db/route.ts` — **modified.** `ROLE_RESTRICTED` +4 ADMIN-only KB mutation entries + a comment sub-block. Enforcement branch unchanged.
- `src/lib/api-client.ts` — **modified.** `@/types` import +4 names; new `KNOWLEDGE BASE` section with 6 wrappers.

## Decisions Made

- **TDD RED not committed (CLAUDE.md precedence).** CLAUDE.md requires `npm run test` to pass before every commit, which outranks a committed failing-test step (identical call as Plan 08-01). The guard test was written and run RED locally — 2 failures: no `ROLE_RESTRICTED` gate, no client wrappers — then implemented to GREEN and committed as one `test(08-04)` commit. Bite re-verified afterwards by deleting one `ROLE_RESTRICTED` entry (test failed with the expected message) and restoring it.
- **`updateWorkTypeAttributes` hardened past the RESEARCH sketch.** The RESEARCH example spreads `attrs` straight into `.update()`. That is exactly threat T-08-13. Implemented instead with an explicit `if ('key' in attrs)` whitelist for the four columns, a `sanitizeCrew()` that rebuilds `typical_crew` from only `{workers,foremen,itr,vehicles}` coerced to non-negative integers, and a runtime check that `typical_period` is `DAY|NIGHT|AROUND|null`. The `/api/db` boundary receives JSON with TS types erased, so the compile-time parameter type is not sufficient on its own (deviation Rule 2 — missing critical validation at a trust boundary).
- **Enrichment fields optional + nullable.** `service_id?: string | null` etc. rather than required, so `fetchWorkTypes` / `fetchJournalObjects` (both `select *`) keep type-checking against rows that predate migration 053. `KbWorkType extends WorkType` in `src/lib/kb/types.ts` re-narrows them to required — a valid subtype refinement, compiles clean.
- **Type-only `@/types` <-> `@/lib/kb/types` cycle accepted.** No `import/no-cycle` ESLint rule is configured; both edges are `import type` and fully erased, so there is no runtime cycle. `tsc --noEmit` and `npm run build` are both clean. This is the direction the plan mandates (kb owns the definitions; types re-exports).

## Deviations from Plan

**One, within Rule 2 (auto-add missing critical validation).** `updateWorkTypeAttributes` was implemented with explicit key whitelisting + `typical_crew` key-rebuild + `typical_period` runtime validation rather than the thin `.update(attrs)` shown in `08-RESEARCH.md`. This is required to satisfy the plan's own `must_haves` truths (exactly four crew keys, non-negative integers, no `required_*` key reaching jsonb, period boundary) at the `/api/db` runtime boundary where TypeScript types provide no protection. No scope or contract change; no extra files.

Otherwise the plan executed exactly as written.

## Known Stubs / Planned Gaps

**None.** This plan delivers a complete persistence layer. The admin UI that consumes these functions (the rebuilt «Виды работ» editor and the new «Синонимы» alias-manager tab, D-17/D-19) is Plan 08-09 per the phase artifact split — not a stub, out of scope by design. Migrations 053/054 (the `ALTER`/`CREATE` these types and writers target) are Plans 08-06/08-07. The functions compile and are callable now; they will hit real columns once those migrations run in Supabase.

## Issues Encountered

None. `npx tsc --noEmit`, `npm run test`, `npm run build`, `npm run lint` all green after each task's implementation.

## User Setup Required

None in this plan — no external service configuration, no migrations authored here.

## Next Phase Readiness

- **08-06 / 08-07** (migrations 053 `ALTER work_types` + `ALTER journal_objects`, 054 `CREATE entity_aliases`) can proceed; the TypeScript surface they need already exists and matches D-01/D-03/D-14.
- **08-09** (admin tabs) can import `fetchEntityAliases`, `createEntityAlias`, `updateEntityAlias`, `deleteEntityAlias`, `findAliasCollisions`, `updateWorkTypeAttributes` from `@/lib/api-client` with full types.
- **Phase 9** (Excel ingest) and **Phase 11** (dictation prefill, EXT-05) get `updateWorkTypeAttributes` with the `typical_crew` key set frozen to the journal `PlanItem` counters.
- The gating guard is active — any future `knowledge.ts` mutation added without an ADMIN gate or a client wrapper fails `npm run test`.

## TDD Gate Compliance

- Task 3 (`tdd="true"`): `knowledge.gating.test.ts` written first, run RED locally (2 failing assertions with the gate + wrappers absent), then implemented to GREEN. Committed as a single `test(08-04): …` commit per CLAUDE.md "tests pass before commit" — no committed RED commit by design (same rationale as Plan 08-01). Guard bite re-verified post-GREEN.
- Tasks 1 and 2 (`tdd="false"`): type/DTO and API-call code, which CLAUDE.md explicitly exempts from the TDD-before-implementation rule ("tests cover core business logic only — not UI components or API calls").

## Self-Check: PASSED

- `src/lib/api/knowledge.ts` — present.
- `src/lib/api/knowledge.gating.test.ts` — present.
- Commits `eadce0c`, `0c6dcc9`, `beee4d0` — all in `git log`.
- `grep -c` of the four mutation names in `route.ts` = 4.
- Full suite 434 passing; build / tsc / lint green.

---
*Phase: 08-knowledge-base-schema-russian-resolver-catalog-vocabulary*
*Completed: 2026-09-03*
