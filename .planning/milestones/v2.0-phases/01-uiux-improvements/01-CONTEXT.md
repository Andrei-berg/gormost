# Phase 1: UI/UX Improvements - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Polish the existing UI without adding new capabilities:
- REQ-130: Move Admin panel out of main navigation into hamburger menu secondary section
- REQ-131: Role-filtered navigation (ALREADY IMPLEMENTED — verify and close)
- REQ-020: Add visible "updated N sec ago" indicator to panels with LIVE mode
- REQ-132: Replace bare "Нет заявок" text with icon + descriptive empty state component
- REQ-133: Basic mobile adaptation for all 8 panels (best practices — readable, touch-friendly)

</domain>

<decisions>
## Implementation Decisions

### Settings placement (REQ-130)
- "Settings" = Admin panel (⚙️ Админ-панель, path `/admin`)
- Remove Admin panel card from the home page grid (`src/app/page.tsx`) — ADMIN role sees their panels via hamburger menu
- In `Header.tsx` hamburger menu: add a divider + "Система" section header below the regular panel list, with the Admin panel link inside — visible only to ADMIN role
- No separate settings page needed

### Navigation filtering (REQ-131)
- Already implemented: `visiblePanels = PANELS.filter(p => hasRole(session, p.roles))` exists in both `Header.tsx` and `src/app/page.tsx`
- Action: verify it works correctly, close the requirement — no code changes needed

### Auto-refresh indicator (REQ-020)
- Location: in `Header.tsx`, next to the existing LIVE badge — format: `LIVE · 12с`
- Quiet update: no spinner or loading state during refresh — counter resets silently
- Scope: all panels that use `mode="LIVE"` prop on Header (Dispatcher, Boss, Zamporab, Head, Transport, Complaints, Foreman)
- Implementation: Header receives a `lastUpdated` timestamp prop; Header internally shows elapsed seconds, counting up from 0 on each new timestamp

### Empty states (REQ-132)
- Design: emoji icon + short text, centered, no action buttons
- One shared `EmptyState` component in `src/components/EmptyState.tsx` — accepts optional `message` prop, defaults to "Заявок нет"
- Replace all existing bare empty state strings: `KanbanBoard.tsx`, `TableView.tsx`, `head/page.tsx`, `boss/page.tsx`, `zamporab/page.tsx`
- Icon: 📭 (neutral, context-independent)

### Mobile layout (REQ-133)
- Scope: all 8 panels + home page + Header
- Approach: best practices — readable layout, touch-friendly tap targets (min 44px height for buttons)
- **Header on mobile** (`< sm`, i.e. `< 640px`): hide clock block and shift badges, keep panel title + LIVE badge + burger menu + logout button
- **Kanban cards**: on mobile (`< sm`) cards occupy 100% screen width — change `minmax(240px, 1fr)` to `minmax(min(240px, 100%), 1fr)` or use responsive override
- **Tables**: horizontal scroll (`overflow-x-auto`) already in place — verify works on mobile
- **KPI grids**: collapse from `grid-cols-4` to `grid-cols-2` on mobile with `grid-cols-2 sm:grid-cols-4`
- **Home page panel grid**: already has `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` — no change needed

### Claude's Discretion
- Exact elapsed time format ("12с" vs "12 сек" vs "0:12")
- Specific emoji icon for EmptyState (📭 suggested, can adjust)
- Button heights and spacing adjustments per panel for touch targets
- Whether to show "Система" section in hamburger even if user has no panels there (hide entirely if not ADMIN)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Header.tsx`: Already has LIVE badge (`mode="LIVE"`), hamburger menu with `visiblePanels`, flex-wrap layout — extend, don't rewrite
- `PANELS` array in `src/types/index.ts`: Admin panel is `id: 'admin'`, `roles: ['ADMIN']` — filter it out of home page grid
- `KanbanBoard.tsx`: Uses `grid-template-columns: repeat(N, minmax(240px, 1fr))` via inline style — needs mobile override
- `src/components/dispatcher/Toolbar.tsx`: Has refresh button — `lastUpdated` indicator can live here or in Header
- Empty state strings: `KanbanBoard.tsx:70`, `TableView.tsx:48`, `head/page.tsx:164`, `boss/page.tsx:110`, `zamporab/page.tsx:178`

### Established Patterns
- Tailwind only — no custom CSS except `.glass` / `.glass-strong` in `globals.css`
- `sm:` breakpoint = 640px (mobile threshold for this project)
- Badge style: `bg-X/20 border border-X/30 text-X px-2 py-0.5 rounded-full text-xs font-bold`
- All components are `'use client'` — no server components in panels

### Integration Points
- `Header.tsx` props interface needs `lastUpdated?: Date | null` added
- Each panel's `page.tsx` needs to pass `lastUpdated={lastUpdated}` to `<Header />`
- `EmptyState` component: new file `src/components/EmptyState.tsx`, imported wherever needed
- Home page (`src/app/page.tsx`): filter out Admin from `visiblePanels` for the card grid (Admin still in hamburger via Header)

</code_context>

<specifics>
## Specific Ideas

- LIVE badge format with timestamp: `🔴 LIVE · 12с` — compact, same line
- "Система" section in hamburger uses same divider style already at bottom of menu (`border-t border-white/10`)
- Empty state centered with `py-20` like existing patterns, icon at `text-4xl`, text at `text-white/40`

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-uiux-improvements*
*Context gathered: 2026-03-01*
