# Phase 07: HR Table View — Research

**Researched:** 2026-03-07
**Domain:** React/Next.js UI pattern — table view with client-side filtering and inline popover editing
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**View switching**
- Toggle between card grid and table — cards are NOT removed, table is an alternative
- Toolbar gets two toggle buttons: "Карточки" / "Таблица" (pattern identical to dispatcher's kanban/table toggle)
- Search field and service filter live in the same toolbar row regardless of view mode
- Default view: cards (preserve existing behavior)

**Toolbar controls**
- Search: text input, filters by employee full_name (client-side, no DB query)
- Service filter: dropdown — "Все службы" + one option per service (uses SERVICE_META for emoji)
- Search and filter apply to both card view and table view simultaneously

**Table columns**
- Name (clickable — opens EmployeeDetailCard, same as card view)
- Service (emoji + name from SERVICE_META)
- Current status (colored badge — clickable to change status)
- No additional columns (keep it compact)

**Inline status editing — status popup**
- Click on the colored status badge in a table row → small floating popup appears
- Popup shows all 11 statuses in two groups separated by a divider:
  - Group 1 (daily): На работе, Отгул, Больничный, Отпуск
  - Group 2 (extended): Командировка, Учебный отпуск, Декрет, Мобилизован, СВО, Вернулся с СВО
  - Uvolen (Уволен) is a lifecycle event — NOT in the popup (same rule as card view)
- Active status shown with checkmark
- After selecting a non-"На работе" status: reason input appears inside the same popup (text field + confirm button)
- Confirming reason (or skipping with Enter on empty field) saves and closes popup
- Popup closes on outside click (cancel, no change)
- Same optimistic update + rollback pattern as EmployeeCard

**Status history**
- Removed from table view entirely — StatusHistory accordion is NOT shown
- Rationale: status history is not for daily use; the card view already has it for when it's needed

**Role-based editing**
- Same canEdit logic as current HR page (HEAD cannot edit, ADMIN/ZAMPORAB/BOSS can)
- If canEdit is false: status badge is not clickable, no popup

### Claude's Discretion

None specified — all decisions are locked.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

---

## Summary

Phase 07 is a pure UI enhancement: add a compact table view as an alternative to the existing card grid in `/hr`. The data layer is already complete (phases 02-05). No new API calls, no new DB schema — only new React components consuming existing `EnrichedEmployee[]` data with client-side filtering.

The key technical challenge is the inline status popup: an absolutely-positioned dropdown that appears relative to the clicked badge, handles outside-click-to-close via `document` event listener, and reuses the exact same optimistic-update + rollback logic from `EmployeeCard.tsx`. This is a well-established pattern in React (no external library needed — the CONTEXT.md explicitly confirms "no existing popover utility").

The project architecture (CLAUDE.md: `page.tsx` = thin orchestrator, each UI section = separate file) dictates exactly where new code lives: `HRToolbar.tsx` and `HRTableView.tsx` in `src/components/hr/`, with minimal changes to `page.tsx` to add three state variables.

**Primary recommendation:** Build two new components (`HRToolbar`, `HRTableView`) without touching any existing HR components. Wire them in `page.tsx` behind a `view` state toggle. The popup is a hand-rolled absolute-div (no lib) — use `useRef` + `useEffect` document listener pattern already established in the codebase.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React (Next.js 16) | Already installed | Component rendering, state | Project stack — no alternatives |
| TypeScript strict | Already installed | Types | Project requirement |
| Tailwind CSS | Already installed | Styling | Project convention — no custom CSS |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `EMPLOYEE_STATUS_CONFIG` | In-repo (`src/types/index.ts`) | Status labels, colors, bg classes | Badge rendering + popup options |
| `SERVICE_META` | In-repo (`src/types/index.ts`) | Service emoji + color | Filter dropdown + Service column |
| `setEmployeeStatus` | In-repo (`src/lib/api.ts`) | Save status change to DB | Inline status edit confirm |
| `EmptyState` | In-repo (`src/components/EmptyState.tsx`) | Empty filtered results | No-results row in table |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled popup div | Headless UI Popover / Radix Popover | Library would add a dependency; CONTEXT.md confirms no existing popover utility, hand-rolled is correct here |
| Client-side filter (decided) | Server-side filter with DB query | DB query adds latency; 270 employees fits easily in memory |

**Installation:** No new packages required. All dependencies already in the project.

---

## Architecture Patterns

### Component Structure

```
src/
├── app/hr/page.tsx                    # ADD: view, search, filterService state; pass to HRToolbar + HRTableView
├── components/hr/
│   ├── HRToolbar.tsx                  # NEW: view toggle + search input + service filter dropdown
│   ├── HRTableView.tsx                # NEW: table shell + rows with inline status popup
│   ├── EmployeeCard.tsx               # UNTOUCHED
│   ├── ServiceSection.tsx             # UNTOUCHED
│   ├── SummaryPanel.tsx               # UNTOUCHED
│   ├── EmployeeDetailCard.tsx         # UNTOUCHED
│   ├── HireModal.tsx                  # UNTOUCHED
│   ├── DismissModal.tsx               # UNTOUCHED
│   ├── TransferModal.tsx              # UNTOUCHED
│   └── StatusHistory.tsx              # UNTOUCHED
```

### Pattern 1: View Toggle State (copy from dispatcher)

**What:** A `view` state in `page.tsx` that conditionally renders either the card grid or the table. The toolbar receives `view` and `onViewChange`.
**When to use:** Whenever two alternative presentations share the same data source.

```typescript
// In page.tsx Content function — add these 3 state variables
const [view, setView] = useState<'cards' | 'table'>('cards')   // default: cards
const [search, setSearch] = useState('')
const [filterService, setFilterService] = useState<string | null>(null)
```

### Pattern 2: Client-Side Filtering

**What:** Filter `visibleEmployees` using `search` and `filterService` before passing to both the card view and table view. Applied once at page level, not per-component.

```typescript
// In page.tsx — computed value (no useMemo needed at 270 employees)
const filteredEmployees = visibleEmployees
  .filter(e => !search || e.user.full_name.toLowerCase().includes(search.toLowerCase()))
  .filter(e => !filterService || e.user.service_id === filterService)
```

Pass `filteredEmployees` to both the card grid (via `grouped`) and `HRTableView`.

**Note on card view:** The existing `grouped` variable re-derives from `visibleEmployees`. Update that derivation to use `filteredEmployees` instead so search/filter also affect the card view.

### Pattern 3: HRToolbar Component

**What:** Mirrors the dispatcher `Toolbar.tsx` structure but replaces kanban/table labels with "Карточки"/"Таблица" and adds a text search input.

```typescript
// src/components/hr/HRToolbar.tsx
interface Props {
  view: 'cards' | 'table'
  onViewChange: (v: 'cards' | 'table') => void
  search: string
  onSearchChange: (v: string) => void
  filterService: string | null
  onFilterChange: (v: string | null) => void
  services: Service[]
}
```

Existing button classes from Toolbar.tsx:
```typescript
const btnBase = 'px-3 py-1.5 rounded-lg text-sm font-medium transition-all'
const btnActive = 'bg-blue-600 text-white'
const btnIdle = 'bg-white/5 text-white/50 hover:bg-white/10'
```

Service filter uses `SERVICE_META` for emoji:
```typescript
{services.map(s => {
  const meta = SERVICE_META[s.service_id] ?? { emoji: '📋' }
  return (
    <option key={s.service_id} value={s.service_id}>
      {meta.emoji} {s.service_name}
    </option>
  )
})}
```

### Pattern 4: HRTableView — Table Shell

**What:** Follows the exact `dispatcher/TableView.tsx` shell — `glass rounded-2xl overflow-hidden` container, `<table w-full text-sm>`, `<thead>` with `text-xs text-white/40`, `<tbody>` with `border-b border-white/5 hover:bg-white/5` rows, 40-44px effective row height via `py-2.5`.

```typescript
// src/components/hr/HRTableView.tsx — top-level structure
<div className="glass rounded-2xl overflow-hidden">
  <table className="w-full text-sm">
    <thead>
      <tr className="border-b border-white/10">
        <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Сотрудник</th>
        <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Служба</th>
        <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Статус</th>
      </tr>
    </thead>
    <tbody>
      {filteredEmployees.map(emp => (
        <HRTableRow key={emp.user.user_id} employee={emp} ... />
      ))}
      {filteredEmployees.length === 0 && (
        <tr><td colSpan={3}><EmptyState message="Сотрудники не найдены" icon="🔍" /></td></tr>
      )}
    </tbody>
  </table>
</div>
```

### Pattern 5: Inline Status Popup (hand-rolled absolute div)

**What:** Each table row manages its own popup open/close state. The popup is an absolutely-positioned `div` with high `z-50` z-index, rendered in-DOM relative to a `relative`-positioned `<td>` wrapper. Outside-click closes via `useEffect` + `document.addEventListener('mousedown', handler)`.

**Critical:** The popup uses `position: absolute` relative to the badge cell, not the viewport. Use `relative` on the `<td>` and `absolute top-full left-0` on the popup.

```typescript
// HRTableRow internal state
const [popupOpen, setPopupOpen] = useState(false)
const [localStatus, setLocalStatus] = useState<EmployeeStatusType>(employee.currentStatus)
const [showReason, setShowReason] = useState(false)
const [pendingReason, setPendingReason] = useState('')
const [saving, setSaving] = useState(false)
const popupRef = useRef<HTMLDivElement>(null)

// Outside-click close
useEffect(() => {
  if (!popupOpen) return
  const handler = (e: MouseEvent) => {
    if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
      setPopupOpen(false)
      setShowReason(false)
      setPendingReason('')
    }
  }
  document.addEventListener('mousedown', handler)
  return () => document.removeEventListener('mousedown', handler)
}, [popupOpen])
```

Popup status list structure:
```typescript
// Group 1 — DAILY_STATUSES (same constant as EmployeeCard.tsx)
const DAILY_STATUSES: EmployeeStatusType[] = ['Na_rabote', 'Otgul', 'Bolnichniy', 'Otpusk']
// Group 2 — EXTENDED_STATUSES (same constant as EmployeeCard.tsx)
const EXTENDED_STATUSES: EmployeeStatusType[] = [
  'Komandirovka', 'Uchebniy_otpusk', 'Dekret', 'Mobilizovan', 'SVO', 'Troydoustroyen_s_SVO'
]
// Uvolen is NOT in either list — same rule as EmployeeCard
```

Active status gets a checkmark:
```typescript
{isActive && <span className="ml-auto text-xs">✓</span>}
```

### Pattern 6: Optimistic Update + Rollback (copy from EmployeeCard)

**What:** Identical to the EmployeeCard pattern — set local state immediately, call API, rollback on failure.

```typescript
const handleStatusClick = async (newStatus: EmployeeStatusType) => {
  if (newStatus === localStatus || saving) return
  const prevStatus = localStatus
  setLocalStatus(newStatus)   // optimistic
  setSaving(true)
  setShowReason(newStatus !== 'Na_rabote')
  setPendingReason('')
  const today = new Date().toISOString().split('T')[0]
  const result = await setEmployeeStatus(
    employee.user.user_id, newStatus, today, today, null, currentUserId
  )
  setSaving(false)
  if (!result) {
    setLocalStatus(prevStatus)  // rollback
    setShowReason(false)
  } else {
    onRefresh()
    // Do NOT auto-close popup — reason input may still be needed
  }
}
```

After reason confirm:
```typescript
const handleReasonConfirm = async () => {
  if (!pendingReason.trim()) {
    setShowReason(false)
    setPopupOpen(false)
    return
  }
  setSaving(true)
  const today = new Date().toISOString().split('T')[0]
  await setEmployeeStatus(
    employee.user.user_id, localStatus, today, today, pendingReason.trim(), currentUserId
  )
  setSaving(false)
  setShowReason(false)
  setPendingReason('')
  setPopupOpen(false)
  onRefresh()
}
```

### Pattern 7: Status Badge Rendering (exact match to EmployeeCard)

```typescript
// From EmployeeCard.tsx — use identical class pattern
const cfg = EMPLOYEE_STATUS_CONFIG[localStatus]
<span
  className={`text-xs px-2 py-1 rounded-lg border shrink-0 ${cfg.bg}`}
  style={{ color: cfg.color }}
>
  {saving ? '...' : cfg.label}
</span>
```

When `canEdit` is true, wrap in a `<button>` that sets `popupOpen(true)`. When `canEdit` is false, render as a plain `<span>`.

### Pattern 8: page.tsx Changes (minimal)

Three state additions + pass to HRToolbar + conditional render:

```typescript
// Add to existing state block
const [view, setView] = useState<'cards' | 'table'>('cards')
const [search, setSearch] = useState('')
const [filterService, setFilterService] = useState<string | null>(null)

// Replace visibleEmployees → filteredEmployees derivation
const filteredEmployees = visibleEmployees
  .filter(e => !search || e.user.full_name.toLowerCase().includes(search.toLowerCase()))
  .filter(e => !filterService || e.user.service_id === filterService)

// grouped now uses filteredEmployees (not visibleEmployees)
const grouped = services
  .map(svc => ({
    serviceId: svc.service_id,
    serviceName: svc.service_name,
    employees: filteredEmployees.filter(e => e.user.service_id === svc.service_id),
  }))
  .filter(g => g.employees.length > 0)
```

The hire button and modals are unchanged. HRToolbar renders above SummaryPanel (or between SummaryPanel and hire button — planner decides).

### Anti-Patterns to Avoid

- **Rendering popup in a portal (`createPortal`):** Unnecessary complexity. Absolute positioning relative to the badge cell works fine at this scale.
- **Putting popup in HRTableView instead of HRTableRow:** Each row manages its own popup state independently. Lifting popup state to the table level creates unnecessary complexity.
- **Touching `ServiceSection.tsx` or `EmployeeCard.tsx`:** These components stay 100% untouched. Search/filter is applied upstream in `page.tsx`.
- **Separate API call for filtered results:** All 270 employees are already in memory. Client-side filter is instantaneous; DB round-trips add latency for no benefit.
- **`useMemo` for filter:** With 270 employees and simple string ops, the filter is fast enough without memoization. Add only if profiling shows lag.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Status config (labels, colors) | Custom status map | `EMPLOYEE_STATUS_CONFIG` from `src/types/index.ts` | Single source of truth — already has all 11 statuses |
| Service emoji/color | Local constant | `SERVICE_META` from `src/types/index.ts` | Same keys as `service_id` in the DB; avoids divergence |
| Status write to DB | Custom fetch/insert | `setEmployeeStatus` from `src/lib/api.ts` | Handles audit log (`logAction()`), append-only semantics |
| Table shell styling | New CSS | `glass rounded-2xl overflow-hidden` + existing Tailwind patterns | Visually matches dispatcher TableView |

**Key insight:** This phase is entirely a UI composition task. All data access, business logic, and type definitions are already built. The risk of divergence (different status labels, different API call shapes) is avoided by importing the same constants already used in `EmployeeCard.tsx`.

---

## Common Pitfalls

### Pitfall 1: Popup Clipped by `overflow-hidden` on Table Container

**What goes wrong:** The table wrapper has `overflow-hidden` (from `glass rounded-2xl overflow-hidden`). An absolutely-positioned popup inside a `<td>` is clipped at the table boundary and partially hidden.
**Why it happens:** CSS `overflow: hidden` clips all descendants, including `position: absolute` children, unless an ancestor with `overflow: visible` is between them.
**How to avoid:** Two options:
1. Use `overflow-visible` on the table wrapper (loses the rounded-corner clip on table rows — visual regression)
2. Render the popup outside the `<table>` element using `document.body` portal via `ReactDOM.createPortal`, positioned with `getBoundingClientRect()` of the badge element.

**Recommendation:** Use `createPortal` if the popup is visually clipped during implementation testing. This is the only case where a portal is appropriate here. Detect the issue early by testing a mid-table row before completing all rows.

**Warning signs:** Popup appears but is cut off at the bottom of the table container on rows near the bottom.

### Pitfall 2: Outside-Click Handler Not Cleaned Up

**What goes wrong:** `document.addEventListener('mousedown', handler)` is added when popup opens, but `removeEventListener` is not called on component unmount or popup close, causing the handler to fire after the popup is gone (stale closure).
**Why it happens:** `useEffect` cleanup is not implemented.
**How to avoid:** Always return the cleanup function from `useEffect`:
```typescript
return () => document.removeEventListener('mousedown', handler)
```
The `useEffect` dependency array must include `popupOpen` so the listener is re-registered correctly.

### Pitfall 3: Filtering Breaks Card View Grouping

**What goes wrong:** After adding client-side search/filter, the card view shows empty service sections or doesn't filter at all.
**Why it happens:** The `grouped` derivation in `page.tsx` still references `visibleEmployees` instead of `filteredEmployees`, or `filteredEmployees` is computed after `grouped`.
**How to avoid:** Compute `filteredEmployees` from `visibleEmployees` first. Then compute `grouped` from `filteredEmployees`. Order matters.

### Pitfall 4: Status Badge in Table Uses Wrong `border` Class

**What goes wrong:** The status badge renders without a visible border, looking flat compared to card view.
**Why it happens:** `EMPLOYEE_STATUS_CONFIG[status].bg` includes border classes (e.g., `bg-green-500/20 border-green-500/30`). If the badge element lacks `border` as a standalone Tailwind class, the border-color class has no effect.
**How to avoid:** Always include `border` as a class in addition to `cfg.bg`:
```typescript
className={`text-xs px-2 py-1 rounded-lg border shrink-0 ${cfg.bg}`}
```
This is already correct in `EmployeeCard.tsx` — copy exactly.

### Pitfall 5: `saving` State Blocks Popup Interaction

**What goes wrong:** After confirming a status change, `saving` is true for the duration of the API call. If the popup stays open during this time, user can click another status. If `saving` check is missing, a second API call fires before the first resolves.
**How to avoid:** Guard `handleStatusClick` with `if (saving) return` — identical to `EmployeeCard.tsx`. The disabled state on reason-confirm button also guards double-submit.

### Pitfall 6: TypeScript Error — `filterService` as `string | null` vs `string`

**What goes wrong:** The service filter state is `string | null` (null = "all services"), but the `<select>` `value` prop expects `string`. TypeScript strict mode raises an error.
**How to avoid:** Use `value={filterService ?? ''}` on the select element and convert back: `onChange={e => setFilterService(e.target.value || null)}`. Include `<option value="">Все службы</option>` as the first option.

---

## Code Examples

### Complete Badge + Popup Button Pattern

```typescript
// In HRTableRow — status cell
<td className="px-4 py-2.5 relative">
  {canEdit ? (
    <button
      onClick={() => setPopupOpen(true)}
      className={`text-xs px-2 py-1 rounded-lg border shrink-0 ${cfg.bg} cursor-pointer hover:opacity-80 transition-opacity`}
      style={{ color: cfg.color }}
    >
      {saving ? '...' : cfg.label}
    </button>
  ) : (
    <span
      className={`text-xs px-2 py-1 rounded-lg border shrink-0 ${cfg.bg}`}
      style={{ color: cfg.color }}
    >
      {cfg.label}
    </span>
  )}

  {/* Status popup */}
  {popupOpen && (
    <div
      ref={popupRef}
      className="absolute top-full left-0 mt-1 z-50 bg-gray-900 border border-white/10 rounded-xl shadow-2xl p-2 min-w-[160px]"
    >
      {/* Group 1: daily */}
      <div className="space-y-0.5">
        {DAILY_STATUSES.map(status => {
          const scfg = EMPLOYEE_STATUS_CONFIG[status]
          const isActive = localStatus === status
          return (
            <button
              key={status}
              onClick={() => handleStatusClick(status)}
              disabled={saving}
              className="flex items-center w-full px-2 py-1.5 rounded-lg text-xs hover:bg-white/10 transition-colors disabled:opacity-50"
              style={{ color: isActive ? scfg.color : 'rgba(255,255,255,0.6)' }}
            >
              {scfg.label}
              {isActive && <span className="ml-auto">✓</span>}
            </button>
          )
        })}
      </div>
      <div className="my-1.5 border-t border-white/10" />
      {/* Group 2: extended */}
      <div className="space-y-0.5">
        {EXTENDED_STATUSES.map(status => {
          const scfg = EMPLOYEE_STATUS_CONFIG[status]
          const isActive = localStatus === status
          return (
            <button
              key={status}
              onClick={() => handleStatusClick(status)}
              disabled={saving}
              className="flex items-center w-full px-2 py-1.5 rounded-lg text-xs hover:bg-white/10 transition-colors disabled:opacity-50"
              style={{ color: isActive ? scfg.color : 'rgba(255,255,255,0.6)' }}
            >
              {scfg.label}
              {isActive && <span className="ml-auto">✓</span>}
            </button>
          )
        })}
      </div>
      {/* Reason input — appears after selecting a non-Na_rabote status */}
      {showReason && (
        <div className="mt-1.5 pt-1.5 border-t border-white/10">
          <div className="flex gap-1.5">
            <input
              type="text"
              value={pendingReason}
              onChange={e => setPendingReason(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleReasonConfirm() }}
              placeholder="Причина (необязательно)"
              className="flex-1 text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white/80 placeholder-white/30 focus:outline-none focus:border-white/30"
              autoFocus
            />
            <button
              onClick={handleReasonConfirm}
              disabled={saving}
              className="text-xs px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/60 border border-white/10 transition-colors disabled:opacity-50"
            >
              ✓
            </button>
          </div>
        </div>
      )}
    </div>
  )}
</td>
```

### HRToolbar Search Input

```typescript
// Search input — same styling as existing form inputs in the project
<input
  type="text"
  value={search}
  onChange={e => onSearchChange(e.target.value)}
  placeholder="Поиск по имени..."
  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/70 placeholder-white/30 focus:outline-none focus:border-white/30 w-48"
/>
```

### Service Filter with Emoji (SERVICE_META)

```typescript
<select
  value={filterService ?? ''}
  onChange={e => onFilterChange(e.target.value || null)}
  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/70 focus:outline-none"
>
  <option value="">Все службы</option>
  {services.map(s => {
    const meta = SERVICE_META[s.service_id] ?? { emoji: '📋' }
    return (
      <option key={s.service_id} value={s.service_id}>
        {meta.emoji} {s.service_name}
      </option>
    )
  })}
</select>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Library popovers (Headless UI, Radix) | Hand-rolled absolute div | Project has never used component libraries | No new dependency for simple inline popup |
| Server-side search | Client-side filter | Project convention | No extra DB queries; 270 employees fits in memory comfortably |
| Single monolithic component | Per-section separate files | CLAUDE.md architecture rule | Each feature isolated, removable |

**Nothing is deprecated for this phase** — we are building new components using patterns already established in the codebase.

---

## Open Questions

1. **Popup overflow/clipping**
   - What we know: The table wrapper uses `overflow-hidden` from the `glass` utility class
   - What's unclear: Whether the popup will be visually clipped in the rendered output; depends on how deep `overflow-hidden` is scoped in the `glass` CSS class
   - Recommendation: Implement with `position: absolute` first. If clipping occurs during testing, switch to `ReactDOM.createPortal` to body. Plan for this possibility in the task's verification step.

2. **HRToolbar placement relative to hire button**
   - What we know: The hire button is currently an ad-hoc `div` in `page.tsx` above `ServiceSection`. HRToolbar would be placed above `SummaryPanel` or between it and the hire button.
   - What's unclear: Which position reads better visually
   - Recommendation: Place HRToolbar between `SummaryPanel` and the hire button — search/filter is a content navigation tool, not an admin action.

---

## Sources

### Primary (HIGH confidence)

- Direct code reading: `/home/user/Projects/gormost/src/app/hr/page.tsx` — current page structure, state shape, data flow
- Direct code reading: `/home/user/Projects/gormost/src/components/hr/EmployeeCard.tsx` — optimistic update, reason input, status click pattern (lines 34-83, 159-183)
- Direct code reading: `/home/user/Projects/gormost/src/components/dispatcher/Toolbar.tsx` — view toggle pattern to replicate
- Direct code reading: `/home/user/Projects/gormost/src/components/dispatcher/TableView.tsx` — table shell, glass container, badge rendering
- Direct code reading: `/home/user/Projects/gormost/src/types/index.ts` — `EMPLOYEE_STATUS_CONFIG` (lines 290-306), `SERVICE_META` (line 167), `EnrichedEmployee` (line 407)
- Project context: `CLAUDE.md` — architecture rules, component patterns, what not to do
- Phase context: `07-CONTEXT.md` — all implementation decisions locked

### Secondary (MEDIUM confidence)

- `STATE.md` accumulated decisions — confirmed append-only event log, canEdit logic, DAILY/EXTENDED status split

### Tertiary (LOW confidence)

- None — all findings are based on direct code inspection.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all imports are from existing in-repo files
- Architecture: HIGH — pattern is a direct parallel to dispatcher kanban/table toggle, with code read directly from source
- Pitfalls: HIGH — overflow clipping and stale listener are well-known React patterns; TypeScript strict-mode null handling verified by reading the actual types
- Popup implementation: HIGH — pattern copied directly from `EmployeeCard.tsx`; only difference is popup-versus-inline layout

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (stable codebase; no external dependencies introduced)
