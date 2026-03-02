# Project Research Summary

**Project:** Gormost — HR Module (Milestone 2.0)
**Domain:** Employee attendance tracking integrated into an existing operational management system
**Researched:** 2026-03-02
**Confidence:** HIGH

## Executive Summary

The Gormost HR module is an attendance and employee status tracking addition to an existing tunnel operations management system. The module's core purpose is replacing WhatsApp group chats as the coordination mechanism: ZAMPORAB (shift foreman) currently has no screen to answer "who from SRV-FIRE is actually here right now?" The scope is deliberately narrow — presence status tracking for ~50–100 employees across 5 services — not payroll, not timekeeping, not leave approvals. The recommended approach builds on the existing codebase with minimal new dependencies (only `xlsx` for Excel export) and follows the established panel-per-role architecture exactly.

The key architectural decision is treating `employee_status` as an append-only event log with date ranges, not a mutable current-state field. This single decision determines whether period reports and attendance grids are possible at all. The existing `users` table remains the canonical employee record — HR extends it with `date_hired`/`date_fired` columns but does not replace or duplicate it. All four research files converge on the same three-phase build order: DB foundation first, then daily operations UI, then reporting.

The main risk is schema decisions made early that cannot be reversed without data migration. Specifically: if `employee_status` is designed as a mutable single-row-per-employee table, period reports become structurally impossible. If HR creates a parallel employee entity instead of extending `users`, data drift with existing panels becomes inevitable. Both mistakes must be avoided in Phase 1 before any UI work begins.

---

## Key Findings

### Recommended Stack

The existing stack covers ~90% of HR module needs with no changes required. Only one new dependency is warranted: `xlsx` (SheetJS Community Edition, ^0.18.5) for in-browser Excel export of attendance sheets. PDF output should use `window.print()` with a `@media print` stylesheet — zero new dependencies, handles Cyrillic natively via OS fonts. The attendance grid is a CSS Grid layout problem solvable with Tailwind's existing utilities; no third-party data grid library is needed.

**Core technologies:**
- `date-fns` ^3.0.0 (already installed): Calendar arithmetic — `eachDayOfInterval`, `startOfMonth`, `endOfMonth`, `format`, `parseISO` cover all date grid needs
- Tailwind CSS (already installed): Attendance grid via `grid-cols-[auto_repeat(31,...)]` inline template; cell color coding via Tailwind utility classes
- `@supabase/supabase-js` (already installed): All DB queries following the existing separate-fetch-then-merge pattern
- `xlsx` (SheetJS CE, NEW — only new dependency): Client-side `.xlsx` generation for attendance sheet exports; works in browser, no API round-trip, handles datasets of ≤150 employees x 31 days instantly

Rejected additions: `react-table`, `react-day-picker`, `ExcelJS`, `jsPDF`, `Puppeteer`, `react-query`, `Zustand`, `react-virtualized` — all add complexity without meaningful benefit at the project's scale.

### Expected Features

The primary user is ZAMPORAB, who uses this every morning before assigning work. The secondary user is BOSS, who needs monthly/quarterly absence counts. ADMIN handles occasional hire/dismiss actions.

**Must have in HR module v1 (table stakes):**
- Employee list grouped by service with colored status badge — core orientation, replaces WhatsApp lookup
- Current presence status per employee: На работе / Отгул / Больничный / Отпуск / Уволен — the primary problem being solved
- One-click status change from employee card — must be fast, replacing message-based coordination
- Today's summary: working/absent headcount per service — ZAMPORAB needs this before assigning work
- Status change history per employee (simple list) — audit trail, minimum viable history
- Inactive/dismissed employees shown separately — `is_active=false` users exist and need handling

**Should have (differentiators — valuable but not day-one blockers):**
- Attendance sheet grid (employee x day matrix, T-13 format) — standard in Russian government ops, enables verbal reporting
- Period reports: vacation/sick leave totals by month/quarter — BOSS planning, government reporting cycles
- Export to Excel — required for official government reporting, manual workaround exists now
- Employee card with hire date, contacts, assignment history — organizational memory

**Defer to HR module v2+:**
- Clock-in/clock-out timestamps (requires hardware)
- Leave approval workflow (requires organizational process change)
- Notifications/push alerts (no infrastructure in scope)
- Separate HR role (ADMIN/BOSS/ZAMPORAB covers all use cases)
- Calendar/shift planning integration (keep concerns separate)

**Russian government context notes:** Status terminology must use standard Russian labor categories. "Отгул" (compensatory day off) is legally distinct from "Отпуск" (vacation). The attendance grid should visually match Form T-13 format. Reporting periods should default to calendar month with quarter selection available.

### Architecture Approach

The HR module follows the established panel-per-role pattern exactly — no new patterns introduced. `src/app/hr/page.tsx` is a thin orchestrator (~60 lines: AuthGuard + state + loadData). Each UI section is a separate file in `src/components/hr/`. All queries go into a new delimited section of `src/lib/api.ts`. Navigation is handled automatically by adding one entry to the `PANELS` array in `src/types/index.ts`.

The `employee_status` table uses an append-only event log design with `date_from`/`date_to` date range fields. "Current status" is derived at query time as the most recent record where `date_from <= today AND (date_to IS NULL OR date_to >= today)`. This approach makes attendance grids and period reports possible without schema changes later. Users and statuses are fetched in separate queries and merged in TypeScript (consistent with existing `fetchPeopleStats` pattern — no Supabase relational joins).

**Major components:**
1. `hr/page.tsx` — AuthGuard(`['ADMIN', 'BOSS', 'ZAMPORAB']`), state, `loadData()`, tab management, callbacks
2. `hr/components/TodaySummary.tsx` — KPI cards: working/absent/sick counts per service (props-only, no fetch)
3. `hr/components/EmployeeList.tsx` + `EmployeeCard.tsx` — grouped employee list with status badge and change action
4. `hr/components/StatusBadge.tsx` — reusable colored badge from `EMPLOYEE_STATUS_CONFIG`, used in cards and grid
5. `hr/components/AttendanceGrid.tsx` — employee x day matrix, lazy-loads on tab switch with date-range filter
6. `hr/components/PeriodReport.tsx` — aggregated absence totals for date range, lazy-loads on tab switch

**DB schema — new items only:**
- `employee_status` table: `(id, user_id, status, date_from, date_to, reason, created_by, created_at)` with indexes on `(user_id, date_from DESC)` and `(date_from)`
- `users` table additions: `date_hired date`, `date_fired date` (both nullable, via migration)
- New TypeScript types: `EmployeeStatusType`, `EmployeeStatus`, `EMPLOYEE_STATUS_CONFIG`, `EnrichedEmployee`
- New API section in `api.ts`: `fetchAllCurrentStatuses()`, `fetchEmployeeStatusHistory()`, `setEmployeeStatus()`, `fetchStatusesForPeriod()`, `hireEmployee()`, `fireEmployee()`

**Build order is strict:** DB migration → TypeScript types → API functions → leaf UI components → page orchestrator. This order is dictated by import dependencies; reversing it causes cascading TypeScript errors.

### Critical Pitfalls

1. **Mutable status instead of event log** — designing `employee_status` with `UPDATE` semantics destroys history and makes period reports structurally impossible. Prevention: append-only insert pattern; API closes prior open period before inserting new status. Any `UPDATE employee_status SET status=` call in production code is a bug signal.

2. **Duplicating user entity** — creating a separate `employees` or `hr_users` table that mirrors `users` creates two sources of truth. `users` already IS the employee record. Prevention: add only `date_hired`/`date_fired` columns to `users`; `employee_status` stores only attendance events, not identity data.

3. **Overlapping status periods** — without enforcement, two concurrent open-ended periods for the same employee corrupt all summary queries. Prevention: API must close previous open period before inserting new one; optional PostgreSQL exclusion constraint using `btree_gist` on date ranges. Detection query: `SELECT user_id, COUNT(*) FROM employee_status WHERE date_to IS NULL GROUP BY user_id HAVING COUNT(*) > 1`.

4. **Type update lag breaking all 8 panels** — adding `date_hired`/`date_fired` to the DB without updating the `User` interface in `src/types/index.ts` breaks all panels simultaneously. Prevention: schema change and type update in the same commit; `npm run build` must pass before that commit lands.

5. **Missing changelog entries** — HR actions not written to `changelog` table break the system's audit trail requirement. Prevention: every HR API function must call `logAction()` — two lines of code that are easy to forget. Template from existing `createRequest()` pattern.

---

## Implications for Roadmap

Based on combined research, the HR module naturally decomposes into three phases with a strict dependency order.

### Phase 1: DB Foundation and Types

**Rationale:** All other work depends on the schema being correct. TypeScript types depend on DB columns; API functions depend on types; UI depends on API. The riskiest decisions (event log vs. mutable state, extending users vs. creating parallel entity) must be made and committed here. Deferring schema decisions means rework later.

**Delivers:**
- `supabase/migrations/001_add_hr_module.sql` — `employee_status` table with date range indexes
- `supabase/migrations/002_add_hr_fields_to_users.sql` — `date_hired`, `date_fired` columns
- Updated `src/types/index.ts` — `EmployeeStatusType`, `EmployeeStatus`, `EMPLOYEE_STATUS_CONFIG`, `EnrichedEmployee`, extended `User` interface, `PANELS` HR entry
- New `// === EMPLOYEE STATUS ===` section in `src/lib/api.ts` — all 6 HR API functions with `logAction()` calls

**Features addressed:** All table stakes depend on this phase completing first.

**Pitfalls to avoid:**
- Mutable status design (Pitfall 2) — must be append-only from day one
- User entity duplication (Pitfall 1) — extend `users`, do not create `employees` table
- Type update lag (Pitfall 4) — types and schema must update together
- Missing changelog (Pitfall 12) — `logAction()` in every API function
- Enum naming collision (Pitfall 9) — use `EmployeeAttendanceStatus` or `HRStatus`, not `Status`
- Non-nullable columns breaking existing rows (phase warning) — all new columns must default to NULL

### Phase 2: Core HR Panel UI (Daily Operations)

**Rationale:** This delivers the primary value — replacing WhatsApp for daily shift coordination. ZAMPORAB's morning workflow is the key use case. Phase 2 requires Phase 1 complete. All components here use the established panel-per-role pattern; no novel UI patterns are needed.

**Delivers:**
- `src/app/hr/page.tsx` — orchestrator with AuthGuard, loadData, tab management
- `src/components/hr/TodaySummary.tsx` — KPI cards for today's attendance by service
- `src/components/hr/EmployeeList.tsx` + `EmployeeCard.tsx` — grouped list with status badges
- `src/components/hr/StatusBadge.tsx` — reusable colored badge component

**Features addressed:**
- Employee list grouped by service (table stake)
- Current presence status display (table stake)
- One-click status change (table stake)
- Today's summary: working/absent per service (table stake)
- Status change history per employee (table stake)
- Inactive employee separation (table stake)

**Pitfalls to avoid:**
- Soft-delete collision (Pitfall 6) — single `dismissEmployee()` function sets both `date_fired` and `is_active=false`
- Mobile nav overflow with 9th panel (Pitfall 7) — test hamburger menu at 375px
- Missing date range validation in status entry form (Pitfall 10) — inline validation before API call
- Role access for HEAD (Pitfall 13) — decide read-only access for HEAD before implementation

### Phase 3: Reporting and Export

**Rationale:** These features serve BOSS's monthly/quarterly reviews and government reporting obligations. They are high-complexity, low-daily-urgency, and architecturally dependent on Phase 1's event log having accumulated some data. Phase 3 requires Phase 2 proven in production.

**Delivers:**
- `src/components/hr/AttendanceGrid.tsx` — monthly employee x day matrix (T-13 format)
- `src/components/hr/PeriodReport.tsx` — absence totals by date range, grouped by service
- Excel export via `xlsx` (new npm dependency)
- Print-friendly `@media print` stylesheet for grid

**Features addressed:**
- Attendance sheet grid (differentiator)
- Period reports: vacations/sick leave by month/quarter (differentiator)
- Export to Excel (differentiator)
- Print view (differentiator)

**Pitfalls to avoid:**
- Full history fetch instead of date-range-filtered queries (Pitfall 5) — always pass date range to `fetchStatusesForPeriod`
- Month boundary miscounting in period reports (Pitfall 11) — use range intersection SQL: `WHERE date_from <= period_end AND (date_to >= period_start OR date_to IS NULL)`
- Dark Tailwind styles breaking print (Pitfall 14) — add `@media print` CSS before implementing print button
- Excel dependency without team approval (Pitfall 14) — `xlsx` install requires human sign-off per CLAUDE.md rules

### Phase Ordering Rationale

- **Dependency direction forces DB-first:** TypeScript types import from DB schema; API functions import from types; components import from API. Writing UI before the DB schema is finalized means rewriting components when schema changes.
- **Event log design cannot be retrofitted cheaply:** If `employee_status` starts mutable and needs to become an event log, all existing data must be migrated. This is the highest-risk decision in the project — get it right in Phase 1.
- **Phase 2 delivers standalone value:** After Phase 2, ZAMPORAB has a working daily tool. Phase 3 can be deferred without breaking Phase 2. This matches the FEATURES.md MVP recommendation: daily workflow first, reporting second.
- **Phase 3 needs data to be useful:** An attendance grid for a system that's been running for 2 weeks has minimal value. Implementing reporting after Phase 2 is live means the grid will have meaningful data to display from day one.

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 3 (AttendanceGrid):** The CSS Grid layout for a variable-column matrix (up to 31 columns) with sticky first column and horizontal scroll has non-obvious Tailwind implementation details. Worth a targeted spike before committing to the component design.
- **Phase 3 (xlsx integration):** SheetJS CE version compatibility with Next.js 16 App Router and Vercel Edge runtime should be verified (`npm info xlsx version`) before installation. The version in STACK.md (^0.18.5) is based on pre-cutoff knowledge.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (DB migration):** Append-only event log with date ranges is a well-documented PostgreSQL pattern. Migration file format and RLS policy application follow established project conventions.
- **Phase 1 (TypeScript types):** Additive changes to `types/index.ts` following existing patterns (`STATUS_CONFIG`, `PRIORITY_CONFIG`). No novel patterns.
- **Phase 2 (HR panel UI):** Follows the established panel-per-role pattern exactly as documented in ARCHITECTURE.md and CLAUDE.md. The canonical example (`dispatcher/page.tsx`) is well-understood.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Existing dependencies confirmed in `package.json`. Only new dependency (`xlsx`) has MEDIUM confidence on exact current version — verify before install. Browser print API is stable. CSS Grid + Tailwind pattern is well-established. |
| Features | HIGH | Table stakes and anti-features derived directly from project context and user interviews (ZAMPORAB workflow). Reporting complexity estimates are MEDIUM — standard patterns with no codebase equivalent to benchmark against. |
| Architecture | HIGH | Full codebase inspection completed. Existing panel pattern is clear and consistent across 8 panels. DB schema patterns (DISTINCT ON, date range indexes) are documented PostgreSQL idioms. No external assumptions made. |
| Pitfalls | HIGH | Derived from direct codebase analysis of `api.ts`, `types/index.ts`, `CONCERNS.md`, and established HR systems design patterns. The top 5 critical pitfalls are architecturally certain — not speculative. |

**Overall confidence: HIGH**

### Gaps to Address

- **HR role access for HEAD and FOREMAN (Pitfall 13):** Research flags this as unresolved. Should HEAD have read-only access to attendance status for their own service? This is a product decision needed before Phase 2 implementation, not a technical question.

- **"Уволен" status vs. `is_active=false` dual-state (FEATURES.md open question 2):** When an employee is dismissed, should both `is_active: false` and `employee_status = FIRED` be set? The recommended answer is yes (single `dismissEmployee()` function sets both), but the implications for existing admin panel UI need verification — the admin panel currently uses `deleteUser()` for dismissal.

- **Default status when no record exists (FEATURES.md open question 3):** If no `employee_status` row exists for an employee today, should the system assume "На работе" (presence is default, absence must be recorded) or show "Unknown"? Russian operations convention is presence-by-default. This must be decided before Phase 2 UI renders the employee list.

- **ZAMPORAB cross-service status editing (FEATURES.md open question 1):** Should ZAMPORAB be able to set status for employees outside their service? Recommendation: ZAMPORAB edits own service only; ADMIN edits all. Confirm before Phase 2.

- **xlsx version compatibility (STACK.md medium confidence):** Run `npm info xlsx version` and check Next.js 16 App Router compatibility before Phase 3 begins. The SheetJS CE import syntax changed between v0.17 and v0.18.

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)
- `/home/user/Projects/gormost/src/types/index.ts` — User interface, PANELS array, STATUS_CONFIG patterns
- `/home/user/Projects/gormost/src/lib/api.ts` — query patterns, soft-delete, logAction usage, fetchPeopleStats pattern
- `/home/user/Projects/gormost/src/app/dispatcher/page.tsx` — canonical panel pattern (verified)
- `/home/user/Projects/gormost/package.json` — confirmed date-fns ^3.0.0, @supabase/supabase-js ^2.47.10 installed
- `/home/user/Projects/gormost/.planning/PROJECT.md` — HR module goals, user roles, data model
- `/home/user/Projects/gormost/.planning/REQUIREMENTS.md` — REQ-100 through REQ-110, financial accounting exclusion
- `/home/user/Projects/gormost/.planning/codebase/CONCERNS.md` — known tech debt, validation gaps
- `/home/user/Projects/gormost/.planning/codebase/ARCHITECTURE.md` — polling pattern, state management conventions
- `/home/user/Projects/gormost/CLAUDE.md` — architectural rules, component conventions

### Secondary (MEDIUM confidence — training knowledge, Aug 2025 cutoff)
- SheetJS CE (xlsx) ecosystem — version 0.18.5 known stable; current version unverified
- Russian labor code Form T-13 attendance sheet conventions
- PostgreSQL exclusion constraints with `btree_gist` — documented pattern, not verified against current Supabase version

### Tertiary (context-inferred)
- `/home/user/Projects/gormost/.planning/STATE.md` — open questions including HR role question (flagged but not resolved by research)

---

*Research completed: 2026-03-02*
*Ready for roadmap: yes*
