# Phase 1: UI/UX Improvements - Research

**Researched:** 2026-03-01
**Domain:** Next.js 16 / React 19 / Tailwind CSS — UI polish, component patterns, mobile responsiveness
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Settings placement (REQ-130)**
- "Settings" = Admin panel (⚙️ Админ-панель, path `/admin`)
- Remove Admin panel card from the home page grid (`src/app/page.tsx`) — ADMIN role sees their panels via hamburger menu
- In `Header.tsx` hamburger menu: add a divider + "Система" section header below the regular panel list, with the Admin panel link inside — visible only to ADMIN role
- No separate settings page needed

**Navigation filtering (REQ-131)**
- Already implemented: `visiblePanels = PANELS.filter(p => hasRole(session, p.roles))` exists in both `Header.tsx` and `src/app/page.tsx`
- Action: verify it works correctly, close the requirement — no code changes needed

**Auto-refresh indicator (REQ-020)**
- Location: in `Header.tsx`, next to the existing LIVE badge — format: `LIVE · 12с`
- Quiet update: no spinner or loading state during refresh — counter resets silently
- Scope: all panels that use `mode="LIVE"` prop on Header (Dispatcher, Boss, Zamporab, Head, Transport, Complaints, Foreman)
- Implementation: Header receives a `lastUpdated` timestamp prop; Header internally shows elapsed seconds, counting up from 0 on each new timestamp

**Empty states (REQ-132)**
- Design: emoji icon + short text, centered, no action buttons
- One shared `EmptyState` component in `src/components/EmptyState.tsx` — accepts optional `message` prop, defaults to "Заявок нет"
- Replace all existing bare empty state strings: `KanbanBoard.tsx`, `TableView.tsx`, `head/page.tsx`, `boss/page.tsx`, `zamporab/page.tsx`
- Icon: 📭 (neutral, context-independent)

**Mobile layout (REQ-133)**
- Scope: all 8 panels + home page + Header
- Approach: best practices — readable layout, touch-friendly tap targets (min 44px height for buttons)
- Header on mobile (`< sm`, i.e. `< 640px`): hide clock block and shift badges, keep panel title + LIVE badge + burger menu + logout button
- Kanban cards: on mobile (`< sm`) cards occupy 100% screen width — change `minmax(240px, 1fr)` to `minmax(min(240px, 100%), 1fr)` or use responsive override
- Tables: horizontal scroll (`overflow-x-auto`) already in place — verify works on mobile
- KPI grids: collapse from `grid-cols-4` to `grid-cols-2` on mobile with `grid-cols-2 sm:grid-cols-4`
- Home page panel grid: already has `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` — no change needed

### Claude's Discretion
- Exact elapsed time format ("12с" vs "12 сек" vs "0:12")
- Specific emoji icon for EmptyState (📭 suggested, can adjust)
- Button heights and spacing adjustments per panel for touch targets
- Whether to show "Система" section in hamburger even if user has no panels there (hide entirely if not ADMIN)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REQ-020 | Dispatcher panel — kanban + table, KPI, people stats, auto-refresh 30s | Auto-refresh indicator pattern: `lastUpdated` prop on Header + elapsed seconds counter |
| REQ-130 | Move Settings/Admin panel out of main navigation | Filter `admin` from home page grid; add "Система" section to hamburger — ADMIN-only |
| REQ-131 | Navigation shows only panels accessible to current role | Already implemented in `Header.tsx` and `src/app/page.tsx` — verify and close |
| REQ-132 | Empty states with clear descriptive text | Shared `EmptyState.tsx` component replacing 5 bare text strings |
| REQ-133 | Basic mobile adaptation for all 8 panels | Tailwind responsive prefixes (`sm:`), `hidden sm:block` for clock, grid collapse patterns |
</phase_requirements>

---

## Summary

This phase is pure UI polish on an existing working v1.0 application. No new data models, no new API calls, no new dependencies required. All 5 requirements are achievable using only what is already installed: Next.js 16, React 19, Tailwind CSS 3.4, and the established project conventions.

The codebase is clean and component-oriented. `Header.tsx` is the single shared component for all panels — changes there affect all 7 LIVE-mode panels simultaneously. The `PANELS` array in `src/types/index.ts` is the single source of truth for navigation. The project deliberately avoids test infrastructure (`npm run build` is the quality gate).

REQ-131 is a verification-and-close task: both `Header.tsx` and `src/app/page.tsx` already run `PANELS.filter(p => hasRole(session, p.roles))`. No code change is needed — the planner should produce a verification task, not an implementation task.

**Primary recommendation:** Implement in dependency order — EmptyState first (standalone, no dependencies), then auto-refresh indicator (Header prop extension), then Admin panel relocation (Header + home page), then mobile CSS fixes per panel. Each task is independently deployable.

---

## Standard Stack

### Core (already installed — zero new dependencies needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.1 | App Router framework | Project standard; all pages use App Router |
| React | ^19.0.0 | UI rendering | Project standard; all components are `'use client'` |
| TypeScript | ^5.9.3 strict | Type safety | Project enforces strict mode |
| Tailwind CSS | ^3.4.0 | Utility-first styling | Project standard; no custom CSS except `.glass`/`.glass-strong` |

### No New Dependencies

This phase requires zero new npm packages. All required capabilities exist in the current stack:

- Elapsed-time counter: `useState` + `useEffect` with `setInterval` (React built-in) — same pattern already used in `Header.tsx` for the clock
- Responsive layout: Tailwind `sm:` prefix (already used throughout the project)
- EmptyState component: pure JSX with Tailwind classes
- Admin filter from home grid: array `.filter()` on `PANELS`

**Installation:**
```bash
# No new packages required
```

---

## Architecture Patterns

### Recommended Component Structure for This Phase

```
src/
├── components/
│   └── EmptyState.tsx           # NEW: shared empty state component
├── components/Header.tsx         # MODIFIED: add lastUpdated prop + elapsed counter + Admin section
├── app/page.tsx                  # MODIFIED: filter admin from visiblePanels grid
├── app/dispatcher/page.tsx       # MODIFIED: pass lastUpdated to Header
├── app/boss/page.tsx             # MODIFIED: pass lastUpdated to Header
├── app/zamporab/page.tsx         # MODIFIED: pass lastUpdated to Header
├── app/head/page.tsx             # MODIFIED: pass lastUpdated to Header
├── app/transport/page.tsx        # MODIFIED: pass lastUpdated to Header
├── app/complaints/page.tsx       # MODIFIED: pass lastUpdated to Header
├── app/foreman/page.tsx          # MODIFIED: pass lastUpdated to Header
├── components/KanbanBoard.tsx    # MODIFIED: use EmptyState, mobile grid fix
└── components/dispatcher/
    └── TableView.tsx             # MODIFIED: use EmptyState
```

### Pattern 1: Elapsed Time Counter in Header

**What:** Header receives a `lastUpdated: Date | null` prop. Internally it maintains a `secondsAgo` state updated every second via `setInterval`. When `lastUpdated` changes (new timestamp from parent's `loadData`), the counter resets to 0.

**When to use:** Any LIVE-mode panel that auto-refreshes on a timer.

**Example:**
```typescript
// Header.tsx — extend existing Props interface
interface Props {
  session: AuthSession
  title: string
  emoji: string
  mode?: 'LIVE' | 'PLANNING' | 'REVIEW'
  showTimer?: string | null
  lastUpdated?: Date | null  // NEW prop
}

// Inside Header component — add alongside existing clock useEffect
const [secondsAgo, setSecondsAgo] = useState(0)

useEffect(() => {
  setSecondsAgo(0)
}, [lastUpdated])

useEffect(() => {
  if (mode !== 'LIVE') return
  const t = setInterval(() => setSecondsAgo(s => s + 1), 1000)
  return () => clearInterval(t)
}, [mode])

// In JSX — replace existing LIVE badge with extended version
{mode === 'LIVE' && (
  <span className="flex items-center gap-1 bg-red-500/20 border border-red-500/30 text-red-400 px-2 py-0.5 rounded-full text-xs font-bold">
    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
    LIVE {lastUpdated != null && `· ${secondsAgo}с`}
  </span>
)}
```

**In each LIVE panel's `page.tsx`:**
```typescript
const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

const loadData = useCallback(async () => {
  // ... existing fetch logic ...
  setLastUpdated(new Date())  // reset counter after each load
}, [/* existing deps */])

// In JSX:
<Header session={session} title="..." emoji="..." mode="LIVE" lastUpdated={lastUpdated} />
```

### Pattern 2: Shared EmptyState Component

**What:** Single file replaces all bare empty-state strings across the codebase.

**When to use:** Any place that currently renders a bare string like `Нет заявок` or `Нет заявок по вашей службе`.

**Example:**
```typescript
// src/components/EmptyState.tsx
interface Props {
  message?: string
}

export default function EmptyState({ message = 'Заявок нет' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-white/40">
      <span className="text-4xl mb-3">📭</span>
      <span className="text-sm">{message}</span>
    </div>
  )
}
```

**Usage in KanbanBoard.tsx (replaces line 70):**
```typescript
import EmptyState from './EmptyState'
// ...
{cards.length === 0 && <EmptyState message="Нет заявок" />}
```

**Usage in TableView.tsx (replaces line 47-49):**
```typescript
{requests.length === 0 && (
  <tr><td colSpan={6}><EmptyState message="Нет заявок" /></td></tr>
)}
```

### Pattern 3: Admin Panel Separation in Navigation

**What:** Remove the `admin` entry from the home page grid while keeping it in the hamburger menu under a "Система" divider section.

**When to use:** Role-specific navigation where admin-only items should not appear in the main grid.

**Example:**
```typescript
// src/app/page.tsx — filter admin out of grid
const visiblePanels = PANELS.filter(p => hasRole(session, p.roles) && p.id !== 'admin')

// src/components/Header.tsx — split panels into regular + system
const regularPanels = visiblePanels.filter(p => p.id !== 'admin')
const systemPanels = visiblePanels.filter(p => p.id === 'admin')

// In hamburger JSX — render system section only if it has items
{regularPanels.map(p => /* existing panel button */)}
{systemPanels.length > 0 && (
  <>
    <div className="border-t border-white/10 mt-2 pt-2">
      <div className="text-[10px] text-white/30 px-2 py-1 uppercase tracking-widest mb-1">Система</div>
      {systemPanels.map(p => /* same button pattern as regularPanels */)}
    </div>
  </>
)}
// existing "Главная" link stays at bottom, after system section
```

### Pattern 4: Mobile Header — Hide Clock Block

**What:** The clock + shift badges block is informational and takes significant horizontal space. On small screens it causes layout break. Use Tailwind `hidden sm:block` to hide it below 640px.

**When to use:** Any element in Header that is secondary information on mobile.

**Example:**
```typescript
// Header.tsx — wrap the clock/shift block
<div className="hidden sm:block text-right">   {/* was: <div className="text-right"> */}
  <div className="text-xs text-white/40">Сейчас</div>
  <div className="text-lg font-mono font-bold text-white">
    {formatDate(now)}, {formatTime(now)}
  </div>
  <div className="flex items-center gap-2 justify-end mt-1">
    {/* shift badges */}
  </div>
</div>
```

### Pattern 5: Mobile KPI Grid Collapse

**What:** KPI grids currently use `grid-cols-4` which is unreadable on mobile. Collapse to `grid-cols-2` using responsive prefix.

**Example:**
```typescript
// From:  className="grid grid-cols-4 gap-4 mb-4"
// To:    className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4"
```

### Pattern 6: Mobile-First Kanban Grid

**What:** `KanbanBoard.tsx` uses an inline style for grid columns: `gridTemplateColumns: \`repeat(${cols.length}, minmax(240px, 1fr))\``. On mobile, `240px` minimum causes horizontal overflow. Wrapping the kanban in `overflow-x-auto` (already done in dispatcher) allows horizontal scroll — this is acceptable. For any panel that does NOT have `overflow-x-auto` wrapper, add it.

**Note:** The CONTEXT.md also mentions `minmax(min(240px, 100%), 1fr)` as an alternative for true responsive stacking. Use `overflow-x-auto` wrapper approach — it preserves the visual column structure without changing the KanbanBoard component's internal logic.

### Anti-Patterns to Avoid

- **Touching `page.tsx` for visual changes:** Mobile adaptations in individual panels should happen in the sub-components (`KPICards.tsx`, etc.), not in the thin page orchestrator.
- **Adding a spinner on LIVE refresh:** Context decision specifies "quiet update" — counter resets silently. Do not add a loading overlay or spinner during the 30s auto-refresh.
- **Creating per-panel EmptyState variants:** One `EmptyState.tsx` with an optional `message` prop covers all use cases. Do not create `EmptyStateRequests.tsx`, `EmptyStateStaff.tsx`, etc.
- **Hardcoding `admin` role check in home page:** Use `p.id !== 'admin'` to filter by panel ID, not by role. This is more robust if roles on the admin panel entry ever change.
- **Modifying PANELS array to remove admin:** Do not remove admin from `PANELS` — it still needs to appear in the hamburger menu. Filter only at the grid render site.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Elapsed seconds display | Custom time-diff calculation with `Date.now()` comparisons | Simple `setInterval` counter with `useState(0)` reset on prop change | No edge cases, already established pattern in Header clock |
| Mobile touch targets | Custom CSS `min-height` rules | Tailwind `min-h-[44px]` or `py-3` on buttons | Consistent with project Tailwind-only convention |
| Responsive breakpoints | Custom media queries in `globals.css` | Tailwind `sm:` prefix (640px) | Project already uses `sm:` consistently |
| Empty state variations | Switch/case logic in EmptyState | `message` prop with default | Simple and sufficient for the use cases |

**Key insight:** This phase is all existing-pattern work. No new patterns need to be invented. Every solution mirrors something already in the codebase.

---

## Common Pitfalls

### Pitfall 1: `lastUpdated` Dependency in `useCallback`

**What goes wrong:** Adding `setLastUpdated(new Date())` inside `loadData` but not wrapping it correctly — if `lastUpdated` is accidentally included in the `useCallback` dependency array, infinite re-render loop occurs.

**Why it happens:** `loadData` calls `setLastUpdated`, creating a new `Date` object. If `lastUpdated` state is in `useCallback`'s dep array, every state update triggers a new `loadData`, which triggers another state update.

**How to avoid:** `setLastUpdated` (the setter) is stable and does NOT need to be in the dependency array. Only include `filterService` or other filter state in deps, not `lastUpdated` itself.

**Warning signs:** Page freezes or network tab shows continuous API calls.

### Pitfall 2: KanbanBoard `<td>` Wrapper for EmptyState

**What goes wrong:** In `TableView.tsx`, the empty state is inside a `<tbody>` — a bare `<div>` as direct child of `<tbody>` is invalid HTML and can cause layout issues.

**Why it happens:** Copy-paste from non-table contexts.

**How to avoid:** Always wrap in `<tr><td colSpan={N}>...</td></tr>` when inside a table. The `EmptyState` component itself remains a plain `<div>` — the caller handles the table structure.

### Pitfall 3: Header `flexWrap` Break on Mobile

**What goes wrong:** `Header.tsx` uses `flex-wrap gap-4` on the outer container. On mobile, all 3 sections (left: title, center: timer, right: clock+buttons) wrap onto separate lines, making the header very tall.

**Why it happens:** All 3 sections remain visible and flex-wrap stacks them vertically.

**How to avoid:** Hide the clock block with `hidden sm:block`. The timer (deadline) for zamporab/planning panels is conditional and may need special treatment — if it appears on mobile, wrap it with `hidden sm:block` too, or use a truncated format.

### Pitfall 4: TypeScript Strict Mode Null Check

**What goes wrong:** `lastUpdated?: Date | null` prop — TypeScript strict mode will require null-checking before using the value. Forgetting this causes a build error.

**How to avoid:** Use `lastUpdated != null && \`· ${secondsAgo}с\`` pattern (null check covers both `null` and `undefined`).

### Pitfall 5: `npm run build` Must Pass

**What goes wrong:** A mobile CSS change or new component is pushed without running the build — TypeScript errors or missing imports break the Vercel auto-deploy.

**Why it happens:** Visual changes feel low-risk, tempting to skip the build check.

**How to avoid:** CLAUDE.md is explicit — run `npm run build` before every commit. This is the only quality gate.

### Pitfall 6: Forgetting All 7 LIVE Panels for `lastUpdated`

**What goes wrong:** `lastUpdated` prop is added to Dispatcher and Boss but forgotten in Foreman, Zamporab, Head, Transport, or Complaints.

**Why it happens:** Each panel is a separate file.

**How to avoid:** The planner should create a checklist of all 7 LIVE-mode panels and treat each as a sub-task, or handle them in one task if they follow the same pattern.

---

## Code Examples

Verified patterns from the existing codebase:

### Existing Badge Style (to match for LIVE counter extension)
```typescript
// Source: src/components/Header.tsx line 59-64
{mode === 'LIVE' && (
  <span className="flex items-center gap-1 bg-red-500/20 border border-red-500/30 text-red-400 px-2 py-0.5 rounded-full text-xs font-bold">
    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
    LIVE
  </span>
)}
```

### Existing Clock useEffect Pattern (reuse for secondsAgo)
```typescript
// Source: src/components/Header.tsx lines 26-29
useEffect(() => {
  const t = setInterval(() => setNow(new Date()), 1000)
  return () => clearInterval(t)
}, [])
```

### Existing Empty State Locations (all to be replaced)
```typescript
// Source: src/components/KanbanBoard.tsx line 70
<div className="text-xs text-white/20 text-center py-8">Нет заявок</div>

// Source: src/components/dispatcher/TableView.tsx lines 47-49
<tr><td colSpan={6} className="px-4 py-12 text-center text-white/20">Нет заявок</td></tr>

// Source: src/app/head/page.tsx line 163-165
<div className="text-center text-white/20 py-20">Нет заявок по вашей службе</div>

// Source: src/app/boss/page.tsx line 110
{pendingApproval.length === 0 && <div className="text-center text-white/20 py-20">Нет заявок на утверждение</div>}

// Source: src/app/zamporab/page.tsx lines 177-179
<div className="glass rounded-xl p-6 text-center text-white/20 text-sm border border-dashed border-white/10">
  Нет заявок — план не составлен
</div>
```

### Existing Responsive Grid (model for KPI collapse)
```typescript
// Source: src/app/page.tsx line 84 — already responsive
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
```

### Existing Divider in Hamburger (reuse for "Система" section)
```typescript
// Source: src/components/Header.tsx lines 142-150
<div className="border-t border-white/10 mt-2 pt-2">
  <button
    onClick={() => { router.push('/'); setMenuOpen(false) }}
    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/40 hover:bg-white/5 hover:text-white transition-all text-left"
  >
    <span className="text-base">🏠</span>
    <span>Главная</span>
  </button>
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Bare text "Нет заявок" | EmptyState component with icon | This phase | Consistent UX, single edit point |
| LIVE badge without timestamp | LIVE badge + elapsed seconds | This phase | Users know when data is stale |
| Admin panel in main grid | Admin in hamburger "Система" section only | This phase | Cleaner navigation for non-admin roles |
| Desktop-only layout | `sm:` responsive breakpoints throughout | This phase | Usable on phones for foremen |

**Deprecated/outdated:**
- Bare empty state text strings in 5 locations: replaced by `EmptyState` component after this phase.

---

## Open Questions

1. **zamporab empty state — custom message**
   - What we know: The current text is "Нет заявок — план не составлен" with a dashed border style different from other empty states.
   - What's unclear: Should the dashed border be preserved as a visual cue for "planning not started", or is the standard EmptyState style sufficient?
   - Recommendation: Use `EmptyState` with `message="Нет заявок — план не составлен"` and drop the dashed border. Keeps consistency. Planner can override if desired.

2. **foreman page empty state — confirmation needed**
   - What we know: CONTEXT.md lists `head/page.tsx`, `boss/page.tsx`, `zamporab/page.tsx` explicitly. `KanbanBoard.tsx` and `TableView.tsx` are also listed. Foreman panel is not explicitly mentioned as having a bare empty state.
   - What's unclear: Whether foreman's empty states are handled via KanbanBoard (already covered) or have separate bare strings.
   - Recommendation: During implementation, grep for `Нет заявок` or similar Russian bare strings across all panel files. The planner can add this as a verification step.

3. **Touch targets on mobile — which specific panels**
   - What we know: Min 44px height for buttons is the standard (Apple HIG, Google Material).
   - What's unclear: Which specific buttons in which panels currently fall below 44px.
   - Recommendation: The `p-2` class produces ~40px buttons (8px padding × 2 + 24px icon = 40px). Changing to `p-2.5` or `p-3` is sufficient. The hamburger button and logout button in Header are the primary candidates. Planner should treat this as a systematic scan task.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `src/components/Header.tsx`, `src/types/index.ts`, `src/app/page.tsx`, `src/components/KanbanBoard.tsx`, `src/components/dispatcher/TableView.tsx`, `src/app/head/page.tsx`, `src/app/boss/page.tsx`, `src/app/zamporab/page.tsx`, `src/app/dispatcher/page.tsx`, `src/app/globals.css`, `package.json` — all read directly
- `01-CONTEXT.md` — locked user decisions read directly

### Secondary (MEDIUM confidence)
- Tailwind CSS `sm:` breakpoint behavior (640px) — established pattern verified in `src/app/page.tsx` line 84 which already uses `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- React `useEffect` + `useState` for interval timers — pattern verified in `Header.tsx` lines 26-29 (clock) and lines 51-55 (dispatcher auto-refresh)

### Tertiary (LOW confidence)
- 44px touch target recommendation — industry standard (Apple HIG, Google Material Design) but not verified against specific Tailwind class pixel outputs in this codebase's context

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — package.json read directly; all libraries confirmed present; zero new dependencies needed
- Architecture: HIGH — all patterns derived from existing codebase, not hypothetical
- Pitfalls: HIGH for TypeScript/React ones (derived from code); MEDIUM for the zamporab empty state nuance (requires implementation judgment)
- Mobile breakpoints: HIGH — `sm:` prefix use verified in existing code

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable framework versions; no external API dependencies)
