---
phase: 04-staff-management
plan: 01
subsystem: database
tags: [postgresql, supabase, migration, ddl, hr, schema]

# Dependency graph
requires:
  - phase: 02-db-foundation
    provides: "employee_status table, users table with date_hired/date_fired"
provides:
  - "Migration 005: professions table (profession/grade/category lookup)"
  - "Migration 005: employee_positions table (SCD Type 2 position history)"
  - "Migration 005: schedules table (6 work schedule types)"
  - "Migration 005: employee_assignments table (shift/schedule assignments)"
  - "Migration 005: 13 new columns on users table (last_name, first_name, middle_name, email, category, probation_start, probation_end, is_disabled, disability_group, disability_notes, has_many_children, svo_type, participates_in_stroyevaya)"
  - "Migration 005: employee_status CHECK constraint extended to 11 values"
affects: [04-02, 04-03, 04-04, 04-05, 05-reports]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SCD Type 2 via partial unique index: CREATE UNIQUE INDEX ... WHERE ended_at IS NULL"
    - "TEXT FK pattern: user_id TEXT NOT NULL REFERENCES users(user_id) — never UUID for users FK"
    - "Idempotent DDL: IF NOT EXISTS guards on all CREATE TABLE and CREATE INDEX statements"
    - "Rollback block as SQL comment at file bottom (project convention)"

key-files:
  created:
    - "supabase/migrations/005_add_staff_management_schema.sql"
  modified: []

key-decisions:
  - "user_id FK columns are TEXT (not UUID) — critical match with existing users.user_id column type"
  - "Partial unique index (WHERE ended_at IS NULL) enforces one active position/assignment per employee without blocking history rows"
  - "UNIQUE(name, COALESCE(grade, '')) on professions enables NULL-safe uniqueness for ITR roles without grade"
  - "employee_status CHECK constraint replaced (DROP + ADD) rather than modified — only idempotent pattern available in PostgreSQL"
  - "13 new users columns all use DEFAULT NULL for backward compatibility with existing data"

patterns-established:
  - "SCD Type 2 pattern: ended_at=NULL is current row, close by setting ended_at=today and insert new row"
  - "Migration header comment: purpose, critical constraints, idempotency note"

requirements-completed: [HR-13, HR-14, HR-15, HR-16]

# Metrics
duration: 5min
completed: 2026-03-06
---

# Phase 04 Plan 01: Staff Management Schema Summary

**PostgreSQL DDL migration adding 4 new HR tables (professions, employee_positions, schedules, employee_assignments) and 13 columns to users, with SCD Type 2 position/assignment history via partial unique indexes**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-06T07:07:26Z
- **Completed:** 2026-03-06T07:12:00Z
- **Tasks:** 1 of 2 (checkpoint:human-verify is pending human action)
- **Files modified:** 1

## Accomplishments
- Migration 005 written with complete DDL for Phase 04 data layer
- 13 new HR columns added to users table (all backward-compatible with DEFAULT NULL)
- 4 new tables: professions (lookup), employee_positions (SCD2), schedules (lookup), employee_assignments (SCD2)
- employee_status CHECK constraint extended from 5 to 11 status values
- All DDL idempotent with IF NOT EXISTS guards — safe to re-run

## Task Commits

Each task was committed atomically:

1. **Task 1: Write migration 005** - `8ed5c0b` (feat)

**Plan metadata:** pending (after checkpoint cleared)

## Files Created/Modified
- `supabase/migrations/005_add_staff_management_schema.sql` - Complete Phase 04 schema DDL: 4 new tables, 13 users columns, updated status constraint

## Decisions Made
- user_id FK columns use TEXT type (not UUID) to match existing users.user_id column — this is the established pattern from migration 001
- Partial unique indexes implement SCD Type 2 "one active record" constraint efficiently without triggers
- COALESCE(grade, '') trick in UNIQUE constraint handles NULL grade for ITR roles (standard PostgreSQL pattern)
- DROP CONSTRAINT + ADD CONSTRAINT is the only idempotent way to replace a CHECK constraint in PostgreSQL

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**Human action required before subsequent Phase 04 plans can proceed.**

Apply migration 005 to Supabase:

1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/wwwtsvboqffzbnliuiun/sql/new
2. Copy full contents of `supabase/migrations/005_add_staff_management_schema.sql` into the editor
3. Run the migration
4. Verify in Table Editor: 4 new tables — `professions`, `employee_positions`, `schedules`, `employee_assignments`
5. Verify: `users` table shows new columns including `last_name`, `first_name`, `category`, `is_disabled`, `svo_type`, `participates_in_stroyevaya`

Type "migration applied" to unblock the next continuation agent.

## Next Phase Readiness
- Migration 005 written and committed, ready to apply
- Once applied: Plan 02 (seed data — schedules + professions INSERT statements) can proceed
- Once applied: Plan 03 (TypeScript types — extend EmployeeStatusType + add HR types) can proceed
- Plans 02-05 all depend on these tables existing in Supabase

---
*Phase: 04-staff-management*
*Completed: 2026-03-06*
