# Phase 07: HR Table View - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a compact table view to the existing HR panel as an alternative to the current card grid. Users can toggle between cards and table. The table supports name search, service filter, and inline status editing directly from the row. No new data, no new entities — same employees, same statuses, different presentation.

</domain>

<decisions>
## Implementation Decisions

### View switching
- Toggle between card grid and table — cards are NOT removed, table is an alternative
- Toolbar gets two toggle buttons: "Карточки" / "Таблица" (pattern identical to dispatcher's kanban/table toggle)
- Search field and service filter live in the same toolbar row regardless of view mode
- Default view: cards (preserve existing behavior)

### Toolbar controls
- Search: text input, filters by employee full_name (client-side, no DB query)
- Service filter: dropdown — "Все службы" + one option per service (uses SERVICE_META for emoji)
- Search and filter apply to both card view and table view simultaneously

### Table columns
- Name (clickable — opens EmployeeDetailCard, same as card view)
- Service (emoji + name from SERVICE_META)
- Current status (colored badge — clickable to change status)
- No additional columns (keep it compact)

### Inline status editing — status popup
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

### Status history
- Removed from table view entirely — StatusHistory accordion is NOT shown
- Rationale: status history is not for daily use; the card view already has it for when it's needed

### Role-based editing
- Same canEdit logic as current HR page (HEAD cannot edit, ADMIN/ZAMPORAB/BOSS can)
- If canEdit is false: status badge is not clickable, no popup

</decisions>

<specifics>
## Specific Ideas

- "Best practices like top companies" — visual quality benchmark: Linear, Notion, GitHub style
- Status badge in the table row should feel like a clickable chip, not a plain text label
- Popup should be a small, well-positioned dropdown (not a modal), positioned relative to the badge
- The table rows should be compact but readable — 40-44px row height, dense but not cramped
- Overall aesthetic: same dark glass style as the rest of the app, but tight and information-dense

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/dispatcher/Toolbar.tsx`: Has the kanban/table toggle pattern with view state — adapt for HR Cards/Table toggle + search + service filter
- `src/components/dispatcher/TableView.tsx`: Existing table with glass container, thead/tbody, hover rows — reuse the table shell pattern
- `src/components/EmptyState.tsx`: Already used in TableView — reuse for empty results in HR table
- `EMPLOYEE_STATUS_CONFIG` (src/types/index.ts): All 11 statuses with label/color/bg — drives both badge display and popup options
- `SERVICE_META` (src/types/index.ts): emoji + color per service_id — use for service column display and filter dropdown

### Established Patterns
- Status badge rendering: `text-xs px-2 py-1 rounded-lg border` with `style={{ color: cfg.color }}` and `className={cfg.bg}` — match exactly
- Popup/popover: no existing popover utility — implement as absolute-positioned div with z-index, close on outside click via useEffect + document listener
- Optimistic status update: `setLocalStatus(newStatus)` → API call → rollback on failure (copy from EmployeeCard.tsx)
- Reason input: `<input placeholder="Причина (необязательно)" />` + confirm button pattern from EmployeeCard lines 167-183

### Integration Points
- `src/app/hr/page.tsx`: Add `view` state ('cards' | 'table'), `search` state (string), `filterService` state (string | null) — pass to both toolbar and content area
- New component: `src/components/hr/HRToolbar.tsx` — handles view toggle, search, service filter
- New component: `src/components/hr/HRTableView.tsx` — renders the compact table with inline editing
- Existing `ServiceSection` and `EmployeeCard` components stay untouched — cards view unchanged

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 07-hr-table-view-compact-list-with-search-filters-and-inline-status-editing*
*Context gathered: 2026-03-07*
