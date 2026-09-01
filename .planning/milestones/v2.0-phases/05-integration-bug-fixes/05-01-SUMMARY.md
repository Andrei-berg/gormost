---
phase: 05-integration-bug-fixes
plan: 01
subsystem: hr
tags: [employee-status, hire-modal, summary-panel, react, typescript]

# Dependency graph
requires:
  - phase: 04-staff-management
    provides: Extended employee statuses (Komandirovka, Uchebniy_otpusk, Dekret, Mobilizovan, SVO, Troydoustroyen_s_SVO) added to EmployeeCard — SummaryPanel must count them as absent
  - phase: 02-db-foundation
    provides: fetchServices(), Service type, createEmployee() with service_id parameter
provides:
  - Correct absent headcount in SummaryPanel for all 10 non-working statuses (INT-01 closed)
  - Newly hired employees get a service_id and appear in /hr list immediately (INT-02a closed)
affects: [06-period-reports, hr-panel, zamporab-panel]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ABSENT_STATUSES typed array as EmployeeStatusType[] — add new statuses here to keep summary accurate"
    - "Promise.all([fetchProfessions(), fetchSchedules(), fetchServices()]) pattern in HireModal useEffect"

key-files:
  created: []
  modified:
    - src/components/hr/SummaryPanel.tsx
    - src/components/hr/HireModal.tsx

key-decisions:
  - "ABSENT_STATUSES covers all 10 non-working statuses; Na_rabote is the only working status (not in array)"
  - "Service dropdown has no default selection — user must explicitly choose, preventing accidental assignment"

patterns-established:
  - "Typed ABSENT_STATUSES array: add status to EmployeeStatusType AND to ABSENT_STATUSES to count as absent"

requirements-completed: [HR-05, HR-08, HR-16]

# Metrics
duration: 2min
completed: 2026-03-06
---

# Phase 05 Plan 01: Integration Bug Fixes (INT-01 + INT-02a) Summary

**Fixed SummaryPanel to count all 10 non-working statuses as absent and wired HireModal service dropdown so newly hired employees get a service_id and appear in /hr immediately**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-06T19:04:06Z
- **Completed:** 2026-03-06T19:05:46Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- INT-01 closed: SummaryPanel ABSENT_STATUSES expanded from 4 to 10 statuses — Komandirovka, Uchebniy_otpusk, Dekret, Mobilizovan, SVO, Troydoustroyen_s_SVO now correctly counted as absent in ZAMPORAB morning summary tiles
- INT-02a closed: HireModal now fetches services, shows a required dropdown, validates service selection, and passes serviceId to createEmployee() — no longer hardcodes null
- npm run build passes with no TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix SummaryPanel ABSENT_STATUSES — add 6 extended statuses (INT-01)** - `58f49be` (fix)
2. **Task 2: Fix HireModal — add required service dropdown (INT-02a)** - `4c8a074` (fix)

## Files Created/Modified
- `src/components/hr/SummaryPanel.tsx` - ABSENT_STATUSES expanded from 4 to 10 non-working statuses
- `src/components/hr/HireModal.tsx` - Added fetchServices import, services/serviceId state, useEffect fetch, service dropdown UI, validation check, and service_id: serviceId in createEmployee call

## Decisions Made
- Service dropdown has no default — user must explicitly choose a service, preventing silent null assignments
- No other changes to SummaryPanel beyond the ABSENT_STATUSES array (logic was already correct)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — both fixes were surgical one-line or small-block changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- INT-01 and INT-02a are closed — ZAMPORAB summary tiles now accurate for all status types
- Newly hired employees appear in /hr immediately with correct service association
- Phase 05 Plan 02 (if any) or Phase 06 can proceed

---
*Phase: 05-integration-bug-fixes*
*Completed: 2026-03-06*
