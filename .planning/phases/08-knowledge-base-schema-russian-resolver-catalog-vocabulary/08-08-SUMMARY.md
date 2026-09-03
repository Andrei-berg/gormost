---
phase: 08-knowledge-base-schema-russian-resolver-catalog-vocabulary
plan: 08
subsystem: ui
tags: [admin, work-types, knowledge-base, react, typescript, tailwind, useLoadData]

# Dependency graph
requires:
  - phase: 08-04
    provides: "updateWorkTypeAttributes (ADMIN-gated narrow writer) + typed api-client wrapper; WorkType widened with service_id/unit/typical_period/typical_crew; TypicalCrew/TypicalPeriod re-exports"
  - phase: 08-07
    provides: "migrations 053/055 applied live — work_types carries the 4 enrichment columns and 5 rows are already attributed; 8 seeded journal_objects"
provides:
  - "src/components/admin/WorkTypeAttributesTab.tsx — dedicated /admin «Виды работ» editor (D-17): per-row service <select>, unit input + datalist, день/ночь/сутки segmented toggle → DAY|NIGHT|AROUND, four crew steppers → typical_crew {workers,foremen,itr,vehicles}; save-diff persistence through updateWorkTypeAttributes; create + delete preserved"
  - "D-18 affordances: search (name/id/construction/object), «Без службы» + «Не заполнено» chips, construction→object breadcrumb per row, checkbox multi-select + one «Проставить службу выбранным» bulk action"
  - "src/app/admin/page.tsx wired: work_types tab renders WorkTypeAttributesTab; dead inline WorkTypesTab + its unused imports removed (lint baseline 47 → 46)"
affects: [phase-09, phase-11]

actuals:
  tokens: 7000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Dedicated admin editor on the WorkPermitCatalogEditor precedent (per-row local edit state + per-row busy flag + save-diff), never the generic CrudTab"
    - "Row keyed on a digest of its persisted attributes so it remounts and re-seeds local state from props after any save or bulk write — replaces a setState-in-effect re-seed, keeps the lint baseline"
    - "Bulk mutation = sequential loop of the single-row writer + one reload(), button disabled with N/total progress while running (D-35 DoS mitigation)"

key-files:
  created:
    - src/components/admin/WorkTypeAttributesTab.tsx
  modified:
    - src/app/admin/page.tsx

key-decisions:
  - "typical_period toggle: clicking the active period clears it back to null (a valid stored value the writer accepts). Still exactly three buttons / three choices — 'exactly three choices' read as the option set, not a not-null constraint."
  - "fetchObjects() added to the tab load (4th parallel fetch, not the 3 the plan lists). Constructions carry only object_id, so a meaningful construction→object breadcrumb (D-18 must_have) needs object names. One extra read on mount, still a single Promise.all. Documented as a deviation."
  - "Crew steppers use <input type=number> with min=0; the change handler additionally runs Math.max(0, Math.floor(valueAsNumber||0)) before setState, so paste / spinner / keyboard cannot land a negative or fractional value in state (T-08-32)."
  - "No Vitest test for the component — CLAUDE.md: tests cover pure business logic only, not UI."

patterns-established:
  - "Attribute-digest row key: key={`${id}:${a}:${b}:${JSON.stringify(c)}`} to force remount-on-persist instead of a re-seed effect"

requirements-completed: [KB-02]

coverage:
  - id: D1
    description: "ADMIN sets a work type's service, unit, typical period and typical crew in /admin «Виды работ», saves, reloads the page, and all values persist (KB-02 SC#2)"
    requirement: KB-02
    verification:
      - kind: manual_procedural
        ref: "08-08-PLAN.md Task 3 UAT steps 1-2 — set 5 values, full page reload, values unchanged (against live migrations 053/055)"
        status: unknown
    human_judgment: true
    rationale: "A browser round-trip against the live Supabase schema — the executor cannot drive the ADMIN session or observe post-reload state. Automated build/test/lint/tsc all pass; the persistence writer itself is unit-covered in Plan 08-04."
  - id: D2
    description: "The typical period control offers exactly three choices and stores 'DAY', 'NIGHT' or 'AROUND' — the daily_plan_items.shift_type value set"
    requirement: KB-02
    verification:
      - kind: other
        ref: "code: `const PERIODS: TypicalPeriod[] = ['DAY','NIGHT','AROUND']` drives the toggle; grep of the component finds each literal once; tsc strict clean"
        status: pass
    human_judgment: false
  - id: D3
    description: "Crew counters cannot go below zero or hold a fractional value; they persist as jsonb keys workers/foremen/itr/vehicles, never required_workers"
    requirement: KB-02
    verification:
      - kind: other
        ref: "code: clampInt = Math.max(0, Math.floor(...)) in setCrewKey + normCrew; CREW_KEYS = ['workers','foremen','itr','vehicles']; `grep -c required_workers` = 0; server writer sanitizes again (08-04)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Saving an unchanged row is a plain scalar overwrite with no accumulating field (KB-02 idempotency)"
    requirement: KB-02
    verification:
      - kind: other
        ref: "code: save() builds attrs from per-field *Dirty flags — an unchanged row sends {} and the Save button is disabled (!dirty); writer is a single .update() (08-04 coverage KB-02-idempotency)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Tab has a search box, «Без службы» + «Не заполнено» chips, a construction→object breadcrumb per row, and a checkbox multi-select with one «Проставить службу выбранным» bulk action (D-18)"
    verification:
      - kind: other
        ref: "grep finds `Без службы`, `Не заполнено`, `Проставить службу выбранным`; build/tsc/lint green"
        status: pass
      - kind: manual_procedural
        ref: "08-08-PLAN.md Task 3 UAT steps 4-6 — chip filtering, search narrowing, breadcrumb visible, bulk sets service on 2 rows"
        status: unknown
    human_judgment: true
    rationale: "Interactive filtering / bulk behaviour needs a human in the browser; structural presence is grep-verified."
  - id: D6
    description: "Create and delete of a work type still work, delete confirmation is the in-app useConfirm dialog (no browser popup)"
    verification:
      - kind: other
        ref: "grep: component calls createWorkType + deleteWorkType, imports useConfirm, `grep -c 'window.confirm|window.alert'` = 0"
        status: pass
      - kind: manual_procedural
        ref: "08-08-PLAN.md Task 3 UAT step 7 — create a throwaway work type then delete it via the in-app dialog"
        status: unknown
    human_judgment: true
    rationale: "Runtime CRUD against live DB + visual confirm of the dialog — needs a human session."
  - id: D7
    description: "Loading and error states use useLoadData with PanelLoader and DataErrorBanner"
    verification:
      - kind: other
        ref: "code: `const { loading, error, reload } = useLoadData(loadFn)`; `if (loading) return <PanelLoader />`; `{error && <DataErrorBanner .../>}`; grep finds all three identifiers"
        status: pass
    human_judgment: false
  - id: D8
    description: "Light mode is readable — no unstyled or invisible text; no isLight branching in JS"
    verification:
      - kind: other
        ref: "`grep -c isLight` = 0; dark utility classes only (bg-white/5, text-white/40, glass, form-select)"
        status: pass
      - kind: manual_procedural
        ref: "08-08-PLAN.md Task 3 UAT step 8 — switch app to light mode, tab still readable"
        status: unknown
    human_judgment: true
    rationale: "Light-mode legibility is a visual judgment; the CSS-token override layer is not exercised by any automated check."

# Metrics
duration: 6min
completed: 2026-09-03
status: complete
---

# Phase 8 Plan 08: «Виды работ» dedicated attribute editor Summary

**`/admin` → «Виды работ» is rebuilt as a dedicated per-row editor (`WorkTypeAttributesTab`): an ADMIN sets each work type's service, unit, typical period (день/ночь/сутки → `DAY`/`NIGHT`/`AROUND` from the `SHIFT_HOURS` эталон) and typical crew (four steppers → `typical_crew {workers,foremen,itr,vehicles}`), persisted through the ADMIN-gated `updateWorkTypeAttributes` with a save-diff idiom; plus a search box, «Без службы» / «Не заполнено» chips, a construction→object breadcrumb per row, and a single «Проставить службу выбранным» bulk action. Create and delete are preserved. The generic `CrudTab`-based inline tab is gone and the lint baseline dropped 47 → 46.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-09-03T11:31:32Z
- **Completed:** 2026-09-03T11:37:34Z
- **Tasks:** 3 (2 code, committed atomically; Task 3 is a UAT — automated portion green, human round-trip pending)
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- **Task 1 — `WorkTypeAttributesTab.tsx` (`e99c605`).** Dedicated editor on the `WorkPermitCatalogEditor` precedent: `useLoadData` load/error with `PanelLoader` / `DataErrorBanner`; per-row local edit state + per-row `busy`; per-field dirty flags feeding a save-diff so an unchanged save sends `{}` and the Save button disables. Controls: service `<select>` (services + empty option), `unit` `<input list>` with the `м² / п.м. / шт. / м³ / компл. / т` datalist, a three-button день/ночь/сутки segmented toggle deriving its labels+emoji from `SHIFT_HOURS` and storing `DAY|NIGHT|AROUND` (click-active clears to null), four crew steppers clamped to non-negative integers in the change handler writing exactly `{workers,foremen,itr,vehicles}`. Create (`createWorkType`, id+construction+name) and delete (`deleteWorkType` behind `useConfirm`) preserved. No `eslint-disable`, no `isLight`, strict TS, no `any`.
- **Task 2 — D-18 affordances + admin wiring (`9ae56f3`).** Search over work name / id / construction name / object name; «Без службы» (null `service_id`) and «Не заполнено» (missing `typical_period` or `typical_crew`) chips that combine with search; construction→object breadcrumb per row from an in-memory join; checkbox column + select-all-visible + one «Проставить службу выбранным» bulk action (sequential loop of `updateWorkTypeAttributes`, disabled with `N/total` progress, single `reload()`). `admin/page.tsx`: `WorkTypeAttributesTab` imported next to `ShiftTab`, the `work_types` render line repointed, the dead inline `WorkTypesTab` and its now-unused imports (`fetchWorkTypes`, `createWorkType`, `updateWorkType`, `deleteWorkType`, `WorkType` type) deleted. Diff limited to the import block, the render line and the removed function.
- **Task 3 — UAT (checkpoint).** Automated portion (`npm run build && npm run test`) green. The human browser round-trip (set attributes → reload → persist; negative/fractional rejection; chips/search/breadcrumb/bulk; create+delete; light mode) is recorded as pending per the phase-wide standing checkpoint policy — see "Pending human verification" below.
- **Verification:** `npx tsc --noEmit` clean; `npm run lint` **0 errors / 46 warnings** (baseline 47, did not grow — shrank by 1 with the inline tab removed); `npm run build` green; `npm run test` **519 passing** (18 files, unchanged); `git diff package.json package-lock.json` empty.

## Task Commits

1. **Task 1: WorkTypeAttributesTab — dedicated per-row attribute editor (D-17)** — `e99c605` (feat)
2. **Task 2: D-18 affordances + wire «Виды работ» tab into admin router** — `9ae56f3` (feat)
3. **Task 3: UAT — KB-02 attributes persist across reload** — checkpoint; automated checks green, human round-trip pending (no code commit)

**Plan metadata:** _(this docs commit)_

## Files Created/Modified

- `src/components/admin/WorkTypeAttributesTab.tsx` — **created** (~506 lines). Default export `WorkTypeAttributesTab` + non-exported `AttrRow` and `CreateWorkTypeForm`. Module consts `UNIT_SUGGESTIONS`, `PERIODS`, `CREW_KEYS`, `CREW_LABELS`, `EMPTY_CREW`, `clampInt`, `normCrew`, `crewEqual`, `chipCls`.
- `src/app/admin/page.tsx` — **modified.** Import block: dropped the `fetchWorkTypes/createWorkType/updateWorkType/deleteWorkType` line and the `WorkType` type; added `import WorkTypeAttributesTab`. Render line `work_types` → `<WorkTypeAttributesTab />`. Removed the 13-line inline `WorkTypesTab`. Net −14 lines.

## Decisions Made

- **Active-period click clears to null.** The three-button toggle has no separate "clear" control; clicking the currently-selected period returns it to `null` (a value `updateWorkTypeAttributes` explicitly accepts). "Exactly three choices" is read as the offered option set, not a not-null constraint — a row legitimately starts with no period.
- **`fetchObjects()` added to the load.** See Deviations. Needed for the D-18 construction→object breadcrumb must_have to show a real object name rather than a UUID.
- **Remount-on-persist instead of a re-seed effect.** The row `key` embeds a digest of the persisted attributes (`id:service:unit:period:crewJSON`). After any save or the bulk action the digest changes, React remounts the row, and local edit state re-seeds from props via `useState` initialisers — the same "seed from props, rely on remount" idiom as the `WorkPermitCatalogEditor` precedent. A `useEffect` re-seed was tried first and dropped because it tripped `react-hooks/set-state-in-effect` (would have grown the lint baseline).
- **No component test.** CLAUDE.md scopes Vitest to pure business logic (shift math, transforms) — not UI.

## Deviations from Plan

### 1. [Rule 3 - Blocking / faithful-to-must_have] Added `fetchObjects()` as a 4th parallel load

- **Found during:** Task 2 (D-18 breadcrumb).
- **Issue:** The plan's Task 2 action says the construction→object breadcrumb is "joined in memory from the already-loaded `fetchConstructions()` result — no extra fetch", and Task 1 lists exactly three fetches. But `constructions` rows carry only `object_id`, not the object name, so that join yields `construction_name → <uuid>` — not the disambiguation the must_have calls for ("tell two identically-named work types apart").
- **Fix:** Added `fetchObjects()` to the existing `Promise.all` in `loadFn`; built an `objById` map; the breadcrumb now renders `construction_name → object_name`. One extra read on tab mount, no extra round-trips per row, still a single `Promise.all`.
- **Files modified:** `src/components/admin/WorkTypeAttributesTab.tsx`.
- **Verification:** `npx tsc --noEmit`, `npm run lint` (46 warnings), `npm run build`, `npm run test` (519) all green.
- **Committed in:** `9ae56f3` (Task 2 commit).

---

**Total deviations:** 1 (extra read to satisfy a D-18 must_have literally).
**Impact on plan:** No scope creep, no contract change, no new files. The breadcrumb is the only thing affected and it is now meaningful.

## Issues Encountered

- **`react-hooks/set-state-in-effect` on the first re-seed approach.** A `useEffect(() => { setServiceId(...); ... }, [wt])` to re-seed the row after `reload()` added a 48th lint warning (baseline 47). Replaced with the attribute-digest row `key` so React remounts the row and the `useState` initialisers do the re-seed — 0 net new warnings, and removing the dead inline `WorkTypesTab` took the baseline to 46.

## User Setup Required

None — no external service configuration. Migrations 053/054/055 were already applied and verified in Plan 08-07.

## Pending human verification

The Task 3 UAT (`checkpoint:human-verify`, `gate="blocking"`) was **not** returned to the human — per the phase-wide standing checkpoint policy the executor only halts for `human-action` / `blocking-human` gates (migration apply, auth, package legitimacy). The automated half of the gate (`npm run build && npm run test`) is green. The browser round-trip below is outstanding and should be run by an ADMIN (login 0000 / PIN 1234) at `/admin` → «Виды работ», local `npm run dev` or gormost.vercel.app:

1. Pick a service-less work type; set service + unit, choose «ночь», set the four crew counters to distinct non-zero values; Save.
2. Full page reload, reopen the tab — all five values unchanged (**KB-02 SC#2**).
3. Try a negative and a fractional crew value — neither can be entered.
4. «Без службы» hides the row just edited; «Не заполнено» selects rows missing period or crew.
5. Search narrows the list; each visible row shows its construction→object breadcrumb.
6. Tick two rows, «Проставить службу выбранным», pick a service — both show it after reload.
7. Create a throwaway work type, then delete it — the delete confirm is the in-app dialog.
8. Switch to light mode — the tab is readable.

Recorded in `.planning/WINDOWS.md` as an `unrun-verify` entry.

## Next Phase Readiness

- **Phase 9** (Excel/Титул ingest): the tab is the manual path to attribute rows ingest can't auto-classify; `typical_crew` key contract is enforced in the UI now as well as the writer.
- **Phase 11** (EXT-05 dictation prefill): `typical_crew {workers,foremen,itr,vehicles}` written here is the exact shape the draft-row prefill reads.
- **No blocker.** The one open item is the human UAT above; all automated gates pass.

## Self-Check: PASSED

- `src/components/admin/WorkTypeAttributesTab.tsx` — FOUND
- `src/app/admin/page.tsx` — `WorkTypeAttributesTab` referenced x2, `function WorkTypesTab` x0
- Commits `e99c605`, `9ae56f3` — FOUND in `git log`
- Component greps: `updateWorkTypeAttributes`/`useLoadData`/`PanelLoader`/`DataErrorBanner`/`useConfirm` present; `isLight` 0; `window.confirm|window.alert` 0; `eslint-disable` 0; `required_workers` 0; `workers`/`foremen`/`itr`/`vehicles` present; `DAY`/`NIGHT`/`AROUND` present; `Без службы` / `Не заполнено` / `Проставить службу выбранным` present
- `npx tsc --noEmit` clean · `npm run lint` 0 errors / 46 warnings · `npm run build` green · `npm run test` 519 passing

---
*Phase: 08-knowledge-base-schema-russian-resolver-catalog-vocabulary*
*Completed: 2026-09-03*
