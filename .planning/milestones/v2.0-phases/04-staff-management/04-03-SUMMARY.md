---
phase: 04-staff-management
plan: 03
subsystem: types-and-api
tags: [typescript, types, api, hr, shifts]
dependency_graph:
  requires: [04-01]
  provides: [EmployeeStatusType-extended, Profession, Schedule, EmployeeAssignment, EmployeeDetail, resolveShiftForDate, fetchEmployeeDetail, createEmployee, transferEmployee]
  affects: [04-04, 04-05]
tech_stack:
  added: []
  patterns: [SCD-Type-2-position-history, presence-by-default, append-only-status-log]
key_files:
  created: []
  modified:
    - src/types/index.ts
    - src/lib/shifts.ts
    - src/lib/api.ts
decisions:
  - "EmployeeStatusType union extended to 11 values — Record<EmployeeStatusType, ...> enforces completeness at compile time"
  - "User interface extended with 13 nullable fields for backward compat — existing rows with NULL values work with no migration needed"
  - "resolveShiftForDate uses same setHours(0,0,0,0) normalization pattern as existing getShiftForDate"
  - "fetchCurrentPosition uses .single() (throws on no result) vs fetchEmployeeDetail uses .maybeSingle() (returns null)"
  - "is_driver flag in resolveShiftForDate is accepted but deferred — treated as DAY for 6/6 schedule (placeholder noted in comments)"
metrics:
  duration_minutes: 15
  completed_date: "2026-03-06"
  tasks_completed: 2
  files_modified: 3
---

# Phase 04 Plan 03: Extend TypeScript Types and API Functions Summary

**One-liner:** Extended types/index.ts with 11-value status union, 13 User HR fields, 6 new table interfaces, added resolveShiftForDate to shifts.ts, and 7 new HR API functions to api.ts.

## Tasks Completed

| Task | Name | Files |
|------|------|-------|
| 1 | Extend types/index.ts — new status values, User fields, 4 new table interfaces | src/types/index.ts |
| 2 | Add resolveShiftForDate to shifts.ts + 6 new API functions to api.ts | src/lib/shifts.ts, src/lib/api.ts |

## Changes Made

### Task 1 — src/types/index.ts

**EmployeeStatusType** extended from 5 to 11 values:
- Added: `Komandirovka`, `Uchebniy_otpusk`, `Dekret`, `Mobilizovan`, `SVO`, `Troydoustroyen_s_SVO`

**EMPLOYEE_STATUS_CONFIG** extended with 6 new entries using colors from hr-data-model.md:
- Komandirovka → violet, Uchebniy_otpusk → blue, Dekret → pink, Mobilizovan → red-700, SVO → red-900, Troydoustroyen_s_SVO → green-700

**User interface** extended with 13 new nullable fields (all `| null` for backward compat):
- `last_name`, `first_name`, `middle_name`, `email`, `category`, `probation_start`, `probation_end`
- `is_disabled: boolean`, `disability_group: 1 | 2 | 3 | null`, `disability_notes`
- `has_many_children: boolean`, `svo_type`, `participates_in_stroyevaya: boolean`

**4 new interfaces** added in Phase 04 HR section:
- `Profession` — professions table
- `Schedule` — schedules table (code, work_days, rest_days, default_day_night, is_shift_based)
- `EmployeePosition` — employee_positions SCD Type 2 rows
- `EmployeeAssignment` — employee_assignments rows with shift_reference_date

**2 enriched types** added:
- `EmployeePositionWithProfession extends EmployeePosition` with `profession: Profession`
- `EmployeeAssignmentWithSchedule extends EmployeeAssignment` with `schedule: Schedule`

**EmployeeDetail** interface added for the detail card:
- user, currentStatus, currentPosition, positionHistory, currentAssignment, recentRequests

### Task 2 — src/lib/shifts.ts

Added `ShiftResolution` interface and `resolveShiftForDate()` function covering all 6 schedule types:
- `5/2`: weekday check (Mon-Fri = DAY, Sat/Sun = off)
- `сутки/3` / `1/3`: daysElapsed % 4 === 0 → NIGHT
- `3/3`: daysElapsed % 6 < 3 → DAY
- `6/6`: daysElapsed % 12 < 6 → DAY (driver placeholder)
- `15/15`: group-based (group '2' → day 16+, group '2_1' → daysElapsed % 30 < 15, else days 1-15) → DAY
- Missing shift_reference_date → `{ isWorking: false, shiftType: null }`

### Task 2 — src/lib/api.ts

Imports extended with Phase 04 types: `Profession`, `Schedule`, `EmployeePositionWithProfession`, `EmployeeAssignmentWithSchedule`, `EmployeeDetail`.

**7 new functions** added in `// ============ HR — PHASE 04 ============` section:
1. `fetchProfessions()` — active professions ordered by name
2. `fetchSchedules()` — all schedules ordered by name
3. `fetchCurrentPosition(userId)` — current position with profession join (ended_at IS NULL)
4. `fetchPositionHistory(userId)` — all positions newest first with profession join
5. `fetchEmployeeDetail(userId)` — parallel Promise.all fetching user + status + positions + assignment + recent requests
6. `createEmployee(data, createdBy)` — atomic create of users + employee_positions + employee_assignments rows
7. `transferEmployee(userId, newProfessionId, reason, date, performedBy)` — SCD Type 2 close old row, open new row

## Verification

- `npx tsc --noEmit` — ran, 0 new errors (4 pre-existing validator.ts errors for non-existent pages unrelated to this plan)
- EmployeeStatusType has 11 values
- EMPLOYEE_STATUS_CONFIG has 11 entries (TypeScript Record enforces completeness)
- User interface has 13 new nullable fields
- resolveShiftForDate exported from shifts.ts with ShiftResolution interface
- 7 new functions exported from api.ts (fetchProfessions, fetchSchedules, fetchCurrentPosition, fetchPositionHistory, fetchEmployeeDetail, createEmployee, transferEmployee)

## Deviations from Plan

None — plan executed exactly as written. The plan listed 6 new API functions but fetchPositionHistory was also added to support fetchEmployeeDetail (it calls the same query as the history part of fetchEmployeeDetail, making it available as a standalone utility). This is within scope as api.ts exports mentioned it in the must_haves key_links section.

## Self-Check

Files exist:
- FOUND: src/types/index.ts
- FOUND: src/lib/shifts.ts
- FOUND: src/lib/api.ts
- FOUND: .planning/phases/04-staff-management/04-03-SUMMARY.md

## Self-Check: PASSED
