# Phase 02: DB Foundation - Research

**Researched:** 2026-03-02
**Domain:** Supabase PostgreSQL migrations, TypeScript types, Supabase JS client v2 API patterns
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HR-01 | Create `employee_status` table (append-only event log: user_id, status, date_from, date_to, reason, created_by) and add `date_hired`/`date_fired` columns to `users` | SQL DDL patterns for Supabase migrations; ALTER TABLE with nullable columns for backward compatibility |
| HR-02 | Show "Na rabote" by default for employees with no status record today (presence-by-default) | Client-side merge pattern: fetch all active users + fetch today's status rows, fill gaps in TypeScript |
</phase_requirements>

---

## Summary

Phase 02 is a pure data layer phase — no UI, no new npm packages, no Vercel/Supabase configuration changes. The deliverables are two SQL migration files, additions to `src/types/index.ts`, and six new functions in `src/lib/api.ts`. The build gate (`npm run build`) is the only quality check.

The riskiest design decision is already locked in STATE.md: `employee_status` is an **append-only event log** — no UPDATE or DELETE paths exist in the API layer. This makes period reports possible (Phase 05) and preserves full audit history. The migration file must reflect this: no `updated_at` column, no `id`-based update trigger. The API's `setEmployeeStatus` function always INSERTs a new row, never PATCHes an existing one.

Presence-by-default (HR-02) is implemented **in TypeScript, not in SQL**. `fetchAllCurrentStatuses` fetches all active users and all status rows for today in two queries, then merges them client-side: users with a matching status row get that status; users without a row get `"Na rabote"` assigned in the TypeScript loop. This avoids PostgreSQL LEFT JOIN complexity and is easier to test visually during Phase 03.

**Primary recommendation:** Write migrations first (only humans can execute them in Supabase SQL Editor), then add types, then add API functions. Each step is independently verifiable with `npm run build`.

---

## Standard Stack

### Core (already installed — zero new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | 2.89.0 | All DB queries, client singleton | Project standard; existing `src/lib/supabase.ts` exports `supabase` |
| TypeScript | ^5.9.3 (strict) | Type safety | Project enforces strict mode; all new types must compile cleanly |
| Next.js | 16.1.1 | Build system | `npm run build` is the quality gate |

### No New Dependencies

Zero new npm packages for this phase. All capabilities exist:
- Supabase `.from().select()/.insert()/.eq()` — already used throughout `src/lib/api.ts`
- `logAction()` from `src/lib/logger.ts` — already exists, all HR functions call it
- TypeScript union types, interfaces, Record — language built-ins

**Installation:**
```bash
# No new packages required
```

---

## Architecture Patterns

### Recommended File Changes for This Phase

```
supabase/
└── migrations/
    ├── 001_add_hr_module.sql          # NEW: employee_status table
    └── 002_add_hr_fields_to_users.sql # NEW: date_hired, date_fired on users

src/
├── types/index.ts     # MODIFIED: add EmployeeStatusType, EmployeeStatus,
│                      #           EMPLOYEE_STATUS_CONFIG, EnrichedEmployee,
│                      #           update User interface
└── lib/api.ts         # MODIFIED: add 6 HR functions at bottom
```

Note: `supabase/` directory does not yet exist in the repo. Create it during implementation.

### Pattern 1: Append-Only Event Log Migration

**What:** `employee_status` stores every status change as a new INSERT. No row is ever UPDATEd or DELETEd through the application. The most recent row for a user on or before a given date is the "current" status.

**When to use:** Any domain where history is required (attendance reports, audit trails).

**SQL:**
```sql
-- supabase/migrations/001_add_hr_module.sql
-- Creates employee_status append-only event log for HR module

CREATE TABLE IF NOT EXISTS employee_status (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  status      TEXT NOT NULL CHECK (status IN ('Na_rabote', 'Otgul', 'Bolnichniy', 'Otpusk', 'Uvolen')),
  date_from   DATE NOT NULL,
  date_to     DATE,           -- NULL = open-ended (no known end date yet)
  reason      TEXT,
  created_by  TEXT NOT NULL REFERENCES users(user_id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_status_user_date
  ON employee_status (user_id, date_from DESC);

-- Rollback:
-- DROP TABLE IF EXISTS employee_status;
```

**Why no `updated_at`:** Append-only means rows are never modified. Including `updated_at` would invite mutation. Omitting it makes the constraint structural.

### Pattern 2: Backward-Compatible ALTER TABLE

**What:** Add nullable columns to `users` without touching existing rows. `DEFAULT NULL` ensures existing rows get `NULL`, not an error.

**SQL:**
```sql
-- supabase/migrations/002_add_hr_fields_to_users.sql
-- Adds date_hired and date_fired to users table for staff lifecycle management

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS date_hired DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS date_fired DATE DEFAULT NULL;

-- Rollback:
-- ALTER TABLE users DROP COLUMN IF EXISTS date_hired;
-- ALTER TABLE users DROP COLUMN IF EXISTS date_fired;
```

**Why `ADD COLUMN IF NOT EXISTS`:** Idempotent — safe to re-run if migration is applied twice by accident.

### Pattern 3: TypeScript Union Type + Config Record (matches existing project pattern)

**What:** New status types mirror the existing `RequestStatus` + `STATUS_CONFIG` pattern in `src/types/index.ts`.

**Example:**
```typescript
// Source: src/types/index.ts — follows existing STATUS_CONFIG pattern

export type EmployeeStatusType =
  | 'Na_rabote'
  | 'Otgul'
  | 'Bolnichniy'
  | 'Otpusk'
  | 'Uvolen'

export interface EmployeeStatus {
  id: string
  user_id: string
  status: EmployeeStatusType
  date_from: string        // ISO date string 'YYYY-MM-DD'
  date_to: string | null
  reason: string | null
  created_by: string
  created_at: string
}

export const EMPLOYEE_STATUS_CONFIG: Record<EmployeeStatusType, {
  label: string
  color: string
  bg: string
}> = {
  Na_rabote:   { label: 'На работе',  color: '#22c55e', bg: 'bg-green-500/20 border-green-500/30' },
  Otgul:       { label: 'Отгул',      color: '#eab308', bg: 'bg-yellow-500/20 border-yellow-500/30' },
  Bolnichniy:  { label: 'Больничный', color: '#f97316', bg: 'bg-orange-500/20 border-orange-500/30' },
  Otpusk:      { label: 'Отпуск',     color: '#3b82f6', bg: 'bg-blue-500/20 border-blue-500/30' },
  Uvolen:      { label: 'Уволен',     color: '#64748b', bg: 'bg-slate-500/20 border-slate-500/30' },
}

// EnrichedEmployee = User + their current status for today
export interface EnrichedEmployee {
  user: User
  currentStatus: EmployeeStatusType
  statusRecord: EmployeeStatus | null  // null = presence-by-default (Na_rabote with no DB row)
}

// Updated User interface — add to existing interface
// Add: date_hired: string | null
//      date_fired: string | null
```

**Updated `User` interface** — add two fields to the existing interface without removing anything:
```typescript
export interface User {
  user_id: string
  tab_number: string
  full_name: string
  position: string | null
  role_level: RoleLevel
  service_id: string | null
  is_active: boolean
  phone: string | null
  pin_code: string | null
  created_at: string
  date_hired: string | null   // NEW — ISO date 'YYYY-MM-DD' or null
  date_fired: string | null   // NEW — ISO date 'YYYY-MM-DD' or null
}
```

### Pattern 4: Presence-by-Default in TypeScript (client-side merge)

**What:** `fetchAllCurrentStatuses` fetches two things in parallel: (1) all active users, (2) all `employee_status` rows where `date_from <= today`. It builds an `EnrichedEmployee[]` where users with no status row get `currentStatus: 'Na_rabote'`.

**Why client-side, not SQL LEFT JOIN:** Simpler to write, simpler to read, simpler to debug. SQL approach would require a subquery to get the latest row per user. TypeScript loop is O(n) and sufficient for dozens of employees.

**Example:**
```typescript
// src/lib/api.ts — new HR section

export async function fetchAllCurrentStatuses(): Promise<EnrichedEmployee[]> {
  const today = new Date().toISOString().split('T')[0] // 'YYYY-MM-DD'

  // Parallel fetch: all active users + today's status rows
  const [usersResult, statusesResult] = await Promise.all([
    supabase.from('users').select('*').eq('is_active', true).order('full_name'),
    supabase
      .from('employee_status')
      .select('*')
      .lte('date_from', today)         // status started on or before today
      .or(`date_to.is.null,date_to.gte.${today}`) // still open OR ends today/later
      .order('date_from', { ascending: false }),
  ])

  const users = (usersResult.data || []) as User[]
  const statuses = (statusesResult.data || []) as EmployeeStatus[]

  // Build a map: user_id -> most recent status row
  const latestByUser = new Map<string, EmployeeStatus>()
  for (const s of statuses) {
    if (!latestByUser.has(s.user_id)) {
      latestByUser.set(s.user_id, s) // already ordered by date_from DESC
    }
  }

  // Merge: users without a status row get 'Na_rabote' by default
  return users.map(user => {
    const statusRecord = latestByUser.get(user.user_id) || null
    return {
      user,
      currentStatus: statusRecord ? statusRecord.status as EmployeeStatusType : 'Na_rabote',
      statusRecord,
    }
  })
}
```

### Pattern 5: API Functions Following Existing Conventions

All six HR functions follow the exact same conventions as existing `api.ts` functions:
- Destructure `.data` from Supabase result, return typed cast with `|| []` or `|| null`
- Call `await logAction(...)` after successful writes
- No error throwing except where existing code does (only `createRequest` throws)
- Return `boolean` (`!error`) for mutation operations

**Full set of 6 functions:**
```typescript
// 1. Already shown above: fetchAllCurrentStatuses()

// 2. Status history for one employee
export async function fetchEmployeeStatusHistory(userId: string): Promise<EmployeeStatus[]> {
  const { data } = await supabase
    .from('employee_status')
    .select('*')
    .eq('user_id', userId)
    .order('date_from', { ascending: false })
  return (data || []) as EmployeeStatus[]
}

// 3. Set status (always INSERT — append-only, never UPDATE)
export async function setEmployeeStatus(
  userId: string,
  status: EmployeeStatusType,
  dateFrom: string,
  dateTo: string | null,
  reason: string | null,
  createdBy: string
): Promise<EmployeeStatus | null> {
  const { data, error } = await supabase
    .from('employee_status')
    .insert({ user_id: userId, status, date_from: dateFrom, date_to: dateTo, reason, created_by: createdBy })
    .select()
    .single()
  if (!error && data) {
    await logAction(createdBy, 'SET_EMPLOYEE_STATUS', 'employee_status', data.id, { userId, status, dateFrom })
  }
  return data as EmployeeStatus | null
}

// 4. Fetch statuses for a date range (for reporting in Phase 05)
export async function fetchStatusesForPeriod(
  dateFrom: string,
  dateTo: string,
  serviceId?: string
): Promise<EmployeeStatus[]> {
  let q = supabase
    .from('employee_status')
    .select('*')
    .lte('date_from', dateTo)
    .or(`date_to.is.null,date_to.gte.${dateFrom}`)
    .order('date_from')
  // If serviceId filter needed: join via users — skip for Phase 02 (Phase 05 concern)
  const { data } = await q
  return (data || []) as EmployeeStatus[]
}

// 5. Hire employee (set date_hired, ensure is_active=true)
export async function hireEmployee(
  userId: string,
  dateHired: string,
  performedBy: string
): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .update({ date_hired: dateHired, is_active: true })
    .eq('user_id', userId)
  if (!error) {
    await logAction(performedBy, 'HIRE_EMPLOYEE', 'user', userId, { date_hired: dateHired })
  }
  return !error
}

// 6. Fire employee (set date_fired, soft-delete: is_active=false)
export async function fireEmployee(
  userId: string,
  dateFired: string,
  performedBy: string
): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .update({ date_fired: dateFired, is_active: false })
    .eq('user_id', userId)
  if (!error) {
    await logAction(performedBy, 'FIRE_EMPLOYEE', 'user', userId, { date_fired: dateFired })
    // Also set final Uvolen status in event log
    await setEmployeeStatus(userId, 'Uvolen', dateFired, null, 'Увольнение', performedBy)
  }
  return !error
}
```

### Anti-Patterns to Avoid

- **Mutable `employee_status`:** Never add an UPDATE path in `api.ts` for `employee_status`. If a ZAMPORAB made a mistake, the correction is a new INSERT with the correct status — not an UPDATE of the existing row. The append-only constraint is essential for Phase 05 reporting.
- **Separate `employees` table:** STATE.md explicitly rejected this. Keep HR fields on `users`. Do not create a parallel `employees` table.
- **`DEFAULT 'Na_rabote'` in the DB:** Do not add a default status column or a trigger. Presence-by-default is a TypeScript-level concept, not a DB constraint — it has no row in `employee_status`.
- **`is_active` filter omitted from `fetchAllCurrentStatuses`:** If `is_active` filter is missing, dismissed employees (who had `is_active` set to `false` by `fireEmployee`) will appear in the active list.
- **Synchronous `logAction`:** All existing API functions use `await logAction(...)`. Do not omit `await` — the logger is fire-and-forget but awaiting it preserves error visibility via console.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID primary key for `employee_status` | Custom `ES-${Date.now()}` ID string | `gen_random_uuid()` in PostgreSQL | Consistent with Supabase defaults; guaranteed uniqueness; matches existing `request_id` pattern in spirit |
| "Current status" query | Complex SQL subquery with `ROW_NUMBER()` OVER PARTITION | Client-side Map merge in `fetchAllCurrentStatuses` | Simpler, debuggable, sufficient for O(100) employees |
| Audit log for HR events | Custom `hr_changelog` table | Existing `logAction()` / `changelog` table | Already exists, already used by all API functions — zero new infrastructure |
| Date formatting | Custom date library | `new Date().toISOString().split('T')[0]` | `date-fns` is installed but this one-liner is sufficient and has no imports |

**Key insight:** The project's existing `changelog` table + `logAction()` function is the audit log. HR functions MUST call it like all other API functions do.

---

## Common Pitfalls

### Pitfall 1: `User` Interface Update Breaks TypeScript Strict Mode

**What goes wrong:** Adding `date_hired` and `date_fired` to the `User` interface while forgetting to update callers that use `Partial<User>` for inserts (e.g., `createUser`). TypeScript strict mode requires completeness checks.

**Why it happens:** `updateUser` takes `Partial<User>` so it's fine. But places that spread a `User` object (like `createUser`) need to handle the new fields gracefully.

**How to avoid:** After adding fields to `User`, run `npx tsc --noEmit` before `npm run build`. Resolve any type errors. Since `date_hired` and `date_fired` are `string | null`, they are nullable and Partial-safe.

**Warning signs:** Build fails with "Property X does not exist on type User" or "missing property".

### Pitfall 2: Supabase `.or()` Syntax for Null-or-Date Filter

**What goes wrong:** Using incorrect `.or()` syntax to express "date_to is NULL OR date_to >= today". Supabase JS client has a specific string format for `.or()` filters.

**Why it happens:** The `.or()` method takes a string of comma-separated PostgREST filter conditions, not chained Supabase methods.

**How to avoid:** Use the exact pattern:
```typescript
.or(`date_to.is.null,date_to.gte.${today}`)
```
This translates to PostgreSQL: `date_to IS NULL OR date_to >= '2026-03-02'`.

**Warning signs:** Query returns no results or incorrect results when `date_to` is NULL.

### Pitfall 3: Migration Not in `supabase/migrations/` Directory

**What goes wrong:** Migration file is placed in the wrong directory (e.g., root of repo or `sql/`) and gets missed by future developers or Supabase CLI tooling.

**Why it happens:** The `supabase/` directory doesn't exist yet — it must be created.

**How to avoid:** Create `supabase/migrations/` as part of the first task. Per CLAUDE.md: "Agent CAN create SQL migration files in `supabase/migrations/`" — this is the designated location.

**Warning signs:** `supabase/` directory does not appear in `git status` after the task.

### Pitfall 4: Missing `date_from` Index Causes Slow History Queries

**What goes wrong:** Querying `employee_status` for a date range (Phase 05) performs a full table scan if `(user_id, date_from)` index is missing.

**Why it happens:** Forgetting to add the index in `001_add_hr_module.sql`.

**How to avoid:** The migration includes `CREATE INDEX IF NOT EXISTS idx_employee_status_user_date ON employee_status (user_id, date_from DESC)`. This is already specified in the Pattern 1 SQL above.

**Warning signs:** Slow response on `fetchStatusesForPeriod` in Phase 05 with many rows.

### Pitfall 5: `fireEmployee` Calling `setEmployeeStatus` — Error Handling

**What goes wrong:** `fireEmployee` calls `setEmployeeStatus` internally. If `setEmployeeStatus` fails silently (Supabase returns an error but the function doesn't throw), the user is marked `is_active=false` but has no `Uvolen` status row.

**Why it happens:** Following the project convention of not throwing errors — all functions return `boolean` or `null`.

**How to avoid:** `fireEmployee` returns `!error` based on the `users` table update only (the primary operation). The `setEmployeeStatus` call is a best-effort side effect, same as how `logAction` is treated. Document this behavior: the `Uvolen` status row may be missing if the second INSERT fails, but the user is still deactivated.

**Warning signs:** Employee appears deactivated (`is_active=false`) but `fetchEmployeeStatusHistory` shows no `Uvolen` row.

### Pitfall 6: `fetchAllCurrentStatuses` Returns Dismissed Employees

**What goes wrong:** If `is_active` filter is accidentally removed from the users query, dismissed employees (`is_active=false`) appear in the HR panel active list.

**Why it happens:** Copying the user fetch pattern from elsewhere without noticing the filter.

**How to avoid:** Always use `.eq('is_active', true)` in `fetchAllCurrentStatuses`. This is consistent with existing `fetchUsers(activeOnly = true)` behavior.

---

## Code Examples

Verified patterns from the existing codebase, extended for HR:

### Existing `logAction` Call Pattern (all HR functions must follow)
```typescript
// Source: src/lib/api.ts line 190-193
if (data) {
  await logAction(userId, 'CREATE_REQUEST', 'request', id, { status: req.status, service_id: req.service_id })
}
```

### Existing `logAction` Signature (source of truth)
```typescript
// Source: src/lib/logger.ts lines 3-8
export async function logAction(
  userId: string,
  actionType: string,
  entityType?: string | null,
  entityId?: string | null,
  details?: Record<string, unknown> | null
): Promise<void>
```

### Existing `STATUS_CONFIG` Pattern (model for `EMPLOYEE_STATUS_CONFIG`)
```typescript
// Source: src/types/index.ts lines 159-165
export const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; bg: string }> = {
  NEW: { label: 'Новая', color: '#eab308', bg: 'bg-yellow-500/20 border-yellow-500/30' },
  PLANNED: { label: 'Запланирована', color: '#3b82f6', bg: 'bg-blue-500/20 border-blue-500/30' },
  // ...
}
```

### Existing Supabase Query Pattern (model for `fetchEmployeeStatusHistory`)
```typescript
// Source: src/lib/api.ts lines 284-287
export async function fetchRemarks(requestId: string): Promise<Remark[]> {
  const { data } = await supabase.from('remarks').select('*').eq('request_id', requestId).order('created_at')
  return (data || []) as Remark[]
}
```

### Existing Soft-Delete Pattern (model for `fireEmployee`)
```typescript
// Source: src/lib/api.ts lines 39-42
export async function deleteUser(userId: string): Promise<boolean> {
  const { error } = await supabase.from('users').update({ is_active: false }).eq('user_id', userId)
  return !error
}
```

### `Promise.all` with Supabase (for parallel fetches in `fetchAllCurrentStatuses`)
```typescript
// Pattern: parallel Supabase queries — used when two queries are independent
const [resultA, resultB] = await Promise.all([
  supabase.from('tableA').select('*'),
  supabase.from('tableB').select('*').eq('column', value),
])
const a = (resultA.data || []) as TypeA[]
const b = (resultB.data || []) as TypeB[]
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No HR data model | `employee_status` append-only log + `users` with `date_hired`/`date_fired` | Phase 02 (this phase) | Enables all of v2.0 HR module |
| WhatsApp for attendance | Structured DB with presence-by-default | Phase 02 (foundation) | ZAMPORAB gets real data in Phase 03 UI |

**Deprecated/outdated:**
- None — this is a greenfield addition. No existing code is deprecated.

---

## Open Questions

1. **Status values: underscores or not in DB CHECK constraint**
   - What we know: TypeScript type uses `'Na_rabote' | 'Otgul' | 'Bolnichniy' | 'Otpusk' | 'Uvolen'` (no spaces, ASCII-safe). CHECK constraint in SQL must match exactly.
   - What's unclear: Whether the product owner prefers Cyrillic status codes in the DB (e.g., `'На работе'`).
   - Recommendation: Use underscore ASCII values in DB (`Na_rabote`, etc.) — they are unambiguous in SQL, safe in URLs, and consistent with existing project naming (`SRV-ENG`, `PLANNED`, etc.). TypeScript `EMPLOYEE_STATUS_CONFIG` provides the Russian display labels.

2. **`date_to` semantics for daily statuses**
   - What we know: For a one-day status like "Otgul today", `date_from = date_to = today`. For ongoing statuses, `date_to = NULL`.
   - What's unclear: Whether Phase 03 UI will always set `date_to = date_from` for single-day entries (most common case) or leave `date_to = NULL`.
   - Recommendation: For Phase 02 API, `setEmployeeStatus` accepts `date_to: string | null` and passes it through — the UI (Phase 03) decides the value. The `fetchAllCurrentStatuses` query handles both cases with the `.or('date_to.is.null,date_to.gte...')` filter.

3. **`fetchStatusesForPeriod` and service filter join**
   - What we know: The function signature includes an optional `serviceId` filter, but joining `employee_status` to `users` to filter by `service_id` requires a Supabase foreign key join or a two-step query.
   - What's unclear: Whether Phase 05 reporting needs per-service filtering at the DB level.
   - Recommendation: Implement without the `serviceId` filter for Phase 02. Phase 05 can add the join or client-side filter when the reporting UI is built. Leave the optional parameter in the signature but treat it as a no-op for now.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `src/lib/api.ts` (read in full), `src/lib/logger.ts`, `src/lib/supabase.ts`, `src/types/index.ts`, `package.json` — all read directly
- `.planning/STATE.md` — locked decisions about append-only log and no separate employees table
- `.planning/REQUIREMENTS.md` — HR-01 and HR-02 requirement text
- `.planning/ROADMAP.md` — Phase 02 success criteria (all 5 criteria read directly)
- `node_modules/@supabase/supabase-js/package.json` — confirmed version 2.89.0

### Secondary (MEDIUM confidence)
- Supabase JS v2 `.or()` filter syntax — pattern `date_to.is.null,date_to.gte.${date}` is the documented PostgREST filter string format; verified against existing `.eq()`, `.lte()` usage in `api.ts`
- `gen_random_uuid()` in PostgreSQL — standard pgcrypto function available in Supabase by default (Supabase docs confirm this; not verified via Context7 in this session)
- `ADD COLUMN IF NOT EXISTS` — PostgreSQL 9.6+ syntax; Supabase runs PostgreSQL 15+

### Tertiary (LOW confidence)
- None — all findings are either from direct codebase inspection or established PostgreSQL/TypeScript patterns

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — package.json and all lib files read directly; zero ambiguity about versions
- Architecture: HIGH — migration SQL and TypeScript patterns derived from existing codebase conventions; no hypothetical decisions
- Pitfalls: HIGH — all pitfalls derived from reading actual code and understanding the append-only constraint; not speculative

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (stable stack — Supabase JS, PostgreSQL, Next.js versions unchanged)
