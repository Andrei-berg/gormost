# Architecture Patterns: HR Module Integration

**Domain:** HR module added to existing tunnel operations management app (Gormost)
**Researched:** 2026-03-02
**Confidence:** HIGH — full codebase inspection, no external assumptions needed

---

## Existing Architecture (Verified)

The app follows a strict panel-per-role pattern. Every panel is structured identically:

```
src/app/[panel]/page.tsx          — thin orchestrator: AuthGuard wrapper + state + loadData + JSX layout (~50-100 lines)
src/components/[panel]/           — UI sections, one component per visual block
src/lib/api.ts                    — all Supabase queries live here, imported by page.tsx
src/lib/auth.ts                   — session stored in localStorage, hasRole() for gating
src/types/index.ts                — all TypeScript interfaces + PANELS array + config constants
```

### Verified Panel Pattern (dispatcher/page.tsx as canonical example)

```
page.tsx structure:
  1. export default → AuthGuard roles={[...]} → renders Content(session)
  2. Content component:
     - useState for each data collection
     - loadData = useCallback(async () => Promise.all([fetch1, fetch2, ...]))
     - useEffect(() => loadData(), [loadData])
     - optional setInterval(loadData, 30000) for LIVE panels
     - derived/computed values (kpi object, filtered lists)
     - JSX: <Header> + component grid
```

### Verified Shared Components

| Component | Location | Used By |
|-----------|----------|---------|
| `AuthGuard` | `src/components/AuthGuard.tsx` | All panels |
| `Header` | `src/components/Header.tsx` | All panels — reads PANELS array for nav menu |
| `KanbanBoard` | `src/components/KanbanBoard.tsx` | Dispatcher, Foreman |
| `RequestModal` | `src/components/RequestModal.tsx` | Dispatcher, Head, Zamporab |
| `EmptyState` | `src/components/EmptyState.tsx` | Complaints, Zamporab |

### Verified Navigation Mechanism

`Header.tsx` reads `PANELS` array from `src/types/index.ts` and filters by `hasRole(session, p.roles)`. Adding HR to navigation = one new entry in the `PANELS` array. No other navigation code exists.

---

## Recommended Architecture for HR Module

### New File Layout

```
src/app/hr/page.tsx                          — NEW: thin orchestrator (~60 lines)
src/components/hr/
  EmployeeList.tsx                           — NEW: employees grouped by service
  EmployeeCard.tsx                           — NEW: individual employee card with status badge + action button
  StatusBadge.tsx                            — NEW: colored badge for PRESENT/SICK/VACATION/FIRED/DAY_OFF
  TodaySummary.tsx                           — NEW: summary counts (working/absent today)
  AttendanceGrid.tsx                         — NEW: grid of employee x day for a month
  PeriodReport.tsx                           — NEW: report view for date range (vacations/sick leave totals)
```

This follows the established pattern exactly. No deviation needed.

---

## DB Schema

### New Table: `employee_status`

```sql
-- Migration: 001_add_hr_module.sql
-- Adds HR module: employee status tracking with history

CREATE TABLE employee_status (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       text NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  status        text NOT NULL CHECK (status IN ('PRESENT', 'SICK', 'VACATION', 'DAY_OFF', 'FIRED')),
  date_from     date NOT NULL,
  date_to       date,           -- NULL means open-ended (current status)
  reason        text,           -- optional note (e.g. "Sick leave order #45")
  created_by    text REFERENCES users(user_id),
  created_at    timestamptz DEFAULT now()
);

-- Index for the most common query: current status per user
CREATE INDEX idx_employee_status_user_date ON employee_status(user_id, date_from DESC);

-- Index for date range queries (attendance grid, period reports)
CREATE INDEX idx_employee_status_date_from ON employee_status(date_from);

-- ROLLBACK:
-- DROP TABLE IF EXISTS employee_status;
```

### Modified Table: `users`

```sql
-- Add HR lifecycle fields to existing users table

ALTER TABLE users
  ADD COLUMN date_hired date,            -- when they started
  ADD COLUMN date_fired date;            -- when they left (soft delete support)

-- ROLLBACK:
-- ALTER TABLE users DROP COLUMN IF EXISTS date_hired;
-- ALTER TABLE users DROP COLUMN IF EXISTS date_fired;
```

### Status Semantics

| Status | Meaning | date_to |
|--------|---------|---------|
| `PRESENT` | Working today (explicit check-in or default) | same as date_from |
| `SICK` | Medical leave | date sick leave ends |
| `VACATION` | Annual leave | date vacation ends |
| `DAY_OFF` | Day off / compensatory | same as date_from |
| `FIRED` | Terminated | NULL (open-ended) |

**Design decision:** Use a status-history table rather than a single current-status field on `users`. This gives attendance grid, period reports, and history view for free. The "current status" is always the most recent record for a user where `date_from <= today` and `(date_to IS NULL OR date_to >= today)`.

---

## TypeScript Types

### New interfaces in `src/types/index.ts`

```typescript
// HR Module types — add to existing types/index.ts

export type EmployeeStatusType = 'PRESENT' | 'SICK' | 'VACATION' | 'DAY_OFF' | 'FIRED'

export interface EmployeeStatus {
  id: string
  user_id: string
  status: EmployeeStatusType
  date_from: string        // ISO date string (YYYY-MM-DD)
  date_to: string | null   // ISO date string or null for open-ended
  reason: string | null
  created_by: string | null
  created_at: string
}

export const EMPLOYEE_STATUS_CONFIG: Record<EmployeeStatusType, { label: string; color: string; bg: string }> = {
  PRESENT:  { label: 'На работе',   color: '#22c55e', bg: 'bg-green-500/20 border-green-500/30' },
  SICK:     { label: 'Больничный',  color: '#ef4444', bg: 'bg-red-500/20 border-red-500/30' },
  VACATION: { label: 'Отпуск',      color: '#3b82f6', bg: 'bg-blue-500/20 border-blue-500/30' },
  DAY_OFF:  { label: 'Отгул',       color: '#f97316', bg: 'bg-orange-500/20 border-orange-500/30' },
  FIRED:    { label: 'Уволен',      color: '#64748b', bg: 'bg-slate-500/20 border-slate-500/30' },
}
```

### Extended User type

The `User` interface in `src/types/index.ts` needs two new optional fields:

```typescript
export interface User {
  // ...existing fields...
  date_hired: string | null   // ISO date
  date_fired: string | null   // ISO date
}
```

### PANELS update in `src/types/index.ts`

```typescript
// Add to PANELS array (after transport, before complaints):
{
  id: 'hr', path: '/hr', title: 'HR-модуль',
  subtitle: 'Состав смены · Статусы · Табель',
  emoji: '👥',
  roles: ['ADMIN', 'BOSS', 'ZAMPORAB'],
  color: 'from-teal-600/40 to-teal-800/40 border-teal-500/30',
  roleLabel: 'HR-менеджер',
},
```

---

## New API Functions

All HR queries go into `src/lib/api.ts` following the established file-per-domain grouping pattern.

### Section: `// ============ EMPLOYEE STATUS ============`

```typescript
// Fetch all status records for a user (history)
fetchEmployeeStatusHistory(userId: string): Promise<EmployeeStatus[]>

// Fetch current status for a single user (date_from <= today, date_to >= today or null)
fetchCurrentEmployeeStatus(userId: string): Promise<EmployeeStatus | null>

// Fetch current statuses for all users (bulk, for EmployeeList / TodaySummary)
fetchAllCurrentStatuses(date?: string): Promise<Record<string, EmployeeStatus>>

// Set new status for a user (creates new record, closing prior open-ended record)
setEmployeeStatus(
  userId: string,
  status: EmployeeStatusType,
  dateFrom: string,
  dateTo: string | null,
  reason: string | null,
  createdBy: string
): Promise<EmployeeStatus | null>

// Fetch status records for a date range (for AttendanceGrid and PeriodReport)
fetchStatusesForPeriod(
  dateFrom: string,
  dateTo: string,
  serviceId?: string
): Promise<EmployeeStatus[]>

// Hire a user: set date_hired on users table
hireEmployee(userId: string, dateHired: string, updatedBy: string): Promise<User | null>

// Fire a user: set date_fired + is_active=false + insert FIRED status record
fireEmployee(userId: string, dateFired: string, reason: string, updatedBy: string): Promise<boolean>
```

**Integration note:** `setEmployeeStatus` must call `logAction()` (same pattern as `updateRequest`, `approveRequest`) with action type `'SET_EMPLOYEE_STATUS'` and entity type `'employee_status'`.

**Integration note:** `fireEmployee` reuses the existing `updateUser()` function for the `is_active: false` + `date_fired` update, then appends a `FIRED` status record, then logs to changelog.

---

## Data Flow

### HR Panel Load Sequence

```
hr/page.tsx: loadData()
  → fetchUsers(activeOnly=false)        // include recently fired (date_fired within 30 days)
  → fetchServices()                     // for grouping by service
  → fetchAllCurrentStatuses(today)      // bulk: one query, returns map of user_id → status
  ↓
  Merge: users + statuses → enriched employee list
  Group: by service_id
  ↓
  Render:
    <TodaySummary>          (counts from enriched list)
    <EmployeeList>          (grouped by service)
      <EmployeeCard>        (per employee — shows StatusBadge + action button)
```

### Status Change Flow (EmployeeCard "Change Status" button)

```
User clicks status button in EmployeeCard
  → EmployeeCard calls onStatusChange(userId, newStatus, dateFrom, dateTo, reason)
  → hr/page.tsx handler calls setEmployeeStatus(...)
  → setEmployeeStatus inserts into employee_status, logs to changelog
  → loadData() re-runs
  → HR panel re-renders with updated statuses
```

### AttendanceGrid / PeriodReport Load (tab switch)

```
User switches to "Табель" or "Отчёт" tab in hr/page.tsx
  → loadData already loaded users + services
  → Lazy-load: fetchStatusesForPeriod(firstOfMonth, today)
  → AttendanceGrid renders employee x day matrix
  → PeriodReport renders grouped totals (sick days, vacation days, etc.)
```

---

## Component Boundaries

### `hr/page.tsx` (orchestrator — ~60 lines)

Responsibilities:
- AuthGuard with `['ADMIN', 'BOSS', 'ZAMPORAB']`
- State: `users`, `services`, `statuses` (map), `activeTab`, `selectedDate`, `periodRange`
- `loadData()` fetching users + services + current statuses
- Tab management: overview / attendance / report
- Pass callbacks to components (onStatusChange, onHire, onFire)

Does NOT contain: any JSX for individual employee cards, grids, or stat widgets.

### `hr/components/EmployeeList.tsx`

Responsibilities: Groups enriched employee objects by `service_id`, renders one section per service, iterates employees within each section. Delegates individual card rendering to `EmployeeCard`.

Props: `{ employees: EnrichedEmployee[]; services: Service[]; onStatusChange: fn }`

### `hr/components/EmployeeCard.tsx`

Responsibilities: Displays one employee row/card — name, position, phone, current `StatusBadge`, and a button/dropdown to change status. Opens an inline form or modal for status selection.

Props: `{ employee: EnrichedEmployee; onStatusChange: fn }`

### `hr/components/StatusBadge.tsx`

Responsibilities: Purely presentational. Renders colored badge from `EMPLOYEE_STATUS_CONFIG`. Reusable in AttendanceGrid cells too.

Props: `{ status: EmployeeStatusType; size?: 'sm' | 'md' }`

### `hr/components/TodaySummary.tsx`

Responsibilities: Counts present/absent/sick/vacation from enriched list. Renders KPI cards (matches existing KPICards visual style from dispatcher panel). No data fetching.

Props: `{ employees: EnrichedEmployee[] }`

### `hr/components/AttendanceGrid.tsx`

Responsibilities: Renders a month grid (rows = employees, columns = days). Fetches its own period data via `fetchStatusesForPeriod` when `month` prop changes (acceptable for lazy-loaded tab content).

Props: `{ users: User[]; month: string /* YYYY-MM */ }`

### `hr/components/PeriodReport.tsx`

Responsibilities: Renders aggregated totals for date range — sick days / vacation days / fired during period, grouped by service. Fetches its own data via `fetchStatusesForPeriod`.

Props: `{ users: User[]; services: Service[]; dateFrom: string; dateTo: string }`

---

## Integration Points with Existing Tables

### Reads from `users` (existing, no schema change needed for reads)

- `fetchUsers(activeOnly=false)` — already exists in `api.ts`, just pass `false`
- HR panel needs to show fired employees during transition period: query `WHERE is_active = false AND date_fired >= (today - 30 days)` — this requires a new function `fetchRecentlyFiredUsers()` or extending `fetchUsers`

### Reads from `services` (existing, unchanged)

- `fetchServices()` already exists. HR uses it directly for grouping.

### Writes to `users` (extend existing `updateUser()`)

- `hireEmployee` calls `updateUser(userId, { date_hired: date })`
- `fireEmployee` calls `updateUser(userId, { is_active: false, date_fired: date })`
- No new update function needed — `updateUser()` already accepts `Partial<User>`

### Writes to `changelog` (existing, unchanged)

- All HR write operations call `logAction()` with appropriate action types
- Convention: action types = `'SET_EMPLOYEE_STATUS'`, `'HIRE_EMPLOYEE'`, `'FIRE_EMPLOYEE'`

### New table `employee_status` (new)

- All reads/writes via new functions in `api.ts` HR section
- No joins needed at DB level — merge in TypeScript (consistent with existing pattern in `fetchPeopleStats`)

---

## Helper Type: EnrichedEmployee

This is a runtime-constructed type (not a DB entity) that merges User + current EmployeeStatus:

```typescript
// Constructed in hr/page.tsx, not stored in DB
export interface EnrichedEmployee extends User {
  currentStatus: EmployeeStatus | null
}
```

---

## What Is Modified vs New

### Modified (minimal, surgical changes)

| File | Change | Scope |
|------|--------|-------|
| `src/types/index.ts` | Add `EmployeeStatusType`, `EmployeeStatus`, `EMPLOYEE_STATUS_CONFIG` interfaces/constants | Additive only |
| `src/types/index.ts` | Add `date_hired`, `date_fired` to `User` interface | Additive only |
| `src/types/index.ts` | Add HR entry to `PANELS` array | One new object |
| `src/lib/api.ts` | Add `// ============ EMPLOYEE STATUS ============` section (~80 lines) | Additive only |

### New (no existing code touched)

| File | Description |
|------|-------------|
| `src/app/hr/page.tsx` | HR panel orchestrator |
| `src/components/hr/EmployeeList.tsx` | Employee list grouped by service |
| `src/components/hr/EmployeeCard.tsx` | Individual employee card with status action |
| `src/components/hr/StatusBadge.tsx` | Colored status badge (reusable) |
| `src/components/hr/TodaySummary.tsx` | Today's attendance KPI cards |
| `src/components/hr/AttendanceGrid.tsx` | Monthly attendance grid |
| `src/components/hr/PeriodReport.tsx` | Date range summary report |
| `supabase/migrations/001_add_hr_module.sql` | DB migration for employee_status table + users columns |

---

## Optimal Build Order

Build order is dictated by dependency direction: DB → TypeScript types → API functions → page orchestrator → UI components.

### Phase 1: DB Foundation

1. Write `supabase/migrations/001_add_hr_module.sql`
2. Human runs migration in Supabase SQL Editor
3. Verify table + indexes exist via Supabase dashboard

**Why first:** All other steps depend on the schema. TypeScript types must match actual columns. Cannot test API functions without the table.

### Phase 2: TypeScript Types

4. Add `EmployeeStatusType`, `EmployeeStatus`, `EMPLOYEE_STATUS_CONFIG` to `src/types/index.ts`
5. Extend `User` interface with `date_hired`, `date_fired`
6. Add HR entry to `PANELS` array
7. Run `npx tsc --noEmit` — must pass before proceeding

**Why second:** All API functions and components import from `@/types`. Type errors here cascade everywhere.

### Phase 3: API Layer

8. Add HR section to `src/lib/api.ts`:
   - `fetchAllCurrentStatuses()`
   - `fetchEmployeeStatusHistory()`
   - `setEmployeeStatus()` (most complex — closes prior records, logs action)
   - `fetchStatusesForPeriod()`
   - `hireEmployee()`, `fireEmployee()`
9. Run `npx tsc --noEmit` — must pass

**Why third:** Page and components call these functions. They can be tested mentally by reading the code before the UI exists.

### Phase 4: UI Components (leaf-first)

10. `StatusBadge.tsx` — purely presentational, no dependencies on other new components
11. `TodaySummary.tsx` — receives pre-computed props, no data fetching
12. `EmployeeCard.tsx` — uses StatusBadge, calls onStatusChange callback
13. `EmployeeList.tsx` — uses EmployeeCard, groups data
14. `AttendanceGrid.tsx` — fetches own data, uses StatusBadge
15. `PeriodReport.tsx` — fetches own data

**Why leaf-first:** Each component can be implemented and mentally verified without its parent existing. Avoids blocking on page.tsx until all children are ready.

### Phase 5: Page Orchestrator

16. `src/app/hr/page.tsx` — wire all components together, implement loadData
17. Run `npm run build` — must pass before commit

**Why last:** page.tsx is the integration point. Writing it last means all imports already exist and TypeScript can verify the entire call chain.

### Phase 6: Manual QA

18. Deploy to Vercel (auto-deploy from main after commit)
19. Test as ZAMPORAB role: can see HR panel, can change statuses
20. Test as BOSS role: can see HR panel
21. Test as DISPATCHER role: cannot see HR panel (not in roles list)
22. Test attendance grid for a month with mixed statuses
23. Test period report date range filter

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Inline HR Logic in Shared Components

**What:** Adding HR-specific code to `Header.tsx`, `AuthGuard.tsx`, or `api.ts` in ways that are interleaved with existing logic.

**Why bad:** Violates the project rule that shared components stay generic. Breaking `Header.tsx` affects all 8 panels simultaneously.

**Instead:** All HR-specific code goes in `src/app/hr/`, `src/components/hr/`, and a clearly delimited section of `src/lib/api.ts`.

### Anti-Pattern 2: Storing Current Status as Column on Users

**What:** Adding a `current_status` column directly to the `users` table instead of using the `employee_status` history table.

**Why bad:** Loses history. AttendanceGrid and PeriodReport become impossible to implement. Requires rewrite later.

**Instead:** Use the `employee_status` table with date ranges. Derive "current status" at query time.

### Anti-Pattern 3: Joining Tables in Supabase Queries

**What:** Using Supabase relational syntax (`select('*, users(*)')`) to join users and employee_status in a single query.

**Why bad:** The existing codebase consistently uses separate queries + TypeScript merging (`fetchPeopleStats` is the canonical example). Mixing patterns creates inconsistency and the Supabase join syntax adds complexity.

**Instead:** Fetch users and statuses separately, merge in TypeScript using `Record<string, EmployeeStatus>` indexed by user_id.

### Anti-Pattern 4: Hardcoding Date Logic in Components

**What:** Calling `new Date()` inside components to determine "today" for status queries.

**Why bad:** Creates subtle bugs when data loaded at 23:59 is rendered at 00:01. Inconsistent timezone handling.

**Instead:** Compute `today` as a string (`new Date().toISOString().slice(0, 10)`) once in `page.tsx loadData()` and pass it down.

---

## Scalability Considerations

The app has ~50 employees across 5 services. HR module data volumes are trivial.

| Concern | Current scale (~50 users) | Notes |
|---------|--------------------------|-------|
| `employee_status` table size | ~18,000 rows/year max | Negligible. Index on (user_id, date_from DESC) handles all queries |
| `fetchAllCurrentStatuses` query | Single query, ~50 rows returned | Fine with date index |
| AttendanceGrid render | 50 employees x 31 days = 1,550 cells | Pure React, no performance concern |
| PeriodReport aggregation | Done in TypeScript on ~50 x 90 days = 4,500 status records max | Negligible |

No pagination, virtualization, or caching needed at this scale.

---

## Sources

- Codebase inspection: `src/app/dispatcher/page.tsx` — canonical panel pattern (HIGH confidence)
- Codebase inspection: `src/types/index.ts` — all existing types, PANELS array (HIGH confidence)
- Codebase inspection: `src/lib/api.ts` — all existing API functions, logAction pattern (HIGH confidence)
- Codebase inspection: `src/lib/auth.ts` — session shape, hasRole mechanism (HIGH confidence)
- Codebase inspection: `src/components/Header.tsx` — PANELS-based navigation (HIGH confidence)
- Codebase inspection: `src/components/AuthGuard.tsx` — role gate pattern (HIGH confidence)
- Project documentation: `.planning/PROJECT.md` — HR module goal, feature list (HIGH confidence)
- Project documentation: `CLAUDE.md` — architectural rules, component conventions (HIGH confidence)
