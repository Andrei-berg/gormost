---
phase: 04-staff-management
plan: 05
subsystem: ui
tags: [react, typescript, tailwind, hr, employee-status]

# Dependency graph
requires:
  - phase: 04-03
    provides: 6 new EmployeeStatusType values and EMPLOYEE_STATUS_CONFIG entries (Komandirovka, Uchebniy_otpusk, Dekret, Mobilizovan, SVO, Troydoustroyen_s_SVO)
provides:
  - EmployeeCard with 10 clickable status buttons in two rows
  - Row 1 (daily): На работе, Отгул, Больничный, Отпуск
  - Row 2 (extended): Командировка, Учебный отпуск, Декрет, Мобилизован, СВО, Вернулся с СВО
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-row status button layout using DAILY_STATUSES + EXTENDED_STATUSES constants"
    - "Uvolen excluded from clickable lists — lifecycle event handled separately"

key-files:
  created: []
  modified:
    - src/components/hr/EmployeeCard.tsx

key-decisions:
  - "CLICKABLE_STATUSES split into DAILY_STATUSES (4) and EXTENDED_STATUSES (6) for visual row grouping"
  - "Uvolen remains excluded from all clickable arrays — dismissal is a lifecycle modal flow, not a status button"

patterns-established:
  - "Status button rows: DAILY_STATUSES first row, EXTENDED_STATUSES second row — both rendered identically via map"

requirements-completed:
  - HR-16

# Metrics
duration: 1min
completed: 2026-03-06
---

# Phase 04 Plan 05: Extended Status Buttons Summary

**EmployeeCard now shows 10 clickable status buttons in two rows — Row 1 (4 daily) + Row 2 (6 extended: Командировка, Учебный отпуск, Декрет, Мобилизован, СВО, Вернулся с СВО)**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-06T17:31:45Z
- **Completed:** 2026-03-06T17:33:13Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Replaced single `CLICKABLE_STATUSES` constant with `DAILY_STATUSES` + `EXTENDED_STATUSES`
- Two-row status button layout renders under `canEdit` condition
- All 10 statuses clickable with identical behavior (optimistic update + INSERT)
- Reason input, StatusHistory, error display, and all existing logic unchanged
- `Uvolen` excluded from both arrays (lifecycle event, not a direct status button)
- `npm run build` passes with no errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend EmployeeCard — two-row status button layout with 6 new statuses** - `4db3448` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `src/components/hr/EmployeeCard.tsx` - Replaced single-row CLICKABLE_STATUSES with two-row DAILY_STATUSES + EXTENDED_STATUSES layout

## Decisions Made
- `CLICKABLE_STATUSES` split into two named arrays for clarity and visual grouping — no functional change to button rendering logic
- Kept identical button className/style pattern across both rows — no visual distinction needed between rows beyond grouping

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 04 is complete — all 5 plans done
- Phase 05 (period reports/export) can begin
- Blocker note from STATE.md: `xlsx` npm dependency requires developer sign-off before Phase 05 install

---
*Phase: 04-staff-management*
*Completed: 2026-03-06*
