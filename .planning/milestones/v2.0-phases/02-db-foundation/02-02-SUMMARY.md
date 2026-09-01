---
phase: 02-db-foundation
plan: "02"
subsystem: database
tags: [typescript, supabase, postgresql, hr-module, employee-status]

# Dependency graph
requires:
  - phase: 02-01
    provides: employee_status table in Supabase, date_hired/date_fired columns in users table

provides:
  - EmployeeStatusType union type (Na_rabote | Otgul | Bolnichniy | Otpusk | Uvolen)
  - EmployeeStatus interface (append-only event log row shape)
  - EMPLOYEE_STATUS_CONFIG constant (labels, colors, backgrounds for UI)
  - EnrichedEmployee interface (User + resolved status for today)
  - User interface extended with date_hired and date_fired fields
  - 6 HR API functions covering status reads, status writes, hire, and fire operations

affects:
  - 03-hr-ui (direct consumer — HR panel components import these types and functions)
  - 05-reports (fetchStatusesForPeriod ready for period report queries)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Presence-by-default: no employee_status row for today = Na_rabote (encoded in fetchAllCurrentStatuses via client-side Map merge)"
    - "Append-only event log: setEmployeeStatus always INSERTs, never UPDATEs — preserves audit trail for Phase 05 reporting"
    - "Parallel Supabase queries via Promise.all in fetchAllCurrentStatuses"

key-files:
  created: []
  modified:
    - src/types/index.ts
    - src/lib/api.ts

key-decisions:
  - "Presence-by-default implemented in fetchAllCurrentStatuses client-side (not SQL DEFAULT/trigger) — no DB row needed for Na_rabote state"
  - "setEmployeeStatus is INSERT-only — no UPDATE path for employee_status table. Fundamental for Phase 05 period reports correctness"
  - "fireEmployee calls setEmployeeStatus best-effort after users update — Uvolen status row is supplementary to is_active=false"

patterns-established:
  - "HR API pattern: always logAction after successful writes (applies to setEmployeeStatus, hireEmployee, fireEmployee)"
  - "EnrichedEmployee pattern: statusRecord=null means Na_rabote — consumers check statusRecord not currentStatus for DB presence"

requirements-completed: [HR-01, HR-02]

# Metrics
duration: 4min
completed: 2026-03-02
---

# Phase 02 Plan 02: HR TypeScript Types and API Functions Summary

**HR types (EmployeeStatusType, EmployeeStatus, EMPLOYEE_STATUS_CONFIG, EnrichedEmployee) and 6 API functions with presence-by-default and append-only status log, ready for Phase 03 HR UI consumption**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-02T12:37:52Z
- **Completed:** 2026-03-02T12:41:26Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Extended User interface with date_hired and date_fired fields
- Added full HR type suite: EmployeeStatusType union, EmployeeStatus interface, EMPLOYEE_STATUS_CONFIG constant, EnrichedEmployee interface
- Implemented fetchAllCurrentStatuses with presence-by-default (no status row today = Na_rabote via client-side Map)
- Implemented setEmployeeStatus as INSERT-only (append-only event log constraint upheld)
- Implemented hireEmployee and fireEmployee with logAction audit trail
- npm run build passes cleanly — no TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add HR types to src/types/index.ts** - `c16c60e` (feat)
2. **Task 2: Add 6 HR API functions to src/lib/api.ts** - `204b9c1` (feat)

**Merge commit:** `a7bf74a` (feat: HR TypeScript types and API functions — plan complete)

## Files Created/Modified
- `src/types/index.ts` - Added date_hired/date_fired to User; added EmployeeStatusType, EmployeeStatus, EMPLOYEE_STATUS_CONFIG, EnrichedEmployee
- `src/lib/api.ts` - Updated import with HR types; appended 6 HR functions: fetchAllCurrentStatuses, fetchEmployeeStatusHistory, setEmployeeStatus, fetchStatusesForPeriod, hireEmployee, fireEmployee

## Decisions Made
- Presence-by-default is encoded in fetchAllCurrentStatuses via client-side Map merge (not SQL DEFAULT or trigger). No DB row for today means Na_rabote — clean separation between DB events and resolved state.
- setEmployeeStatus is INSERT-only — the append-only constraint is fundamental to Phase 05 period report correctness. A mutable design would make historical queries impossible.
- fireEmployee calls setEmployeeStatus best-effort after updating users row. The users update (is_active=false + date_fired) is the authoritative dismissal action; the Uvolen status row is supplementary audit log.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `.next/dev/types/validator.ts` had pre-existing stale references to deleted pages (planner, service-chief, service, test). These errors existed before this plan and are unrelated to HR changes. Verified our source changes are clean via `npx tsc --noEmit --project tsconfig.json` excluding the `.next/dev/types` path.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 6 HR API functions ready for immediate consumption by Phase 03 HR UI
- Types exported from @/types — any component can import EmployeeStatusType, EMPLOYEE_STATUS_CONFIG, EnrichedEmployee
- fetchAllCurrentStatuses returns EnrichedEmployee[] — Phase 03 UI just calls this and renders the result
- fetchStatusesForPeriod API is Phase 05-ready (accepts _serviceId placeholder parameter)

---
*Phase: 02-db-foundation*
*Completed: 2026-03-02*
