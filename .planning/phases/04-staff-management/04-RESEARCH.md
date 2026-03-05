# Phase 04: Staff Management — Research

**Researched:** 2026-03-05
**Domain:** HR data layer, employee lifecycle management, shift scheduling, SQL seed migrations, Next.js/TypeScript component extension
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**ФИО structure:** Store split: `last_name`, `first_name`, `middle_name`. Keep `full_name` for backward compat. On new employee creation, assemble `full_name` from the three parts.

**Professions table:** `name` + `grade` + `category` (ИТР/рабочий). Canonical name from staff schedule file (штатное расписание), not from shift file. Grade is a separate field, not embedded in name. Examples: "Дорожный рабочий" + "3 разряд" | "Главный механик" + NULL.

**History table (SCD Type 2):** `employee_positions` with one row per employee where `ended_at IS NULL`. On transfer: close old row (`ended_at = today`), open new row. Partial unique index: `(user_id) WHERE ended_at IS NULL`. `change_reason`: 'прием' | 'перевод' | 'повышение' | 'понижение' | 'совмещение'.

**Schedules:** 6 types: сутки/3, 5/2, 3/3, 6/6, 15/15, 1/3. `сутки/3` and `1/3` are `is_shift_based=true`. `default_day_night`: night (сутки/3, 1/3), day (5/2, 3/3, 6/6 non-driver), alternating (driver 6/6 and 15/15 — Phase drivers, skip now).

**Assignments:** `employee_assignments` with one active row per employee (`ended_at IS NULL`). `shift_num` 1–4 for сутки/3 and 1/3, NULL otherwise. `rotation_group` '1', '2', '2_1' for 15/15. `foreman_name` is text. `shift_reference_date` is anchor date for resolveShiftForDate calculation.

**Shift reference dates (CRITICAL — 2026-03-05 shift 3 is working):**
- Shift 1 (Чекин А.В.): reference_date = 2026-03-07
- Shift 2 (Максимов И.Н.): reference_date = 2026-03-08
- Shift 3 (Кожин В.М.): reference_date = 2026-03-05
- Shift 4 (Станишевский А.В.): reference_date = 2026-03-06
- Formula: `days_since_reference % 4 === 0` → working (NIGHT)

**Employee categories:** 'ИТР' and 'рабочий' only. 'Бригада №1' in shift file = 'рабочий' label, not structural unit.

**New statuses (6):** Komandirovka, Uchebniy_otpusk, Dekret, Mobilizovan, SVO, Troydoustroyen_s_SVO. `Uvolen` stays as lifecycle event from `fireEmployee`, not shown as clickable status button.

**SVO fields:** `svo_type` TEXT CHECK IN ('мобилизован', 'контракт', 'через_регион') on users table. SVO statistics output is Phase 05; data captured here.

**Disability:** `is_disabled` BOOLEAN + `disability_group` SMALLINT (1/2/3) + `disability_notes` TEXT (work restrictions, not medical diagnosis). Only warn, never block assignment (Phase 05+).

**Parking attendants:** `participates_in_stroyevaya = false`. Otherwise normal employees.

**Drivers:** Paused until mechanic panel redesign. Store `is_driver = true` in assignment. Day/night for drivers = 'day' as placeholder.

**Employee Detail Card:** Opens on name click in /hr. Shows: full FIO (split), profession+grade, category, schedule, shift number, phone, email, hire date, probation end (if active), disability flag+notes (if set), position history list, last 10 request assignments. ADMIN sees: "Dismiss" button, "Transfer position" button. Access: ZAMPORAB, HEAD, ADMIN, BOSS can open (read). Only ADMIN sees edit buttons.

**Hire/Dismiss/Transfer UI (ADMIN only):** Hire = modal form (FIO, profession, category, phone, hire date, probation dates). Dismiss = confirmation with dismissal date (→ is_active=false, "Dismissed" section). Transfer = select new profession + reason + date.

**Data import:** 270 employees from `.planning/roster-merged.json` as SQL seed migration (not script — for versioning). Professions from `profession` field (штатное file). FIO split by spaces into 3 parts. 46 ITR with no schedule → default 5/2.

### Claude's Discretion

- Whether EmployeeDetailCard is a modal overlay or side panel
- Exact ordering and visual layout of status buttons on EmployeeCard (6 new + 4 existing)
- How to handle the 15/15 schedule variants in roster-merged.json ('15/15 (1)', '15/15 (2)', '15/15 (2,1)', '15/15(2)', '15/15') — normalization strategy

### Deferred Ideas (OUT OF SCOPE)

- Строевая записка (military roll call report) — Phase 05
- Штатное расписание (staffing schedule) — Phase 05
- Driver card / vehicle assignment — mechanic panel redesign phase
- Dispatcher 1/3 reference dates — need HR clarification, placeholder for now
- Winter mobile brigades — separate feature
- Remaining ~91 employees (sick/vacation/SVO not in shift file) — manual entry via Admin
- Disability assignment warning — Phase 05+
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HR-08 | ADMIN can hire (with hire date) and dismiss (with dismissal date, soft-delete: is_active=false + date_fired) | `hireEmployee()` exists, needs extended form; `fireEmployee()` exists, needs DismissModal UI and "Dismissed" section in /hr |
| HR-09 | User can open employee detail card showing contacts, position, request assignment history | Requires new `EmployeeDetailCard.tsx` component + `fetchEmployeeDetail()` API function joining professions + assignments |
| HR-13 | Extended employee profile: split FIO, category, phone, email, probation dates, disability flag+group+notes, many-children flag, svo_type, participates_in_stroyevaya | Requires ALTER TABLE users (11 new columns) + updated User interface in types/index.ts |
| HR-14 | professions lookup table + employee_positions SCD Type 2 history | Requires CREATE TABLE professions + employee_positions + partial unique index + seed data + transferEmployee() API |
| HR-15 | schedules lookup table + employee_assignments (schedule+shift+rotation+ref date+driver flag) | Requires CREATE TABLE schedules + employee_assignments + partial unique index + seed data + assignSchedule() API |
| HR-16 | 6 new employee status types (Komandirovka, Uchebniy_otpusk, Dekret, Mobilizovan, SVO, Troydoustroyen_s_SVO) | Extend EmployeeStatusType union + update CHECK constraint in employee_status + add to EMPLOYEE_STATUS_CONFIG + add buttons to EmployeeCard |
| HR-17 | resolveShiftForDate(assignment, date) function computing isWorking + DAY/NIGHT for all 6 schedule types | Extend lib/shifts.ts with new exported function; logic fully specified in hr-data-model.md |
| HR-18 | Import 270 employees from roster-merged.json via seed migration with correct professions, schedules, shifts, assignments | SQL seed migration; requires professions and schedules tables to exist first (ordering dependency) |
</phase_requirements>

---

## Summary

Phase 04 is a data-heavy phase with a clear dependency chain: database schema must be correct before TypeScript types can be extended, types before API functions, API before UI components. The data model is fully designed in `hr-data-model.md` — this phase is primarily an execution problem, not a design problem.

The work splits into three natural streams: (1) database layer (4 new tables + users ALTER + status CHECK update + 2 seed files + 270-employee import), (2) TypeScript/API layer (User interface extension + 6 new status types + new interfaces for 4 new tables + 6 new API functions), and (3) UI layer (4 new components + EmployeeCard extended status buttons + ServiceSection name-click wiring). These streams have strict sequential dependencies within each plan but can be structured as 5 plans executed in order.

The highest-risk item is the SQL seed migration for 270 employees: the roster-merged.json has schedule variants ('15/15 (1)', '15/15 (2)', '15/15 (2,1)', '15/15(2)', '15/15') that must be normalized to the 6 canonical schedule codes, and one profession entry (`<Объект не найден>`) that must be handled. The employee_status table CHECK constraint must be updated to accept 6 new status values — this ALTER requires human review and execution in Supabase SQL Editor before any TypeScript changes.

**Primary recommendation:** Execute as 5 plans: (1) DB schema migration with human checkpoint, (2) Seed data migrations (professions + schedules + 270-employee import) with human checkpoint, (3) TypeScript types + API functions, (4) EmployeeDetailCard + HireModal + DismissModal + TransferModal UI, (5) resolveShiftForDate function + EmployeeCard new status buttons + ServiceSection wiring.

---

## Standard Stack

### Core (all already in project, no new installs)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| Next.js (App Router) | 16 | Framework, routing | Existing |
| TypeScript strict | 5.x | Types | Existing |
| Supabase JS client | 2.x | DB queries via `@/lib/supabase` | Existing |
| Tailwind CSS | 3.x | Styling | Existing |
| React `useState` / `useEffect` | 18 | Component state | Existing |

**No new npm dependencies required for Phase 04.**

### Supporting Patterns

| Pattern | Purpose |
|---------|---------|
| `supabase.from('table').select('*, relation(*)')` | JOIN queries for enriched data |
| `CREATE UNIQUE INDEX ... WHERE ended_at IS NULL` | Partial unique index for SCD Type 2 |
| `ADD COLUMN IF NOT EXISTS` | Idempotent ALTER TABLE |
| `INSERT INTO ... ON CONFLICT DO NOTHING` | Safe seed data upsert |
| `Promise.all([...])` | Parallel Supabase queries in API functions |

---

## Architecture Patterns

### Migration Naming Convention (from existing migrations)

```
001_add_hr_module.sql          ← format: NNN_descriptive_name.sql
002_add_hr_fields_to_users.sql
003_add_work_planning_module.sql
004_add_vehicle_status_tracking.sql
```

Phase 04 migrations must follow this sequence:
```
005_add_staff_management_schema.sql    ← CREATE TABLE professions, employee_positions, schedules, employee_assignments + ALTER users + ALTER employee_status CHECK
006_seed_professions_and_schedules.sql ← INSERT professions (~45 rows) + INSERT schedules (6 rows)
007_seed_employees.sql                 ← 270 employee INSERTs with positions and assignments
```

### Migration Structure (from 001/002 — use as template)

```sql
-- [What and why, 2-3 lines]
-- [Key design decision note]

-- TABLE CREATE or ALTER TABLE...
CREATE TABLE IF NOT EXISTS table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ...
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_...;
CREATE UNIQUE INDEX idx_... ON ... WHERE ended_at IS NULL;  -- partial unique

-- Rollback:
-- DROP TABLE IF EXISTS ...;
-- ALTER TABLE ... DROP COLUMN IF EXISTS ...;
```

### TypeScript Extension Pattern (from existing types/index.ts)

Current `EmployeeStatusType` is a union type (not an enum):
```typescript
// EXISTING:
export type EmployeeStatusType =
  | 'Na_rabote'
  | 'Otgul'
  | 'Bolnichniy'
  | 'Otpusk'
  | 'Uvolen'

// EXTEND TO (add 6 new values — extend the union):
export type EmployeeStatusType =
  | 'Na_rabote'
  | 'Otgul'
  | 'Bolnichniy'
  | 'Otpusk'
  | 'Uvolen'
  | 'Komandirovka'
  | 'Uchebniy_otpusk'
  | 'Dekret'
  | 'Mobilizovan'
  | 'SVO'
  | 'Troydoustroyen_s_SVO'
```

`EMPLOYEE_STATUS_CONFIG` is typed `Record<EmployeeStatusType, {...}>` — adding new union values means TypeScript will error until all 6 are added to the config object. This is the desired behavior (compile-time completeness check).

### New TypeScript Interfaces to Add (in types/index.ts)

```typescript
export interface Profession {
  id: string
  name: string
  grade: string | null
  category: 'ИТР' | 'рабочий'
  is_active: boolean
  created_at: string
}

export interface EmployeePosition {
  id: string
  user_id: string
  profession_id: string
  started_at: string
  ended_at: string | null
  change_reason: string | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface Schedule {
  id: string
  code: string
  name: string
  work_days: number
  rest_days: number
  default_day_night: 'night' | 'day' | 'alternating'
  is_shift_based: boolean
  created_at: string
}

export interface EmployeeAssignment {
  id: string
  user_id: string
  schedule_id: string
  shift_num: number | null
  rotation_group: string | null
  foreman_name: string | null
  shift_reference_date: string | null
  is_driver: boolean
  started_at: string
  ended_at: string | null
  created_by: string | null
  created_at: string
}

// Enriched: EmployeeAssignment joined with Schedule
export interface EmployeeAssignmentWithSchedule extends EmployeeAssignment {
  schedule: Schedule
}

// Enriched: EmployeePosition joined with Profession
export interface EmployeePositionWithProfession extends EmployeePosition {
  profession: Profession
}

// Extended User with new HR fields
// Add to existing User interface:
// last_name: string | null
// first_name: string | null
// middle_name: string | null
// email: string | null
// category: 'ИТР' | 'рабочий' | null
// probation_start: string | null
// probation_end: string | null
// is_disabled: boolean
// disability_group: 1 | 2 | 3 | null
// disability_notes: string | null
// has_many_children: boolean
// svo_type: 'мобилизован' | 'контракт' | 'через_регион' | null
// participates_in_stroyevaya: boolean

// For employee detail card — full enriched employee
export interface EmployeeDetail {
  user: User
  currentStatus: EmployeeStatusType
  currentPosition: EmployeePositionWithProfession | null
  positionHistory: EmployeePositionWithProfession[]
  currentAssignment: EmployeeAssignmentWithSchedule | null
  recentRequests: RequestAssignment[]  // last 10
}
```

### API Function Signatures

New functions to add to `src/lib/api.ts`:

```typescript
// Fetch full employee detail for detail card
export async function fetchEmployeeDetail(userId: string): Promise<EmployeeDetail | null>

// Fetch all professions (for hire/transfer form dropdown)
export async function fetchProfessions(): Promise<Profession[]>

// Fetch all schedules (for hire form dropdown)
export async function fetchSchedules(): Promise<Schedule[]>

// Create a new employee (hire flow) — sets users record, employee_positions, employee_assignments
export async function createEmployee(data: {
  last_name: string
  first_name: string
  middle_name: string
  full_name: string
  tab_number: string
  profession_id: string
  category: 'ИТР' | 'рабочий'
  schedule_id: string
  shift_num: number | null
  phone: string | null
  date_hired: string
  probation_start: string | null
  probation_end: string | null
  service_id: string | null
}, createdBy: string): Promise<User | null>

// Transfer employee to new position (SCD Type 2 close+open)
export async function transferEmployee(
  userId: string,
  newProfessionId: string,
  reason: string,
  date: string,
  performedBy: string
): Promise<boolean>

// Get current position for employee
export async function fetchCurrentPosition(userId: string): Promise<EmployeePositionWithProfession | null>

// Get position history for employee
export async function fetchPositionHistory(userId: string): Promise<EmployeePositionWithProfession[]>
```

Note: `hireEmployee()` and `fireEmployee()` already exist in api.ts but need extension:
- `hireEmployee()` currently sets `date_hired` + `is_active=true` only — Phase 04 wraps it with `createEmployee()` which also creates the positions and assignments rows
- `fireEmployee()` is complete as-is for the dismissal action

### Component Architecture (follows CLAUDE.md pattern)

New files for Phase 04:
```
src/components/hr/
  EmployeeDetailCard.tsx    ← modal overlay (decision: modal, not side panel)
  HireModal.tsx             ← ADMIN: form to create new employee
  DismissModal.tsx          ← ADMIN: confirmation with dismissal date
  TransferModal.tsx         ← ADMIN: change profession + reason + date
  (existing files remain unchanged — only EmployeeCard gets new status buttons)
```

`/hr` page.tsx (`src/app/hr/page.tsx`) — only changes:
- Add `onNameClick` prop threading down to `ServiceSection` → `EmployeeCard`
- Add `selectedEmployee` state + `EmployeeDetailCard` render
- Add `showHireModal` state + "Hire Employee" button (ADMIN only)

### EmployeeCard Extended Status Buttons (HR-16)

The existing `CLICKABLE_STATUSES` constant currently controls which 4 buttons show. Phase 04 extends this to show 10 statuses, but with role/context filtering:

```typescript
// All clickable statuses (excluding Uvolen which is lifecycle only):
const ALL_STATUSES: EmployeeStatusType[] = [
  'Na_rabote', 'Otgul', 'Bolnichniy', 'Otpusk',        // existing
  'Komandirovka', 'Uchebniy_otpusk', 'Dekret',          // new general
  'Mobilizovan', 'SVO', 'Troydoustroyen_s_SVO',         // new SVO
]
// Show all 10 for canEdit users; no filtering by role needed (ADMIN/ZAMPORAB both see all)
```

Visual grouping: existing 4 on first row, new 6 on second row (or use flex-wrap — planner decides exact layout).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Partial unique constraint | Application-level uniqueness check | `CREATE UNIQUE INDEX ... WHERE ended_at IS NULL` (PostgreSQL) | Race conditions; DB enforces atomically |
| Cascade delete for positions/assignments | Manual delete in API | `ON DELETE CASCADE` in FK definition | Correctness under partial failures |
| Date arithmetic for shifts | Custom date math | `Math.floor((targetMs - refMs) / 86400000)` — whole-day integer diff | Existing pattern in shifts.ts already does this correctly |
| JOIN queries | Multiple sequential fetches + JS merge | `supabase.from('table').select('*, profession(*), schedule(*)')` | Single round-trip, less error-prone |
| Idempotent seed data | Conditional logic in SQL | `INSERT INTO ... ON CONFLICT DO NOTHING` | Clean, re-runnable migrations |
| SCD Type 2 close+open | Manual two-step with potential failure | Transactional update: close old + insert new in sequence in TypeScript (Supabase doesn't expose explicit transactions but sequential awaits in a try/catch are safe here since the constraint prevents double-open) | Prevents orphaned open records |

**Key insight:** The partial unique index `WHERE ended_at IS NULL` is PostgreSQL-native and is the correct mechanism for SCD Type 2. Do not attempt to enforce this at the application layer.

---

## Common Pitfalls

### Pitfall 1: employee_status CHECK constraint not updated for new statuses

**What goes wrong:** TypeScript allows the 6 new status values, but the Supabase INSERT fails with a CHECK constraint violation because the DB-level CHECK on `employee_status.status` still only accepts the original 5 values.

**Why it happens:** The CHECK constraint was hardcoded in migration 001: `CHECK (status IN ('Na_rabote', 'Otgul', 'Bolnichniy', 'Otpusk', 'Uvolen'))`. It must be explicitly updated.

**How to avoid:** Include the CHECK constraint update in migration 005:
```sql
ALTER TABLE employee_status
  DROP CONSTRAINT employee_status_status_check,
  ADD CONSTRAINT employee_status_status_check
    CHECK (status IN (
      'Na_rabote','Otgul','Bolnichniy','Otpusk','Uvolen',
      'Komandirovka','Uchebniy_otpusk','Dekret',
      'Mobilizovan','SVO','Troydoustroyen_s_SVO'
    ));
```

**Warning signs:** Supabase returns a constraint error when setting new status types. TypeScript build passes but runtime fails.

### Pitfall 2: users.user_id is TEXT in existing schema, not UUID

**What goes wrong:** New tables (`employee_positions`, `employee_assignments`) use `UUID REFERENCES users(user_id)` in the design document, but `users.user_id` is `TEXT` in the actual schema (confirmed in migration 001: `user_id TEXT NOT NULL REFERENCES users(user_id)`).

**Why it happens:** The `users` table was created before the Phase 04 design and uses TEXT ids (the existing migration uses TEXT for user_id in employee_status too).

**How to avoid:** In migration 005, use `TEXT NOT NULL REFERENCES users(user_id)` for `user_id` columns in new tables, matching the existing FK type. The `professions`, `schedules` tables use their own UUID PKs — that is fine since they are new tables.

**Confirmed pattern from migration 001:**
```sql
user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
created_by TEXT NOT NULL REFERENCES users(user_id),
```

### Pitfall 3: Roster profession strings need cleaning before seeding

**What goes wrong:** The `profession` field in roster-merged.json uses inconsistent formats: "Дорожный рабочий, 3 разряд" (comma separator) vs "Дорожный рабочий 3 разряд" (space only), and one entry is `<Объект не найден>` which is a data error.

**Why it happens:** The roster was assembled from two source files (штатное + смены) with different formatting conventions.

**How to avoid:**
- In the seed migration SQL, define the professions table rows with clean canonical names (no trailing qualifiers in the name field, grade in separate column)
- Normalize the `<Объект не найден>` entry: in the seed SQL, map that tab_number to a known profession or INSERT without profession (NULL profession_id, handle gracefully)
- The `_profMismatch: true` employees (30 of them) use штатное profession as authoritative — this is already the rule

**Data note:** 48 unique profession strings in roster, but after normalization (splitting name from grade at the last comma) the actual distinct (name, grade) pairs reduce to approximately 40-42 canonical professions.

### Pitfall 4: Schedule normalization — roster has 9 schedule string variants, model has 6 codes

**What goes wrong:** The seed migration cannot use roster `schedule` values directly as foreign keys to `schedules.code` because the roster contains: `'15/15 (1)'`, `'15/15 (2)'`, `'15/15 (2,1)'`, `'15/15(2)'`, `'15/15'` — all mapping to the single `15/15` schedule code with different `rotation_group` values.

**Why it happens:** The rotation group information was encoded in the schedule name string in the source files.

**How to avoid:** In the seed SQL, use a CASE mapping:
```sql
-- schedule mapping logic (for 007_seed_employees.sql):
-- roster 'сутки/3' → schedule code 'сутки/3', rotation_group NULL
-- roster '6/6'     → schedule code '6/6',     rotation_group NULL
-- roster '3/3'     → schedule code '3/3',     rotation_group NULL
-- roster ''        → schedule code '5/2' (46 ITR default), rotation_group NULL
-- roster '15/15 (1)'  → schedule code '15/15', rotation_group '1'
-- roster '15/15 (2)'  → schedule code '15/15', rotation_group '2'
-- roster '15/15 (2,1)'→ schedule code '15/15', rotation_group '2_1'
-- roster '15/15(2)'   → schedule code '15/15', rotation_group '2'  (same as '15/15 (2)')
-- roster '15/15'      → schedule code '15/15', rotation_group '1'  (treat as group 1, verify with HR)
```

**Warning signs:** Foreign key constraint failure in the seed migration on `schedule_id`.

### Pitfall 5: resolveShiftForDate date arithmetic — UTC vs local timezone

**What goes wrong:** `new Date('2026-03-05')` in JavaScript creates a UTC midnight date. When you compute day differences using `.getTime()`, local timezone offsets can cause off-by-one errors (e.g., in UTC+3 timezone, a date parsed as UTC midnight is 3 hours behind local midnight).

**Why it happens:** The existing `shifts.ts` file uses `new Date(BASE_DATE)` with `setHours(0,0,0,0)` to normalize — this is the correct pattern.

**How to avoid:** Follow the exact pattern in `getShiftForDate()`:
```typescript
const targetDate = new Date(dateStr)
targetDate.setHours(0, 0, 0, 0)
const refDate = new Date(assignment.shift_reference_date)
refDate.setHours(0, 0, 0, 0)
const daysElapsed = Math.floor((targetDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24))
```
The `setHours(0,0,0,0)` on both dates eliminates time component issues.

### Pitfall 6: EnrichedEmployee type must not break existing HR components

**What goes wrong:** Phase 03 components (`ServiceSection`, `EmployeeCard`, `StatusHistory`, `SummaryPanel`) all import `EnrichedEmployee` from `@/types`. If the `User` interface is extended and any new field is `NOT NULL` without a default, `fetchAllCurrentStatuses()` will return User objects missing those fields from existing DB rows, causing TypeScript errors at runtime.

**Why it happens:** Existing users in DB don't have `last_name`, `first_name`, etc. — they are NULL.

**How to avoid:** All new fields in the `User` interface extension must be typed as `| null` (which they are per the design). The `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` pattern with `DEFAULT NULL` ensures existing rows return NULL for new columns. Supabase `select('*')` will include the new columns automatically. No changes required to existing Phase 03 components.

### Pitfall 7: Partial unique index syntax in Supabase/PostgreSQL

**What goes wrong:** Using `UNIQUE (user_id)` as a column constraint instead of a partial unique index fails to allow multiple historical rows.

**How to avoid:** Use the index form:
```sql
CREATE UNIQUE INDEX employee_positions_current
  ON employee_positions (user_id)
  WHERE ended_at IS NULL;

CREATE UNIQUE INDEX employee_assignments_current
  ON employee_assignments (user_id)
  WHERE ended_at IS NULL;
```
These allow unlimited historical rows (where `ended_at IS NOT NULL`) while enforcing at most one active row.

---

## Code Examples

### Verified patterns from existing codebase

#### ALTER TABLE with IF NOT EXISTS (migration pattern — from 002)
```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS date_hired DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS date_fired DATE DEFAULT NULL;
```

#### INSERT seed data idempotently
```sql
INSERT INTO schedules (code, name, work_days, rest_days, default_day_night, is_shift_based)
VALUES
  ('сутки/3', 'Суточный',               1,  3,  'night', true),
  ('5/2',     'Пятидневка',              5,  2,  'day',   false),
  ('3/3',     'Трёхдневка',              3,  3,  'day',   false),
  ('6/6',     'Шестидневная вахта',      6,  6,  'day',   false),
  ('15/15',   'Полумесячная вахта',      15, 15, 'day',   false),
  ('1/3',     'Диспетчерский суточный',  1,  3,  'night', true)
ON CONFLICT (code) DO NOTHING;
```

#### Supabase JOIN query (PostgREST syntax)
```typescript
const { data } = await supabase
  .from('employee_positions')
  .select('*, profession:professions(*)')
  .eq('user_id', userId)
  .is('ended_at', null)
  .single()
```

#### SCD Type 2 close + open (TypeScript pattern)
```typescript
export async function transferEmployee(
  userId: string,
  newProfessionId: string,
  reason: string,
  date: string,
  performedBy: string
): Promise<boolean> {
  // 1. Close current position
  const { error: closeErr } = await supabase
    .from('employee_positions')
    .update({ ended_at: date })
    .eq('user_id', userId)
    .is('ended_at', null)
  if (closeErr) return false

  // 2. Open new position
  const { error: openErr } = await supabase
    .from('employee_positions')
    .insert({
      user_id: userId,
      profession_id: newProfessionId,
      started_at: date,
      ended_at: null,
      change_reason: reason,
      created_by: performedBy,
    })
  if (openErr) return false

  await logAction(performedBy, 'TRANSFER_EMPLOYEE', 'user', userId, { newProfessionId, reason })
  return true
}
```

#### resolveShiftForDate function signature (extends shifts.ts)
```typescript
export interface ShiftResolution {
  isWorking: boolean
  shiftType: 'DAY' | 'NIGHT' | null  // null when isWorking=false
}

export function resolveShiftForDate(
  assignment: {
    schedule_code: string         // schedule.code joined
    shift_reference_date: string | null  // 'YYYY-MM-DD'
    rotation_group: string | null
    is_driver: boolean
  },
  date: Date
): ShiftResolution
```

#### logAction pattern (from api.ts — must be called in every new API function)
```typescript
await logAction(performedBy, 'HIRE_EMPLOYEE', 'user', userId, { date_hired: dateHired })
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Single `position` text field on users | `employee_positions` SCD Type 2 table | Full transfer history; Phase 05 reporting enabled |
| No schedule tracking | `employee_assignments` with `resolveShiftForDate()` | строевая записка calculation possible (Phase 05) |
| 5 employee statuses | 11 employee statuses | Covers SVO/military/decree scenarios |
| `full_name` only | `last_name` + `first_name` + `middle_name` + `full_name` | Document generation, sorting, formal reports |

**Deprecated/outdated:**
- `position` field on `users`: Still kept for backward compat (Phase 03 components display it). Phase 04 adds `employee_positions` table as the authoritative source. The `users.position` field remains as a display fallback.

---

## Data Import Analysis (HR-18)

### Roster-merged.json facts (verified by inspection)

| Metric | Value |
|--------|-------|
| Total employees | 270 |
| With сутки/3 schedule (shift workers) | 179 |
| With 6/6 schedule | 11 |
| With 15/15 variants (all rotation groups) | 32 |
| With 3/3 schedule | 2 |
| With empty schedule (→ default 5/2) | 46 |
| Unique profession strings (raw) | 48 |
| Employees with `_profMismatch: true` | 30 |
| Employees with `shift` value assigned | ~224 |
| One data error entry | `<Объект не найден>` |

### Seed Migration Order (CRITICAL — dependency chain)

```
005_add_staff_management_schema.sql   ← must run first (creates tables)
006_seed_professions_and_schedules.sql ← must run second (seeds lookup data)
007_seed_employees.sql                ← must run last (depends on profession/schedule IDs)
```

### Employee Import SQL Strategy

Migration 007 must:
1. Use `INSERT INTO users (...) ON CONFLICT (tab_number) DO UPDATE SET ...` to handle re-runs and pre-existing users
2. Look up `profession_id` by `(name, grade)` using a subquery
3. Look up `schedule_id` by `code` using a subquery
4. Create `employee_positions` row for each employee (started_at = hireDate from roster)
5. Create `employee_assignments` row (started_at = hireDate, shift_reference_date from the shift_num lookup table)
6. Handle `<Объект не найден>` employee: insert without profession (skip employee_positions row for that user, or use a placeholder)

### FIO Splitting Logic for SQL

The roster `fio` field is always "Фамилия Имя Отчество" (3 space-separated parts). In the SQL seed, split using `split_part()`:
```sql
split_part(fio_value, ' ', 1) AS last_name,
split_part(fio_value, ' ', 2) AS first_name,
split_part(fio_value, ' ', 3) AS middle_name
```

---

## Plan Structure Recommendation

Phase 04 should execute as **5 plans** in strict order:

| Plan | Name | Key Deliverables | Human Checkpoint |
|------|------|-----------------|-----------------|
| 04-01 | DB Schema Migration | Migration 005 (ALTER users 11 cols + CREATE 4 tables + UPDATE employee_status CHECK) | YES — human runs in Supabase SQL Editor |
| 04-02 | Seed Data Migrations | Migration 006 (professions + schedules seed) + Migration 007 (270 employees) | YES — human runs in Supabase SQL Editor |
| 04-03 | TypeScript Types + API | Extend User + new interfaces + 6 API functions + resolveShiftForDate (HR-13, HR-14, HR-15, HR-16, HR-17) | No (code only, build check) |
| 04-04 | Employee Detail Card + Admin Modals | EmployeeDetailCard + HireModal + DismissModal + TransferModal (HR-08, HR-09) | No (code only, build check) |
| 04-05 | HR-16 Status Buttons + /hr Wiring | EmployeeCard extended buttons + ServiceSection name-click + /hr page orchestration | No (code only, build check) |

**Why 5 plans instead of 3 or 7:**
- Plans 01 and 02 are separate because seed data (270 rows) takes significant SQL generation effort and can be run as a second human-applied migration after schema is confirmed
- Plans 03 and 04 could theoretically merge but are kept separate because 03 is pure TypeScript/API (no UI) and 04 is all UI — the separation makes each plan reviewable independently
- Plan 05 is last because it modifies existing working components (EmployeeCard) — doing it after all new infrastructure exists prevents forward references

---

## Open Questions

1. **Dispatcher 1/3 reference dates**
   - What we know: 1/3 schedule exists in schedules table; formula is `days_elapsed % 4 === 0`
   - What's unclear: What are the shift reference dates for dispatcher суточники on 1/3 schedule? No dispatcher appears in roster-merged.json with 1/3 schedule.
   - Recommendation: Insert placeholder reference dates (e.g., 2026-03-05) in migration 007 for any 1/3 employees; CONTEXT.md defers this to HR clarification. Phase 05 unblocked.

2. **`<Объект не найден>` entry in roster**
   - What we know: One employee entry has profession = `<Объект не найден>` (data error from штатное file extraction)
   - What's unclear: Tab number and correct profession for this person
   - Recommendation: Skip employee_positions INSERT for that tab_number in the seed migration; add a comment in the SQL. HR can manually update via Admin panel.

3. **`15/15` (no group suffix) in roster — rotation group assignment**
   - What we know: 4 employees have schedule = '15/15' with no parenthetical (vs '15/15 (1)' etc.)
   - What's unclear: Are these group 1 or a different group?
   - Recommendation: Treat as rotation_group = '1' (first half of month) as the safer default; document in migration comment for HR verification.

4. **users table existing user_id format**
   - What we know: Existing users have user_id as TEXT (not UUID), e.g. system/role accounts. Roster employees have tab numbers like '0000-00780', 'СТ00011993'
   - What's unclear: When inserting 270 employees via seed, should we use gen_random_uuid() for user_id or use tab_number as the id?
   - Recommendation: Use `gen_random_uuid()` for user_id (consistent with how new users are created via createUser() in api.ts), with `tab_number` in the dedicated tab_number column. The CONFLICT target should be `tab_number` to handle re-runs.

---

## Sources

### Primary (HIGH confidence)
- `src/types/index.ts` — verified existing types, EmployeeStatusType union, EMPLOYEE_STATUS_CONFIG, EnrichedEmployee, User interface
- `src/lib/api.ts` — verified existing HR functions (fetchAllCurrentStatuses, hireEmployee, fireEmployee, setEmployeeStatus), logAction call pattern
- `src/lib/shifts.ts` — verified existing shift calculation pattern (date arithmetic, setHours normalization)
- `supabase/migrations/001_add_hr_module.sql` — verified migration format, user_id TEXT FK pattern, CHECK constraint syntax
- `supabase/migrations/002_add_hr_fields_to_users.sql` — verified ADD COLUMN IF NOT EXISTS pattern
- `src/components/hr/EmployeeCard.tsx` — verified CLICKABLE_STATUSES pattern, component structure
- `src/components/hr/ServiceSection.tsx` — verified component structure, props pattern
- `.planning/hr-data-model.md` — complete schema design (primary design input)
- `.planning/phases/04-staff-management/04-CONTEXT.md` — locked decisions, constraints
- `.planning/roster-merged.json` — verified by node analysis: 270 employees, 48 profession strings, schedule distribution

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` — requirement descriptions and traceability
- `.planning/ROADMAP.md` — phase success criteria (9 criteria for Phase 04)
- `.planning/hr-interview-notes.md` — HR decisions summary

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all existing libraries verified in codebase
- Migration patterns: HIGH — verified from existing migrations 001-004
- TypeScript extension patterns: HIGH — verified from types/index.ts and existing HR components
- Seed data strategy: HIGH — roster data analyzed directly, schedule normalization identified
- Architecture: HIGH — fully specified in hr-data-model.md, confirmed against existing code
- Pitfalls: HIGH — all pitfalls identified from actual code inspection (user_id TEXT type, CHECK constraint, etc.)

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable stack — Next.js, Supabase, TypeScript patterns stable)
