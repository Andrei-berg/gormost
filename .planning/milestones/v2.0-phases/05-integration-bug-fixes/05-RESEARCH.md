# Phase 05: Integration Bug Fixes — Research

**Researched:** 2026-03-06
**Domain:** Cross-phase integration bug fixes — TypeScript/React component state, Supabase SQL migration
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HR-05 | User sees today's summary — how many working/absent per service | Fix INT-01: add 6 extended statuses to ABSENT_STATUSES in SummaryPanel.tsx |
| HR-08 | ADMIN can hire employee (with hire date) and dismiss (soft-delete) | Fix INT-02a: add service dropdown to HireModal.tsx — hired employees must have service_id |
| HR-16 | Extended employee statuses: Komandirovka, Uchebniy_otpusk, Dekret, Mobilizovan, SVO, Troydoustroyen_s_SVO | Fix INT-01: all 6 new statuses must count as absent in SummaryPanel |
| HR-18 | Migration: 270 seeded employees imported with correct data | Fix INT-02b: migration 008 must SET service_id on all 270 seeded employees |
</phase_requirements>

---

## Summary

Phase 05 fixes two critical cross-phase integration bugs discovered in the v2.0 milestone audit. Both bugs exist because Phase 04 (Staff Management) added data and UI without updating Phase 03 (Core HR Panel) components that depend on a complete status list and non-null service_id values.

**Bug 1 (INT-01):** `SummaryPanel.tsx` has a hardcoded `ABSENT_STATUSES` array with only 4 values. Phase 04 added 6 new extended statuses to `EmployeeStatusType` and `EMPLOYEE_STATUS_CONFIG`, but `SummaryPanel.tsx` was not updated. Employees on Komandirovka, Uchebniy_otpusk, Dekret, Mobilizovan, SVO, or Troydoustroyen_s_SVO are currently counted as "present" in the summary tiles — a correctness bug visible to ZAMPORAB every morning.

**Bug 2 (INT-02):** `page.tsx` line 42 filters `employees.filter(e => e.user.service_id !== null)` before rendering. Two sources create employees with `service_id = NULL`: (a) `HireModal.tsx` hardcodes `service_id: null` in the `createEmployee()` call, (b) `007_seed_employees.sql` omits `service_id` from the INSERT column list entirely. Both newly hired employees and all 270 seeded employees are silently invisible in `/hr`. This is a complete showstopper for the HR module's usefulness.

**Critical finding about the seed fix:** The `roster-merged.json` file has NO `service_id` field — it only has `foreman` (бригадир). The foremans (Чекин, Кожин, Максимов, Станишевский) identify shift rotation groups (smeny 1-4), NOT the 5 service groups (SRV-ENG, SRV-STR, etc.). Service assignment for the 270 seeded employees cannot be derived from the roster data. Migration `008` must assign all employees to a single service (e.g., SRV-STR as the main construction service), or the task must be flagged for human review.

**Primary recommendation:** Fix INT-01 with a hardcoded 10-status array (simpler, no config change needed). Fix INT-02a by adding a required service dropdown to HireModal. Fix INT-02b by writing migration 008 that sets a default service_id on all seeded employees with service_id IS NULL, pending human confirmation of the correct service.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React useState | (Next.js 16 built-in) | Form state for service dropdown in HireModal | Already used in HireModal |
| Supabase JS client | (project-standard) | UPDATE query in migration 008 | Existing project pattern |

No new libraries needed for this phase. All fixes use the existing project stack.

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure

No new files except migration. Changes are surgical edits to existing files:

```
src/
├── components/hr/
│   ├── SummaryPanel.tsx       # Edit: expand ABSENT_STATUSES from 4 to 10 entries
│   └── HireModal.tsx          # Edit: add services state + service dropdown UI
supabase/migrations/
└── 008_fix_seeded_employee_services.sql  # New: UPDATE service_id on 270 employees
```

### Pattern 1: Hardcode All 10 Absent Statuses in SummaryPanel

**What:** Replace the 4-entry ABSENT_STATUSES array with all 10 non-working statuses.

**When to use:** Always — this is the simplest, most readable fix. The status set is stable and defined in types/index.ts.

**Why not derive from EMPLOYEE_STATUS_CONFIG:** `EMPLOYEE_STATUS_CONFIG` has no `is_absent` boolean flag. Deriving requires (a) adding the flag to the config type and every entry, (b) filtering the config object keys. That is more code, more risk, and buys nothing — the status set is known and defined once.

**Example (verified by reading SummaryPanel.tsx):**
```typescript
// src/components/hr/SummaryPanel.tsx line 6 — BEFORE:
const ABSENT_STATUSES: EmployeeStatusType[] = ['Otgul', 'Bolnichniy', 'Otpusk', 'Uvolen']

// AFTER — all non-working statuses:
const ABSENT_STATUSES: EmployeeStatusType[] = [
  'Otgul', 'Bolnichniy', 'Otpusk', 'Uvolen',
  'Komandirovka', 'Uchebniy_otpusk', 'Dekret',
  'Mobilizovan', 'SVO', 'Troydoustroyen_s_SVO',
]
```

Note: `Na_rabote` is the only absent value NOT in this list. The logic in SummaryPanel is `!ABSENT_STATUSES.includes(e.currentStatus)` which correctly computes "working" by exclusion.

### Pattern 2: Service Dropdown in HireModal

**What:** Add `services` state to HireModal, load via `fetchServices()` in the existing `useEffect`, add a required `<select>` field for service assignment.

**When to use:** Required — without service_id, newly hired employees are immediately invisible in /hr.

**How to integrate with existing useEffect (verified by reading HireModal.tsx):**

The existing `useEffect` already calls `Promise.all([fetchProfessions(), fetchSchedules()])`. The service fetch must be added to this same `Promise.all`. The `fetchServices()` function already exists in `src/lib/api.ts` (line 52).

```typescript
// HireModal.tsx — extend existing useEffect:
const [services, setServices] = useState<Service[]>([])
const [serviceId, setServiceId] = useState('')

useEffect(() => {
  Promise.all([fetchProfessions(), fetchSchedules(), fetchServices()]).then(([profs, scheds, svcs]) => {
    setProfessions(profs)
    setSchedules(scheds)
    setServices(svcs)
    if (profs.length > 0) setProfessionId(profs[0].id)
    if (scheds.length > 0) setScheduleId(scheds[0].id)
    // No default for serviceId — user must choose explicitly
    setLoadingOptions(false)
  })
}, [])

// In handleSubmit validation:
if (!lastName.trim() || !firstName.trim() || !tabNumber.trim() || !professionId || !scheduleId || !serviceId) {
  setError('Заполните все обязательные поля')
  return
}

// In createEmployee() call:
service_id: serviceId,  // was: service_id: null
```

**Import to add:** `fetchServices` from `@/lib/api` and `Service` from `@/types`.

### Pattern 3: Migration 008 — Set service_id on Seeded Employees

**What:** A SQL UPDATE migration that assigns `service_id` to all users where `service_id IS NULL AND role_level = 'WORKER' AND tab_number NOT LIKE 'user-%'`.

**Critical constraint:** `roster-merged.json` has NO `service_id` field. The only field that groups employees is `foreman` (shift foreman name, identifying смены 1-4 rotation groups). This does NOT map to services (SRV-ENG, SRV-STR, SRV-FIRE, SRV-VENT, SRV-CCTV).

**Practical approach for migration 008:** Since the correct service-to-employee mapping is not available in the roster data, migration 008 must assign a single fallback service to all 270 seeded employees. Based on context (GBU Gormost — tunnel operations, the main workforce is construction/road workers), `SRV-STR` (Строительная служба) is the most appropriate default. The migration should be clearly commented as a placeholder requiring manual correction via admin panel.

**Alternative:** Leave service_id as NULL and remove the `service_id !== null` filter from page.tsx. This makes all employees visible but loses the service grouping entirely. NOT recommended — service grouping is a core UX feature.

**Migration pattern (CLAUDE.md: provide comment + rollback):**
```sql
-- Migration 008: Fix service_id for seeded employees
-- Assigns all seeded employees (service_id IS NULL) to SRV-STR as placeholder.
-- After running: ADMIN should review and reassign employees to correct services.
-- Rollback: UPDATE users SET service_id = NULL WHERE service_id = 'SRV-STR' AND role_level = 'WORKER';

UPDATE users
SET service_id = 'SRV-STR'
WHERE service_id IS NULL
  AND role_level = 'WORKER'
  AND is_active = true;
```

**IMPORTANT caveat:** This UPDATE uses `SRV-STR` as a hardcoded value. The actual `service_id` PK values in the live Supabase `services` table depend on what was seeded in the initial setup. The code uses string IDs like `'SRV-ENG'`, `'SRV-STR'` etc. consistently (confirmed in `SERVICE_META` in types/index.ts). The migration must use the same IDs that exist in the services table.

### Anti-Patterns to Avoid

- **Don't change the page.tsx filter:** `employees.filter(e => e.user.service_id !== null)` is correct architecture. The fix is to ensure employees have a service_id, not to remove the filter.
- **Don't add is_absent flag to EMPLOYEE_STATUS_CONFIG:** Over-engineering for a 1-line fix. Adding a flag requires touching the config type + every entry + SummaryPanel.
- **Don't use UPDATE in 007 seed migration:** The audit said "007 seed migration omits service_id" — do NOT modify 007. Create 008 as a separate migration (versioning, safe re-run).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fetching services in HireModal | Custom fetch | `fetchServices()` in api.ts (line 52) | Already exists, tested |
| Service list in HireModal | Custom state mgmt | Add to existing `Promise.all` in useEffect | Follows existing pattern in HireModal |
| Migration rollback pattern | Ad-hoc | Follow 007_seed_employees.sql pattern: comment + rollback section | CLAUDE.md requirement |

---

## Common Pitfalls

### Pitfall 1: Troydoustroyen_s_SVO is "Working" Not "Absent"

**What goes wrong:** "Вернулся с СВО" (returned from SVO) sounds like a return to work status, so it might be left out of ABSENT_STATUSES or misclassified.

**Why it happens:** The label "Трудоустроен с СВО" implies the employee is back and working.

**How to avoid:** Check the Phase 04 CONTEXT.md decision: "Troydoustroyen_s_SVO — Вернулся с СВО, принят снова". This is a transitional status, and per audit INT-01, ALL 6 extended statuses should be absent. The SummaryPanel counts "working" as anyone NOT in ABSENT_STATUSES — so if Troydoustroyen_s_SVO means the person is now at work, it should be EXCLUDED from ABSENT_STATUSES. Clarify with business logic before coding.

**Recommendation:** Based on the Phase 03 design — "На работе" is the working status. Troydoustroyen_s_SVO likely means the employee is in a transitional paperwork state, not yet actively working. Include it in ABSENT_STATUSES to be conservative. The audit explicitly says "Add all 6 extended statuses to ABSENT_STATUSES."

**Warning signs:** If the ZAMPORAB says headcounts are wrong for returned SVO employees after the fix.

### Pitfall 2: service_id Values May Not Match 'SRV-STR' Literally

**What goes wrong:** The migration uses `'SRV-STR'` but the actual `service_id` PK in the live Supabase DB might be different (UUID, different string, etc.).

**Why it happens:** The codebase uses `SERVICE_META` with keys `'SRV-ENG'`, `'SRV-STR'`, etc., implying these ARE the PKs. But the services table is seeded via the Admin UI / manual data entry, not via a migration file in the repo. There is no `INSERT INTO services` migration in `supabase/migrations/`.

**How to avoid:** Before running migration 008, verify with `SELECT service_id, service_name FROM services;` in Supabase SQL Editor. Use the actual service_id value from that query.

**Warning signs:** Migration 008 returns 0 rows updated (service_id foreign key constraint fails silently with UPDATE).

### Pitfall 3: HireModal Service Dropdown Has No Default — Breaks Submit

**What goes wrong:** If `serviceId` state starts as `''` and no default is set, the validation `!serviceId` correctly blocks submit — but the UX is jarring if the user doesn't notice the new required field.

**Why it happens:** Unlike profession and schedule (which auto-select the first option), service has no sensible default.

**How to avoid:** Show the dropdown with a placeholder option like `"— Выберите службу —"` with value `''`. Validation already checks `!serviceId`. Mark the field label with `*` to match other required fields.

### Pitfall 4: TypeScript Import Missing in HireModal

**What goes wrong:** Adding `Service` type and `fetchServices` import to HireModal.tsx causes TypeScript errors if the import line is incomplete.

**Why it happens:** The current HireModal imports `{ fetchProfessions, fetchSchedules, createEmployee }` from `@/lib/api` and `{ Profession, Schedule }` from `@/types`. `Service` and `fetchServices` must be added.

**How to avoid:** Add both imports explicitly. `npm run build` must pass.

### Pitfall 5: Migration 008 Scope — Active vs Inactive Users

**What goes wrong:** The UPDATE catches dismissed employees (is_active=false) who should NOT be assigned to a service.

**Why it happens:** The WHERE clause `service_id IS NULL AND role_level = 'WORKER'` includes dismissed workers.

**How to avoid:** Add `AND is_active = true` to the WHERE clause. Dismissed workers can remain with service_id=NULL since they're in the DismissedSection (separate query via `fetchUsers(false)` filtered differently).

---

## Code Examples

Verified patterns from reading current codebase:

### Current SummaryPanel Bug (line 6)
```typescript
// Source: src/components/hr/SummaryPanel.tsx:6 (read directly)
const ABSENT_STATUSES: EmployeeStatusType[] = ['Otgul', 'Bolnichniy', 'Otpusk', 'Uvolen']
// Missing: Komandirovka, Uchebniy_otpusk, Dekret, Mobilizovan, SVO, Troydoustroyen_s_SVO
```

### All 10 Status Values (from types/index.ts)
```typescript
// Source: src/types/index.ts:266-277 (read directly)
export type EmployeeStatusType =
  | 'Na_rabote'           // present — NOT absent
  | 'Otgul'               // absent
  | 'Bolnichniy'          // absent
  | 'Otpusk'              // absent
  | 'Uvolen'              // absent
  | 'Komandirovka'        // absent
  | 'Uchebniy_otpusk'     // absent
  | 'Dekret'              // absent
  | 'Mobilizovan'         // absent
  | 'SVO'                 // absent
  | 'Troydoustroyen_s_SVO' // absent (transitional)
```

### HireModal Current createEmployee Call (line 54-72)
```typescript
// Source: src/components/hr/HireModal.tsx:54-72 (read directly)
const result = await createEmployee(
  {
    // ... other fields ...
    service_id: null,  // BUG: hardcoded null — fix to: service_id: serviceId
  },
  currentUserId
)
```

### page.tsx Filter (line 42)
```typescript
// Source: src/app/hr/page.tsx:42 (read directly)
setEmployees(emps.filter(e => e.user.service_id !== null))
// This is CORRECT — do not remove. Fix the data, not the filter.
```

### fetchServices already exists
```typescript
// Source: src/lib/api.ts:52-55 (read directly)
export async function fetchServices(): Promise<Service[]> {
  const { data } = await supabase.from('services').select('*').order('service_name')
  return (data || []) as Service[]
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 4-status ABSENT_STATUSES | Must be 10-status | Phase 04 added 6 statuses | Summary tiles show wrong counts until fixed |
| service_id: null in HireModal | service_id from dropdown | Phase 05 fix | Newly hired employees become visible |
| No service_id in 007 seed INSERT | Migration 008 UPDATE | Phase 05 fix | 270 seeded employees become visible |

---

## Open Questions

1. **Should Troydoustroyen_s_SVO be counted as absent or present?**
   - What we know: The audit says "add all 6 extended statuses to ABSENT_STATUSES"
   - What's unclear: "Returned from SVO, re-hired" could mean the employee is now at work
   - Recommendation: Include in ABSENT_STATUSES per audit guidance. If wrong, easy to remove.

2. **What is the correct service_id for seeded employees?**
   - What we know: roster-merged.json has no service_id. Services exist in Supabase DB as SRV-ENG, SRV-STR, SRV-FIRE, SRV-VENT, SRV-CCTV (from SERVICE_META)
   - What's unclear: The actual PK values in the live `services` table need to be confirmed
   - Recommendation: Migration 008 uses `'SRV-STR'` as placeholder with a comment instructing human to verify service_id values first. Alternatively, treat as human checkpoint: plan includes a "verify services table" task before executing migration.

3. **Should the page.tsx filter be changed to be less strict?**
   - What we know: The current filter `service_id !== null` is intentional per Phase 03 design (group by service)
   - What's unclear: Should employees with no service be shown in an "Unassigned" bucket?
   - Recommendation: No. Fix the data (migration 008), keep the filter. "Unassigned" bucket adds UI complexity out of scope.

---

## Sources

### Primary (HIGH confidence)
- `src/components/hr/SummaryPanel.tsx` — read directly, confirmed ABSENT_STATUSES bug at line 6
- `src/components/hr/HireModal.tsx` — read directly, confirmed `service_id: null` hardcode at line 69
- `src/app/hr/page.tsx` — read directly, confirmed `service_id !== null` filter at line 42
- `src/types/index.ts` — read directly, confirmed all 11 EmployeeStatusType values
- `src/lib/api.ts` — read directly, confirmed `fetchServices()` exists and `createEmployee()` signature
- `supabase/migrations/007_seed_employees.sql` — read directly, confirmed no service_id in INSERT
- `.planning/roster-merged.json` — analyzed directly, confirmed no service_id field
- `.planning/v2.0-MILESTONE-AUDIT.md` — read directly, primary source for bug specifications
- `src/components/hr/EmployeeCard.tsx` — read directly, confirmed EXTENDED_STATUSES list

### Secondary (MEDIUM confidence)
- `.planning/phases/04-staff-management/04-CONTEXT.md` — design decisions for Phase 04

---

## Metadata

**Confidence breakdown:**
- Bug specifications: HIGH — read directly from audit report and source code
- Fix for INT-01 (ABSENT_STATUSES): HIGH — trivial 1-array change, verified all values
- Fix for INT-02a (HireModal service dropdown): HIGH — pattern follows existing dropdown in same file
- Fix for INT-02b (migration 008): MEDIUM — service_id PK values in live DB not verified (no INSERT migration for services table found in repo)
- Roster service mapping: HIGH confidence that NO mapping exists in roster-merged.json

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stable codebase, low churn)
