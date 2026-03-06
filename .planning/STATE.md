---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: milestone
status: in_progress
last_updated: "2026-03-06T07:12:00.000Z"
progress:
  total_phases: 5
  completed_phases: 3
  total_plans: 12
  completed_plans: 8
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-02)

**Core value:** Replace WhatsApp attendance coordination with a structured HR screen — ZAMPORAB sees who is present, changes status in one click, generates monthly reports
**Current focus:** Phase 04 — Staff Management (DB Layer)

## Current Position

Phase: 04 of 05 (Staff Management)
Plan: 1 of 5 in current phase (04-01 complete — migration 005 applied to Supabase; ready for Plan 02 seed data)
Status: In progress
Last activity: 2026-03-06 — Migration 005 applied: professions, employee_positions, schedules, employee_assignments live in Supabase

Progress: [######----] 53% (v1.0 + v1.1 + Phase 02 + Phase 03 + Phase 04 Plan 01 done)

## Performance Metrics

**Velocity:**
- Total plans completed: 4 (Phase 01, milestone v1.1, Phase 02, Phase 03 P01)
- Average duration: ~9min
- Total execution time: unknown

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01. UI/UX | 3/3 | - | - |
| 02. DB Foundation | 2/2 | ~7min | ~3.5min |
| 03. HR Panel UI | 2/3 | 19min | ~9.5min |
| 04. Staff Management | 1/5 | ~5min | ~5min |

*Updated after each plan completion*

## Accumulated Context

### Decisions

- v1.0: 8 panels, kanban, approval chain, transport, complaints, audit log — complete
- v1.1: EmptyState, Header LIVE counter, mobile KPI, admin hamburger — complete
- [Research]: `employee_status` must be append-only event log — mutable design makes period reports impossible
- [Research]: Extend `users` (add `date_hired`/`date_fired`) — do NOT create separate `employees` table
- [Research]: Presence-by-default — no status row today means "Na rabote"
- [Research]: ZAMPORAB edits own service only; ADMIN edits all services
- [Research]: HEAD gets read-only access to own service HR panel
- [Phase 02-db-foundation]: employee_status is append-only event log — no updated_at column; all status changes are new INSERTs
- [Phase 02-db-foundation]: date_hired/date_fired added to existing users table — no separate employees table needed
- [Phase 02-02]: Presence-by-default encoded in fetchAllCurrentStatuses client-side (Map merge) — no SQL DEFAULT or trigger needed
- [Phase 02-02]: setEmployeeStatus is INSERT-only — no UPDATE path exists for employee_status (protects Phase 05 period report correctness)
- [Phase 02-02]: fireEmployee calls setEmployeeStatus best-effort — users.is_active=false is authoritative dismissal; Uvolen status row is supplementary audit log
- [Phase 03]: EmployeeCard stubbed inline in ServiceSection — Plan 02 extracts it as a standalone file
- [Phase 03]: HEAD role: canEdit=false + service_id filter in page.tsx — fully read-only view of own service
- [Phase 03-core-hr-panel-ui]: Reason add-on fires second setEmployeeStatus INSERT — not UPDATE — preserving append-only log
- [Phase 03-core-hr-panel-ui]: Uvolen excluded from CLICKABLE_STATUSES — dismissal flow is Phase 04 scope
- [Phase 04-01]: user_id FK columns are TEXT (not UUID) — critical match with existing users.user_id column type
- [Phase 04-01]: Partial unique index (WHERE ended_at IS NULL) implements SCD Type 2 "one active record" constraint
- [Phase 04-01]: UNIQUE(name, COALESCE(grade, '')) on professions handles NULL grade for ITR roles (PostgreSQL pattern)
- [Phase 04-01]: employee_status CHECK constraint replaced via DROP+ADD (only idempotent pattern in PostgreSQL)

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 05]: `xlsx` npm dependency requires developer sign-off before install (per CLAUDE.md rules)
- [Phase 05]: Verify SheetJS CE compatibility with Next.js 16 App Router before Phase 05 (`npm info xlsx`)
- [Phase 03]: Mobile nav may overflow with 9th panel — test hamburger at 375px width

## Session Continuity

Last session: 2026-03-06
Stopped at: Completed 04-01-PLAN.md — migration 005 schema applied to Supabase (8ed5c0b + 1ef3da8 fix); ready for Plan 02 seed data
Resume file: None
