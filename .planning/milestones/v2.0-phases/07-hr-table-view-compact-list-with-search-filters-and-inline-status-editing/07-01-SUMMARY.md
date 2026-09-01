---
phase: 07-hr-table-view-compact-list-with-search-filters-and-inline-status-editing
plan: "01"
subsystem: ui
tags: [react, typescript, tailwind, hr, status-editing]

requires:
  - phase: 04-staff-management
    provides: EmployeeCard status editing pattern (optimistic update, DAILY/EXTENDED groups, reason flow)
  - phase: 03-core-hr-panel-ui
    provides: EnrichedEmployee type, setEmployeeStatus API, EMPLOYEE_STATUS_CONFIG

provides:
  - HRTableView component with compact table layout and inline StatusPopup
  - HRTableRow sub-component with per-row popup state management
  - Outside-click popup close via document mousedown listener
  - Two-group status popup (Ежедневные/Расширенные) with active checkmark

affects:
  - 07-02 (page wiring — HRTableView will be imported into /hr page)

tech-stack:
  added: []
  patterns:
    - "HRTableRow manages own popup/optimistic state — parent (HRTableView) is stateless"
    - "StatusPopup replaces its own content: status list → reason input (single-view swap)"
    - "Outside-click via useRef + document mousedown addEventListener in useEffect"

key-files:
  created:
    - src/components/hr/HRTableView.tsx
  modified: []

key-decisions:
  - "StatusPopup view replaces status list with reason input (not shows below) — cleaner UX in compact table"
  - "services prop added to Props interface to resolve service_id → service_name display"
  - "Uvolen excluded from both DAILY_STATUSES and EXTENDED_STATUSES — lifecycle event, not clickable"
  - "HRTableRow is internal sub-component (not exported) — state isolation per row"

patterns-established:
  - "Table row popup pattern: relative wrapper + absolute z-50 top-full — drops below badge"
  - "canEdit guard: true = button wrapper, false = plain span (no cursor, no popup)"

requirements-completed:
  - HR-UX-01

duration: 2min
completed: "2026-03-07"
---

# Phase 07 Plan 01: HRTableView Summary

**Compact HR table component with floating StatusPopup for inline status editing — two-group popup (Ежедневные/Расширенные), optimistic update + rollback, outside-click close, reason input flow**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-07T03:10:17Z
- **Completed:** 2026-03-07T03:11:46Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Built HRTableView with 3-column table (Сотрудник, Служба, Статус) matching existing table shell pattern
- StatusPopup drops below status badge with two groups (daily 4 / extended 6) and divider, Uvolen excluded
- Optimistic update + rollback pattern copied exactly from EmployeeCard — status saved immediately, reason collected as follow-up INSERT
- Outside-click close via `useRef` + `document.addEventListener('mousedown')` with cleanup
- `canEdit=false` renders badge as non-clickable `<span>` — popup never opens

## Task Commits

1. **Task 1: Build HRTableView with StatusPopup inline editing** - `0cb6cd6` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `src/components/hr/HRTableView.tsx` - Compact HR table with per-row StatusPopup, optimistic status editing, service display, empty state

## Decisions Made

- StatusPopup view-swap pattern: status list replaced by reason input (not appended below) — keeps popup compact in table context
- `services: Service[]` prop added so rows can resolve `service_id` to human-readable name with emoji
- HRTableRow internal sub-component (not exported separately) — cleaner API surface, state isolation per row

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- HRTableView is complete and TypeScript-clean — ready for import in /hr page (07-02)
- Component accepts `employees`, `canEdit`, `currentUserId`, `onNameClick`, `onRefresh`, `services` — matches expected page.tsx integration props
- Build passes — component not yet imported, no route changes

---
*Phase: 07-hr-table-view-compact-list-with-search-filters-and-inline-status-editing*
*Completed: 2026-03-07*
