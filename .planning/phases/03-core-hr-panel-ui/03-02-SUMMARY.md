---
phase: 03-core-hr-panel-ui
plan: "02"
subsystem: ui
tags: [react, nextjs, tailwind, optimistic-update, accordion, employee-status]

# Dependency graph
requires:
  - phase: 03-01
    provides: ServiceSection stub with EmployeeCardStub, /hr orchestrator page, SummaryPanel tiles
  - phase: 02-db-foundation
    provides: setEmployeeStatus and fetchEmployeeStatusHistory API functions, EmployeeStatus types
provides:
  - EmployeeCard interactive component with 4 status buttons, optimistic update, rollback, reason input
  - StatusHistory lazy accordion with open/loaded guard preventing repeat fetches
  - ServiceSection updated to use real EmployeeCard (stub removed)
  - Full /hr route is interactive end-to-end for ZAMPORAB role
affects:
  - phase 03-03 (monthly report — reads same employee data)
  - phase 04 (Uvolen/dismissal flow — wires into EmployeeCard)
  - phase 05 (xlsx export — depends on employee_status log created by these buttons)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optimistic update with rollback: localStatus mirrors server state; roll back if result is null"
    - "Lazy fetch accordion: track open and loaded separately — fetch fires only when open && !loaded"
    - "Append-only status log: reason add-on fires second setEmployeeStatus INSERT with reason text"
    - "CLICKABLE_STATUSES constant excludes Uvolen — dismissal is a separate Phase 04 flow"

key-files:
  created:
    - src/components/hr/StatusHistory.tsx
    - src/components/hr/EmployeeCard.tsx
  modified:
    - src/components/hr/ServiceSection.tsx

key-decisions:
  - "Reason input fires a SECOND setEmployeeStatus INSERT (same status + reason text) — not an UPDATE — preserving append-only log integrity"
  - "dateTo always equals dateFrom for daily HR panel clicks — open-ended records are for multi-day leave (Phase 04 scope)"
  - "Uvolen is not a clickable button — dismissal flow is Phase 04 scope"
  - "StatusHistory uses open+loaded boolean pair to prevent re-fetch on accordion toggle"

patterns-established:
  - "Optimistic update pattern: copy prevStatus before mutation, rollback on null result"
  - "Reason UX: fire API immediately with reason=null, show input as optional add-on, confirm fires second INSERT"

requirements-completed: [HR-04, HR-06]

# Metrics
duration: 8min
completed: 2026-03-04
---

# Phase 03 Plan 02: Interactive EmployeeCard and StatusHistory Summary

**One-click employee status change with optimistic update, reason input, and lazy-loaded history accordion — replaces WhatsApp coordination for ZAMPORAB role**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-04T09:55:12Z
- **Completed:** 2026-03-04T10:02:58Z
- **Tasks:** 3
- **Files modified:** 3 (2 created, 1 updated)

## Accomplishments
- EmployeeCard with 4 status buttons (Na_rabote, Otgul, Bolnichniy, Otpusk), optimistic update, and rollback on API failure
- StatusHistory accordion with lazy fetch (only on first open) and colored status labels with date ranges
- ServiceSection stub replaced with real EmployeeCard — /hr route is fully interactive end-to-end
- Full `npm run build` passes with zero TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create StatusHistory.tsx** - `e6905dd` (feat)
2. **Task 2: Create EmployeeCard.tsx** - `78e0d07` (feat)
3. **Task 3: Update ServiceSection to use real EmployeeCard** - `a53c111` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `src/components/hr/StatusHistory.tsx` - Lazy accordion showing past EmployeeStatus records; fetches on first open only
- `src/components/hr/EmployeeCard.tsx` - Interactive card: 4 status buttons, optimistic update, reason input, error rollback, StatusHistory embedded
- `src/components/hr/ServiceSection.tsx` - Removed EmployeeCardStub, imports real EmployeeCard with currentUserId and onRefresh props wired through

## Decisions Made
- Reason add-on fires a second setEmployeeStatus INSERT (same status + reason text) — preserves append-only log; no UPDATE path exists
- dateTo always equals dateFrom for daily panel clicks — open-ended multi-day records are Phase 04 scope
- Uvolen excluded from CLICKABLE_STATUSES — dismissal UI is Phase 04 scope
- StatusHistory tracks `open` and `loaded` independently so toggling closed/open does not re-fetch

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Pre-existing `.next/dev/types/validator.ts` errors referencing stale dev cache routes are not caused by our changes and were present before this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- /hr route is fully interactive: ZAMPORAB can click status buttons, add reasons, and view history
- HEAD role sees cards in read-only mode (canEdit=false flows through correctly from page.tsx)
- Plan 03-03 (monthly report / summary view) can now build on top of this interactive layer
- Phase 04 (Uvolen dismissal flow) has a clear integration point in EmployeeCard (add Uvolen button)
- Phase 05 (xlsx report) benefits from the append-only status log being populated by these buttons

## Self-Check: PASSED

All created files confirmed present on disk. All task commits confirmed in git log.

---
*Phase: 03-core-hr-panel-ui*
*Completed: 2026-03-04*
