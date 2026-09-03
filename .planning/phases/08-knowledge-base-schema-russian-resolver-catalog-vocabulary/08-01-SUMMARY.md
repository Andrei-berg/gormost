---
phase: 08-knowledge-base-schema-russian-resolver-catalog-vocabulary
plan: 01
subsystem: api
tags: [resolver, russian-nlp, entity-resolution, knowledge-base, typescript, vitest, pure-lib]

# Dependency graph
requires:
  - phase: 08 (context/research/patterns)
    provides: D-02/D-07/D-08/D-09/D-15 locked decisions, RESEARCH code examples, PATTERNS analog table
provides:
  - "src/lib/kb/ module tree with final synchronous signatures (types, normalize, expandAbbreviations, stem, lemmatize, preprocess, index, resolve)"
  - "Frozen D-07 resolver contract published as types: ResolveResult (3 shapes), CanonicalType (4 values), KbIndex, TypicalCrew, TypicalPeriod, EntityAlias, KbWorkType, DEFAULT_KB_CONFIG"
  - "buildKbIndex(rows): pure KbIndex builder — loads work_types WHERE service_id != null, drops aliases with dangling canonical_id"
  - "resolveEntity(phrase, index, opts?): exact-alias + exact-name ladder (steps 1-2), weight-ranked ambiguous, honest unresolved fallthrough"
  - "src/lib/kb/purity.test.ts: filesystem-enumerated D-08 guard (no server-only / no @/lib/api / no supabase / no async pipeline export)"
  - "src/lib/kb/__fixtures__/resolve-cases.ru.ts: 9-case Russian starter fixture set (KB-04 SC#4 seed)"
affects: [08-02, 08-03, 08-04, 08-05, 08-06, 08-07, 08-08, 08-09, phase-09, phase-11]

actuals:
  tokens: 6000
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Pure client-safe lib under src/lib/kb/ — import type only, named exports, no server-only, no @/lib/api (D-08)"
    - "Single text entry point preprocess() = expandAbbreviations → normalize → token-wise lemmatize, identical at index-build and query time (D-09)"
    - "buildKbIndex mirrors journalStats.aggregateJournal: fetched arrays in, one Map-backed aggregate out, zero I/O (D-06)"
    - "Filesystem-enumerated purity guard test (no hardcoded file list)"

key-files:
  created:
    - src/lib/kb/types.ts
    - src/lib/kb/normalize.ts
    - src/lib/kb/expandAbbreviations.ts
    - src/lib/kb/stem.ts
    - src/lib/kb/lemmatize.ts
    - src/lib/kb/preprocess.ts
    - src/lib/kb/index.ts
    - src/lib/kb/resolve.ts
    - src/lib/kb/resolve.test.ts
    - src/lib/kb/purity.test.ts
    - src/lib/kb/__fixtures__/resolve-cases.ru.ts
  modified: []

key-decisions:
  - "Task 1 checkpoint (blocking decision): proceed-as-locked — the D-07 resolver contract and D-02 object identity are published verbatim, no amendment. Human authorized on the standing 'least future rework' instruction."
  - "TDD RED state not committed: CLAUDE.md mandates `npm run test` passes before every commit, which outranks a committed failing-test step. RED was run locally (11/22 fail with the resolver stubbed) then implemented to GREEN in one feat commit."
  - "Per-module unit tests (normalize.test.ts, stem.test.ts, etc.) deferred to plans 08-02/08-03/08-05 per the plan file list; this plan's resolve.test.ts covers the pipeline transitively plus targeted normalize/preprocess assertions for the phase must-have truths."

patterns-established:
  - "src/lib/kb purity: every module is pure + synchronous + client-safe, enforced by purity.test.ts"
  - "Resolver ladder: exact alias (step 1) → exact normalized name (step 2) → unresolved (step 3 fuzzy is 08-05)"

requirements-completed: [KB-01, KB-04]

coverage:
  - id: D1
    description: "Frozen D-07 resolver contract published as TypeScript types (ResolveResult 3 shapes, CanonicalType 4 values, KbIndex, TypicalCrew 4 keys, TypicalPeriod, EntityAlias, KbWorkType)"
    requirement: KB-04
    verification:
      - kind: unit
        ref: "src/lib/kb/resolve.test.ts#resolveEntity — contract guarantees (D-07)"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit (strict mode compiles every consumer)"
        status: pass
    human_judgment: false
  - id: D2
    description: "resolveEntity resolves a Russian phrase to a real catalog id via exact alias (method 'alias') or exact normalized name (method 'exact'); unknown/empty/whitespace and dangling-alias inputs return unresolved with no invented id"
    requirement: KB-04
    verification:
      - kind: unit
        ref: "src/lib/kb/resolve.test.ts#resolveEntity — fixture cases (KB-04 SC#4)"
        status: pass
      - kind: unit
        ref: "src/lib/kb/resolve.test.ts#resolveEntity — contract guarantees (D-07)"
        status: pass
    human_judgment: false
  - id: D3
    description: "buildKbIndex loads only work_types rows with service_id != null and skips entity_aliases whose canonical_id is absent from the loaded rows (KB-01, D-01)"
    requirement: KB-01
    verification:
      - kind: unit
        ref: "src/lib/kb/resolve.test.ts#buildKbIndex — input filtering (KB-01, D-01)"
        status: pass
      - kind: unit
        ref: "src/lib/kb/resolve.test.ts#an alias whose canonical_id is absent from the index is skipped (no dangling id)"
        status: pass
    human_judgment: false
  - id: D4
    description: "normalize() code-point rules: lowercase, ё→е with й preserved, NBSP (U+00A0) and whitespace runs collapse to one ASCII space, trim (D-11 subset for this slice)"
    requirement: KB-04
    verification:
      - kind: unit
        ref: "src/lib/kb/resolve.test.ts#normalize — D-11 code-point rules (this slice)"
        status: pass
    human_judgment: false
  - id: D5
    description: "src/lib/kb/ module tree is provably free of server-only marker, @/lib/api, supabase client, and async pipeline exports (D-08)"
    requirement: KB-04
    verification:
      - kind: unit
        ref: "src/lib/kb/purity.test.ts#src/lib/kb purity guard (D-08)"
        status: pass
    human_judgment: false

duration: ~60min (continuation run after human checkpoint resolution)
completed: 2026-09-03
status: complete
---

# Phase 8 Plan 01: KB module scaffold + exact-alias Russian resolver tracer Summary

**The full `src/lib/kb/` module layout now exists with final synchronous signatures, the D-07 resolver contract is frozen as TypeScript types, and a Russian phrase resolves end-to-end to a real `journal_objects` id via the exact-alias / exact-name path — or an honest `unresolved`, never an invented entity.**

## Performance

- **Duration:** ~60 min (continuation run; Task 1 checkpoint resolved by human before this run)
- **Started:** 2026-09-03T07:28:00Z (phase execution start)
- **Completed:** 2026-09-03T08:45:44Z
- **Tasks:** 3 (Task 1 decision recorded; Tasks 2-3 built + committed)
- **Files modified:** 11 created

## Accomplishments
- Published the frozen D-07 contract as `src/lib/kb/types.ts`: `ResolveResult` (three shapes `resolved` / `ambiguous` / `unresolved`), `CanonicalType` (`object | construction | work_type | service`), `KbIndex`, `TypicalCrew` (exactly `workers`/`foremen`/`itr`/`vehicles`), `TypicalPeriod`, `EntityAlias`, `KbWorkType`, `DEFAULT_KB_CONFIG`.
- Built the whole D-08 pipeline with final signatures: `normalize` (code-point rules), `expandAbbreviations` (seed dict), `stem` (identity body, final signature), `lemmatize` (synchronous swap point), `preprocess` (the single text entry point), `buildKbIndex` (pure `Map`-backed transform), `resolveEntity` (exact-alias + exact-name ladder, weight-ranked ambiguous).
- `resolve.test.ts`: 22 assertions covering exact alias, case/whitespace/NBSP variants, short-form alias, exact catalog name, abbreviation-fed alias, `opts.type` narrowing, unknown → unresolved, empty/whitespace → `{ status:'unresolved', normalized:'' }`, dangling-alias skip, weight-ranked ambiguity, and the `service_id IS NOT NULL` work_types filter.
- `purity.test.ts`: filesystem-enumerated D-08 guard — 21 assertions, verified to fail when a forbidden import is added then reverted.
- Full suite 141 passing (98 baseline + 22 resolver + 21 purity), `npm run build` green, `npm run lint` 0 errors / 47 warnings (baseline unchanged), `npx tsc --noEmit` clean. Zero new npm dependencies (`git diff package.json package-lock.json` empty).

## Task Commits

1. **Task 1: Freeze the resolver contract and object identity** — no code; decision `proceed-as-locked` recorded here (see Decisions Made).
2. **Task 2: End-to-end Russian phrase → real catalog id (tracer, TDD)** — `3332a99` (feat)
3. **Task 3: Purity guard — src/lib/kb has no server or API imports (TDD)** — `155cf4e` (test)

**Plan metadata:** _(this docs commit)_

## Files Created/Modified
- `src/lib/kb/types.ts` — frozen D-07 contract types + `DEFAULT_KB_CONFIG`; `TypicalCrew` keys documented as mirroring `PlanItem`, not `required_*` columns.
- `src/lib/kb/normalize.ts` — D-11 code-point subset (lowercase, ё→е, NBSP, collapse whitespace, trim); written as chained `.replace()` so 08-03 appends the №/dash/quote/punctuation rules.
- `src/lib/kb/expandAbbreviations.ts` — whitespace-token-wise, case-insensitive expander over a 4-entry seed dict (`борт.`, `ж/б`, `п/п`, `эв`); 08-03 grows it.
- `src/lib/kb/stem.ts` — final `stem(token): string` signature, identity body; header cites the Snowball RU algorithm for 08-02.
- `src/lib/kb/lemmatize.ts` — synchronous `(token) => string` swap point (D-12), delegates to `stem`.
- `src/lib/kb/preprocess.ts` — `preprocess(s): { normalized, lemmas }`, the single text entry point (D-09).
- `src/lib/kb/index.ts` — `buildKbIndex(rows, config?)`; `service_id != null` filter (D-01), dangling-`canonical_id` skip, `Map` accumulators, `import type` only.
- `src/lib/kb/resolve.ts` — `resolveEntity(phrase, index, opts?)`; ladder steps 1-2 + weight-ranked ambiguous; step 3 fuzzy returns `unresolved` until 08-05; header documents `score` = match-strength confidence, not a model probability.
- `src/lib/kb/resolve.test.ts` — 22 assertions (fixture cases + contract guarantees + index filtering + normalize/preprocess must-have truths).
- `src/lib/kb/purity.test.ts` — 21 assertions; `FORBIDDEN_IMPORT_SPECIFIERS` exported at top of file; recursive `readdirSync`, self-excluded by filename.
- `src/lib/kb/__fixtures__/resolve-cases.ru.ts` — in-memory KB (2 objects, 1 service, 2 work_types incl. one immature, 6 aliases incl. one dangling + one ambiguous pair) + 9 `cases`.

## Decisions Made

- **Task 1 — `proceed-as-locked` (blocking `checkpoint:decision`).** The human was shown the three `ResolveResult` shapes and the four `CanonicalType` values as literal text and authorized proceeding with the contract EXACTLY as locked in 08-CONTEXT.md / the plan, no amendment. Confirmed verbatim: `resolveEntity(phrase, index, opts?: { type?: CanonicalType }) => ResolveResult`; `CanonicalType = 'object' | 'construction' | 'work_type' | 'service'`; `score` = match-strength confidence only (no model this phase), `low`/`high` thresholds map to 🟢/🟡/🔴; `opts.scopeObjectId` deliberately NOT in the v3.0 contract (D-16) while `entity_aliases.scope_object_id` still ships; object identity (D-02) = a `journal_objects.id` row returned unchanged, no `kb_locations`, no synthesized ids. Standing instruction for the rest of Phase 8: auto-take the least-rework option on any further `checkpoint:decision` and record it — no more questions.
- **RED state not committed (CLAUDE.md precedence).** CLAUDE.md requires `npm run test` to pass before every commit. That outranks committing a failing-test TDD step. RED was executed locally (resolver stubbed to always-`unresolved` → 11/22 fail; forbidden-import added to `stem.ts` → purity guard fails), then implemented to GREEN and committed. Task 2 is one `feat` commit; Task 3 one `test` commit.
- **Per-module unit test files deferred.** The plan's Task 2 `<files>` list names only `resolve.test.ts`; `normalize.test.ts` / `stem.test.ts` / `expandAbbreviations.test.ts` / `preprocess.test.ts` / `index.test.ts` belong to plans 08-02/08-03/08-05. `resolve.test.ts` exercises the whole pipeline transitively and adds direct `describe('normalize …')` / `describe('preprocess …')` blocks to nail the phase must-have truths (ё/й/NBSP, empty-input `normalized === ''`).

## Deviations from Plan

**None affecting scope or behaviour.** Two process notes, both driven by CLAUDE.md taking precedence over the generic executor flow:

1. **[Rule 3-adjacent — CLAUDE.md precedence] TDD RED not committed.** The GSD TDD flow suggests a committed `test(...)` RED step; CLAUDE.md forbids committing with a failing suite. Resolved by running RED locally and committing only GREEN. No behaviour impact — the tests are identical to what a RED-then-GREEN split would have produced, and the bite was verified by stubbing.

## Known Stubs / Planned Gaps

All three are **intentional, plan-scoped, signature-final** placeholders — the objective of this plan is the exact-alias/exact-name tracer, which is fully working. Each names the plan that fills it:

| Location | Gap | Resolved by |
|----------|-----|-------------|
| `src/lib/kb/stem.ts` | `stem()` returns the token unchanged (identity) | **08-02** — transcribe the Snowball RU algorithm; add `stem.test.ts` from the official sample vocabulary |
| `src/lib/kb/expandAbbreviations.ts` | 4-entry seed dictionary only | **08-03** — grow the curated dictionary; add `expandAbbreviations.test.ts` |
| `src/lib/kb/normalize.ts` | code-point rules only; no №/dash/quote/trailing-punct/numeric-token canonicalization | **08-03** — append the remaining D-11 `.replace()` steps; add `normalize.test.ts` |
| `src/lib/kb/resolve.ts` | ladder step 3 (fuzzy: lemma overlap + trigram Dice) returns `unresolved` | **08-05** — add `similarity.ts` + the fuzzy layer; grow the fixture set to ~30 cases |

No stub blocks this plan's goal; the resolver never invents an entity in any of these states.

## Issues Encountered
None. `npm run build`, `npm run test`, `npm run lint`, `npx tsc --noEmit` all green on first full run after implementation.

## User Setup Required
None — no external service configuration. No migrations in this plan (schema work is 08-06/08-07).

## Next Phase Readiness
- The D-07 contract is frozen and importable. 08-02 (stemmer spike + vendored Snowball RU) and 08-03 (normalize/abbreviation completion) can proceed against final signatures.
- 08-04 (`src/lib/api/knowledge.ts` + admin wiring) can import `EntityAlias` / `CanonicalType` / `TypicalCrew` / `TypicalPeriod` / `KbWorkType` from `src/lib/kb/types.ts` (or re-export via `src/types/index.ts` as that plan prefers).
- 08-05 fuzzy layer is additive: `KbIndex.entries` is already populated with `{ id, type, nameNorm, lemmas, weight }`.
- Purity guard is active — any future kb file that imports server/API code fails `npm run test`.

## TDD Gate Compliance
- Task 2 (`tdd="true"`): tests written and run RED locally before implementation (11/22 failing with resolver stubbed), then GREEN. Committed as a single `feat` commit per CLAUDE.md "tests pass before commit". No committed `test(...)` RED commit for this task by design.
- Task 3 (`tdd="true"`): `purity.test.ts` written, verified to fail on an injected forbidden import (`@/lib/supabase` + `server-only` in `stem.ts`), reverted, GREEN. Committed as `test(08-01): …`.

## Self-Check: PASSED

All 11 source/test files + SUMMARY.md verified present on disk; task commits `3332a99` and `155cf4e` verified in git log.

---
*Phase: 08-knowledge-base-schema-russian-resolver-catalog-vocabulary*
*Completed: 2026-09-03*
