---
phase: 07-hr-table-view-compact-list-with-search-filters-and-inline-status-editing
plan: 02
subsystem: ui
tags: [react, tailwind, nextjs, hr, filter, search, table-view]

# Dependency graph
requires:
  - phase: 07-hr-table-view-compact-list-with-search-filters-and-inline-status-editing
    provides: "07-01: HRTableView component with StatusPopup for inline status editing"
provides:
  - HRToolbar component (view toggle + search + service filter)
  - /hr page wired with view switching, search, and service filter logic
  - filteredEmployees computed with AND logic applied to both card and table views
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - HRToolbar follows dispatcher Toolbar pattern — thin orchestrator (page.tsx) calls new component via callback props
    - filteredEmployees computed from visibleEmployees — role filter (isHead) applied first, then search + service filter (AND logic)
    - Conditional rendering: view === 'table' ? <HRTableView> : <ServiceSection grid> — single boolean switch

key-files:
  created:
    - src/components/hr/HRToolbar.tsx
  modified:
    - src/app/hr/page.tsx

key-decisions:
  - "HRToolbar placed between SummaryPanel and hire button — SummaryPanel shows totals across all visible employees (not filtered), toolbar controls only affect the content area below"
  - "filteredEmployees feeds both grouped (card view) and HRTableView (table view) — single source of truth for filter state"
  - "Default view is cards — preserves existing ServiceSection behavior without any visible change for users who never touch the toolbar"

patterns-established:
  - "Toolbar pattern: page.tsx holds state, passes callbacks down to toolbar, applies computed result to content rendering"

requirements-completed: [HR-UX-01]

# Metrics
duration: 2min
completed: 2026-03-07
---

# Phase 07 Plan 02: HR Toolbar and View Wiring Summary

**HRToolbar (view toggle + search + service filter) wired into /hr page with filteredEmployees AND logic serving both card and table views**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-07T03:13:58Z
- **Completed:** 2026-03-07T03:15:25Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created HRToolbar with teal-themed view toggle (Карточки/Таблица), search input, and service filter dropdown with emoji
- Added view/search/filterService state to page.tsx; computed filteredEmployees with AND logic
- Wired HRTableView as conditional table view; card view (ServiceSection) unchanged
- ADMIN hire button and dismissed employees section stay visible in both views
- Production build passes cleanly

## Task Commits

Each task was committed atomically:

1. **Task 1: Create HRToolbar component** - `55d8c8e` (feat)
2. **Task 2: Update page.tsx — add state, filter logic, conditional rendering** - `9843af7` (feat)

**Plan metadata:** (final docs commit — see below)

## Files Created/Modified
- `src/components/hr/HRToolbar.tsx` - View toggle + search input + service filter dropdown; teal active button style
- `src/app/hr/page.tsx` - Added 3 state vars, filteredEmployees computation, HRToolbar insertion, conditional view rendering

## Decisions Made
- HRToolbar placed between SummaryPanel and hire button — SummaryPanel intentionally uses visibleEmployees (not filteredEmployees) so totals are unaffected by search/filter
- filteredEmployees feeds grouped (cards) AND HRTableView (table) from one computed value
- Default view is 'cards' — preserves existing behavior for all existing users

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - `npx tsc --noEmit` and `npm run build` both passed on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 07 is complete: HRTableView (Plan 01) + wiring (Plan 02) both done
- /hr page now has dual-view mode with search + service filter
- No blockers for subsequent phases
