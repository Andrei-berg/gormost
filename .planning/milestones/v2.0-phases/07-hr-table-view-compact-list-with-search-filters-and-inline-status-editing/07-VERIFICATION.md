---
phase: 07-hr-table-view-compact-list-with-search-filters-and-inline-status-editing
verified: 2026-03-07T04:00:00Z
status: human_needed
score: 16/16 automated truths verified
re_verification: false
human_verification:
  - test: "Open /hr as ZAMPORAB. Click Таблица toggle. Verify table renders employees with Name, Service, Status columns."
    expected: "Compact table appears with correct columns; Карточки remains default on first load"
    why_human: "Visual rendering and toggle behavior requires browser"
  - test: "In table view, click a status badge. Verify the StatusPopup drops below with two groups (Ежедневные, Расширенные) and a divider between them."
    expected: "Popup appears below badge; group headers and divider are visible; Uvolen is absent from both groups"
    why_human: "Popup positioning and visual grouping requires browser"
  - test: "Select a non-Na_rabote status (e.g. Отгул). Verify status list is replaced by reason input with confirm and cancel buttons."
    expected: "Reason input view appears inside popup; status change applies optimistically on the badge"
    why_human: "View-swap inside popup and optimistic update requires live interaction"
  - test: "Click outside the popup without confirming. Verify popup closes and status badge reverts to original."
    expected: "Outside click closes popup; no status change is persisted"
    why_human: "Outside-click handler requires real mouse events"
  - test: "Type a name fragment into the search input. Verify rows filter in real time in both card and table views."
    expected: "Both views narrow to matching employees as user types; filter applies AND logic with service dropdown"
    why_human: "Real-time filter UX requires browser"
  - test: "Open /hr as HEAD. Verify status badges in table view are plain spans (not buttons) and popup never opens."
    expected: "canEdit=false — badges are not clickable, no popup on click"
    why_human: "Role-based rendering requires login as HEAD role"
  - test: "Verify SummaryPanel totals do not change when search/filter is applied."
    expected: "SummaryPanel shows visibleEmployees totals; toolbar filters only the content area below"
    why_human: "Requires visual inspection while filtering"
---

# Phase 07: HR Table View Verification Report

**Phase Goal:** ZAMPORAB and ADMIN can toggle the /hr panel to a compact table view, search employees by name, filter by service, and change employee status inline without leaving the table
**Verified:** 2026-03-07T04:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths — Plan 01 (HRTableView)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A compact table renders employees with Name, Service, and Status columns | VERIFIED | `HRTableView.tsx` L300-311: thead has 3 th elements (Сотрудник, Служба, Статус); tbody maps employees to HRTableRow |
| 2 | Clicking an employee name opens EmployeeDetailCard (same as card view) | VERIFIED | L149-154: name `<button>` calls `onNameClick(employee.user.user_id)`; page.tsx L123 wires `onNameClick` to `setSelectedUserId`, which opens `EmployeeDetailCard` at L187 |
| 3 | Clicking a status badge opens a floating popup with statuses in two groups | VERIFIED | L169-176: `canEdit` wraps badge in `<button onClick={() => setPopupOpen(true)}`; popup at L197+ renders DAILY_STATUSES (4) then EXTENDED_STATUSES (6) with divider |
| 4 | Active status shows a checkmark in the popup | VERIFIED | L214-215: `<span className={... isActive ? 'opacity-100' : 'opacity-0'}>✓</span>` — preserves spacing, toggles visibility |
| 5 | Selecting a non-Na_rabote status reveals a reason input inside the popup | VERIFIED | L112-115: sets `pendingStatus`, swaps popup to reason view at L255-284; Na_rabote closes popup directly at L107-110 |
| 6 | Confirming or skipping reason saves status and closes popup | VERIFIED | `handleReasonConfirm` L118-137: calls `setEmployeeStatus` only when `reasonText.trim()` is non-empty, closes popup regardless |
| 7 | Clicking outside the popup closes it without saving | VERIFIED | L46-57: `useEffect` + `document.addEventListener('mousedown', handler)` + `popupRef` — clears `popupOpen` and `pendingStatus` on outside click |
| 8 | Optimistic update applies immediately; rollback on API failure | VERIFIED | L80-104: `setLocalStatus(newStatus)` before await; `setLocalStatus(prevStatus)` on `!result` |
| 9 | If canEdit is false, status badge is not clickable and popup never opens | VERIFIED | L168-188: `canEdit` branches to either `<button>` (editable) or plain `<span>` (read-only); `popupOpen` state only reachable via the button |

### Observable Truths — Plan 02 (HRToolbar + page wiring)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Toolbar shows Карточки and Таблица toggle buttons — Карточки is active by default | VERIFIED | `HRToolbar.tsx` L30-41: two buttons; `page.tsx` L33: `useState<'cards' \| 'table'>('cards')` |
| 2 | Search input filters employees by full_name in both card and table views | VERIFIED | `page.tsx` L67-73: `filteredEmployees` filters by `full_name.toLowerCase().includes(search)`; both `HRTableView` (L119) and `grouped`/ServiceSection (L129-144) consume `filteredEmployees` |
| 3 | Service filter dropdown shows Все службы + one option per service with emoji | VERIFIED | `HRToolbar.tsx` L56-70: `<option value="">Все службы</option>` then `services.map(s => ...)` with `SERVICE_META[s.service_id]?.emoji` |
| 4 | Switching to table view renders HRTableView; card view renders existing ServiceSection grid | VERIFIED | `page.tsx` L118-145: `view === 'table' ? <HRTableView ... /> : <> {grouped.map(...ServiceSection)} </>` |
| 5 | Search and service filter apply simultaneously to both views | VERIFIED | `page.tsx` L67-73: AND logic — `matchesSearch && matchesService`; `filteredEmployees` feeds both branches |
| 6 | ADMIN hire button and dismissed employees section remain visible in both views | VERIFIED | `page.tsx` L106-116 (hire button) and L148-181 (dismissed section) are outside the `view === 'table'` conditional |
| 7 | SummaryPanel stays above the toolbar — not affected by view toggle | VERIFIED | `page.tsx` L94: `<SummaryPanel employees={visibleEmployees} .../>` — uses `visibleEmployees` (pre-filter), placed before `<HRToolbar>` at L96 |

**Score:** 16/16 truths verified by static analysis

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/hr/HRTableView.tsx` | Compact HR table with inline status editing via popup | VERIFIED | 331 lines; exports `default HRTableView`; contains internal `HRTableRow` sub-component; fully substantive |
| `src/components/hr/HRToolbar.tsx` | View toggle + search input + service filter for /hr page | VERIFIED | 73 lines; exports `default HRToolbar`; all three controls present |
| `src/app/hr/page.tsx` | Orchestrates view state, search, filter, conditional rendering | VERIFIED | Imports `HRToolbar` (L13) and `HRTableView` (L14); all 3 state vars present (L33-35); `filteredEmployees` computed (L67-73) |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `HRTableView.tsx StatusPopup` | `setEmployeeStatus` API | `handleStatusSelect → setEmployeeStatus call` | WIRED | L86-93: `await setEmployeeStatus(employee.user.user_id, newStatus, today, today, null, currentUserId)` |
| `HRTableView.tsx name button` | `EmployeeDetailCard` | `onNameClick(userId)` prop callback | WIRED | L150: `onClick={() => onNameClick(employee.user.user_id)}`; page.tsx L123: `onNameClick={(uid) => setSelectedUserId(uid)}` → L187: `EmployeeDetailCard` rendered when `selectedUserId` set |
| `page.tsx filteredEmployees` | `HRTableView employees prop` | client-side filter by search + filterService | WIRED | L119: `<HRTableView employees={filteredEmployees} .../>` |
| `HRToolbar` | `page.tsx state` | `onViewChange / onSearchChange / onFilterChange` callbacks | WIRED | L96-104: `onViewChange={setView}`, `onSearchChange={setSearch}`, `onFilterChange={setFilterService}` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| HR-UX-01 | 07-01-PLAN, 07-02-PLAN | Compact table view with search, filters, and inline status editing | SATISFIED (code) | All 16 observable truths verified in codebase. Full feature is implemented and wired. |

### Requirement Definition Gap (informational)

**HR-UX-01** is referenced in ROADMAP.md (Phase 07 requirements field) and in both PLAN frontmatter blocks, but it does not appear in `REQUIREMENTS.md`. The requirement exists as an informal UX enhancement added after the initial HR module requirements were written. This is a documentation gap — the implementation exists and is complete, but `REQUIREMENTS.md` has no formal entry for HR-UX-01.

**Impact:** No impact on phase goal achievement. The code delivers the stated goal. REQUIREMENTS.md should be updated to register HR-UX-01 formally, but this does not block phase passage.

---

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| — | None found | — | — |

All `placeholder` occurrences in HRToolbar.tsx and HRTableView.tsx are legitimate HTML `placeholder` attributes on `<input>` elements, not stub indicators.

---

## TypeScript Compilation

`npx tsc --noEmit` output contains only 4 errors in `.next/dev/types/validator.ts` — these reference removed/renamed pages (`planner`, `service-chief`, `service`, `test`) and are pre-existing issues unrelated to Phase 07. No errors in `src/` files.

---

## Commits Verified

All documented commits exist in git history:

| Commit | Message |
|--------|---------|
| `0cb6cd6` | feat(07-01): build HRTableView with inline StatusPopup editing |
| `55d8c8e` | feat(07-02): create HRToolbar with view toggle, search, and service filter |
| `9843af7` | feat(07-02): wire HRTableView into /hr page with toolbar, search, and filter |

---

## Human Verification Required

All automated checks pass. The following items require browser testing to confirm visual and interactive behavior:

### 1. Table toggle and column layout

**Test:** Open /hr as ZAMPORAB, click "Таблица" button.
**Expected:** Compact table appears with Сотрудник, Служба, Статус columns; rows are ~40-44px tall; default state shows "Карточки" active.
**Why human:** Visual layout and button active state require browser rendering.

### 2. StatusPopup appearance and grouping

**Test:** In table view, click any status badge.
**Expected:** Floating popup drops below badge; shows "Ежедневные" header (4 statuses), a divider, "Расширенные" header (6 statuses). Uvolen is absent. Active status has visible checkmark.
**Why human:** Popup positioning (absolute z-50 top-full) and visual grouping require browser.

### 3. Status selection and reason view swap

**Test:** Click a non-Na_rabote status (e.g. Отгул).
**Expected:** Status list is immediately replaced by reason input with confirm (✓) and cancel (✕) buttons; status badge updates optimistically.
**Why human:** View-swap inside popup and optimistic update requires live interaction.

### 4. Outside-click popup close

**Test:** Open popup, then click elsewhere on the page.
**Expected:** Popup closes without saving; status badge stays at original value.
**Why human:** Outside-click uses document mousedown listener — requires real mouse events.

### 5. Search and filter in real time

**Test:** Type a name fragment in search input while in table view, then switch to card view.
**Expected:** Both views narrow to matching employees in real time; switching view preserves filter state.
**Why human:** Real-time UX and filter persistence requires browser interaction.

### 6. HEAD role read-only enforcement

**Test:** Log in as HEAD role, open /hr, switch to table view.
**Expected:** Status badges are plain spans (not clickable buttons); clicking does nothing; no popup appears.
**Why human:** Role-based rendering requires login session with HEAD role.

### 7. SummaryPanel totals unaffected by filter

**Test:** Apply a name search that narrows employees to 2. Check SummaryPanel tiles.
**Expected:** SummaryPanel still shows totals for all visible employees (not filtered count).
**Why human:** Requires visual inspection while active filter is applied.

---

## Gaps Summary

No gaps found. All 16 observable truths are supported by concrete codebase evidence. All artifacts exist and are substantive. All key links are wired. No blocker anti-patterns detected.

The only outstanding item is **human verification** — the feature requires browser testing to confirm visual correctness, popup positioning, and interactive behavior that cannot be verified by static analysis.

---

_Verified: 2026-03-07T04:00:00Z_
_Verifier: Claude (gsd-verifier)_
