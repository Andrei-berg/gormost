---
phase: 08-knowledge-base-schema-russian-resolver-catalog-vocabulary
plan: 09
subsystem: ui
tags: [react, admin, entity-aliases, resolver, normalizer, supabase, kb]

# Dependency graph
requires:
  - phase: 08-04
    provides: KB persistence layer (src/lib/api/knowledge.ts) — fetch/create/update/delete/findAliasCollisions, all four mutations ADMIN-gated in ROLE_RESTRICTED
  - phase: 08-05
    provides: collision predicate + resolver ambiguity assertion (src/lib/kb/collisions.test.ts), alias fuzzy-entry weighting
  - phase: 08-07
    provides: migrations 053/054/055 applied — entity_aliases table + anon_all_entity_aliases policy live with 28 seeded rows
  - phase: 08-08
    provides: WorkTypeAttributesTab precedent for an extracted admin tab component
provides:
  - "/admin → «Синонимы» tab: searchable alias list with source badge, weight, resolved canonical name per row"
  - "Collapsible add form (canonical_type selector + free-text-plus-suggest entity picker + surface input) with the D-13 soft collision warning on submit"
  - "In-place weight and scope_object_id editing; delete behind the in-app confirm dialog"
  - "One canonical string normalizer — journal `norm` re-pointed at src/lib/kb/normalize.ts"
affects: [phase-09-spreadsheet-ingest, phase-11-dictation-resolver, phase-13-correction-loop]

actuals:
  tokens: 7000
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Extracted admin tab component wired through the admin/page.tsx Tab union + tabs[] + render block (mirrors ShiftTab / WorkTypeAttributesTab)"
    - "Soft collision warning: findAliasCollisions runs BEFORE the write and only drives a useConfirm banner — the write is never blocked, no conflict flag, existing row untouched (D-13)"
    - "Alias surface_norm computed client-side via preprocess().normalized so the collision check keys on the resolver's exact index key (D-09, D-14)"
    - "Single canonical normalizer: journal/data.ts re-exports `normalize as norm` rather than keeping a divergent local definition"

key-files:
  created:
    - src/components/admin/AliasManagerTab.tsx
  modified:
    - src/app/admin/page.tsx
    - src/components/journal/data.ts

key-decisions:
  - "Pre-existing untracked AliasManagerTab.tsx (~588 lines) already satisfied every Task 1 acceptance criterion — committed as-is with no edits"
  - "journal `norm` collapsed onto @/lib/kb/normalize via `export { normalize as norm }` — export name preserved so revert is a one-liner"
  - "«Синонимы» tab uses the 🔗 emoji, inserted directly after «Виды работ» in the admin tab bar"

patterns-established:
  - "Alias manager add flow: preprocess → findAliasCollisions → useConfirm (only if collisions) → createEntityAlias → reload"
  - "Dangling canonical_id renders an explicit ⚠ битая ссылка marker (matches buildKbIndex skip behaviour) instead of a blank cell"

requirements-completed: [KB-03]

coverage:
  - id: D1
    description: "ADMIN opens /admin → «Синонимы», searches by surface form or canonical entity name, and sees each alias row's source badge, weight and resolved canonical name"
    requirement: KB-03
    verification:
      - kind: manual_procedural
        ref: "08-09-PLAN.md Task 3 how-to-verify steps 1-2 — verified on gormost.vercel.app, 28 seeded aliases listed with «из справочника» badge, weight, canonical name; entity picker suggests objects (user screenshots)"
        status: pass
    human_judgment: true
    rationale: "Deployed-site visual verification of list rendering, badge styling and search behaviour — no automated UI harness in this project"
  - id: D2
    description: "Adding a surface that already resolves to a DIFFERENT canonical of the same type shows an inline soft warning; ADMIN confirms and BOTH rows persist — no hard block, no conflict flag"
    requirement: KB-03
    verification:
      - kind: manual_procedural
        ref: "08-09-PLAN.md Task 3 step 4 — user ran the collision script, soft warning named the existing canonical, confirmed, both rows persisted"
        status: pass
      - kind: unit
        ref: "src/lib/kb/collisions.test.ts (Plan 08-05) — pins the pure predicate + resolver ambiguity"
        status: pass
    human_judgment: true
    rationale: "End-to-end collision behaviour on the live DB is a human UAT; the pure predicate is separately unit-covered"
  - id: D3
    description: "A true duplicate (same surface_norm + canonical_type + scope) is refused by the unique expression index and shown as a readable message, not a silent no-op"
    requirement: KB-03
    verification:
      - kind: manual_procedural
        ref: "08-09-PLAN.md Task 3 step 5 — user saw a readable error notice on the duplicate add"
        status: pass
    human_judgment: true
    rationale: "Requires a live DB round-trip to trigger the index rejection"
  - id: D4
    description: "In-place weight + scope_object_id editing and delete behind the in-app confirm dialog; tab readable in light mode"
    requirement: KB-03
    verification:
      - kind: manual_procedural
        ref: "08-09-PLAN.md Task 3 steps 6-8 — user confirmed weight/scope save, delete via in-app dialog, light mode readable"
        status: pass
    human_judgment: true
    rationale: "Visual + interaction verification on the deployed site"
  - id: D5
    description: "The project has one canonical string normalizer — journal `norm` re-pointed at src/lib/kb/normalize.ts; the /journal object combobox still suggests and selects correctly"
    verification:
      - kind: manual_procedural
        ref: "08-09-PLAN.md Task 3 step 9 — user eyeballed the /journal «Новая запись плана» object combobox with mixed case + quote/dash input; suggestions still correct, no wrong matches"
        status: pass
      - kind: unit
        ref: "npm run test — 18 files, 519 passed (normalize.test.ts locks the KB normalizer)"
        status: pass
    human_judgment: true
    rationale: "The re-point is a behaviour change on a shipped screen; the sanctioned mitigation is an explicit human eyeball of the affected dropdown"

duration: 14min
completed: 2026-09-09
status: complete
---

# Phase 08 Plan 09: Alias Manager + Normalizer Collapse Summary

**ADMIN now manages the resolver's irregular-Russian vocabulary from /admin → «Синонимы» — searching by surface or canonical, seeing each alias's provenance, and getting a confirmable soft warning when one phrase would bind to two canonicals — and the journal and KB share a single string normalizer.**

## Performance

- **Duration:** ~14 min active work (checkpoint spanned 2026-09-03 → 2026-09-09 awaiting UAT)
- **Started:** 2026-09-03T15:33:00Z
- **Completed:** 2026-09-09
- **Tasks:** 3 (Task 3 = human UAT checkpoint)
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- Shipped `AliasManagerTab.tsx` — the D-19 «Синонимы» tab: searchable alias list (surface_raw / surface_norm / resolved canonical name), per-row source badge (seed / manual / voice / correction), weight, scope object; collapsible add form with a canonical_type selector and a free-text-plus-suggest entity picker.
- Implemented the D-13 soft collision warning: `findAliasCollisions` runs before the write and only drives a `useConfirm` banner naming the existing canonical; on confirm both rows persist, nothing is blocked or flagged, and that surface then resolves ambiguous (pinned by `collisions.test.ts`).
- Wired the tab into the `/admin` router with the minimal four-point edit (Tab union, tabs[] entry, render line, import).
- Collapsed the project's two string normalizers into one — `src/components/journal/data.ts` now re-exports `normalize as norm` from `@/lib/kb/normalize`.
- KB-03 verified end-to-end on gormost.vercel.app: seeded aliases visible (RLS policy live), search by surface and canonical both work, collision soft-warning keeps both rows, true duplicate rejected with a readable message, in-place weight/scope edit + delete work, light mode readable, and the /journal object combobox still suggests correctly after the norm re-point.

## Task Commits

1. **Task 1: AliasManagerTab — search, source badges, add form with the D-13 soft collision warning** - `660739e` (feat)
2. **Task 2: Register the «Синонимы» tab and collapse the two normalizers into one** - `b675db4` (feat)
3. **Task 3: UAT — KB-03 alias management, the collision warning, and the /journal eyeball** - human-verify checkpoint, APPROVED by the user, no defects

**Interim state commit:** `df18e7c` (docs: STATE position at checkpoint)
**Plan metadata:** this SUMMARY commit (docs)

## Files Created/Modified
- `src/components/admin/AliasManagerTab.tsx` (created, ~588 lines) - the «Синонимы» alias manager: `useLoadData` batch load of aliases + objects + work types + services, per-row canonical-name resolution from already-loaded arrays, source badge, in-place weight/scope editing, delete, collapsible add form, D-13 soft collision check via `findAliasCollisions` + `useConfirm`, `preprocess().normalized` for the index key, unique-index rejection surfaced as a readable notice, `surface_raw` rendered as React text only.
- `src/app/admin/page.tsx` (modified, +4/-1) - `aliases` added to the `Tab` union, `{ id: 'aliases', label: 'Синонимы', emoji: '🔗' }` inserted after `work_types`, render line `{tab === 'aliases' && <AliasManagerTab />}`, `AliasManagerTab` import next to `WorkTypeAttributesTab`.
- `src/components/journal/data.ts` (modified) - local `norm` definition replaced with `export { normalize as norm } from '@/lib/kb/normalize'`.

## Decisions Made
- **Committed the pre-existing untracked `AliasManagerTab.tsx` as-is.** The file (~588 lines, from a prior session) was evaluated line-by-line against the Task 1 `<action>` spec and every acceptance criterion — client component; all required identifiers present; all four source badge labels; `grep -c` = 0 for `dangerouslySetInnerHTML`, `window.confirm|window.alert`, `isLight`, `eslint-disable`; `findAliasCollisions` (line 150) precedes `createEntityAlias` (line 170); `preprocess().normalized` used for the collision key. tsc/lint/build/test all green. No edits were needed.
- **Preserved the `norm` export name** in `data.ts` rather than renaming and updating call sites in the same commit, so a revert stays a one-line change back to the local definition.

## Deviations from Plan

### 1. [Doc correction] Task 2 — `norm` has two consumers, not one

- **Found during:** Task 2
- **Plan statement:** 08-PATTERNS.md / Task 2 `<read_first>` describe `ObjectCombobox.tsx` as the *only* consumer of `journal/data.ts` `norm`.
- **Reality:** `src/components/journal/AddItemModal.tsx` also imports `norm` from `./data` (line 4, used at line 52 for an `exact` match check).
- **Impact:** None. Both call sites use `norm` as `(s: string) => string`, which `normalize(input: string): string` satisfies exactly. tsc, lint, build and the full 519-test suite pass unchanged. The re-export keeps both compiling and a revert is still a one-liner.
- **Action taken:** No code change beyond the planned re-export; recorded here and in STATE.

## Issues / Observations (not defects in this plan)

- **Project-wide RLS findings in the Supabase Security Advisor.** The Advisor reports 29 pre-existing project-wide findings: `policy_exists_rls_disabled` / `rls_disabled_in_public` on old tables (`categories`, `objects`, `constructions`, `requests`, `services`, `work_types`, `shifts`, `vehicles`, `schedules`, …), plus `rls_enabled_no_policy` on `work_permit_types` / `work_permit_service_types`. **This plan's own table `entity_aliases` is NOT flagged** — migration 054 enabled RLS and created `anon_all_entity_aliases` correctly, and UAT step 1 confirmed the seeded rows are readable. Recommend a separate whole-app RLS hardening migration; out of scope for phase 08.
- **Normalizer collapse widens journal suggest matching slightly.** The KB normalizer is stricter than the old local `norm` (also strips quotes, canonicalizes the number marker, collapses dash variants), so `/journal` object suggestions match a little more aggressively. This is the intended improvement and UAT step 9 confirmed no wrong matches. **Fallback if it ever breaks a real workflow:** restore the local definition in `data.ts` — `export const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim()` — a one-line revert.

## Known Stubs

None. All alias fields are wired to real data (`entity_aliases` + the three catalog fetches); no placeholder values, no unwired components.

## TDD Gate Compliance

N/A — plan `type: execute`, not `type: tdd`. Per CLAUDE.md the alias manager is a UI component (tests cover pure business logic only); the collision predicate it calls is already covered by `src/lib/kb/collisions.test.ts` from Plan 08-05.

## Verification

| Check | Result |
| ----- | ------ |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | 0 errors, 46 warnings (baseline ≤ 47) |
| `npm run build` | exit 0 |
| `npm run test` | 18 files, 519 tests passed |
| KB-03 UAT (Task 3, deployed site) | APPROVED by user — steps 1-9 all pass, no defects |
| `src/app/admin/page.tsx` diff scope | import block + Tab union + tabs[] + render block only |

## Self-Check: PASSED

- `src/components/admin/AliasManagerTab.tsx` — FOUND
- `src/app/admin/page.tsx` — FOUND (aliases tab present, grep `AliasManagerTab` = 2, `'aliases'` = 3, `Синонимы` = 1)
- `src/components/journal/data.ts` — FOUND (re-exports `normalize as norm`, no local `norm` definition)
- Commit `660739e` — FOUND
- Commit `b675db4` — FOUND
- Commit `df18e7c` — FOUND
