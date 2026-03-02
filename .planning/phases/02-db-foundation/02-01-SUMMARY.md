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
duration: partial (awaiting human action for Task 3)
completed: 2026-03-02
---

# Phase 02 Plan 01: HR Module DB Foundation Summary

**Append-only employee_status table and date_hired/date_fired columns on users — SQL migrations created and committed, awaiting human execution in Supabase SQL Editor**

## Performance

- **Duration:** ~5 min (Tasks 1-2 complete; Task 3 awaiting human action)
- **Started:** 2026-03-02T12:17:14Z
- **Completed:** 2026-03-02T12:17:14Z (partial — checkpoint at Task 3)
- **Tasks:** 2/3 complete (Task 3 is checkpoint:human-action)
- **Files modified:** 2

## Accomplishments
- Created supabase/migrations/ directory (new convention for project)
- Created 001_add_hr_module.sql with append-only employee_status table, CHECK constraint on 5 status values, composite index for efficient lookups, and rollback section
- Created 002_add_hr_fields_to_users.sql with idempotent ALTER TABLE for date_hired and date_fired columns and rollback section

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration 001 — employee_status append-only table** - `50eca97` (chore)
2. **Task 2: Create migration 002 — add date_hired and date_fired to users** - `165b6cf` (chore)
3. **Task 3: Human executes migrations in Supabase SQL Editor** - awaiting human action

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

**Both SQL migration files must be executed manually in Supabase SQL Editor.**

Steps:
1. Open https://supabase.com/dashboard/project/wwwtsvboqffzbnliuiun/sql
2. Paste and run `supabase/migrations/001_add_hr_module.sql`
   - Verify: `SELECT * FROM employee_status LIMIT 1;` returns 0 rows without error
3. Paste and run `supabase/migrations/002_add_hr_fields_to_users.sql`
   - Verify: `SELECT user_id, date_hired, date_fired FROM users LIMIT 3;` shows NULL date_hired and date_fired

## Next Phase Readiness
- Migration files are committed and ready for human execution
- After human confirms both scripts ran: Phase 02-02 (TypeScript types) can begin
- employee_status schema is the source of truth for all subsequent HR type definitions

---
*Phase: 02-db-foundation*
*Completed: 2026-03-02*
