# Roadmap: Gormost — HR Module (Milestone v2.0)

## Milestones

- Completed: **v1.0 Core** - Phases 1-4 (dispatching, approvals, kanban, all 8 panels)
- Completed: **v1.1 UI/UX** - Phase 01 (empty states, header improvements, mobile KPI)
- Completed: **v2.0 HR Module** - Phases 02-07 (all shipped to prod; Phases 05/06 executed outside GSD tracking, reconciled 2026-09-01)

## Overview

The v2.0 milestone adds an HR attendance panel to Gormost. ZAMPORAB currently answers "who from SRV-FIRE is here today?" via WhatsApp. This milestone replaces that with a structured screen: per-employee status tracking backed by an append-only event log, a daily operations view, hire/dismiss management, and monthly attendance reporting with Excel export.

Build order is strict: DB schema must be correct before types, types before API, API before UI. The riskiest decision (event log vs. mutable state) is locked in Phase 02.

---

## Phases

- [x] **Phase 02: DB Foundation** - HR schema migrations, TypeScript types, and API functions
- [x] **Phase 03: Core HR Panel UI** - Daily operations screen for ZAMPORAB morning workflow (completed 2026-03-04)
- [x] **Phase 04: Staff Management** - Hire/dismiss actions and employee detail card (completed 2026-03-06)
- [x] **Phase 05: Integration Bug Fixes** - SummaryPanel headcount + service_id gap fixed; migration 008 shipped (05-01/05-02 SUMMARY present)
- [x] **Phase 06: Reporting & Export** - HRReports, timesheet (Т-13), export1c, докладная/строевая записка print forms shipped
- [x] **Phase 07: HR Table View** - Compact list with search, filters, inline status editing

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
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md — SQL migrations for employee_status table and users HR columns + human checkpoint
- [x] 02-02-PLAN.md — TypeScript types and 6 HR API functions

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
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md — PANELS entry, page.tsx orchestrator, SummaryPanel, ServiceSection skeleton
- [x] 03-02-PLAN.md — EmployeeCard (status buttons + optimistic update + reason input) and StatusHistory accordion

### Phase 04: Staff Management
**Goal**: The HR database layer is complete with full employee profiles, and ADMIN can manage the full employee lifecycle (hire, dismiss, transfer) with a rich employee detail card visible to all HR users
**Depends on**: Phase 03
**Requirements**: HR-08, HR-09, HR-13, HR-14, HR-15, HR-16, HR-17, HR-18
**Success Criteria** (what must be TRUE):
  1. DB: migration creates `professions`, `employee_positions`, `schedules`, `employee_assignments` tables; `users` table gets 13 new HR fields (split FIO, category, probation, disability, svo_type, participates_in_stroyevaya, etc.)
  2. Seed data: `professions` table has all ~45 canonical profession/grade entries from штатное расписание; `schedules` table has 6 schedule types (сутки/3, 5/2, 3/3, 6/6, 15/15, 1/3) with day/night metadata
  3. Employee detail card (opened by clicking employee name in /hr) shows: full FIO (split), profession+grade, category (ИТР/рабочий), schedule type, shift number, phone, email, hire date, probation end if active, disability flag+notes if set
  4. ADMIN can create a new employee with full profile (FIO split, profession, category, schedule assignment, phone, probation dates) — employee appears in HR list immediately
  5. ADMIN can dismiss an employee with dismissal date — `is_active=false`, dismissed employees appear in a separate collapsed section with dismissal date
  6. ADMIN can record a position transfer: current `employee_positions` record closes, new one opens — full history visible in employee detail card
  7. Status panel in EmployeeCard gains 6 new status buttons: Командировка, Учебный отпуск, Декрет, Мобилизован, СВО, Вернулся с СВО
  8. `resolveShiftForDate(assignment, date)` function in lib/shifts.ts correctly determines is_working + DAY/NIGHT for all 6 schedule types using shift_reference_date
  9. 270 employees from roster-merged.json imported via seed migration with correct profession, schedule, shift, and assignment data
**Plans**: 5 plans

Plans:
- [x] 04-01-PLAN.md — Schema migration 005 (ALTER users + CREATE 4 tables + fix employee_status CHECK) + human checkpoint
- [x] 04-02-PLAN.md — Seed migrations 006 (professions + schedules) + 007 (270 employees) + human checkpoint
- [x] 04-03-PLAN.md — TypeScript types extension + resolveShiftForDate in shifts.ts + 6 new API functions
- [x] 04-04-PLAN.md — EmployeeDetailCard + HireModal + DismissModal + TransferModal + /hr page wiring
- [x] 04-05-PLAN.md — EmployeeCard extended 10-status two-row button layout (HR-16)

### Phase 05: Integration Bug Fixes
**Goal**: Fix 2 critical cross-phase integration bugs found in audit — SummaryPanel shows wrong headcounts, and all hired/seeded employees are invisible in /hr
**Depends on**: Phase 04
**Requirements**: HR-05, HR-08, HR-16, HR-18
**Gap Closure**: Closes gaps from v2.0 audit (INT-01, INT-02)
**Success Criteria** (what must be TRUE):
  1. `SummaryPanel.tsx` ABSENT_STATUSES includes all 10 non-working statuses — employees on Командировка/Декрет/СВО/etc. are counted as absent, not present
  2. `HireModal.tsx` has a required service dropdown — newly hired employees are visible in /hr immediately
  3. Migration `008_fix_seeded_employee_services.sql` sets correct `service_id` on all 270 seeded employees — they appear in /hr list

**Plans**: 2 plans

Plans:
- [x] 05-01-PLAN.md — Fix SummaryPanel ABSENT_STATUSES (INT-01) + HireModal service dropdown (INT-02a)
- [x] 05-02-PLAN.md — Migration 008: set service_id on 270 seeded employees (INT-02b) + human checkpoint

### Phase 06: Reporting & Export
**Goal**: BOSS and ZAMPORAB can view and export attendance data for any calendar month or quarter
**Depends on**: Phase 05
**Requirements**: HR-10, HR-11, HR-12
**Status**: ✓ Complete — shipped outside GSD tracking. Evidence: `src/components/hr/HRReports.tsx`,
`src/lib/timesheet.ts` (+ `timesheet.test.ts`), `src/lib/export1c.ts` (+ `export1c.test.ts`),
докладная/строевая записка print forms, migration `030_timesheet_full.sql`. Timesheet export
embed-query bug fixed in `d5ea916` (2026-09-01). Plans were never formally written.
**Success Criteria** (what must be TRUE):
  1. User selects a month and sees an attendance grid: rows are employees grouped by service, columns are days 1-31, each cell shows a status code (R/O/B/P/U) matching T-13 format conventions
  2. User selects a date range and sees a period report: per-employee and per-service totals for vacation days, sick days, and compensatory days
  3. User clicks "Export to Excel" and receives a `.xlsx` file with the attendance grid data, formatted for printing
  4. The attendance grid renders correctly on print preview (`window.print()`) without dark Tailwind styles bleeding through
**Plans**: TBD

### Phase 07: HR table view — compact list with search, filters and inline status editing
**Goal**: ZAMPORAB and ADMIN can toggle the /hr panel to a compact table view, search employees by name, filter by service, and change employee status inline without leaving the table
**Depends on**: Phase 05 (standalone UX feature — no new DB or API needed)
**Requirements**: HR-UX-01
**Plans**: 2 plans

Plans:
- [x] 07-01-PLAN.md — HRTableView component with StatusPopup inline editing
- [x] 07-02-PLAN.md — HRToolbar + page.tsx wiring (view toggle, search, service filter)

---

## Progress

**Execution Order:** Phase 02 → Phase 03 → Phase 04 → Phase 05 → Phase 06 → Phase 07 — all complete

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 01. UI/UX Improvements | v1.1 | 3/3 | Complete | 2026-03-02 |
| 02. DB Foundation | v2.0 | 2/2 | Complete | 2026-03-02 |
| 03. Core HR Panel UI | v2.0 | 2/2 | Complete | 2026-03-04 |
| 04. Staff Management | v2.0 | 5/5 | Complete | 2026-03-06 |
| 05. Integration Bug Fixes | v2.0 | 2/2 | Complete | 2026-03-06 |
| 06. Reporting & Export | v2.0 | — (no formal plans) | Complete (shipped outside GSD) | ~2026-Q2 |
| 07. HR Table View | v2.0 | 2/2 | Complete | 2026-03-07 |

*Reconciled 2026-09-01: v2.0 fully shipped to production. `.planning/` tracking had frozen at Phase 07.*
