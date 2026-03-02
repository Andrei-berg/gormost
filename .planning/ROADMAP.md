# Roadmap: Gormost — HR Module (Milestone v2.0)

## Milestones

- Completed: **v1.0 Core** - Phases 1-4 (dispatching, approvals, kanban, all 8 panels)
- Completed: **v1.1 UI/UX** - Phase 01 (empty states, header improvements, mobile KPI)
- Active: **v2.0 HR Module** - Phases 02-05

## Overview

The v2.0 milestone adds an HR attendance panel to Gormost. ZAMPORAB currently answers "who from SRV-FIRE is here today?" via WhatsApp. This milestone replaces that with a structured screen: per-employee status tracking backed by an append-only event log, a daily operations view, hire/dismiss management, and monthly attendance reporting with Excel export.

Build order is strict: DB schema must be correct before types, types before API, API before UI. The riskiest decision (event log vs. mutable state) is locked in Phase 02.

---

## Phases

- [ ] **Phase 02: DB Foundation** - HR schema migrations, TypeScript types, and API functions
- [ ] **Phase 03: Core HR Panel UI** - Daily operations screen for ZAMPORAB morning workflow
- [ ] **Phase 04: Staff Management** - Hire/dismiss actions and employee detail card
- [ ] **Phase 05: Reporting & Export** - Attendance grid, period reports, and Excel export

---

## Phase Details

### Phase 02: DB Foundation
**Goal**: The HR data layer exists and is correct — schema, types, and API functions are ready for UI to consume
**Depends on**: Nothing (first phase of this milestone)
**Requirements**: HR-01, HR-02
**Success Criteria** (what must be TRUE):
  1. Migration file `001_add_hr_module.sql` creates `employee_status` table with append-only semantics (no UPDATE path in API)
  2. Migration file `002_add_hr_fields_to_users.sql` adds `date_hired` and `date_fired` columns to `users` without breaking existing rows
  3. `src/types/index.ts` exports `EmployeeStatusType`, `EmployeeStatus`, `EMPLOYEE_STATUS_CONFIG`, `EnrichedEmployee`, and updated `User` interface — `npm run build` passes
  4. `src/lib/api.ts` has 6 HR functions: `fetchAllCurrentStatuses`, `fetchEmployeeStatusHistory`, `setEmployeeStatus`, `fetchStatusesForPeriod`, `hireEmployee`, `fireEmployee` — each calls `logAction()`
  5. Presence-by-default logic is encoded in `fetchAllCurrentStatuses`: employees with no status record today return "Na rabote" without requiring a row
**Plans**: TBD

### Phase 03: Core HR Panel UI
**Goal**: ZAMPORAB can open `/hr` and immediately see who is present today, change a status with one click, and review status history per employee
**Depends on**: Phase 02
**Requirements**: HR-03, HR-04, HR-05, HR-06, HR-07
**Success Criteria** (what must be TRUE):
  1. ZAMPORAB opens `/hr` and sees all employees in their service grouped by service name, each with a colored status badge (green/yellow/red/grey)
  2. ZAMPORAB clicks a status button on any employee card and the status changes immediately — one click, no modal required for the common case
  3. The today summary panel shows working/absent headcount per service before the employee list
  4. ZAMPORAB can expand any employee's status history and see a chronological list of past status changes with dates and reasons
  5. HEAD role can open `/hr` and see their own service employees in read-only mode (no status change buttons visible)
**Plans**: TBD

### Phase 04: Staff Management
**Goal**: ADMIN can formally record employee lifecycle events (hire, dismiss) and any user can view a complete employee card
**Depends on**: Phase 03
**Requirements**: HR-08, HR-09
**Success Criteria** (what must be TRUE):
  1. ADMIN can set a hire date for a new employee and the employee appears as active in the HR list from that date
  2. ADMIN can dismiss an employee with a dismissal date — the employee's `is_active` becomes false and they appear in a separate "Dismissed" section rather than the active list
  3. Any HR panel user can click an employee name to open a detail card showing: full name, position, service, phone, hire date, and the last 10 request assignments for that employee
**Plans**: TBD

### Phase 05: Reporting & Export
**Goal**: BOSS and ZAMPORAB can view and export attendance data for any calendar month or quarter
**Depends on**: Phase 04
**Requirements**: HR-10, HR-11, HR-12
**Success Criteria** (what must be TRUE):
  1. User selects a month and sees an attendance grid: rows are employees grouped by service, columns are days 1-31, each cell shows a status code (R/O/B/P/U) matching T-13 format conventions
  2. User selects a date range and sees a period report: per-employee and per-service totals for vacation days, sick days, and compensatory days
  3. User clicks "Export to Excel" and receives a `.xlsx` file with the attendance grid data, formatted for printing
  4. The attendance grid renders correctly on print preview (`window.print()`) without dark Tailwind styles bleeding through
**Plans**: TBD

---

## Progress

**Execution Order:** Phase 02 → Phase 03 → Phase 04 → Phase 05

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 01. UI/UX Improvements | v1.1 | 3/3 | Complete | 2026-03-02 |
| 02. DB Foundation | v2.0 | 0/? | Not started | - |
| 03. Core HR Panel UI | v2.0 | 0/? | Not started | - |
| 04. Staff Management | v2.0 | 0/? | Not started | - |
| 05. Reporting & Export | v2.0 | 0/? | Not started | - |
