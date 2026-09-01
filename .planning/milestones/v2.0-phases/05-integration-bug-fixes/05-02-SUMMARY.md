---
phase: 05-integration-bug-fixes
plan: 02
subsystem: database
tags: [supabase, postgresql, migration, hr, employees, service_id]

# Dependency graph
requires:
  - phase: 05-01
    provides: INT-01 and INT-02a fixed; HireModal service dropdown enforces non-null service_id going forward
  - phase: 04-staff-management
    provides: 007_seed_employees.sql that introduced the 270 employees with null service_id

provides:
  - Migration 008 that sets service_id = 'SRV-STR' on all active seeded employees
  - 270 seeded employees are now visible in /hr (INT-02b closed)
  - Employees grouped under SRV-STR tile in SummaryPanel and ServiceSection

affects:
  - 06-period-reports (all active employees now have service_id; report queries can join without nulls)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Placeholder-then-reassign: bulk assign seeded records to a default service, document admin follow-up"
    - "Migration only touches is_active=true rows: dismissed employees with null service_id are intentionally preserved"

key-files:
  created:
    - supabase/migrations/008_fix_seeded_employee_services.sql
  modified: []

key-decisions:
  - "Seeded employees assigned to SRV-STR as placeholder — roster-merged.json has no service_id field so correct assignments are unknown; admin must reassign via /hr admin view"
  - "Dismissed employees (is_active=false) left with service_id=NULL — DismissedSection does not filter by service_id, so they remain visible without a service"
  - "Migration scoped to WHERE service_id IS NULL AND is_active = true to avoid overwriting any future manual assignments"

patterns-established:
  - "Human-gated SQL execution: agent writes migration file, human runs it in Supabase SQL Editor — never automated"

requirements-completed: [HR-18]

# Metrics
duration: ~30min (including human checkpoint wait times)
completed: 2026-03-06
---

# Phase 05 Plan 02: Integration Bug Fixes — INT-02b Summary

**Migration 008 assigns SRV-STR as placeholder service_id to 270 seeded employees, making them visible in the /hr panel after human ran it in Supabase SQL Editor**

## Performance

- **Duration:** ~30 min (including human verification checkpoints)
- **Started:** 2026-03-06
- **Completed:** 2026-03-06
- **Tasks:** 3 (2 auto, 1 human-gated checkpoint each for verification)
- **Files modified:** 1

## Accomplishments

- Verified SRV-STR exists as a live service_id PK in Supabase (human checkpoint)
- Wrote migration 008 with UPDATE statement, prerequisite comment, and rollback section
- Human ran the migration — zero active employees remain with service_id = NULL
- 270 seeded employees now appear in /hr grouped under SRV-STR (INT-02b closed)

## Task Commits

1. **Task 1: Verify service_id PK values** — human checkpoint, no commit (confirmed SRV-STR exists)
2. **Task 2: Write migration 008** — `cd24e70` (feat)
3. **Task 3: Run migration and verify** — human checkpoint, no code commit (human executed SQL)

## Files Created/Modified

- `supabase/migrations/008_fix_seeded_employee_services.sql` — UPDATE users SET service_id = 'SRV-STR' WHERE service_id IS NULL AND is_active = true; includes prerequisite comment and rollback

## Decisions Made

- SRV-STR chosen as placeholder because roster-merged.json has no service_id field; the correct per-employee assignments are unknown. Admin must open /hr and reassign as needed.
- Dismissed employees (is_active=false) intentionally left with service_id=NULL — they surface in DismissedSection which has no service_id filter.

## Deviations from Plan

None — plan executed exactly as written. Human checkpoint responses matched expected signals ("SRV-STR confirmed", "migration ran successfully").

## Issues Encountered

None.

## User Setup Required

Admin action recommended (not required for visibility): open https://gormost.vercel.app/hr and reassign employees currently grouped under SRV-STR to their correct services (SRV-ENG, SRV-FIRE, SRV-VENT, SRV-CCTV). Employees whose correct service is SRV-STR require no change.

## Next Phase Readiness

- INT-02b closed: seeded employees are visible in /hr
- Combined with 05-01: INT-01 (SummaryPanel absent statuses) and INT-02a (HireModal service dropdown) are also resolved
- Phase 05 is fully complete — all integration bugs from v2.0 audit are fixed
- Phase 06 (period reports / export) can begin; all active employees now have non-null service_id, so report queries can join without null guards

---
*Phase: 05-integration-bug-fixes*
*Completed: 2026-03-06*
