---
phase: 04-staff-management
plan: 04
subsystem: ui
tags: [react, nextjs, tailwind, hr, modals, employee-lifecycle]

requires:
  - phase: 04-03
    provides: fetchEmployeeDetail, createEmployee, transferEmployee, fireEmployee API functions and EmployeeDetail types

provides:
  - EmployeeDetailCard modal with full employee profile
  - HireModal form for creating new employees
  - DismissModal confirmation dialog for dismissal
  - TransferModal form for position transfers
  - /hr page wired with name-click, ADMIN lifecycle actions, DismissedSection

affects:
  - 04-05
  - phase-05

tech-stack:
  added: []
  patterns:
    - "Modal overlay pattern: fixed inset-0 bg-black/60 z-50 with click-outside-to-close"
    - "useEffect on userId for modal data fetch (detail card)"
    - "Thin orchestrator pattern: modal state in page.tsx, data fetching inside modals"

key-files:
  created:
    - src/components/hr/EmployeeDetailCard.tsx
    - src/components/hr/HireModal.tsx
    - src/components/hr/DismissModal.tsx
    - src/components/hr/TransferModal.tsx
  modified:
    - src/app/hr/page.tsx
    - src/components/hr/ServiceSection.tsx
    - src/components/hr/EmployeeCard.tsx

key-decisions:
  - "EmployeeDetailCard fetches its own data via useEffect(userId) — detail card is self-contained, page.tsx only tracks selectedUserId"
  - "DismissedSection added inline in page.tsx (not a separate component) — collapsible toggle, shows date_fired"
  - "Employee name in EmployeeCard is a button element (not a div) to preserve accessibility and event handling"

patterns-established:
  - "HR modal chain: name click -> detail card -> dismiss/transfer (userId state threads through)"
  - "findEmployee helper in page.tsx resolves userId to name for dismiss/transfer targets"

requirements-completed: [HR-08, HR-09]

duration: 4min
completed: 2026-03-06
---

# Phase 4 Plan 04: HR Lifecycle UI Summary

**Employee detail card, hire/dismiss/transfer modals wired to /hr page — ADMIN has full employee lifecycle management via modal chain from name click**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-06T16:30:46Z
- **Completed:** 2026-03-06T16:34:xx Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- EmployeeDetailCard opens on employee name click, showing all profile sections (contact, position, schedule, probation, disability, position history, recent requests)
- ADMIN can hire new employees via HireModal form (profession/schedule dropdowns, shift number, probation dates)
- ADMIN can dismiss employees via DismissModal — dismissed employees move to collapsible DismissedSection
- ADMIN can transfer employees to new positions via TransferModal (profession dropdown + reason select)
- npm run build passes cleanly

## Task Commits

1. **Task 1: Create EmployeeDetailCard, HireModal, DismissModal, TransferModal** - `cce4ac3` (feat)
2. **Task 2: Wire /hr page.tsx — name click, modals, DismissedSection** - `1d1b088` (feat)

## Files Created/Modified

- `src/components/hr/EmployeeDetailCard.tsx` - Modal overlay with full employee profile, collapsible position history, ADMIN dismiss/transfer buttons
- `src/components/hr/HireModal.tsx` - Create employee form with profession/schedule selects, probation dates, shift num toggle
- `src/components/hr/DismissModal.tsx` - Confirmation dialog with date_fired picker calling fireEmployee()
- `src/components/hr/TransferModal.tsx` - Position transfer form with profession select and change_reason dropdown
- `src/app/hr/page.tsx` - Added modal state, ADMIN hire button, DismissedSection, onNameClick wiring
- `src/components/hr/ServiceSection.tsx` - Added onNameClick prop threaded to EmployeeCard
- `src/components/hr/EmployeeCard.tsx` - Employee name is now a clickable button

## Decisions Made

- EmployeeDetailCard is self-contained: fetches its own EmployeeDetail on mount via useEffect(userId), no data passed from parent beyond userId.
- DismissedSection is inline in page.tsx rather than a separate component — simple collapsible list with name + date_fired, no extra state needed.
- Employee name styled as `<button>` element for proper accessibility (keyboard navigation, screen readers).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 04-05 (reports/export) can proceed — all employee lifecycle management UI is complete
- /hr page at https://gormost.vercel.app/hr now has full ADMIN lifecycle controls
- Dismissed employees visible in collapsible section below active service groups

---
*Phase: 04-staff-management*
*Completed: 2026-03-06*
