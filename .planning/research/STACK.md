# Technology Stack — HR Module Additions

**Project:** Gormost v2.0 — HR Module
**Researched:** 2026-03-02
**Scope:** NEW additions only. Existing stack (Next.js 16, TypeScript, Tailwind, Supabase, date-fns 3, @dnd-kit) is validated and NOT re-researched.

---

## Summary Verdict

The existing stack covers ~90% of HR module needs. Only one new dependency is required: `xlsx` for Excel export. PDF output should use browser `window.print()` + a print stylesheet — zero new dependencies. The attendance grid is a pure CSS Grid layout problem solvable with Tailwind. No calendar picker library is needed; date-fns already handles all date arithmetic.

---

## Recommended Stack Additions

### Excel Export

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `xlsx` (SheetJS CE) | ^0.18.5 | Generate `.xlsx` files for attendance sheets and period reports in-browser | Industry standard, 1M+ weekly downloads, zero runtime dependencies, works in both browser and Node.js. The Community Edition covers all required features (cell styling not needed for tabular HR reports). |

**Why not ExcelJS:** ExcelJS (~500kB unminified) is Node.js-first and requires bundler configuration in Next.js App Router. Its browser bundle is larger and less stable. SheetJS CE is purpose-built for browser export and has a smaller footprint for the use case here.

**Why not a server Route Handler for export:** Client-side generation with `xlsx` avoids an API round-trip, works on Vercel Edge, and keeps the implementation simple. The datasets (≤150 employees × 31 days) are small enough that in-browser generation is instant.

### PDF / Print Output

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Browser Print API (`window.print()`) | built-in | Print-to-PDF for attendance sheets and employee cards | Zero dependencies. Modern browsers render `@media print` stylesheets cleanly. Sufficient for the report formats required (tabular data, no complex layout). |

**Why not jsPDF:** jsPDF adds ~300kB to the bundle and requires manual layout math (coordinates, font embedding). For tabular reports with Cyrillic text, the font embedding story is painful. Browser print handles Cyrillic natively via the OS font stack. The output quality is identical for this use case.

**Why not Puppeteer/headless:** Server-side PDF generation (Puppeteer) requires a persistent Node process — incompatible with Vercel's serverless architecture without a dedicated endpoint, which is over-engineering for internal HR reports.

### Date Grid Rendering

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `date-fns` | ^3.0.0 (ALREADY INSTALLED) | Calendar arithmetic: generate day arrays for a month/quarter, format dates in Russian locale, compute date ranges | Already in `package.json`. Functions needed: `eachDayOfInterval`, `startOfMonth`, `endOfMonth`, `startOfQuarter`, `endOfQuarter`, `format`, `parseISO`, `differenceInCalendarDays`. |
| Tailwind CSS | ^3.4.0 (ALREADY INSTALLED) | Attendance grid layout (employee rows × day columns) via CSS Grid utilities | `grid-cols-[auto_repeat(31,_minmax(28px,_1fr))]` style inline template or computed class — handles variable column counts. No third-party grid component needed. |

**Why no date picker library (react-day-picker, flatpickr, etc.):** The HR module needs period selectors (month/quarter dropdowns), not a full calendar picker. A simple `<select>` for month and year, plus radio buttons for quarter, is sufficient and matches the existing UI style. Adding a date picker library for this would be over-engineering.

---

## Database Schema Additions

### New Tables

#### `employee_statuses` — Current Status per Employee

```sql
-- Stores the CURRENT status of each employee.
-- Indexed on user_id for O(1) lookup in the daily attendance view.
CREATE TABLE employee_statuses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  status      text NOT NULL CHECK (status IN ('present','vacation','sick','leave','fired')),
  changed_by  uuid REFERENCES users(user_id),
  changed_at  timestamptz NOT NULL DEFAULT now(),
  note        text,
  UNIQUE (user_id)  -- only one current status per employee
);

-- Rollback:
-- DROP TABLE IF EXISTS employee_statuses;
```

**Design decision — single-row per employee (not append-only):** The attendance sheet needs a point-in-time "what is their status today?" query. A UNIQUE constraint on `user_id` makes this O(1). History is tracked separately (see below). This avoids a `DISTINCT ON` or `MAX(changed_at)` aggregation on every page load.

#### `employee_status_history` — Immutable Status Change Log

```sql
-- Append-only log. Never updated or deleted.
-- Used for: attendance sheet grid (what was status on day X?),
--           period reports (how many sick days in March?).
CREATE TABLE employee_status_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  status      text NOT NULL CHECK (status IN ('present','vacation','sick','leave','fired')),
  changed_by  uuid REFERENCES users(user_id),
  effective_date date NOT NULL DEFAULT CURRENT_DATE,  -- the day this status applies from
  changed_at  timestamptz NOT NULL DEFAULT now(),
  note        text
);

CREATE INDEX idx_esh_user_date ON employee_status_history (user_id, effective_date DESC);
CREATE INDEX idx_esh_date      ON employee_status_history (effective_date);

-- Rollback:
-- DROP TABLE IF EXISTS employee_status_history;
-- DROP INDEX IF EXISTS idx_esh_user_date;
-- DROP INDEX IF EXISTS idx_esh_date;
```

**Design decision — `effective_date` (date, not timestamptz):** HR presence tracking is day-granular. Using a `date` column rather than timestamp simplifies the attendance grid query: "give me all status changes in April" becomes `WHERE effective_date BETWEEN '2026-04-01' AND '2026-04-30'`. Timestamptz is preserved in `changed_at` for the audit trail.

**Attendance grid query pattern:**

```sql
-- For each employee, find their status on a specific date:
-- "What was employee X's status on 2026-04-15?"
SELECT DISTINCT ON (user_id)
  user_id, status
FROM employee_status_history
WHERE effective_date <= '2026-04-15'
ORDER BY user_id, effective_date DESC, changed_at DESC;
```

This query uses the `idx_esh_user_date` index efficiently for datasets of ≤200 employees.

#### `users` table additions (migrations, not new table)

```sql
-- Add hire_date and dismiss_date to support soft-delete with timeline.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS hire_date    date,
  ADD COLUMN IF NOT EXISTS dismiss_date date;

-- is_active already exists (confirmed in types/index.ts).
-- dismiss_date populated when is_active = false, enables "fired on X date" display.

-- Rollback:
-- ALTER TABLE users DROP COLUMN IF EXISTS hire_date;
-- ALTER TABLE users DROP COLUMN IF EXISTS dismiss_date;
```

### RLS Policy Pattern

Follow the existing project pattern: Supabase RLS is managed at the project level, not in migration files (as per INTEGRATIONS.md — the app uses anon key with RLS). New tables need policies. Migration files should note this but policies are applied via Supabase dashboard.

```sql
-- Add to migration as comment for human to apply:
-- ENABLE ROW LEVEL SECURITY ON employee_statuses;
-- ENABLE ROW LEVEL SECURITY ON employee_status_history;
-- Policy: allow read to all authenticated sessions, write only to ADMIN/ZAMPORAB/BOSS roles.
-- (Apply manually via Supabase SQL editor — not in migration file per project conventions.)
```

---

## Attendance Grid — Architecture Decision

The attendance grid (employee × day matrix, up to 150 employees × 31 days) should be rendered as a **pure React component with Tailwind CSS Grid**, not a third-party data grid library.

**Rationale:**
- ~4,650 cells maximum (150 employees × 31 days) — no virtualization needed
- Status values are single-letter codes (`П`/`О`/`Б`/`У`/`У`) — cells are tiny
- Existing `date-fns` provides `eachDayOfInterval` to generate the column headers
- A library like `react-table` or `ag-Grid` would add 100-500kB for no meaningful benefit

**Cell color mapping** (consistent with existing STATUS_CONFIG pattern in `types/index.ts`):

```typescript
export const HR_STATUS_CONFIG = {
  present:  { label: 'П', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  vacation: { label: 'О', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  sick:     { label: 'Б', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  leave:    { label: 'У', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  fired:    { label: '—', color: 'bg-slate-800/40 text-slate-600 border-slate-700/30' },
} as const
```

---

## Integration Points with Existing Code

| Existing File | How HR Module Integrates |
|---------------|--------------------------|
| `src/types/index.ts` | Add `EmployeeStatus`, `EmployeeStatusHistory` interfaces and `HR_STATUS_CONFIG` constant |
| `src/lib/api.ts` | Add HR functions: `fetchCurrentStatuses()`, `updateEmployeeStatus()`, `fetchStatusHistory(userId, from, to)`, `fetchAttendanceGrid(from, to)` |
| `src/lib/logger.ts` | Call `logAction()` on every status change (already used in existing flows) |
| `src/app/admin/page.tsx` | Hire/dismiss actions live here (ADMIN role); use existing `updateUser()` with new `hire_date`/`dismiss_date` fields |
| `PANELS` constant | Add HR panel entry for `/hr` route — accessible to ZAMPORAB, BOSS, ADMIN |
| `src/components/Header.tsx` | HR panel link added automatically once PANELS array is updated |

---

## What NOT to Add

| Rejected Addition | Reason |
|------------------|--------|
| `react-table` / `@tanstack/react-table` | Overkill for a fixed attendance matrix. CSS Grid is sufficient. |
| `react-day-picker` / `flatpickr` | Month/quarter selectors are `<select>` dropdowns. No calendar UI needed. |
| `ExcelJS` | Node.js-first, larger bundle, not needed when SheetJS CE covers the use case. |
| `jsPDF` | Cyrillic font pain, unnecessary bundle weight when browser print handles it natively. |
| `Puppeteer` / server-side PDF | Incompatible with Vercel serverless. Not needed for internal reports. |
| `react-query` / `SWR` | Existing pattern uses direct Supabase calls + `useState`. Consistent with codebase style. |
| `Zustand` / Redux | No global state management needed; each panel manages local state per CLAUDE.md architecture rules. |
| `react-virtualized` | 4,650 cells max. DOM can handle this trivially. |

---

## Installation

```bash
# Only new dependency:
npm install xlsx

# Verify TypeScript types are bundled (xlsx ships its own types since v0.18):
# No @types/xlsx needed.
```

Existing dependencies cover everything else:
- `date-fns` — calendar math (already installed)
- `clsx` — conditional class composition for status cells (already installed)
- `@supabase/supabase-js` — all DB queries (already installed)
- Tailwind CSS — grid layout and cell styling (already installed)

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| `xlsx` for Excel export | MEDIUM | SheetJS CE is the documented community standard; cannot verify current npm version without web access. Last known stable: 0.18.5 (pre-cutoff). Verify with `npm info xlsx version` before install. |
| Browser print for PDF | HIGH | Browser print API is stable and well-documented. Cyrillic support confirmed via OS font stack. No version dependency. |
| date-fns sufficiency | HIGH | Functions `eachDayOfInterval`, `startOfMonth`, `endOfMonth`, `format`, `parseISO` confirmed in date-fns v3 docs (cutoff: Aug 2025). Package already installed. |
| CSS Grid for attendance table | HIGH | Tailwind's grid utilities are stable and sufficient for fixed-column tables. Well-established pattern. |
| Supabase schema patterns | HIGH | `DISTINCT ON` pattern for latest-per-user is a documented PostgreSQL idiom. `effective_date date` + `changed_at timestamptz` split is standard HR schema practice. |
| RLS policy approach | MEDIUM | Consistent with existing project pattern (anon key + RLS). Actual policy syntax depends on Supabase project version; apply via dashboard per project conventions. |

---

## Sources

- Existing codebase: `/home/user/Projects/gormost/package.json` — confirmed date-fns ^3.0.0, @supabase/supabase-js ^2.47.10 installed
- Existing codebase: `/home/user/Projects/gormost/src/types/index.ts` — confirmed `User.is_active: boolean` (soft-delete already supported)
- Existing codebase: `/home/user/Projects/gormost/src/lib/api.ts` — confirmed `deleteUser()` already uses soft-delete pattern (`update({ is_active: false })`)
- Project context: `.planning/codebase/INTEGRATIONS.md` — confirmed no RLS migrations in codebase; policies applied via dashboard
- Project context: `.planning/PROJECT.md` — confirmed HR module target features
- Training knowledge (Aug 2025 cutoff): SheetJS CE (xlsx) and jsPDF ecosystem knowledge; LOW/MEDIUM confidence on exact current versions
