# Phase 8: Knowledge base — schema, Russian resolver, catalog vocabulary - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-02
**Phase:** 8-knowledge-base-schema-russian-resolver-catalog-vocabulary
**Areas discussed:** KB schema shape, Resolver architecture, Russian preprocessing depth, Alias collisions & ambiguity, Admin «Виды работ» editor, Seed data & fixtures

All six presented gray areas were selected for discussion. Areas 1–2 were worked
through option-by-option; from Area 3 onward the user delegated the remaining
calls with the standing instruction *"сделай так чтобы было тип топ, чтобы потом
не встряли"* (build the most robust option that avoids later rework), plus an
explicit "agree" on the resolver returning `ambiguous` with candidates (2b).

---

## Area 1 — KB schema shape & Титул/Конструктив data

| Sub | Option | Selected |
|-----|--------|----------|
| 1a work-type vocab | Enrich existing `work_types` with columns | ✓ |
| 1a | New `kb_work_types` island with bridge column | |
| 1a | Hybrid (enrich, resolver uses only rows with `service_id`) | ✓ (falls out of the enrich choice) |
| 1b object identity | `journal_objects` as-is is canonical identity | ✓ |
| 1b | `kb_locations` with `journal_object_id NOT NULL` | |
| 1c Титул columns | Add empty enrichment cols to `journal_objects` in Phase 8 | ✓ |
| 1c | Defer object columns to Phase 9 | |
| 1d construction | Nothing in Phase 8; keep enum value extensible | ✓ |
| 1d | New `journal_constructions` now, empty | |
| 1d | Enrich admin `constructions` | |
| 1e catalog map doc | `.planning/codebase/ARCHITECTURE.md` (stale) | |
| 1e | New `docs/catalog-map.md` + CLAUDE.md pointer | ✓ |
| 1e | Section inside CLAUDE.md | |

**User's choice:** "1a-1e all agree with recommendations."
**Notes:** Recorded as D-01…D-05. The research `ARCHITECTURE.md` `kb_*` island design is explicitly not taken; `journal_objects` shape is frozen now so Phase 9 (parallel with Phase 10) does not rewrite migrations.

---

## Area 2 — Resolver architecture

| Sub | Option | Selected |
|-----|--------|----------|
| 2a matching site | All matching in TypeScript, in memory; no `pg_trgm` | ✓ |
| 2a | Hybrid: exact in TS, fuzzy via Postgres `pg_trgm` | |
| 2b contract | Resolver returns `resolved` / `ambiguous` (ranked candidates) / `unresolved` | ✓ |
| 2c code location | `src/lib/agent/resolve/` | |
| 2c | `src/lib/kb/` (separate from provider-dependent agent layer) | ✓ |

**User's choice:** "2b agree, resolver returns ambiguous with candidates." 2a and 2c taken at the recommended default (not objected).
**Notes:** Recorded as D-06…D-08. Contract frozen (D-07) as a cross-phase dependency; `score` is resolution confidence from match strength, distinct from any model self-confidence.

---

## Area 3 — Russian preprocessing / lemmatization depth

| Sub | Option | Selected |
|-----|--------|----------|
| 3a abbreviations | Separate `expandAbbreviations()` layer | ✓ |
| 3a | Fold abbreviation expansion into `normalize()` | |
| 3b lemmatization | Normalization + stemming only | (fallback) |
| 3b | Stemming now + explicit lemmatizer spike behind a fixture gate | ✓ |
| 3b | Serverless pymorphy2 function | rejected |
| 3c stemmer code | Small dedicated npm package | |
| 3c | Vendored Russian Porter stemmer in-repo (~60 lines) | ✓ |
| 3c | `natural` (full package) | |

**User's choice:** "сделай так чтобы было тип топ, чтобы потом не встряли" — delegated; resolved toward the most upgrade-safe option.
**Notes:** Recorded as D-09…D-12b. `lemmatize()` is a swappable module behind `(token) => string`; vendored Porter-RU stemmer is the guaranteed impl and KB-04 fallback; a pure-JS lemmatizer spike is a Phase 8 plan task gated by `lemma-cases.ru.ts`. No new npm dependency in the base build. Serverless pymorphy2 rejected (breaks pure-resolver invariant).

---

## Area 4 — Alias collisions & ambiguity

| Sub | Option | Selected |
|-----|--------|----------|
| 4a collision behavior | Soft warning, ADMIN confirms, both rows live | ✓ |
| 4a | Hard uniqueness block | |
| 4a | Soft + `conflicted` flag column for a review screen | |
| 4b unique key | `unique nulls not distinct (surface_norm, canonical_type, scope_object_id)` | ✓ |
| 4c ambiguity rule | Exact alias/name → immediate `resolved`; fuzzy near-tie (< `tieMargin`) → `ambiguous`; weight orders candidates, never promotes fuzzy | ✓ |
| 4c | Always take top-1 by score, break ties by weight | |
| 4d `scope_object_id` | Column exists, UI can set it, resolver ignores it in v3.0 | ✓ |
| 4d | No column until v3.x | |
| 4d | Column + resolver honours `opts.scopeObjectId` | |

**User's choice:** delegated ("тип топ") — resolved toward schema-correct-now, behaviour-simple-now.
**Notes:** Recorded as D-13…D-16. `entity_aliases` DDL fully locked (D-14) including `surface_raw` for audit. Collisions remain query-findable, so no flag column and no conflict-review screen in v3.0.

---

## Area 5 — Admin «Виды работ» editor + alias manager

| Sub | Option | Selected |
|-----|--------|----------|
| editor form | Dedicated editor tab (WorkPermitCatalogEditor precedent) | ✓ |
| editor form | Extend the generic inline `CrudTab` | |
| affordances | search + «Без службы»/«Не заполнено» filters + breadcrumb + lightweight bulk "set service for selected" | ✓ |
| affordances | richer bulk (period/crew, CSV) | deferred v3.x |
| alias manager | New `/admin` → «Синонимы» tab (search, source badge, weight, collision check, edit/delete) | ✓ |
| gating | All `knowledge.ts` mutations ADMIN-only in `ROLE_RESTRICTED` | ✓ |

**User's choice:** delegated ("тип топ").
**Notes:** Recorded as D-17…D-20. `typical_crew` jsonb keys locked to `{ workers, foremen, itr, vehicles }` (1:1 with `daily_plan_items` columns). `typical_period` stored as `DAY|NIGHT|AROUND`.

---

## Area 6 — Seed data & fixtures

| Sub | Option | Selected |
|-----|--------|----------|
| seed strategy | Phase 8 hand-seeds canonical объекты + starter aliases + starter work-type attribution via migration | ✓ |
| seed strategy | Ship only a fixture file; tables stay empty until Phase 9 | |
| fixtures | `src/lib/kb/__fixtures__/resolve-cases.ru.ts` (~30 cases) = KB-04 fixture set + Phase 10 golden-set seed | ✓ |

**User's choice:** delegated ("тип топ").
**Notes:** Recorded as D-21…D-23. Exact authoritative canonical-object list to be finalized with the user during planning; seed is a starter and Phase 9 ingest dedups on the normalized+lemmatized name (IMP-05), so it enriches rather than duplicates. Migration split 053–055 suggested; planner verifies `work_types` live columns via Supabase MCP first (no prior migration touches that table).

---

## Claude's Discretion

- Exact abbreviation-dictionary contents, `normalize()` regex ordering, `tieMargin` / threshold defaults, fixture wording.
- Whether journal's `norm()` (`src/components/journal/data.ts`) is re-pointed at the new `src/lib/kb/normalize.ts` or left in place.
- Migration file numbers (053–055 is a suggestion, not a lock).

## Deferred Ideas

- Scope-aware alias resolution (resolver honouring `scope_object_id`) — v3.x.
- KB construction storage + Конструктив ingest — Phase 9.
- `pg_trgm` / SQL-side fuzzy match — performance optimization, later.
- Serverless pymorphy2 lemmatizer — rejected.
- Bulk attribute operations beyond "set service for selected" — v3.x.
- Conflict-review screen for colliding aliases — v3.x.
- KB-health dashboard — v3.x.
- Low-confidence review queue — v3.x.
- Vercel plan / `maxDuration` verification — Phase 10 concern.
