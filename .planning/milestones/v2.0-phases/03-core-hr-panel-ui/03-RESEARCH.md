# Phase 03: Core HR Panel UI - Research

**Researched:** 2026-03-04
**Domain:** Next.js App Router UI — employee status management panel with role-filtered views, one-click status change, and inline history accordion
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Employee card layout:**
- Card-based grid layout (not compact list) — reuses the FleetBoard/Transport card+badge pattern
- Grid: 1 col mobile, 2 cols tablet, 3 cols desktop
- Each card shows: employee name, position, current status badge (colored per EMPLOYEE_STATUS_CONFIG)
- Cards grouped under service section headers (service emoji + name from SERVICE_META)

**One-click status change:**
- All 4 active statuses shown as inline buttons on the card: На работе / Отгул / Больничный / Отпуск
- "Уволен" is NOT a clickable button — dismissal is Phase 04 scope
- Currently active status button is highlighted/selected; clicking it is a no-op
- Status changes immediately on click (optimistic update) — no confirmation modal

**Reason field:**
- Reason is optional and only appears after clicking a non-"На работе" status
- Shown as a small inline input below the status buttons — user can type and confirm, or just move on
- If user skips reason, status is saved with `reason: null`

**Status history:**
- Inline accordion within the card — expand arrow (chevron) at the bottom of the card
- Shows a chronological list of past status records: date range, status label (colored), reason if present
- No pagination for now — show all history records for the employee

**Summary panel (top of page):**
- Appears above the employee list
- One tile per service: service emoji + name, count "На работе: X / Всего: Y"
- Statuses counted as "absent": Otgul, Bolnichniy, Otpusk
- Read-only — no actions in the summary

**HEAD role access:**
- HEAD opens `/hr` and sees only their own service employees
- Status change buttons are NOT rendered for HEAD role
- Status history accordion is available (read-only view)
- ZAMPORAB sees all services

### Claude's Discretion
- Exact card spacing and typography
- Loading skeleton design while data fetches
- Error state handling (failed status update)
- Whether to show "last changed" timestamp on the card

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HR-03 | User sees employee list with colored status badge, grouped by service | `EMPLOYEE_STATUS_CONFIG` + `SERVICE_META` already defined; `EnrichedEmployee` shape from Phase 02; `fetchAllCurrentStatuses` returns grouped-ready data |
| HR-04 | ZAMPORAB can change employee status with one button click (Na_rabote / Otgul / Bolnichniy / Otpusk) | `setEmployeeStatus` API function exists; optimistic-update pattern from FleetBoard; role filter via `hasRole()` |
| HR-05 | User sees today's summary — working/absent count per service | Computed client-side from `EnrichedEmployee[]` array; `SERVICE_META` provides tile labels |
| HR-06 | User sees status change history per employee | `fetchEmployeeStatusHistory` API function exists; inline accordion with `useState` open/close state |
| HR-07 | HEAD role can view HR panel for their own service in read-only mode | `hasRole()` for button visibility; `session.service_id` for service filter; `AuthGuard roles=['ZAMPORAB','HEAD','ADMIN','BOSS']` |
</phase_requirements>

---

## Summary

Phase 03 builds the core HR panel UI at `/hr`. The backend API, TypeScript types, and database schema were completed in Phase 02. All six required API functions (`fetchAllCurrentStatuses`, `setEmployeeStatus`, `fetchEmployeeStatusHistory`, and others) are implemented in `src/lib/api.ts`. The `EnrichedEmployee` interface and `EMPLOYEE_STATUS_CONFIG` constant are defined in `src/types/index.ts`. This phase is purely a UI build — no new API functions or schema changes are needed.

The codebase has strong prior art to follow: the FleetBoard card component (`src/components/transport/FleetBoard.tsx`) demonstrates the exact glass-card + badge + grid pattern to reuse. The `PlanStats.tsx` component demonstrates per-service tile summaries. The `transport/page.tsx` demonstrates the thin orchestrator page pattern (~50 lines, state + loadData only). All are directly reference-worthy for implementation.

The only novel element is the inline accordion for status history and the inline reason input that appears conditionally after a non-"На работе" click. Both are straightforward React `useState` interactions with no external libraries needed. The role-based visibility (ZAMPORAB edits all, HEAD reads own service only) is handled via existing `hasRole()` and `session.service_id`.

**Primary recommendation:** Build `src/app/hr/page.tsx` as a thin orchestrator, split UI into `src/components/hr/{SummaryPanel,ServiceSection,EmployeeCard,StatusHistory}.tsx`, and wire directly to existing API functions. Zero new dependencies required.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.1.1 | Page routing, RSC-capable shell | Project standard; `src/app/hr/page.tsx` follows app dir convention |
| React | 19.0.0 | UI state, hooks | Project standard |
| TypeScript (strict) | 5.9.3 | Types | Project CLAUDE.md requires strict mode, no `any` |
| Tailwind CSS | 3.4.x | Styling | Project standard; glass utility classes in globals.css |
| @supabase/supabase-js | 2.47.x | DB queries via existing `src/lib/api.ts` functions | All HR API functions already written here |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 3.0.0 | Date formatting for status history rows | Already installed; use `format(parseISO(date), 'dd.MM.yyyy', { locale: ru })` for Cyrillic dates |
| clsx | 2.1.0 | Conditional className composition | Already installed; use for status button active state |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline accordion (useState) | Radix Collapsible or Headless UI | Libraries add bundle weight with no gain — simple open/close with chevron rotation is sufficient |
| Optimistic update (client state) | Server refetch after every status click | Refetch adds noticeable latency per click; optimistic update is immediate and rolls back on error |
| clsx for className | Template literals | clsx is already installed, cleaner for 3+ conditional classes |

**Installation:** No new packages required. All dependencies already present.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/hr/
│   └── page.tsx              # Thin orchestrator: AuthGuard + state + loadData (~50 lines)
└── components/hr/
    ├── SummaryPanel.tsx      # Per-service tiles: Na_rabote / Total counts
    ├── ServiceSection.tsx    # Section header + employee card grid for one service
    ├── EmployeeCard.tsx      # Single card: name, position, badge, status buttons, reason input
    └── StatusHistory.tsx     # Accordion: list of past EmployeeStatus rows
```

### Pattern 1: Thin Orchestrator Page
**What:** `page.tsx` holds only session state, data arrays, and `loadData`. All rendering is delegated to components.
**When to use:** Every page in this project (CLAUDE.md rule).
**Example:**
```typescript
// src/app/hr/page.tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import SummaryPanel from '@/components/hr/SummaryPanel'
import ServiceSection from '@/components/hr/ServiceSection'
import { fetchAllCurrentStatuses } from '@/lib/api'
import type { AuthSession, EnrichedEmployee } from '@/types'
import { SERVICE_META } from '@/types'

export default function HRPage() {
  return (
    <AuthGuard roles={['ZAMPORAB', 'HEAD', 'ADMIN', 'BOSS']}>
      {(session) => <Content session={session} />}
    </AuthGuard>
  )
}

function Content({ session }: { session: AuthSession }) {
  const [employees, setEmployees] = useState<EnrichedEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadData = useCallback(async () => {
    const data = await fetchAllCurrentStatuses()
    setEmployees(data)
    setLastUpdated(new Date())
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const isHead = session.role_level === 'HEAD'
  const canEdit = !isHead  // ZAMPORAB, ADMIN, BOSS can edit

  // HEAD sees only their service; others see all
  const visibleEmployees = isHead
    ? employees.filter(e => e.user.service_id === session.service_id)
    : employees

  // Group by service_id
  const grouped = Object.keys(SERVICE_META).map(serviceId => ({
    serviceId,
    employees: visibleEmployees.filter(e => e.user.service_id === serviceId),
  })).filter(g => g.employees.length > 0)

  return (
    <div className="min-h-screen p-4 max-w-6xl mx-auto">
      <Header session={session} title="Кадры" emoji="👥" mode="LIVE" lastUpdated={lastUpdated} />
      <SummaryPanel employees={visibleEmployees} />
      {grouped.map(g => (
        <ServiceSection
          key={g.serviceId}
          serviceId={g.serviceId}
          employees={g.employees}
          canEdit={canEdit}
          currentUserId={session.user_id}
          onRefresh={loadData}
        />
      ))}
    </div>
  )
}
```

### Pattern 2: Status Badge and Button (EMPLOYEE_STATUS_CONFIG)
**What:** Use `EMPLOYEE_STATUS_CONFIG` directly for color and label — never hardcode color strings.
**When to use:** Every place that renders an employee status.
**Example:**
```typescript
// Source: src/types/index.ts — EMPLOYEE_STATUS_CONFIG already defined
import { EMPLOYEE_STATUS_CONFIG, type EmployeeStatusType } from '@/types'

// Badge
const cfg = EMPLOYEE_STATUS_CONFIG[currentStatus]
<span className={`text-xs px-2 py-1 rounded-lg border shrink-0 ${cfg.bg}`} style={{ color: cfg.color }}>
  {cfg.label}
</span>

// Active status button (highlighted)
const CLICKABLE_STATUSES: EmployeeStatusType[] = ['Na_rabote', 'Otgul', 'Bolnichniy', 'Otpusk']

{CLICKABLE_STATUSES.map(status => {
  const scfg = EMPLOYEE_STATUS_CONFIG[status]
  const isActive = currentStatus === status
  return (
    <button
      key={status}
      onClick={() => !isActive && onStatusClick(status)}
      className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
        isActive
          ? `${scfg.bg} font-medium`
          : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
      }`}
      style={isActive ? { color: scfg.color } : undefined}
    >
      {scfg.label}
    </button>
  )
})}
```

### Pattern 3: Optimistic Update with Rollback
**What:** Update local React state immediately on click, then call API. Roll back if API fails.
**When to use:** All status change interactions — makes UI feel instant.
**Example:**
```typescript
// Inside EmployeeCard.tsx
const [localStatus, setLocalStatus] = useState<EmployeeStatusType>(employee.currentStatus)
const [saving, setSaving] = useState(false)
const [error, setError] = useState<string | null>(null)

const handleStatusClick = async (newStatus: EmployeeStatusType) => {
  if (newStatus === localStatus) return  // no-op
  const prevStatus = localStatus
  setLocalStatus(newStatus)  // optimistic
  setError(null)
  setSaving(true)

  const today = new Date().toISOString().split('T')[0]
  const result = await setEmployeeStatus(
    employee.user.user_id, newStatus, today, today, pendingReason || null, currentUserId
  )

  setSaving(false)
  if (!result) {
    setLocalStatus(prevStatus)  // rollback
    setError('Не удалось сохранить статус')
  } else {
    setPendingReason('')
    onRefresh()
  }
}
```

### Pattern 4: Inline Accordion for History
**What:** Single `useState<boolean>` controls open/close. History data fetched lazily on first open.
**When to use:** The StatusHistory accordion within each EmployeeCard.
**Example:**
```typescript
// StatusHistory.tsx
'use client'
import { useState, useEffect } from 'react'
import { fetchEmployeeStatusHistory } from '@/lib/api'
import { EMPLOYEE_STATUS_CONFIG } from '@/types'
import type { EmployeeStatus } from '@/types'

interface Props {
  userId: string
}

export default function StatusHistory({ userId }: Props) {
  const [open, setOpen] = useState(false)
  const [history, setHistory] = useState<EmployeeStatus[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (open && !loaded) {
      fetchEmployeeStatusHistory(userId).then(data => {
        setHistory(data)
        setLoaded(true)
      })
    }
  }, [open, loaded, userId])

  return (
    <div className="mt-3 border-t border-white/10 pt-2">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 w-full"
      >
        <span className={`transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
        История статусов
      </button>
      {open && (
        <div className="mt-2 space-y-1">
          {!loaded && <div className="text-xs text-white/30 animate-pulse">Загрузка...</div>}
          {loaded && history.length === 0 && (
            <div className="text-xs text-white/30">Нет записей</div>
          )}
          {loaded && history.map(h => {
            const cfg = EMPLOYEE_STATUS_CONFIG[h.status]
            return (
              <div key={h.id} className="text-xs flex items-start gap-2 py-1">
                <span className={`px-1.5 py-0.5 rounded border shrink-0 ${cfg.bg}`} style={{ color: cfg.color }}>
                  {cfg.label}
                </span>
                <span className="text-white/40">
                  {h.date_from}{h.date_to && h.date_to !== h.date_from ? ` — ${h.date_to}` : ''}
                  {h.reason && <span className="ml-1 text-white/30">· {h.reason}</span>}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

### Pattern 5: Service Section Header
**What:** Service group header with emoji + name from SERVICE_META, followed by employee card grid.
**When to use:** ServiceSection.tsx wrapper.
**Example:**
```typescript
// ServiceSection.tsx — uses SERVICE_META for header, grid for cards
import { SERVICE_META } from '@/types'

const meta = SERVICE_META[serviceId] ?? { emoji: '📋', color: '#ffffff', bg: 'bg-white/10' }

<div className="mb-6">
  <div className="flex items-center gap-2 mb-3">
    <span className="text-xl">{meta.emoji}</span>
    <h2 className="text-sm font-bold text-white/70 uppercase tracking-wider">
      {/* service name from employees[0].user.service_id lookup or passed prop */}
      {serviceName}
    </h2>
    <span className="text-xs text-white/30 ml-1">({employees.length} чел.)</span>
  </div>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    {employees.map(emp => (
      <EmployeeCard key={emp.user.user_id} employee={emp} ... />
    ))}
  </div>
</div>
```

### Pattern 6: SummaryPanel Tiles
**What:** One tile per service showing working/total counts. Computed client-side from `EnrichedEmployee[]`.
**When to use:** Top of the HR page above the employee list.
**Example:**
```typescript
// SummaryPanel.tsx
const ABSENT_STATUSES: EmployeeStatusType[] = ['Otgul', 'Bolnichniy', 'Otpusk']

{Object.entries(SERVICE_META).map(([serviceId, meta]) => {
  const svcEmps = employees.filter(e => e.user.service_id === serviceId)
  if (svcEmps.length === 0) return null
  const working = svcEmps.filter(e => !ABSENT_STATUSES.includes(e.currentStatus) && e.currentStatus !== 'Uvolen').length
  return (
    <div key={serviceId} className="glass rounded-xl p-3 text-center">
      <div className="text-xl mb-1">{meta.emoji}</div>
      <div className="text-lg font-bold font-mono text-green-400">{working}</div>
      <div className="text-[10px] text-white/40">На работе</div>
      <div className="text-[10px] text-white/30">из {svcEmps.length}</div>
    </div>
  )
})}
```

### Pattern 7: Reason Input (conditional inline)
**What:** Small text input that appears below status buttons only when a non-"На работе" status is clicked. User can type reason or skip.
**When to use:** Inside EmployeeCard after a non-Na_rabote status is selected but before API call fires.
**Decision:** Reason is saved when user presses Enter or clicks a "Save" mini-button, OR automatically saved on a subsequent status click (whichever comes first). The simplest UX: show input, then call API only on an explicit confirm step (Enter key or small checkmark button) while keeping the status already optimistically updated.
**Simpler alternative:** Show the reason input after status click. A "Сохранить" button triggers the API call. If user ignores and clicks another status, save with null reason. This matches the CONTEXT.md decision: "If user skips reason, status is saved with reason: null."

### Anti-Patterns to Avoid
- **Fetching history on initial page load for all employees:** Fetch history lazily (only when accordion opens). Loading 50+ history sets upfront is wasteful.
- **Storing `employees` as a dict keyed by userId in page state:** Keep as `EnrichedEmployee[]` — filtering and grouping is done inline during render. Avoids denormalization bugs.
- **Calling `fetchAllCurrentStatuses` on every status card click:** Call only in `onRefresh` (after save). Use optimistic local state within the card.
- **Hardcoding Russian status labels or colors:** Always use `EMPLOYEE_STATUS_CONFIG[status].label` and `.color`.
- **Adding HR panel to PANELS array without adding role check:** PANELS array in `src/types/index.ts` must include the `hr` entry; AuthGuard on the page must list `['ZAMPORAB', 'HEAD', 'ADMIN', 'BOSS']`.
- **Using `session.role_level === 'ZAMPORAB'` for edit permission check:** ADMIN and BOSS also need edit access. Use `canEdit = !isHead` where `isHead = session.role_level === 'HEAD'`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Status color/label mapping | Custom color map in component | `EMPLOYEE_STATUS_CONFIG` from `src/types/index.ts` | Already defined with all 5 statuses; changes propagate everywhere |
| Service emoji/name lookup | Inline object in component | `SERVICE_META` from `src/types/index.ts` | Already defined; consistent with other panels |
| Role permission check | Custom role string comparison | `hasRole(session, roles)` from `src/lib/auth.ts` | Handles null session, array comparison correctly |
| Session reading | `localStorage.getItem` directly | `getSession()` from `src/lib/auth.ts` | Handles SSR safety (typeof window check) |
| Employee status API | Custom Supabase queries | `fetchAllCurrentStatuses`, `setEmployeeStatus`, `fetchEmployeeStatusHistory` from `src/lib/api.ts` | All 3 HR functions implemented in Phase 02; correct date filtering, presence-by-default logic included |
| Date formatting | `new Date().toLocaleString()` | `date-fns` `format(parseISO(date), 'dd.MM.yyyy')` | Already installed; handles ISO strings correctly without timezone issues |

**Key insight:** Phase 02 front-loaded the entire data layer. Phase 03 is pure presentation — don't replicate what's already built.

---

## Common Pitfalls

### Pitfall 1: Service name not available from SERVICE_META
**What goes wrong:** `SERVICE_META` has emoji/color but not a human-readable Russian name. Rendering `SERVICE_META[serviceId].name` throws undefined.
**Why it happens:** SERVICE_META was built for color/emoji only. The `Service` database table has `service_name`.
**How to avoid:** Either (a) fetch `fetchServices()` in `loadData` and pass service name to `ServiceSection`, or (b) hardcode a `SERVICE_NAMES` constant alongside `SERVICE_META`. Option (a) is safer as it stays in sync with DB. Looking at the data: `services` table has `service_name` for `SRV-ENG`, `SRV-STR`, etc. Pass `services: Service[]` from page state.
**Warning signs:** TypeScript error "Property 'name' does not exist on type '{ emoji: string; color: string; bg: string }'"

### Pitfall 2: PANELS array missing HR entry — nav header won't show HR link
**What goes wrong:** ZAMPORAB navigates to `/hr` directly but it's invisible in the hamburger menu. HEAD can't find the panel.
**Why it happens:** `Header.tsx` filters `PANELS` by role — if HR isn't in PANELS, it's never shown.
**How to avoid:** Add HR entry to `PANELS` in `src/types/index.ts` before or alongside creating the page. Roles: `['ZAMPORAB', 'HEAD', 'ADMIN', 'BOSS']`.
**Warning signs:** Page loads correctly at `/hr` but doesn't appear in navigation menu.

### Pitfall 3: Mobile nav overflow with 9th+ panel
**What goes wrong:** STATE.md flagged this concern — hamburger at 375px may overflow with 9 panels.
**Why it happens:** `Header.tsx` renders all visible panels in a dropdown; 9 items may exceed mobile viewport height.
**How to avoid:** HR is the 10th panel entry. Test hamburger at 375px after adding HR. Header menu uses `overflow-y-auto` — add it if not present, or rely on scroll. The menu div is `w-56` fixed width, no max-height set currently.
**Warning signs:** Hamburger menu items cut off at bottom of screen on mobile.

### Pitfall 4: Optimistic update leaves stale data if user switches cards rapidly
**What goes wrong:** User clicks status on card A, then immediately on card B. Both fire API calls. Card A rollback (if error) doesn't know about card B's state.
**Why it happens:** Each `EmployeeCard` manages its own `localStatus` independently.
**How to avoid:** Each card is isolated — this is actually correct. The issue only arises if two status changes for the same employee fire simultaneously, which is impossible (only one card per employee).
**Warning signs:** Not a real issue given one-card-per-employee design, but log API errors to console for debugging.

### Pitfall 5: History accordion fetches on every open/close toggle
**What goes wrong:** User opens accordion, closes it, reopens — triggers a redundant API call.
**Why it happens:** `useEffect` watching `open` re-fires on every re-open if `loaded` is not tracked.
**How to avoid:** Track `loaded` boolean separately from `open`. Fetch only when `open && !loaded`. See Pattern 4 example above.
**Warning signs:** Network tab shows repeated `/rest/v1/employee_status` requests as user toggles accordion.

### Pitfall 6: `setEmployeeStatus` date_to — single-day vs open-ended
**What goes wrong:** Passing `date_to: null` for every status creates open-ended records. The `fetchAllCurrentStatuses` query uses `date_to.is.null OR date_to >= today` — so multiple open-ended records can match, and only `date_from DESC` ordering ensures the latest wins.
**Why it happens:** The API supports both single-day and open-ended records.
**How to avoid:** For daily HR panel status changes (the common case), pass `dateTo = dateFrom` (same day) to keep records single-day. Open-ended records are only appropriate for formal leave that spans multiple days. For this panel's one-click UX, always use `dateTo = today`.
**Warning signs:** Employee shows wrong status the next day because an old open-ended record is still "active".

---

## Code Examples

Verified patterns from project source code:

### Glass Card Pattern (from FleetBoard.tsx)
```typescript
// Source: src/components/transport/FleetBoard.tsx lines 52-56
<div
  key={v.id}
  className={`glass rounded-xl p-4 border ${
    isStale ? 'border-red-500/40' : v.status === 'BROKEN' ? 'border-red-500/20' : 'border-transparent'
  }`}
>
```
For EmployeeCard, use: `className="glass rounded-xl p-4 border border-transparent"`

### Status Badge Pattern (from FleetBoard.tsx)
```typescript
// Source: src/components/transport/FleetBoard.tsx lines 66-71
<span
  className={`text-xs px-2 py-1 rounded-lg border shrink-0 ${cfg.bg}`}
  style={{ color: cfg.color }}
>
  {cfg.label}
</span>
```
Apply identically with `EMPLOYEE_STATUS_CONFIG[currentStatus]`.

### AuthGuard + thin page (from transport/page.tsx lines 14-20)
```typescript
// Source: src/app/transport/page.tsx
export default function HRPage() {
  return (
    <AuthGuard roles={['ZAMPORAB', 'HEAD', 'ADMIN', 'BOSS']}>
      {(session) => <Content session={session} />}
    </AuthGuard>
  )
}
```

### canEdit role check (from transport/page.tsx line 48)
```typescript
// Source: src/app/transport/page.tsx line 48
const canEdit = ['TRANSPORT', 'ADMIN'].includes(session.role_level)
// For HR:
const isHead = session.role_level === 'HEAD'
const canEdit = !isHead  // ZAMPORAB, ADMIN, BOSS can all edit
```

### useCallback + loadData pattern (from transport/page.tsx lines 30-46)
```typescript
// Source: src/app/transport/page.tsx
const loadData = useCallback(async () => {
  const [veh, ...] = await Promise.all([...])
  setVehicles(veh)
  setLastUpdated(new Date())
}, [today])

useEffect(() => { loadData() }, [loadData])
```

### Per-service tile with SERVICE_META (from zamporab/PlanStats.tsx lines 47-63)
```typescript
// Source: src/components/zamporab/PlanStats.tsx
{services.map(svc => {
  const meta = SERVICE_META[svc.service_id]
  return (
    <div key={svc.service_id} className="glass rounded-xl p-3 text-center">
      <div className="text-2xl mb-1">{meta?.emoji || '📋'}</div>
      <div className="text-xs text-white/60 mb-2 truncate">{svc.service_name}</div>
      ...
    </div>
  )
})}
```

### PANELS entry pattern (from src/types/index.ts)
```typescript
// New HR entry to add to PANELS array in src/types/index.ts
{
  id: 'hr', path: '/hr', title: 'Кадры',
  subtitle: 'Статус сотрудников · Присутствие · История', emoji: '👥',
  roles: ['ZAMPORAB', 'HEAD', 'ADMIN', 'BOSS'],
  color: 'from-teal-600/40 to-teal-800/40 border-teal-500/30',
  roleLabel: 'Кадровый учёт',
},
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages with large monolithic components | Thin orchestrator + separated component files | Project standard (CLAUDE.md) | Adding a feature = adding one component + one import |
| Fetch all data (including history) upfront | Lazy-fetch history per accordion open | Phase 03 design | Reduces initial load for large employee lists |
| Confirmation modal for status changes | Optimistic one-click with inline rollback error | Phase 03 design (CONTEXT.md) | Faster UX; no blocking modals |
| Separate employee status page per role | Single `/hr` with role-conditional rendering | Phase 03 design | Simpler routing; HEAD and ZAMPORAB share one URL |

**Deprecated/outdated:**
- Modal-based status change: explicitly out of scope per CONTEXT.md decisions — one-click only.
- Pagination for status history: deferred — show all records for now (Phase 06+ scope if needed).

---

## Open Questions

1. **Service name display in ServiceSection header**
   - What we know: `SERVICE_META` has emoji + color only. `services` DB table has `service_name`.
   - What's unclear: Should page.tsx fetch `fetchServices()` alongside `fetchAllCurrentStatuses()`, or should a `SERVICE_NAMES` constant be added to `src/types/index.ts`?
   - Recommendation: Fetch `fetchServices()` in `loadData` and pass `services` list to `ServiceSection`. This avoids a hardcoded constant that drifts from the DB. Add `services: Service[]` to page state.

2. **Reason input confirmation UX — when exactly to fire the API**
   - What we know: Reason is optional, appears after non-Na_rabote click, status saves with null reason if skipped.
   - What's unclear: Should the API fire immediately on status button click (with null reason), then allow reason editing as a separate update? Or should the API fire after a "confirm" step?
   - Recommendation: Fire API on status click immediately with `reason: null`. Then show reason input as "add reason (optional)" — if user types and confirms, fire a second `setEmployeeStatus` INSERT with the same status and the reason text. This matches the append-only log design and avoids blocking the status change behind a reason step. The CONTEXT.md says "user can type and confirm, or just move on" — immediate save with null, optional follow-up.

3. **Handling employees with no `service_id` (service_id = null)**
   - What we know: `users.service_id` can be null (e.g., ADMIN users).
   - What's unclear: Should admin users without a service appear on the HR panel?
   - Recommendation: Filter out employees with `service_id === null` from the HR display. They have no service group to appear under. `fetchAllCurrentStatuses` returns all active users — page.tsx should filter `visibleEmployees` to only those with a non-null `service_id`.

---

## Sources

### Primary (HIGH confidence)
- `src/types/index.ts` — `EMPLOYEE_STATUS_CONFIG`, `SERVICE_META`, `EnrichedEmployee`, `EmployeeStatus`, `PANELS` — read directly from project source
- `src/lib/api.ts` — `fetchAllCurrentStatuses`, `setEmployeeStatus`, `fetchEmployeeStatusHistory` implementations — read directly from project source
- `src/components/transport/FleetBoard.tsx` — glass card + status badge + grid pattern reference — read directly
- `src/app/transport/page.tsx` — thin orchestrator pattern + canEdit pattern + loadData/useCallback pattern — read directly
- `src/components/zamporab/PlanStats.tsx` — per-service tile pattern — read directly
- `src/components/AuthGuard.tsx` — role guard implementation — read directly
- `src/lib/auth.ts` — `hasRole()`, `getSession()` implementations — read directly
- `src/components/Header.tsx` — PANELS usage, nav pattern — read directly
- `src/app/globals.css` — `.glass` and `.glass-strong` utility class definitions — read directly
- `package.json` — confirmed: Next.js 16.1.1, React 19, date-fns 3.0.0, clsx 2.1.0 — no new installs needed

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — accumulated decisions from Phases 01-02, mobile nav concern flag — read directly
- `.planning/REQUIREMENTS.md` — HR-03 through HR-07 requirement text — read directly
- `.planning/phases/03-core-hr-panel-ui/03-CONTEXT.md` — locked UI decisions from /gsd:discuss-phase — read directly

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified from package.json, no new deps needed
- Architecture: HIGH — directly modeled on existing patterns from 4+ existing panel components
- API integration: HIGH — all 3 HR API functions verified in src/lib/api.ts with correct signatures
- Pitfalls: HIGH — all flagged from direct code inspection (SERVICE_META gaps, PANELS omission, date_to design)
- Open questions: MEDIUM — UX decisions that weren't fully specified in CONTEXT.md, solvable during planning

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable stack; no external dependencies to track)
