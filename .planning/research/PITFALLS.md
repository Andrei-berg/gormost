# Domain Pitfalls — HR Module for Gormost

**Domain:** Adding HR attendance tracking to an existing operational management system
**Researched:** 2026-03-02
**Confidence:** HIGH (codebase analyzed directly; domain patterns from established HR systems)

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or broken integrations with existing system.

---

### Pitfall 1: Duplicating User State Instead of Extending It

**What goes wrong:** Creating a new `employees` or `hr_users` table that mirrors data already in `users`. Developers do this thinking "HR needs its own entity" and end up with two sources of truth: `users.is_active` plus `employee_status.status`, `users.full_name` plus `hr_employees.full_name`, etc.

**Why it happens:** The HR module feels like a separate domain, so the instinct is to give it a separate entity. But in Gormost, `users` already IS the employee record — it has `tab_number`, `full_name`, `position`, `service_id`, `is_active`, `phone`, `role_level`.

**Consequences:**
- Data drift: user fired via `users.is_active = false` but still shows as active in HR table
- Double-maintenance: hire/fire must update two tables atomically
- Existing panels break: `fetchUsers(activeOnly=true)` already filters by `is_active` — a separate HR active-state creates a split that doesn't propagate to dispatcher, foreman, etc.
- TypeScript types in `src/types/index.ts` become stale as the `User` interface no longer matches what HR uses

**Prevention:** Never create a parallel employee entity. Add `date_hired`, `date_fired` columns directly to the existing `users` table via migration. The `employee_status` table should only store ephemeral attendance events (vacation, sick leave, off-shift), not identity data. `users` is the canonical record.

**Detection:** Warning sign — if you find yourself doing `JOIN hr_employees ON user_id = users.user_id`, you have a duplication problem.

**Phase that must address this:** Phase 1 (DB migrations) — schema decisions here are irreversible without data migration.

---

### Pitfall 2: Designing employee_status as Current State Instead of Event Log

**What goes wrong:** Treating `employee_status` as a single row per employee that gets overwritten on status change (like `UPDATE employee_status SET status='ON_VACATION' WHERE user_id=X`). This deletes history.

**Why it happens:** It feels simpler. "Just check the current row." But the stated requirement is "history of status changes" and "period reports: vacations/sick leave per month/quarter." You cannot compute these from a single mutable row.

**Consequences:**
- No history: cannot answer "how many sick days did Иванов take in February?"
- Period reports become impossible without historical data
- Cannot detect overlapping statuses (two entries claiming same user is on vacation simultaneously)
- Rollback of incorrect status entry requires manual SQL

**Prevention:** Design `employee_status` as an append-only event log:

```sql
CREATE TABLE employee_status (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     text NOT NULL REFERENCES users(user_id),
  status      text NOT NULL,      -- 'WORKING' | 'VACATION' | 'SICK' | 'ABSENT' | 'DISMISSED'
  date_from   date NOT NULL,
  date_to     date,               -- NULL means "ongoing / open-ended"
  reason      text,
  created_by  text REFERENCES users(user_id),
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

Current status = most recent row ordered by `date_from DESC, created_at DESC`. Add a computed view or function for convenience — do NOT store "current status" as a separate field.

**Detection:** Warning sign — any `UPDATE employee_status SET` call in the API layer (except closing an open period with `date_to`).

**Phase that must address this:** Phase 1 (DB migrations) — cannot change this after data exists without a migration.

---

### Pitfall 3: Overlapping Status Periods Corrupting the History

**What goes wrong:** No constraint prevents recording two overlapping vacation periods for the same employee. Example: `[2026-03-01 to 2026-03-07, VACATION]` and `[2026-03-05 to 2026-03-10, SICK]` both exist. Now "who is present today?" query returns the wrong person; period reports double-count days.

**Why it happens:** The append-only pattern is correct but requires additional logic to close the previous open period before opening a new one. Without enforcement, any code path that inserts without checking will create overlaps.

**Consequences:**
- "Present today" summary double-counts employees
- Period reports (days of vacation) count same days twice
- Attendance grid shows contradictory statuses for same day
- Manual cleanup required

**Prevention:** Two layers:
1. API layer: Before inserting a new status, close any open period for that user (`UPDATE employee_status SET date_to = [new date_from - 1] WHERE user_id=X AND date_to IS NULL`). Do this in the same logical operation.
2. Database constraint (optional but strongly recommended): PostgreSQL exclusion constraint using the `btree_gist` extension on `(user_id, daterange(date_from, COALESCE(date_to, 'infinity')))`. This is a database-enforced guarantee that no overlaps can be inserted.

**Detection:** Query `SELECT user_id, COUNT(*) FROM employee_status WHERE date_to IS NULL GROUP BY user_id HAVING COUNT(*) > 1` — any result is a data problem.

**Phase that must address this:** Phase 1 (DB) + Phase 1 (API). Both layers must handle this together.

---

### Pitfall 4: Breaking Existing Panels When Adding HR Fields to users Table

**What goes wrong:** Adding `date_hired` and `date_fired` columns to `users` causes TypeScript compilation errors because the `User` interface in `src/types/index.ts` no longer matches the DB schema. The build breaks. Existing `fetchUsers()` calls now return objects with new fields that existing components don't handle.

**Why it happens:** `src/types/index.ts` is the single source of truth for the entire codebase. Every panel — dispatcher, foreman, head, zamporab, boss, admin — imports `User` from there. A schema change without a synchronized type update breaks `npm run build` and `npx tsc --noEmit`.

**Consequences:**
- Build failure blocks deployment to Vercel
- Eight panels all stop compiling simultaneously
- Admin panel's user CRUD form (`/admin`) shows wrong fields or throws runtime errors

**Prevention:** Schema change and type update MUST happen in the same commit:
1. Write the SQL migration file (`supabase/migrations/NNN_add_hr_fields_to_users.sql`)
2. Update `User` interface in `src/types/index.ts` to add `date_hired: string | null` and `date_fired: string | null`
3. Run `npm run build` before committing — if it fails, the types are incomplete
4. Update admin panel user form to show/accept these fields

New fields should be `| null` to not break existing data rows that predate the migration.

**Detection:** `npx tsc --noEmit` will surface all breakages before they hit production.

**Phase that must address this:** Phase 1 (DB + types must be updated together).

---

### Pitfall 5: Attendance Grid Performance — Loading All History for All Employees

**What goes wrong:** The attendance grid (employee x day matrix, e.g. 50 employees x 31 days) fetches all `employee_status` records and computes the grid in JavaScript. For a 6-month-old system with daily status changes, this becomes hundreds of rows fetched and iterated client-side.

**Why it happens:** The existing pattern in `src/lib/api.ts` is to fetch everything and filter/transform in JavaScript (see `fetchPeopleStats()` — 4 separate queries, O(n²) loop). This works for the small operational dataset but attendance grids have different scale characteristics.

**Consequences:**
- Slow initial render for the attendance page (noticeable with 50 employees and 6+ months of data)
- The 30-second polling used across all panels will re-fetch the full history every cycle if HR panel uses the same pattern
- Month navigation (moving from March to February) causes a full re-fetch

**Prevention:**
- Always query `employee_status` with a date range filter: `WHERE date_from <= period_end AND (date_to >= period_start OR date_to IS NULL)` — never fetch all history
- Load only the selected month/period, not all records ever
- When user changes the month selector, re-query with new date range rather than filtering in memory
- Limit the polling interval on the HR panel — attendance data changes rarely vs. operational requests

**Detection:** Warning sign — any `fetchEmployeeStatus()` call without a date range parameter.

**Phase that must address this:** Phase 1 (API design) and Phase 3 (reports). Establish the pattern in Phase 1 to avoid retrofitting.

---

## Moderate Pitfalls

---

### Pitfall 6: Soft-Delete Collision with is_active Flag

**What goes wrong:** The existing `users` table already implements soft-delete via `is_active = false` (see `deleteUser()` in `api.ts`). The HR "dismiss" feature adds `date_fired`. These can desync: an employee dismissed via HR (date_fired set) but `is_active` still true, or vice versa — dismissed via admin panel (is_active = false) but HR shows them as active.

**Prevention:** The dismiss action in the HR panel must update both fields atomically: set `date_fired = today`, `is_active = false`, and insert a `DISMISSED` record into `employee_status`. Write a single `dismissEmployee()` API function that does all three. Never let the admin panel's `deleteUser()` and HR's dismiss pathway diverge.

**Phase:** Phase 1 (API) — establish the single dismissal function.

---

### Pitfall 7: Navigation Conflict Adding HR Panel to PANELS Config

**What goes wrong:** Adding the `/hr` panel to the `PANELS` array in `src/types/index.ts` and to the `Header.tsx` navigation without considering mobile layout. The existing navigation already has 8 panels in the hamburger menu; adding a 9th changes the layout and may push other items below the fold on mobile.

**Prevention:** Test on mobile (≤375px) after adding the HR panel to `PANELS`. The Header.tsx hamburger menu uses a flex/grid layout — verify it handles 9 items cleanly. Consider grouping: HR under "Management" section could reduce clutter.

**Phase:** Phase 2 (HR panel UI). Add to PANELS in Phase 1 but validate visual layout in Phase 2.

---

### Pitfall 8: "Today's Summary" Returning Stale Data Due to Polling Gap

**What goes wrong:** The "summary for today: who is working, who is absent" view is loaded once on mount and then updated every 30 seconds via the standard polling pattern. If a ZAMPORAB marks someone as sick at 09:00, other users see it by 09:30 at worst. For operational context this is fine. But HR actions (marking absence at shift start) are time-sensitive.

**Prevention:** For the HR panel, consider reducing polling to 15 seconds for the "today's summary" card. Alternatively, after any status-change action, immediately call `loadData()` to refresh all HR panels — the existing `onSave` callback pattern already does this.

**Phase:** Phase 2 (HR panel UI).

---

### Pitfall 9: Status Type Enum Conflicts With RoleLevel Naming

**What goes wrong:** The new HR `EmployeeStatus` type (`'WORKING' | 'VACATION' | 'SICK' | 'ABSENT' | 'DISMISSED'`) must be added to `src/types/index.ts`. If named `Status` or `UserStatus`, it collides with the existing naming conventions and may confuse TypeScript in components that import both.

**Prevention:** Name the type explicitly `EmployeeAttendanceStatus` or `HRStatus` — something that cannot be confused with `RequestStatus` or `StaffRequestStatus`, both of which already exist. Export a corresponding `HR_STATUS_CONFIG` constant (matching the pattern of `STATUS_CONFIG`, `PRIORITY_CONFIG`) to avoid hardcoding display labels in components.

**Phase:** Phase 1 (types).

---

### Pitfall 10: Missing Date Validation in Status Entry UI

**What goes wrong:** When ZAMPORAB enters a vacation period with `date_from` and `date_to`, nothing prevents entering `date_from > date_to` (e.g., end before start), or entering a past date incorrectly, or leaving `date_to` blank when it should be required.

**Why it happens:** The existing codebase has no validation framework — validation is described in `CONCERNS.md` as a missing critical feature. The RequestModal.tsx shows the pattern: no Zod, no yup, only basic state-level checks.

**Prevention:** Add explicit date validation in the status entry form before submission:
- `date_from` must be a valid date
- `date_to` must be null (ongoing) OR >= `date_from`
- Display inline error message (follow existing error state pattern in components)
This does not require a new validation library — a `validate()` function with simple comparisons is sufficient.

**Phase:** Phase 2 (HR panel UI).

---

### Pitfall 11: report period Query Edge Cases at Month Boundaries

**What goes wrong:** Period reports for "vacations in February" must correctly count partial periods. An employee who goes on vacation Feb 25 and returns March 5 should appear in both the February report (3 days: Feb 25-28) and the March report (5 days: Mar 1-5). A naive query `WHERE date_from >= Feb 1 AND date_from <= Feb 28` misses this employee entirely in February.

**Why it happens:** Date range intersection logic is non-trivial and easy to get wrong on first attempt.

**Prevention:** Use proper date-range intersection for period reports:
```sql
WHERE date_from <= [period_end]
  AND (date_to >= [period_start] OR date_to IS NULL)
```
Then clip the period on both sides in application code: `effective_from = MAX(date_from, period_start)`, `effective_to = MIN(date_to, period_end)`. Days counted = `effective_to - effective_from + 1`.

**Phase:** Phase 3 (HR reports) — test with boundary data before considering this feature complete.

---

## Minor Pitfalls

---

### Pitfall 12: Changelog Entries Missing for HR Actions

**What goes wrong:** Status changes in the HR module are not written to the `changelog` table, breaking the audit trail that is explicitly a system requirement.

**Prevention:** Every HR action (status change, hire, dismiss) must call `logAction()` after the database write, following the pattern in `src/lib/api.ts`. Use action types: `'HR_STATUS_CHANGE'`, `'HR_HIRE'`, `'HR_DISMISS'`. This is two lines of code per API function — easy to forget but important.

**Phase:** Phase 1 (API functions).

---

### Pitfall 13: Role Guard Mismatch — FOREMAN and HEAD Cannot See Their Own Staff

**What goes wrong:** The HR panel is planned for roles `ADMIN, BOSS, ZAMPORAB`. But HEAD already manages their service's staff (assigns them to requests), and FOREMAN sees who is on their team. Locking HR data behind ZAMPORAB/BOSS/ADMIN only means HEAD cannot check who from their service is sick today before submitting requests.

**Prevention:** Consider giving HEAD read-only access to HR status for their own service (`service_id` matches). This is a UX requirement to clarify before implementation — not asking HEAD to edit HR records, just to see attendance for their service. Resolving this in Phase 2 (role design) avoids a later access-control rework.

**Phase:** Phase 2 (HR panel) — define role access clearly in Phase 1 planning.

---

### Pitfall 14: Export Report Format Assumptions

**What goes wrong:** The attendance grid export (REQ-107) is planned as "Excel or print." Implementing `window.print()` for the attendance grid produces unreadable output because the dark-mode Tailwind styles (dark backgrounds, white text) do not invert for print. Excel export via a library adds a new dependency.

**Prevention:**
- For print: add a `@media print` CSS override in `globals.css` to invert colors (white bg, black text) before attempting to print the grid. Test with `Ctrl+P` in browser.
- For Excel: `xlsx` (SheetJS) is the standard zero-dependency option — but confirm with the project rule "don't install new major dependencies without asking" before adding it.

**Phase:** Phase 3 (reports) — resolve export strategy before starting implementation.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 1: DB migration for users | Adding non-nullable columns breaks existing rows | All new columns must be `... DEFAULT NULL` |
| Phase 1: DB migration for employee_status | Mutable status instead of event log | Design as append-only from day one |
| Phase 1: TypeScript types | `User` interface update breaks 8 panels | Always update types and run build in same commit |
| Phase 1: API functions | Missing `logAction()` in new HR functions | Template HR functions from existing `createRequest()` pattern |
| Phase 2: HR panel UI | Parallel user entity created by mistake | All user data reads must come from `users` table JOIN |
| Phase 2: Dismiss flow | `is_active` and `date_fired` drift apart | Single `dismissEmployee()` function touches both |
| Phase 2: PANELS config | Mobile nav overflow with 9th panel | Check hamburger layout on 375px screen |
| Phase 2: Status entry form | No date range validation | Add inline validation before any API call |
| Phase 3: Period reports | Boundary month miscounting | Use range intersection SQL, not simple field comparison |
| Phase 3: Attendance grid | Full history fetch on every render | Always pass date range filter to status queries |
| Phase 3: Export | Print media with dark Tailwind styles | Add `@media print` CSS before implementing print button |

---

## Sources

- Direct codebase analysis: `/home/user/Projects/gormost/src/types/index.ts` (User interface, type patterns)
- Direct codebase analysis: `/home/user/Projects/gormost/src/lib/api.ts` (query patterns, soft-delete, assignUsers, logAction usage)
- Direct codebase analysis: `/home/user/Projects/gormost/.planning/codebase/CONCERNS.md` (known tech debt, fragile areas)
- Direct codebase analysis: `/home/user/Projects/gormost/.planning/codebase/ARCHITECTURE.md` (polling pattern, state management)
- Direct codebase analysis: `/home/user/Projects/gormost/.planning/ROADMAP.md` (milestone 2.0 requirements)
- Direct codebase analysis: `/home/user/Projects/gormost/.planning/PROJECT.md` (user roles, data model)
- Domain knowledge: HR attendance tracking database design (event sourcing vs. mutable state, date range intersection, soft-delete patterns) — HIGH confidence, established patterns

---

*Pitfalls research: 2026-03-02*
