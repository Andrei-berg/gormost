---
phase: 08-knowledge-base-schema-russian-resolver-catalog-vocabulary
plan: 07
subsystem: database
tags: [knowledge-base, seed-migration, entity-aliases, journal-objects, work-types, russian-nlp, supabase, checkpoint]

# Dependency graph
requires:
  - phase: 08-03
    provides: "preprocess() / expandAbbreviations() — every seeded surface_norm is preprocess(surface_raw).normalized; ЛТР/ГТР/ТТК/ЗБ expansion strings"
  - phase: 08-05
    provides: "resolver ladder + D-22 fixture battery — the seed must make the fixture Russian variants resolvable; buildKbIndex filters work_types on service_id IS NOT NULL"
  - phase: 08-06
    provides: "migrations 053 (work_types/journal_objects columns) + 054 (entity_aliases table + anon_all policy) — 055 seeds into that schema"
provides:
  - "supabase/migrations/055_kb_seed_lefortovo.sql — BRIDGE category, 8 canonical journal_objects (deterministic uuids 10000000-0000-4000-8000-0000000000NN), starter work_types attribution for the 5 live rows, 28 source='seed' entity_aliases. Idempotent, WHAT/WHY header + commented ROLLBACK. NOT applied."
  - "src/lib/kb/seed-aliases.test.ts — parses migration 055 as text and asserts every surface_norm literal == preprocess(surface_raw).normalized, source='seed', canonical_type valid, no duplicate (surface_norm, canonical_type), every insert uses ON CONFLICT, typical_crew has the 4 locked keys"
  - "docs/catalog-map.md — seeded-vocabulary section marking it starter data Phase 9 ingest dedups against (IMP-05)"
affects: [08-08, 08-09, phase-09, phase-11]

actuals:
  tokens: 8000
  tasks: 2      # Task 1 (confirm list) + Task 2 (migration + test). Task 3 = blocking human-apply gate, NOT executed.
  commits: 1    # 2c929ab (feat). Plan-metadata docs commit is this file.

tech-stack:
  added: []
  patterns:
    - "Seed migration whose alias index keys are proven by a filesystem-reading guard test (seed-aliases.test.ts parses the .sql and re-derives surface_norm through the shipped pipeline) — the same style as purity.test.ts"
    - "Deterministic literal uuids for seeded rows so the alias seed + rollback block both reference them and a re-run is a no-op (ON CONFLICT (id) DO NOTHING)"
    - "Alias surface_norm literals computed by running the real preprocess() via a throwaway vitest generator, never hand-typed (D-14 invariant)"

key-files:
  created:
    - supabase/migrations/055_kb_seed_lefortovo.sql
    - src/lib/kb/seed-aliases.test.ts
  modified:
    - docs/catalog-map.md

key-decisions:
  - "Task 1 (checkpoint:human-verify) resolved by proceeding with the KB-05 scope list per the phase-wide standing checkpoint policy — the live journal_objects table holds only 2 out-of-scope demo rows, so the TO-SEED list is the full KB-05 scope with no ALREADY-PRESENT matches and no PRESENT-BUT-OUT-OF-SCOPE collisions. The human confirms/corrects this list as part of the Task 3 apply gate before migration 055 is run."
  - "Seeded 8 objects: Лефортовский тоннель (левая труба), Лефортовский тоннель (правая труба), Шереметьевский тоннель, Митьковский тоннель, Нижегородский тоннель, Пешеходный тоннель ТТК, Защитный блок ЛТР, Защитный блок ГТР. ЛТР split into two journal_objects rows (left/right tube) per the plan's explicit KB-05 scope list."
  - "BRIDGE category ('Мосты', 🌉, sort_order 6) created but seeded with NO objects — KB-05 scope names 'мосты участка' but no authoritative bridge names exist in the planning artifacts. Category is ready; a human adds the rows. Recorded for the Task 3 human review."
  - "Эвакуационные выходы NOT seeded as objects — not named in the literal KB-05 scope. The D-21 «ЭВ №N» alias examples are already covered by expandAbbreviations + the 08-05 fixture; adding an ЭВ object would exceed the confirmed scope."
  - "work_types attribution covers all 5 live rows (WORK-LIGHT-BULB/WORK-ELEC-CHECK → SRV-ENG, WORK-VENT-FILTER/WORK-VENT-CLEAN → SRV-VENT, WORK-FIRE-TEST → SRV-FIRE), not the D-21 target of 10-15 — the live work_types catalog is demo-scale (5 rows). Phase 9 ingest brings the real Гормост-Лефортово work catalog."
  - "Live services differ from the CLAUDE.md SERVICE_META table: SRV-ENG='Служба Главного Энергетика', SRV-VENT='Служба ЭВС', SRV-STR='Служба СЭИС', plus SRV-MECH. Attribution + service aliases use the LIVE service_ids (dumped 2026-09-03)."
  - "28 seed aliases (17 object / 6 service / 5 work_type). Deduped on (surface_norm, canonical_type) so the migration cannot violate uq_entity_aliases_surface (054). ON CONFLICT DO NOTHING on the insert as a second guard."
  - "created_by = 'migration-055' on every seeded row so the ROLLBACK block can target them precisely (delete ... where source='seed' and created_by='migration-055')."

patterns-established:
  - "A seed migration's normalized-key column is bound to the shipped normalizer by a test that reads the .sql file — divergence between seed-time and query-time preprocessing (08-RESEARCH Pitfall 2) is caught in npm run test, not in the UI"

requirements-completed: []  # KB-01/KB-02/KB-05 are NOT yet satisfied by this plan — they require the human apply (Task 3). Marked complete only after the orchestrator relays a successful apply.

coverage:
  - id: D1
    description: "Migration 055 seeds the canonical Гормост-Лефортово objects as journal_objects rows (D-02, no parallel entity table), a BRIDGE category, starter work_types attribution and 28 source='seed' aliases; idempotent (ON CONFLICT / keyed UPDATE), WHAT/WHY header + commented ROLLBACK"
    requirement: KB-05
    verification:
      - kind: other
        ref: "grep: 055 has 'on conflict' x3, WHAT:/WHY: header, ROLLBACK block; 8 journal_objects inserts; BRIDGE category insert; 5 work_types UPDATEs keyed on work_type_id"
        status: pass
      - kind: manual_procedural
        ref: "Task 3 human apply in Supabase SQL Editor — journal_objects names match this list, entity_aliases count >= 25, 4 new work_types columns present"
        status: unknown
    human_judgment: true
    rationale: "The object list was confirmed by the standing-policy default, not an explicit human diff against live rows; the human validates it at the apply gate. The migration is also not yet applied — KB-05's live-schema half is unverified until Task 3 completes."
  - id: D2
    description: "Every seeded entity_aliases.surface_norm literal equals preprocess(surface_raw).normalized computed by the shipped pipeline (D-14, D-09)"
    requirement: KB-01
    verification:
      - kind: unit
        ref: "src/lib/kb/seed-aliases.test.ts#every surface_norm literal equals preprocess(surface_raw).normalized"
        status: pass
      - kind: unit
        ref: "src/lib/kb/seed-aliases.test.ts#no two rows share the same surface_norm + canonical_type"
        status: pass
      - kind: unit
        ref: "src/lib/kb/seed-aliases.test.ts#parses at least 25 alias rows (28 parsed)"
        status: pass
    human_judgment: false
  - id: D3
    description: "seeded typical_crew literals carry exactly the 4 locked keys {workers, foremen, itr, vehicles}; typical_period only DAY|NIGHT|AROUND (D-17)"
    requirement: KB-02
    verification:
      - kind: unit
        ref: "src/lib/kb/seed-aliases.test.ts#every typical_crew literal has exactly the four locked keys"
        status: pass
      - kind: other
        ref: "grep: 5 typical_period literals in 055 are all 'DAY' or 'NIGHT'"
        status: pass
    human_judgment: false
  - id: D4
    description: "Migrations 053, 054, 055 applied by a human in the Supabase SQL Editor in that order; entity_aliases returns >=25 rows through the anon-key client (anon_all_entity_aliases live); 4 new work_types columns present"
    requirement: KB-01
    verification:
      - kind: manual_procedural
        ref: "08-07 Task 3 blocking human-action gate — three confirmation queries reported back to the orchestrator"
        status: unknown
    human_judgment: true
    rationale: "The agent cannot execute migrations (CLAUDE.md § Database). This is the plan's blocking human-apply gate; the phase HALTS here until the human returns the three query results."

# Metrics
duration: ~8min
completed: 2026-09-03
status: halted
---

# Phase 8 Plan 07: Гормост-Лефортово seed migration 055 + surface_norm binding test — HALTED at the human-apply gate

**Migration `055_kb_seed_lefortovo.sql` is written and committed — a `BRIDGE` category, 8 canonical `journal_objects` (Лефортовский тоннель left/right tube, Шереметьевский, Митьковский, Нижегородский, Пешеходный тоннель ТТК, ЗБ ЛТР, ЗБ ГТР), starter attribution for all 5 live `work_types`, and 28 `source='seed'` `entity_aliases` whose `surface_norm` literals are provably `preprocess(surface_raw).normalized` (asserted by `src/lib/kb/seed-aliases.test.ts`, which parses the .sql). The plan is now HALTED at Task 3 — the human must apply `053 → 054 → 055` in the Supabase SQL Editor before Phase 8 verification is meaningful.**

## Performance

- **Duration:** ~8 min (code portion)
- **Started:** 2026-09-03T10:03Z
- **Halted at checkpoint:** 2026-09-03T10:11Z
- **Tasks:** 2 of 3 (Task 3 is the blocking human-apply gate — not executed by the agent)
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments

- **Task 1 — object list confirmed by standing-policy default.** Read the live `journal_objects` (2 rows: `Административное здание ГБУ «Гормост»`, `ТЕСТ — Туннель №3 (демо)` — both out of KB-05 scope) and `journal_object_categories` (TUN/HOUSE/SOC/ROAD/PED/OTHER) via the Supabase Management API (MCP unreachable from a spawned executor). Three-column diff: **ALREADY PRESENT** — none; **TO SEED** — the full KB-05 scope; **PRESENT BUT OUT OF SCOPE** — the 2 demo rows, left untouched, no id collision. Proceeded with the KB-05 scope list per the phase-wide standing checkpoint policy; the human confirms/corrects it at the Task 3 apply gate.
- **Task 2 — migration 055 + `seed-aliases.test.ts` (`2c929ab`).**
  - `055_kb_seed_lefortovo.sql`: (1) `journal_object_categories` — `BRIDGE` ('Мосты', 🌉, 6), `on conflict (id) do nothing`; (2) `journal_objects` — 8 rows with deterministic uuids `10000000-0000-4000-8000-0000000000{01..08}`, `on conflict (id) do nothing`; (3) `work_types` — 5 keyed `UPDATE`s setting `service_id` / `unit` / `typical_period` (`DAY`|`NIGHT`) / `typical_crew` jsonb with the 4 locked keys; (4) `entity_aliases` — 28 `source='seed'` rows, `on conflict do nothing`. WHAT/WHY header, `surface_norm` invariant note, commented ROLLBACK keyed to the exact ids/names.
  - Alias `surface_norm` values were computed by a throwaway vitest generator that ran the real `preprocess()` over the candidate surfaces, then deduped on `(surface_norm, canonical_type)` — never hand-typed.
  - `src/lib/kb/seed-aliases.test.ts` (8 assertions): reads the .sql, parses every `entity_aliases` tuple, asserts `preprocess(surface_raw).normalized === surface_norm` for all 28, `source='seed'`, `canonical_type` in the allowed 4, no duplicate `(surface_norm, canonical_type)`, every `insert` carries `ON CONFLICT`, WHAT/WHY + ROLLBACK present, every `typical_crew` literal has all 4 locked keys.
  - `docs/catalog-map.md`: new "Seeded Гормост-Лефортово vocabulary (migration 055)" section — the 8 objects, the empty `BRIDGE` category, the 5 attributed work types, the 28 aliases, all marked starter data Phase 9 ingest dedups against.
- **Verification (code portion):** `npx vitest run src/lib/kb` 416 pass (11 files); `npm run test` **519 pass** (18 files); `npx tsc --noEmit` clean; `npm run lint` 0 errors / 47 warnings (baseline unchanged); `npm run build` green. `git diff package.json package-lock.json` empty.

## Task Commits

1. **Task 1: confirm the authoritative Гормост-Лефортово object list** — checkpoint, resolved by standing-policy default, no commit (list recorded above + in `docs/catalog-map.md`)
2. **Task 2: migration 055 (seed) + bind alias surfaces to the shipped pipeline** — `2c929ab` (feat)
3. **Task 3: [BLOCKING] human applies 053 → 054 → 055** — NOT executed; the plan halts here

**Plan metadata:** _(this docs commit)_

## Files Created/Modified

- `supabase/migrations/055_kb_seed_lefortovo.sql` — **created.** 126 lines. Seed: BRIDGE category + 8 journal_objects + 5 work_types UPDATEs + 28 entity_aliases. Idempotent, header + rollback. **Not applied.**
- `src/lib/kb/seed-aliases.test.ts` — **created.** ~130 lines / 8 assertions. Parses migration 055, binds `surface_norm` to `preprocess()`.
- `docs/catalog-map.md` — **modified.** +53 lines: seeded-vocabulary section (starter data, Phase 9 dedups).

## Decisions Made

See frontmatter `key-decisions`. Highlights:

- **Task 1 not returned to the human as an interactive gate.** The standing checkpoint policy for this phase directs the executor to take the plan's default and record it. The genuine blocking gate is Task 3; the object list is put in front of the human there, before migration 055 is applied, so a correction is still cheap.
- **ЛТР seeded as two objects** (left / right tube) — the plan's KB-05 what-built lists them as separate lines.
- **BRIDGE category created empty** — scope names "мосты участка" but no authoritative names exist; the category is ready for the human to populate.
- **All 5 live work_types attributed** (not 10-15) — the live catalog is demo-scale.
- **Live service ids used** — they differ from CLAUDE.md's SERVICE_META (`SRV-ENG` = Служба Главного Энергетика, not "Инженерные системы"; `SRV-MECH` exists; `SRV-STR` = Служба СЭИС).

## Deviations from Plan

**No auto-fixes (Rules 1-3).** Three scope adjustments, all forced by live-data reality and documented above:

1. **work_types attribution = 5 rows, not D-21's 10-15.** Only 5 `work_types` rows exist live. Keyed `UPDATE`s are idempotent no-ops on ids that do not exist, so seeding more would be dead SQL. Phase 9 ingest is the designed path for the real catalog.
2. **Fixture work-type phrases not targeted by the seed.** The plan's Task 2 action suggests attributing work types "that the fixture phrases in `resolve-cases.ru.ts` target" — but that fixture is self-contained (its own `workTypes` array: `Замена бортового камня`, `Монтаж железобетонной плиты`, …) and none of those rows exist in the live `work_types`. `seed-aliases.test.ts` binds the seed to `preprocess()` directly and does not depend on the fixture, so the seed and the tests still reinforce each other on the `surface_norm` invariant.
3. **No ЭВ (эвакуационный выход) object seeded** — outside the literal KB-05 scope; the D-21 alias examples for it are already covered elsewhere.

**Total deviations:** 0 auto-fixed, 3 documented scope adjustments. **Impact:** the seed is a strict subset of the KB-05 scope; no scope creep. Phase 9 refines.

## Issues Encountered

- **Vitest suppresses `console.log`** — the surface-norm generator wrote its output to a scratchpad file instead. The generator (`_seedgen.test.ts`) was deleted before the commit; only `seed-aliases.test.ts` (the real binding test) ships.

## User Setup Required

**YES — this plan halts at a blocking human-action gate. See "CHECKPOINT REACHED" below.**

The human must apply, in the Supabase SQL Editor for project `wwwtsvboqffzbnliuiun`, one at a time and in order:

1. `supabase/migrations/053_kb_work_type_attributes.sql`
2. `supabase/migrations/054_entity_aliases.sql`
3. `supabase/migrations/055_kb_seed_lefortovo.sql`

Then run three confirmation queries and report the results back:
- `select column_name from information_schema.columns where table_name = 'work_types' and column_name in ('service_id','unit','typical_period','typical_crew');` — expect all 4.
- `select count(*) from entity_aliases;` — expect **>= 25** (28 seeded). A count of 0 with no error means `anon_all_entity_aliases` is missing / RLS is blocking.
- `select id, name, category_id from journal_objects where created_by = 'migration-055' order by id;` — expect the 8 names listed above.

Known failure modes: a syntax error near a uniqueness clause in 054 → the file still uses `NULLS NOT DISTINCT` (it should not); 055 failing on a FK / missing column → 053 or 054 did not actually apply. If any file errors, paste the exact text and the phase stays halted.

## Next Phase Readiness

- **08-08 / 08-09** (admin «Виды работ» rebuild + «Синонимы» tab): the columns and table their `knowledge.ts` writers target are defined in migration form; the tabs can be built against the types now, but **UI verification is a false green until Task 3 applies the schema**.
- **Phase 9** (Excel/Титул ingest): `docs/catalog-map.md` carries the seeded-object list + the starter-data / dedup note.
- **Blocker:** migrations `053 → 054 → 055` are unapplied. `requirements-completed` is intentionally empty — KB-01/KB-02/KB-05 flip to complete only after the orchestrator relays a successful human apply and the post-apply confirmation queries pass.

## Self-Check: PASSED

- `supabase/migrations/055_kb_seed_lefortovo.sql` — FOUND (126 lines, `on conflict` x3, WHAT/WHY, ROLLBACK)
- `src/lib/kb/seed-aliases.test.ts` — FOUND (8 assertions, all pass)
- `docs/catalog-map.md` — seeded-vocabulary section present (+53 lines)
- Commit `2c929ab` — FOUND in `git log`
- Scratch generator `_seedgen.test.ts` — removed (not in `git status`, not in tree)
- `npm run test` 519 pass / `npx vitest run src/lib/kb` 416 pass / `tsc` clean / `lint` 0 errors 47 warnings / `build` green
- No migration executed by the agent — live `entity_aliases` still absent (table created by 054, unapplied)

---
*Phase: 08-knowledge-base-schema-russian-resolver-catalog-vocabulary*
*Halted at the human-apply gate: 2026-09-03*
