# Phase 03: Core HR Panel UI - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

ZAMPORAB opens `/hr` and immediately sees who is present today (grouped by service), changes a status with one click, and reviews status history per employee. HEAD role sees their service in read-only mode.

Creating employees (hire/dismiss) and reporting are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Employee card layout
- Card-based grid layout (not compact list) — reuses the FleetBoard/Transport card+badge pattern
- Grid: 1 col mobile, 2 cols tablet, 3 cols desktop
- Each card shows: employee name, position, current status badge (colored per EMPLOYEE_STATUS_CONFIG)
- Cards grouped under service section headers (service emoji + name from SERVICE_META)

### One-click status change
- All 4 active statuses shown as inline buttons on the card: На работе / Отгул / Больничный / Отпуск
- "Уволен" is NOT a clickable button — dismissal is Phase 04 scope
- Currently active status button is highlighted/selected; clicking it is a no-op
- Status changes immediately on click (optimistic update) — no confirmation modal

### Reason field
- Reason is optional and only appears after clicking a non-"На работе" status
- Shown as a small inline input below the status buttons — user can type and confirm, or just move on
- If user skips reason, status is saved with `reason: null`

### Status history
- Inline accordion within the card — expand arrow (chevron) at the bottom of the card
- Shows a chronological list of past status records: date range, status label (colored), reason if present
- No pagination for now — show all history records for the employee

### Summary panel (top of page)
- Appears above the employee list
- One tile per service: service emoji + name, count "На работе: X / Всего: Y"
- Statuses counted as "absent": Otgul, Bolnichniy, Otpusk
- Read-only — no actions in the summary

### HEAD role access
- HEAD opens `/hr` and sees only their own service employees
- Status change buttons are NOT rendered for HEAD role
- Status history accordion is available (read-only view)
- ZAMPORAB sees all services

### Claude's Discretion
- Exact card spacing and typography
- Loading skeleton design while data fetches
- Error state handling (failed status update)
- Whether to show "last changed" timestamp on the card

</decisions>

<specifics>
## Specific Ideas

- No specific references provided — open to standard approaches consistent with the app's dark glass UI
- Presence-by-default: employees with no DB row today show as "На работе" (already encoded in `fetchAllCurrentStatuses`)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `EMPLOYEE_STATUS_CONFIG` in `src/types/index.ts` — has label, color, bg for all 5 statuses. Use directly for badge and button styling.
- `SERVICE_META` in `src/types/index.ts` — has emoji and name for each service. Use for section headers and summary tiles.
- `EnrichedEmployee` interface — `{ user, currentStatus, statusRecord }` — exact shape the cards will render.
- FleetBoard card pattern (`src/components/transport/FleetBoard.tsx`) — glass card, status badge, grid layout. Directly reusable as structural reference.
- `EmptyState.tsx` component exists for empty service groups.

### Established Patterns
- Glass card style: `className="glass rounded-xl p-4 border ..."` — used across Transport, Dispatcher, Work Planning panels.
- Status badge: `<span className={cfg.bg} style={{ color: cfg.color }}>{cfg.label}</span>` — standard pattern.
- Page structure: thin `page.tsx` (~50 lines) with state + loadData, separate component files in `src/components/hr/`.
- Role check via `hasRole()` from `src/lib/auth.ts` — use to hide edit buttons for HEAD role.

### Integration Points
- New page: `src/app/hr/page.tsx` — add to PANELS config in `src/types/index.ts` for nav header
- New components dir: `src/components/hr/` — EmployeeCard.tsx, ServiceSection.tsx, SummaryPanel.tsx, StatusHistory.tsx
- API functions already exist in `src/lib/api.ts`: `fetchAllCurrentStatuses`, `setEmployeeStatus`, `fetchEmployeeStatusHistory`
- AuthGuard wraps the page with roles: `['ZAMPORAB', 'HEAD', 'ADMIN', 'BOSS']`

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-core-hr-panel-ui*
*Context gathered: 2026-03-04*
