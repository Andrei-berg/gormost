---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Планировщик-агент
current_phase: 8
current_phase_name: Knowledge base — schema, Russian resolver, catalog vocabulary
status: planning
stopped_at: Phase 8 context gathered
last_updated: "2026-09-02T10:19:16.253Z"
last_activity: 2026-09-02
last_activity_desc: v3.0 roadmap created (6 phases, 8-13; 35/35 requirements mapped)
progress:
  total_phases: 1
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-01)

**Core value:** A dispatcher/foreman dictates or pastes work text; the agent — trained on the участок vocabulary — lays it out into day/night draft plan rows split by service; a human reviews and publishes.
**Current focus:** Phase 8 — Knowledge base: schema, Russian resolver, catalog vocabulary

## Current Position

Phase: 8 (first of 6 in v3.0) — Knowledge base — schema, Russian resolver, catalog vocabulary
Plan: — (not yet planned)
Status: Ready to plan
Last activity: 2026-09-02 — v3.0 roadmap created (6 phases, 8-13; 35/35 requirements mapped)

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 0 (this milestone)
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 8. Knowledge base | 0/TBD | - | - |

*Updated after each plan completion*

## Accumulated Context

### Decisions

Full log in PROJECT.md. Recent decisions affecting current work:

- [v3.0 research]: resolve-don't-generate — the LLM only segments text into work-lines; a deterministic resolver maps each field to a real catalog ID or `null`; guardrails live above the provider adapter.
- [v3.0 research]: the KB is an enrichment layer keyed to `journal_objects`, not a standalone 4th catalog — the agent's only write sink is unpublished `daily_plan_items`.
- [v3.0 research]: structured output = prompt-instructed JSON + Zod safeParse + one repair retry, uniform across all providers (no `generateObject` / constrained decoding).
- [v3.0 roadmap]: 6 phases (8-13). Future-item phases (low-confidence review queue, eval calibration, cost/drift monitoring) deliberately NOT created — those requirements are v3.x.
- [v3.0 roadmap]: TST-01 mapped to Phase 13 as suite consolidation; every phase still TDDs its own pure logic per CLAUDE.md.

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 10] Verify the Vercel plan for gormost.vercel.app — Hobby's ~10s timeout is a blocker for the LLM/STT routes as designed.
- [Phase 9] SheetJS `xlsx` is a new major dependency — needs user sign-off.
- [Phase 8] No verified JS Russian lemmatization library — spike needed; stemming-only fallback acceptable.
- [Phase 8] Reconciliation between the three existing catalogs (`objects`/`journal_objects`/`work_permit_catalog`) is undocumented — must write the catalog map into ARCHITECTURE.md before Phase 9.
- [Phase 10] v1 default provider (Anthropic+Groq vs Yandex/self-hosted) undecided — pending confirmed deployment constraint.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v3.x | Low-confidence review queue + one-click curate | Deferred | v3.0 roadmap |
| v3.x | Confidence-threshold auto-calibration, drift & cost monitoring, budget kill-switch | Deferred | v3.0 roadmap |
| v3.x | Second LLM/STT adapter wired to prove the abstraction | Deferred | v3.0 roadmap |

## Session Continuity

Last session: 2026-09-02T10:19:16.235Z
Stopped at: Phase 8 context gathered
Resume file: .planning/phases/08-knowledge-base-schema-russian-resolver-catalog-vocabulary/08-CONTEXT.md
