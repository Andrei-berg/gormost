# Feature Landscape: HR Module (Attendance & Employee Status)

**Domain:** Employee presence/attendance tracking for shift-based operations management
**Project:** Gormost — Lefortovo tunnel operations (GBU "Gormost")
**Researched:** 2026-03-02
**Confidence:** HIGH (domain knowledge + thorough project documentation review)

---

## Context: What Users Actually Need

The system replaces WhatsApp group chats for shift coordination. ZAMPORAB (shift foreman) currently has no
structured way to know who is physically present today. Key pain: "Who from SRV-FIRE is actually here right
now?" is answered by phone call or message, not by looking at a screen.

**Users who will use HR module:**
- ZAMPORAB — daily: "who do I have available for this shift?"
- BOSS — weekly/monthly: "how many sick days this quarter per service?"
- ADMIN — occasional: onboarding/offboarding employees

**Scale:** ~50–100 employees across 5 services. Not a large HR system. Not a payroll system.

---

## Table Stakes

Features users expect from a presence tracking module. Missing = the module feels useless.

| Feature | Why Expected | Complexity | Dependency on Existing Data |
|---------|--------------|------------|----------------------------|
| Employee list grouped by service | Core orientation — "who belongs where" | Low | `users` table + `services` table (both exist) |
| Current presence status per employee | The primary problem being solved | Low | New `employee_status` table needed |
| Status values: На работе / Отгул / Больничный / Отпуск / Уволен | Standard Russian labor categories; matches REQ-101 | Low | New enum/table |
| One-click status change from employee card | Replacing WhatsApp messages; must be fast | Low-Med | New API function |
| Today's summary: who's in, who's out — per service | ZAMPORAB needs this before assigning work | Med | Aggregation query on employee_status |
| Visual color coding of statuses | Without color, status is hard to scan; same pattern as existing request statuses | Low | UI only |
| Show inactive/dismissed employees separately | is_active=false users exist; need clear separation from active staff | Low | `users.is_active` exists |

**Why these are table stakes:** Without the employee list + current status + quick toggle, the module
delivers no value. The whole point is replacing WhatsApp with a screen that shows who's available now.

---

## Differentiators

Features that go beyond basic presence — valued but not expected on day one.

| Feature | Value Proposition | Complexity | Dependency |
|---------|-------------------|------------|------------|
| Status change history per employee | Audit trail — "when did Ivanov go on sick leave?" | Med | New `employee_status_history` table or event log |
| Attendance sheet grid (employee × day) | Monthly view — standard in Russian government ops; enables verbal reports | High | Query over date range + grid rendering |
| Period report: vacations/sick leave by month/quarter | BOSS dashboard for planning; answers "how many sick days in Q1?" | High | Date-range aggregation over status history |
| Employee card with contacts + assignment history | "What has this person worked on?" — connects HR to operational data | Med | JOIN `users` + `request_assignments` (both exist) |
| Hire date / dismiss date fields | Proper lifecycle tracking; enables date-bounded reports | Low | `date_hired`/`date_fired` fields on `users` table |
| Export (Excel or print) | Required for official government reporting (ГБУ context) | High | External library or CSV generation |

**Why differentiators:** These add organizational memory and reporting capability. They're expected
eventually by a government utility company (paper trail culture) but the module is still useful without them
from day one.

---

## Anti-Features

Features to explicitly NOT build in this module.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Payroll / salary calculation | Completely out of scope (REQUIREMENTS.md explicitly excludes financial accounting); creates legal/compliance complexity | Use 1C or equivalent dedicated system |
| Clock-in / clock-out timestamps | Requires hardware (turnstile, badge reader) or mobile GPS; massive scope creep; this is presence status, not timekeeping | Keep it manual status toggle |
| Automatic sick leave detection | No integration with medical system; can't auto-detect; would require HR role and legal workflow | Manual entry by ZAMPORAB/ADMIN |
| Leave approval workflow | Not requested; ZAMPORAB currently decides informally; formalizing requires process change the org isn't ready for | Simple status set, no multi-step approval |
| Notification / push alerts | No notification infrastructure in scope (REQ-140 is Realtime for requests, not HR) | Out of scope for this milestone |
| Separate HR role | Overkill for 50-100 people; existing roles (ADMIN/BOSS/ZAMPORAB) cover all use cases (open question in STATE.md) | ZAMPORAB changes status, ADMIN manages employees |
| Calendar / shift planning integration | Shift system is separate (4-day rotation, auto-calculated in shifts.ts); merging HR presence with shift planning adds complexity | Keep HR presence and shift planning separate concerns |

---

## Feature Dependencies

```
users table (existing)
  └─ is_active field (existing) — basis for hire/dismiss
  └─ service_id field (existing) — basis for grouping by service
  └─ date_hired / date_fired fields (NEW — migration needed)
      └─ Employee card with lifecycle info

employee_status table (NEW — migration needed)
  └─ user_id, status, date_from, date_to, reason, changed_by, changed_at
      └─ Current status per employee (most recent record)
      └─ Status change history (full history)
      └─ Today's summary (filter date = today)
      └─ Attendance sheet grid (query by date range)
      └─ Period reports (aggregate by date range + status type)

request_assignments table (existing)
  └─ JOIN with users → Employee assignment history in employee card

changelog table (existing)
  └─ HR status changes should be logged here (same pattern as request changes)
```

**Critical dependency note:** The `employee_status` table design determines everything. It must support
both "what is the current status?" (latest record per user) and "what was the status on date X?"
(point-in-time query). This is a temporal data problem — the table needs `date_from` and `date_to` fields,
not just a single `status` field on the `users` table.

---

## Feature Complexity Breakdown

### Phase 1 — DB Foundation (required for everything else)
- SQL migration: `employee_status` table — **Low complexity**, **HIGH impact**
- SQL migration: `date_hired`, `date_fired` fields on `users` — **Low complexity**
- API functions: `setEmployeeStatus`, `getEmployeeStatus`, `getStatusHistory` — **Low-Med complexity**
- Connect to changelog logger — **Low complexity** (pattern exists)

### Phase 2 — Core HR Panel UI
- `/hr` page + AuthGuard (ZAMPORAB, BOSS, ADMIN) — **Low complexity** (pattern exists)
- Employee list by service with current status badges — **Low complexity**
- Quick status toggle button/dropdown in employee card — **Low-Med complexity**
- Today's summary: headcount per service, absent count — **Low complexity**
- Status history drawer/modal per employee — **Med complexity**
- Employee card: contacts, role, hire date — **Low complexity** (data exists)
- Assignment history in employee card — **Med complexity** (requires JOIN query)

### Phase 3 — Reporting
- Attendance sheet grid (employee × day matrix) — **High complexity** (date range + matrix rendering)
- Period report: absences by month/quarter — **Med-High complexity**
- Export to Excel/CSV — **High complexity** (new library or CSV string generation)
- Print-friendly view — **Med complexity** (CSS print media query)

---

## MVP Recommendation

For ZAMPORAB's daily workflow, the minimum viable HR module is:

**Must have in v1 of HR module:**
1. Employee list grouped by service, with colored status badge
2. Current status shown prominently (На работе / Отгул / Больничный / Отпуск / Уволен)
3. One-click status change (button or dropdown)
4. Today's summary: X working, Y absent per service
5. Status change history per employee (simple list)

**Can defer to v2 of HR module:**
- Attendance sheet grid (high complexity, low daily urgency)
- Period reports (useful for BOSS but not daily)
- Export (useful for government reporting but manual workaround exists for now)
- Employee card assignment history (nice to have, not critical)

**Rationale:** ZAMPORAB uses this every morning before assigning work. The daily presence list + toggle
solves 80% of the WhatsApp replacement value. Reporting is secondary — it serves BOSS's monthly reviews,
not daily operations. Build the daily workflow first, prove value, then add reporting.

---

## Russian Government Context Notes

**Status terminology must match Russian labor law conventions:**
- "Отгул" (compensatory day off) — distinguishable from "Отпуск" (vacation); both are absences but different HR categories
- "Больничный" (sick leave) — tracked separately; government agencies report these to FSS (social insurance fund)
- "Уволен" (dismissed) — soft-delete pattern already in `users.is_active`; status should show "Уволен" rather than disappearing

**Attendance sheet (Табель учёта рабочего времени):**
This is Form T-13 in Russian labor code — a monthly grid of employee × working day. Government organizations
are legally required to maintain this. The attendance sheet in this system won't be the official record
(payroll is in 1C), but ZAMPORAB will use it to fill out the paper/1C record. Make the grid visually
match the T-13 format.

**Date range:** Report periods should default to calendar month and allow quarter selection. Russian
government reporting cycles are monthly (to FSS) and quarterly (to management).

---

## Connections to Existing Features

| Existing Feature | How HR Module Connects |
|-----------------|------------------------|
| Admin panel Users tab | HR extends it — hire/dismiss moves from admin CRUD to dedicated HR workflow with date tracking |
| Dispatcher PeopleStats | Shows "X people from service Y in requests" — HR module provides the "X people available" counterpart |
| Request assignments | Source of truth for "what has this employee worked on" in employee card history |
| Changelog | All HR status changes must be logged here — same `logAction()` function, same table |
| ZAMPORAB panel "Запросы людей" tab | StaffRequest (inter-service transfers) is adjacent to HR presence; may surface here or in HR panel |
| Boss dashboard | HR summary (% present per service) should surface as a new KPI card in boss panel |

---

## Open Questions for Implementation

1. **HR role question** (flagged in STATE.md): Should ZAMPORAB be able to set status for employees
   outside their service? Current staff requests suggest cross-service visibility. Recommendation: ZAMPORAB
   sees all services but can only change status for employees in their assigned service, unless ADMIN.

2. **"Уволен" status vs is_active=false**: Currently dismissal = `is_active: false`. HR module needs to
   distinguish "on extended leave" from "dismissed". The `employee_status` table handles this, but
   `is_active` should remain the access control flag. Decision needed: does dismissal set both
   `is_active: false` AND `employee_status = Уволен`?

3. **Status on days with no record**: If no `employee_status` row exists for today, is the employee
   "На работе" (default assumption: present if no exception recorded) or "Unknown"? Russian ops management
   convention: absence must be recorded; presence is the default. Design accordingly.

4. **Attendance sheet date boundary**: The shift system uses 07:00–19:00 day / 19:00–07:00 night. Does
   the attendance grid track by calendar day or by shift? Recommendation: calendar day for simplicity.

---

## Sources

- Project documentation: `/home/user/Projects/gormost/.planning/PROJECT.md`
- Requirements: `/home/user/Projects/gormost/.planning/REQUIREMENTS.md` (REQ-100 through REQ-110)
- Roadmap: `/home/user/Projects/gormost/.planning/ROADMAP.md` (Milestone 2.0)
- State: `/home/user/Projects/gormost/.planning/STATE.md`
- Codebase review: `src/types/index.ts`, `src/lib/api.ts`, `src/app/admin/page.tsx`, `src/app/zamporab/page.tsx`
- Domain knowledge: Russian labor code attendance conventions (Form T-13), government utility company context
- Confidence: HIGH for table stakes and anti-features (clear from project context + domain); MEDIUM for
  reporting complexity estimates (standard patterns, no equivalent to benchmark against in this codebase)
