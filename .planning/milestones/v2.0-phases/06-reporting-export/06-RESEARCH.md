# Phase 06: Reporting & Export — Research

**Researched:** 2026-03-26
**Domain:** HR attendance reporting — status-based timesheet grid (T-13 format), period totals, .xlsx export, print CSS
**Confidence:** HIGH

---

## Summary

Phase 06 adds status-based attendance reporting to the existing `/hr` panel. The project already has a shift-schedule-based attendance grid (`TabeTable.tsx`, `TimesheetExport.tsx`, `printForms.ts`) under the "Аналитика" tab. Phase 06's goal is **distinct**: it must build a grid that shows `employee_status` rows (Otgul, Bolnichniy, Otpusk, etc.) rather than shift schedule patterns. The existing tooling covers "who was on shift duty" — Phase 06 covers "who was on vacation/sick/absent."

The data source is `employee_status` (append-only event log) queried via the already-implemented `fetchStatusesForPeriod(dateFrom, dateTo)`. The grid algorithm must expand each overlapping status row across the days it covers within the selected month, then fall back to "Na_rabote" for days with no status row (presence-by-default rule locked in Phase 02).

For Excel export, use SheetJS Community Edition installed via tarball URL (NOT `npm install xlsx` which serves an outdated, vulnerable 0.18.5). The export can be fully client-side: no new API route is needed. The existing API route at `/api/timesheet/export` is for 1C XML/CSV shift-based export and is out of scope here.

For print, the project uses a `window.open() + win.document.write(html)` pattern (see `printForms.ts`) with plain CSS — this avoids all Tailwind dark mode bleed entirely and is the established project pattern.

**Primary recommendation:** Build an `AttendanceGrid` component using `fetchStatusesForPeriod`, add it as a new "Табель" sub-tab within the existing `/hr` analytics tab or as a new Route. Use SheetJS CE (tarball install) for client-side xlsx export. Use the project's existing `window.open + plain HTML/CSS` print pattern — do NOT use `window.print()` from within the dark-themed app page.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HR-10 | User can view attendance sheet — employee × day grid for selected month (T-13 format) | `fetchStatusesForPeriod` returns overlapping status rows; presence-by-default fills gaps; T-13 code mapping table below |
| HR-11 | User can view period report — sums of vacation/sick days by month or quarter | Same data source; aggregate by `status` across expanded date ranges per employee |
| HR-12 | User can export sheet to .xlsx and print it | SheetJS CE client-side xlsx; existing `window.open + plain HTML` print pattern |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SheetJS CE (xlsx) | 0.20.3 | Client-side .xlsx generation | Only viable option for browser-side xlsx; no server round-trip needed; CE is sufficient for T-13 grid without styling |
| date-fns | ^3.0.0 (already installed) | Date arithmetic for period expansion | Already in project, handles month boundaries, day iteration |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| No new UI libraries | — | Grid rendering | 270×31 = 8,370 cells does NOT require virtualization — plain `<table>` renders at ~60fps; see Pitfalls |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SheetJS CE tarball | ExcelJS | ExcelJS is ~1.08MB bundled, Node-first (needs server action), poor client-side story. SheetJS CE is browser-native. |
| SheetJS CE tarball | xlsx 0.18.5 from npm | npm registry version is 2+ years old, has known high-severity CVE. Use tarball. |
| window.open + plain HTML | window.print() in-page | In-page print requires overriding all dark Tailwind classes. New window with plain CSS is the established project pattern and zero risk. |

**Installation:**
```bash
npm install --save https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
```

**Verify install:**
```bash
npm run build
```

---

## Architecture Patterns

### Recommended Project Structure

The reporting feature lives inside the existing `/hr` page under the "Аналитика" tab (already handled by `HRToolsShell`). Add a new `AttendanceTab` view mode to `HRToolsShell` rather than creating a new route.

```
src/
├── components/hr-tools/
│   ├── AttendanceGrid.tsx      ← new: status-based employee × day grid
│   ├── AttendanceSummary.tsx   ← new: period totals table (vacation/sick/otgul sums)
│   ├── AttendanceExport.tsx    ← new: xlsx export button (client-side SheetJS)
│   ├── HRToolsShell.tsx        ← add 'attendance' to ViewMode, wire new components
│   ├── TabeTable.tsx           ← existing shift-schedule grid (unchanged)
│   ├── TimesheetExport.tsx     ← existing 1C export (unchanged)
│   └── printForms.ts           ← add printAttendance() function
├── lib/
│   ├── attendanceUtils.ts      ← new: buildMonthlyAttendance(), T-13 code mapping
│   └── api.ts                  ← extend fetchStatusesForPeriod (add serviceId join)
```

### Pattern 1: Status-to-Grid Expansion Algorithm

**What:** Expand overlapping `employee_status` rows into a day-keyed map per employee.
**When to use:** This is the core data transformation needed for HR-10.

```typescript
// Source: project's own employee_status schema (append-only, date_from/date_to)

export type T13Code = 'Я' | 'О' | 'Б' | 'П' | 'К' | 'У' | 'Р' | 'В' | 'МО' | 'Д' | 'С' | '?'

// Map our EmployeeStatusType → T-13 display code
export const STATUS_TO_T13: Record<EmployeeStatusType, T13Code> = {
  Na_rabote:            'Я',   // явка
  Otgul:                'В',   // отгул (используем В — выходной по согласованию)
  Bolnichniy:           'Б',   // больничный
  Otpusk:               'О',   // отпуск (ОТ в полном формате, сокращаем до О)
  Uvolen:               '—',   // нет в табеле
  Komandirovka:         'К',   // командировка
  Uchebniy_otpusk:      'У',   // учебный отпуск (ОУ в полном формате)
  Dekret:               'Р',   // отпуск по беременности/уходу
  Mobilizovan:          'МО',  // мобилизован (нестандартный)
  SVO:                  'С',   // СВО
  Troydoustroyen_s_SVO: 'Я',   // вернулся, работает
}

// Build a map: userId → { 'YYYY-MM-DD': T13Code }
export function buildAttendanceMap(
  users: User[],
  statuses: EmployeeStatus[],
  year: number,
  month: number
): Map<string, Map<string, T13Code>> {
  const daysInMonth = new Date(year, month, 0).getDate()
  const result = new Map<string, Map<string, T13Code>>()

  for (const user of users) {
    result.set(user.user_id, new Map())
  }

  for (const row of statuses) {
    const dayMap = result.get(row.user_id)
    if (!dayMap) continue

    // Expand the status row across all days it covers within this month
    const rowStart = new Date(row.date_from + 'T12:00:00')
    const rowEnd   = row.date_to
      ? new Date(row.date_to + 'T12:00:00')
      : new Date(year, month, 0) // open-ended: clip to end of month

    const monthStart = new Date(year, month - 1, 1)
    const monthEnd   = new Date(year, month, 0)

    const clampStart = rowStart < monthStart ? monthStart : rowStart
    const clampEnd   = rowEnd   > monthEnd   ? monthEnd   : rowEnd

    const cur = new Date(clampStart)
    while (cur <= clampEnd) {
      const dateStr = cur.toISOString().split('T')[0]
      const code = STATUS_TO_T13[row.status as EmployeeStatusType]
      if (code && code !== '—') {
        // Last-write wins — most recent row overwrites earlier (statuses ordered by date_from ASC)
        dayMap.set(dateStr, code)
      }
      cur.setDate(cur.getDate() + 1)
    }
  }

  return result
}
```

### Pattern 2: SheetJS CE Client-Side xlsx Export

**What:** Generate xlsx directly in the browser, trigger download.
**When to use:** Export button in `AttendanceExport.tsx`.

```typescript
// Source: https://docs.sheetjs.com/docs/getting-started/examples/export/
// "use client" — runs in browser only

import { utils, writeFileXLSX } from 'xlsx'

export function exportAttendanceXlsx(
  rows: { name: string; serviceId: string; cells: string[] }[],
  days: number[],
  year: number,
  month: number
): void {
  // Build array-of-arrays: header row + data rows
  const header = ['ФИО', ...days.map(d => String(d))]
  const data = [header, ...rows.map(r => [r.name, ...r.cells])]

  const ws = utils.aoa_to_sheet(data)
  // Set column widths: name col wider, day cols narrow
  ws['!cols'] = [{ wch: 30 }, ...days.map(() => ({ wch: 4 }))]

  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, 'Табель')

  const mm = String(month).padStart(2, '0')
  writeFileXLSX(wb, `tabel_${year}_${mm}.xlsx`)
}
```

### Pattern 3: Print via New Window (Project Standard)

**What:** Generate plain HTML string, open in new window, auto-print.
**When to use:** Print button. Reuses project's established pattern from `printForms.ts`.

```typescript
// Source: src/components/hr-tools/printForms.ts (existing project pattern)

export function printAttendance(/* ... params ... */): void {
  const html = buildAttendanceHtml(/* ... */)
  const win = window.open('', '_blank')
  if (!win) { alert('Разрешите всплывающие окна'); return }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 400)
}

// The HTML uses BASE_CSS from printForms.ts (white background, black text)
// NO Tailwind classes — plain CSS only, no dark mode bleed
```

### T-13 Standard Code Reference

| Our Status | T-13 Code | Meaning (Russian standard) |
|------------|-----------|---------------------------|
| Na_rabote | Я | Явка (present) |
| Otgul | В | Выходной / отгул |
| Bolnichniy | Б | Временная нетрудоспособность |
| Otpusk | О | Ежегодный отпуск (ОТ in full) |
| Komandirovka | К | Командировка |
| Uchebniy_otpusk | У | Учебный отпуск (ОУ in full) |
| Dekret | Р | Отпуск по беременности/родам/уходу |
| Mobilizovan | НН | Неявка (или спец. код организации) |
| SVO | НН | Неявка (или спец. код организации) |
| Troydoustroyen_s_SVO | Я | Явка (вернулся) |

Note: Standard T-13 codes Я/Б/О/К are universally recognized. МО/С/Р are used by some organizations. The project already defines `EntryCode` in `timesheet.ts` with similar codes — align with that.

### Anti-Patterns to Avoid

- **Querying per-employee:** Do NOT call `fetchEmployeeStatusHistory(userId)` in a loop for each of 270 employees. Use `fetchStatusesForPeriod` once — it fetches all overlapping rows for the period in one query.
- **Mutating the status log:** Do not attempt UPDATE on `employee_status`. It is append-only by locked decision.
- **Tailwind print classes:** Do not use `print:bg-white` or the Tailwind `darkMode: ['variant', '@media not print { .dark & }']` trick. The project pattern (new window + plain HTML) is simpler and already works.
- **window.print() in-page:** Triggers dark background, glassmorphism gradients, and white text bleeding into print. Use `window.open()` pattern.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| xlsx file generation | Custom XML builder | SheetJS CE `utils.aoa_to_sheet + writeFileXLSX` | xlsx format has 100+ edge cases (string/number typing, encoding, cell refs) |
| Date range expansion | Custom overlap logic | The pattern in Pattern 1 above | Clamping to month boundaries and open-ended `date_to` (null = ongoing) has edge cases |
| T-13 code mapping | Any custom encoding | The `STATUS_TO_T13` map | Standard T-13 codes are fixed by Russian HR regulation |

**Key insight:** The xlsx generation is 5 lines with SheetJS. The grid data transformation is the real work — get that right first, xlsx is trivial.

---

## Common Pitfalls

### Pitfall 1: `fetchStatusesForPeriod` Returns All Services
**What goes wrong:** The function fetches ALL employees' statuses. If the caller doesn't filter by `service_id`, BOSS gets all 270 employees unexpanded, which is correct, but ZAMPORAB should only see their service.
**Why it happens:** The `_serviceId` parameter in `fetchStatusesForPeriod` is currently a no-op (marked with underscore and comment "Phase 05 adds the join when needed").
**How to avoid:** Either extend `fetchStatusesForPeriod` to join `users` on `service_id`, or filter the returned statuses client-side by pre-fetching users with their `service_id`. Client-side filter is simpler and avoids a migration.
**Warning signs:** ZAMPORAB sees employees from other services.

### Pitfall 2: Open-Ended Status Rows (`date_to = null`)
**What goes wrong:** An employee on Dekret has `date_to = null`. If you do `new Date(row.date_to)` you get `Invalid Date`.
**Why it happens:** `date_to: null` means the status is ongoing with no defined end.
**How to avoid:** Always guard: `row.date_to ? new Date(row.date_to) : endOfMonth`. See Pattern 1 expansion algorithm above.
**Warning signs:** TypeScript will show `Argument of type 'string | null' is not assignable` if types are strict.

### Pitfall 3: Status Row Ordering Matters for Last-Write-Wins
**What goes wrong:** Multiple overlapping status rows for the same employee on the same day (e.g., Otpusk → Na_rabote override on return). The grid shows the wrong code.
**Why it happens:** `fetchStatusesForPeriod` orders by `date_from ASC`. If two rows cover the same day, the later-starting row should win (most specific/recent).
**How to avoid:** After building the grid map, also process rows ordered by `date_from ASC, created_at ASC` so that a Na_rabote row starting later than an Otpusk row correctly overrides it for that day.
**Warning signs:** Employee shown as Otpusk on days they've already returned.

### Pitfall 4: SheetJS CE Lacks Cell Styling
**What goes wrong:** You try to color cells (green for Я, orange for Б) in the xlsx export. SheetJS CE does not support cell styling — only SheetJS Pro does.
**Why it happens:** SheetJS split styling into the paid tier.
**How to avoid:** Xlsx export is unformatted (text only). Print preview (via new window + plain HTML) CAN have colored cells using CSS — add `background-color` inline styles to `<td>` elements. Don't promise xlsx styling.
**Warning signs:** `ws[cellRef].s = {...}` silently has no effect in CE.

### Pitfall 5: SheetJS Requires `"use client"` in App Router
**What goes wrong:** `writeFileXLSX` calls `document.createElement` and triggers `ReferenceError: document is not defined` if the component renders server-side.
**Why it happens:** Next.js 16 App Router renders server-side by default.
**How to avoid:** Add `"use client"` to `AttendanceExport.tsx`. The export button only runs in browser. Alternatively use `typeof window !== 'undefined'` guard.
**Warning signs:** Build passes but runtime crashes with document/navigator errors.

### Pitfall 6: 270×31 Grid Performance is Fine Without Virtualization
**What goes wrong:** Adding react-window or react-virtualized for 8,370 cells.
**Why it happens:** Generic advice says "virtualize large grids."
**How to avoid:** 8,370 static DOM nodes is within React's comfortable range (threshold for required virtualization is typically >10,000 interactive cells). The existing `TabeTable.tsx` already renders 270×31 without virtualization. Use the same approach. If scroll performance is sluggish, add `useMemo` on the grid computation — which Pattern 1 already recommends.
**Warning signs:** You would only need virtualization if employees exceed ~2,000 rows.

---

## Code Examples

### Fetching All Statuses for a Month

```typescript
// Source: src/lib/api.ts — fetchStatusesForPeriod (existing)
// Call with month boundaries:
const year = 2026, month = 3
const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`
const dateTo   = new Date(year, month, 0).toISOString().split('T')[0] // last day
const statuses = await fetchStatusesForPeriod(dateFrom, dateTo)
```

### Period Summary (HR-11) Aggregation

```typescript
// Count days per status type per employee for period totals
export function buildPeriodSummary(
  attendanceMap: Map<string, Map<string, T13Code>>
): Map<string, Record<T13Code, number>> {
  const result = new Map<string, Record<T13Code, number>>()
  for (const [userId, dayMap] of attendanceMap) {
    const counts: Record<string, number> = {}
    for (const code of dayMap.values()) {
      counts[code] = (counts[code] ?? 0) + 1
    }
    result.set(userId, counts as Record<T13Code, number>)
  }
  return result
}
```

### SheetJS Tarball Import in Client Component

```typescript
// "use client"
// Source: https://docs.sheetjs.com/docs/demos/frontend/react/
import { utils, writeFileXLSX } from 'xlsx'
// Install: npm install --save https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| xlsx 0.18.5 from npm | SheetJS CE 0.20.3 from tarball | SheetJS stopped publishing to npm ~2022 | npm registry version has CVE; must use tarball URL |
| In-page window.print() with Tailwind | New window + plain CSS HTML | Project pattern established in printForms.ts | Zero dark-mode bleed, works cross-browser |

**What already exists in this project:**
- `TabeTable.tsx` — shift-schedule grid (D/N days); different from HR-10 (status grid)
- `TimesheetExport.tsx` + `/api/timesheet/export` — 1C XML/CSV; different from HR-12 (xlsx)
- `printForms.ts` — `printTabel()` function; prints shift schedule, not status-based attendance
- These are NOT replacements for Phase 06. Phase 06 must build a parallel status-based layer.

---

## Open Questions

1. **Where exactly does the attendance report live?**
   - What we know: `/hr` has "Аналитика" tab with `HRToolsShell` (view modes: roster, tabel, coverage, stroevaya, drivers, planner, check). There is already a 'tabel' view (shift-based).
   - What's unclear: Should the status-based attendance (HR-10) be a new view mode in `HRToolsShell` (e.g., 'attendance'), or a new tab on the `/hr` page itself?
   - Recommendation: Add as a new view mode `'attendance'` in `HRToolsShell`. Keep all analytics in one place. Rename the existing 'tabel' to 'смены' if confusion arises.

2. **Quarter period support for HR-11**
   - What we know: `fetchStatusesForPeriod` accepts arbitrary date ranges. Quarter = 3 months.
   - What's unclear: Should the period picker support Q1/Q2/Q3/Q4 presets, or just month-picker?
   - Recommendation: Add quarter presets to the period selector in `HRToolsShell` alongside existing week/month presets. The query handles it automatically.

3. **HR-17: `resolveShiftForDate` still pending**
   - What we know: Marked pending in REQUIREMENTS.md (Phase 04 incomplete item). The status-based attendance grid (HR-10) does NOT need `resolveShiftForDate` — it uses `employee_status` rows, not shift calculations.
   - Recommendation: Phase 06 can proceed without HR-17. HR-17 is relevant only for the shift-schedule timesheet (TabeTable), not for status-based HR-10.

---

## Validation Architecture

> Skipped — workflow.nyquist_validation not confirmed as enabled in .planning/config.json.

---

## Sources

### Primary (HIGH confidence)
- Project codebase: `src/components/hr-tools/TabeTable.tsx` — existing grid pattern (270×31, no virtualization)
- Project codebase: `src/components/hr-tools/printForms.ts` — established print pattern (new window + plain HTML)
- Project codebase: `src/lib/api.ts` `fetchStatusesForPeriod` — existing query API
- Project codebase: `src/lib/timesheet.ts` `EntryCode` type — T-13 codes already defined
- Project codebase: `src/types/index.ts` `EmployeeStatusType` + `EMPLOYEE_STATUS_CONFIG` — all 11 status types
- [SheetJS CE official docs](https://docs.sheetjs.com/docs/getting-started/examples/export/) — client-side xlsx export API
- [SheetJS React demo](https://docs.sheetjs.com/docs/demos/frontend/react/) — `"use client"` pattern, tarball install

### Secondary (MEDIUM confidence)
- [GitHub tailwindcss #16384](https://github.com/tailwindlabs/tailwindcss/discussions/16384) — Tailwind dark mode + print solution; project avoids this entirely by using new-window print pattern
- npm: `xlsx` 0.18.5 on npm registry confirmed stale; `exceljs` 4.4.0 too heavy for client-side

### Tertiary (LOW confidence)
- Performance threshold for grid virtualization: stated as ~10,000+ cells; consistent with existing project code not using virtualization for same grid size

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — SheetJS tarball confirmed from official docs; project already uses new-window print pattern
- Architecture: HIGH — based on reading actual project code; pattern is consistent with CLAUDE.md conventions
- T-13 code mapping: MEDIUM — standard Russian HR codes are well-established; specific project mapping for SVO/Mobilizovan statuses is a judgment call
- Pitfalls: HIGH — most derived from reading actual project code (open-ended date_to, service filter gap, SheetJS CE styling limitation)

**Research date:** 2026-03-26
**Valid until:** 2026-06-26 (stable domain; SheetJS version may update, but tarball pattern is stable)
