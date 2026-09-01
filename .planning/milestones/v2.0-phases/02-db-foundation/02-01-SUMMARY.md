---
phase: 02-db-foundation
plan: 01
subsystem: database
tags: [postgresql, supabase, sql, migrations, hr-module]

# Dependency graph
requires: []
provides:
  - employee_status append-only event log table with CHECK constraint on 5 status values
  - date_hired and date_fired columns on users table
  - supabase/migrations/ directory established with sequential numbering convention
affects:
  - 02-02 (TypeScript types depend on employee_status schema)
  - 02-03 (API functions depend on both tables)
  - 03-hr-panel (HR panel components depend on DB schema)
  - 05-reports (period queries depend on date_from index design)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SQL migrations: append-only numbered files in supabase/migrations/ with rollback sections"
    - "append-only event log: status changes are INSERTs, never UPDATEs"
    - "presence-by-default: no status row today means Na_rabote (TypeScript-level, not DB-level)"

key-files:
  created:
    - supabase/migrations/001_add_hr_module.sql
    - supabase/migrations/002_add_hr_fields_to_users.sql
  modified: []

key-decisions:
  - "employee_status is append-only event log — no updated_at column to prevent mutation"
  - "Composite index on (user_id, date_from DESC) for efficient latest-status and period-range queries"
  - "date_hired/date_fired added to existing users table — no separate employees table"
  - "ADD COLUMN IF NOT EXISTS for idempotent migration re-runs"

patterns-established:
  - "Migration pattern: descriptive filename, comment header, rollback section at bottom"
  - "Append-only design: all HR status changes are new INSERTs only"

requirements-completed:
  - HR-01

# Metrics
duration: ~20min
completed: 2026-03-02
---

# Phase 02 Plan 01: HR Module DB Foundation Summary

**Append-only employee_status event log table and date_hired/date_fired columns on users — migrations created, committed, and applied to Supabase via human-executed SQL Editor**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-02T12:17:14Z
- **Completed:** 2026-03-02T12:20:00Z
- **Tasks:** 3/3 complete
- **Files modified:** 2

## Accomplishments
- Created supabase/migrations/ directory (new convention for project)
- Created 001_add_hr_module.sql with append-only employee_status table, CHECK constraint on 5 status values, composite index for efficient lookups, and rollback section
- Created 002_add_hr_fields_to_users.sql with idempotent ALTER TABLE for date_hired and date_fired columns and rollback section
- Human confirmed both migrations applied successfully in Supabase SQL Editor — employee_status table and date_hired/date_fired columns are live in the database

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration 001 — employee_status append-only table** - `50eca97` (chore)
2. **Task 2: Create migration 002 — add date_hired and date_fired to users** - `165b6cf` (chore)
3. **Task 3: Human executes migrations in Supabase SQL Editor** - confirmed complete (human-action, no code commit)

## Files Created/Modified
- `supabase/migrations/001_add_hr_module.sql` - CREATE TABLE employee_status with append-only design, CHECK constraint, composite index, and rollback
- `supabase/migrations/002_add_hr_fields_to_users.sql` - ALTER TABLE users to add date_hired and date_fired as DATE DEFAULT NULL with rollback

## Decisions Made
- Append-only design (no updated_at) enforced at schema level — no trigger needed, TypeScript handles presence-by-default
- Composite index on (user_id, date_from DESC) supports both "current status" queries and Phase 05 period reports
- Used ADD COLUMN IF NOT EXISTS for safe idempotent migrations

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

Both migrations have been executed in Supabase SQL Editor for project `wwwtsvboqffzbnliuiun`. No further setup required.

- `employee_status` table exists in Supabase with 0 rows
- `users` table has `date_hired` and `date_fired` columns (NULL for existing rows)

## Next Phase Readiness
- DB schema is live — Phase 02-02 (TypeScript types) can begin immediately
- employee_status schema is the source of truth for all subsequent HR type definitions
- Composite index on `employee_status(user_id, date_from DESC)` is in place for efficient period queries

## Self-Check: PASSED

- FOUND: supabase/migrations/001_add_hr_module.sql
- FOUND: supabase/migrations/002_add_hr_fields_to_users.sql
- FOUND: .planning/phases/02-db-foundation/02-01-SUMMARY.md
- FOUND commit: 50eca97 (migration 001)
- FOUND commit: 165b6cf (migration 002)
- Task 3: Human confirmed migrations applied in Supabase SQL Editor (2026-03-02)

---
*Phase: 02-db-foundation*
*Completed: 2026-03-02*
