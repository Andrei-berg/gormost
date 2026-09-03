---
phase: 08-knowledge-base-schema-russian-resolver-catalog-vocabulary
plan: 03
subsystem: api
tags: [russian-nlp, normalization, abbreviations, preprocess, entity-resolution, knowledge-base, vitest, pure-lib]

# Dependency graph
requires:
  - phase: 08-01
    provides: "src/lib/kb/ module tree with final synchronous signatures; normalize() code-point subset + expandAbbreviations() 4-entry seed dict + preprocess() composition"
  - phase: 08-02
    provides: "src/lib/kb/stem.ts — real vendored Snowball RU stemmer behind lemmatize(); __fixtures__/lemma-cases.ru.ts D-12a gate"
provides:
  - "src/lib/kb/normalize.ts — full D-11 rule set: number-marker canonicalization (№/N/#/no + digit -> one glued «№»), stray-marker strip, dash-variant collapse (hyphen/NB-hyphen/figure/en/em dash/horizontal bar -> «-»), quote strip (« » \" ' `), trailing . , ; : strip; idempotent across the whole case table"
  - "src/lib/kb/normalize.test.ts — 35-case table + full idempotence loop + planner invariants + single-export check (78 assertions)"
  - "src/lib/kb/expandAbbreviations.ts — 13-entry curated D-10 dictionary; ABBREVIATIONS exported as an эталон constant; whitespace-token-wise, case-insensitive, substring-safe matching"
  - "src/lib/kb/expandAbbreviations.test.ts — 29-case table + case-insensitivity + substring-safety (T-08-10) + exported-constant checks (32 assertions)"
  - "src/lib/kb/preprocess.ts — D-09 composition locked: single export, empty tokens dropped, header names the four consumer kinds; `normalized` is exactly normalize(expandAbbreviations(input))"
  - "src/lib/kb/preprocess.test.ts — stage-order proof + `normalized === normalize(expand(x))` over a 12-input table + four-consumer anti-variant assertion + empty/whitespace contract + self-idempotence loop (34 assertions)"
affects: [08-04, 08-05, 08-07, 08-09, phase-09, phase-11, phase-13]

actuals:
  tokens: 6750
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "normalize() as an ordered chain of linear character-class .replace() calls — no nested quantifiers (threat T-08-09), order chosen so no rule re-feeds an earlier one, proven by an idempotence loop over the whole case table"
    - "Abbreviation dictionary as an exported эталон constant (mirrors SCHEDULES / SHIFT_HOURS) so the 08-07 seed migration and Phase 13 correction-learning read one source of truth"
    - "Exact whitespace-token matching gives substring-safety and longest-key-first ordering for free (no per-entry regex)"
    - "preprocess() has zero options/overloads/variants by construction — the D-09 single-code-path guarantee is enforced by an anti-variant test, not a convention"

key-files:
  created:
    - src/lib/kb/normalize.test.ts
    - src/lib/kb/expandAbbreviations.test.ts
    - src/lib/kb/preprocess.test.ts
  modified:
    - src/lib/kb/normalize.ts
    - src/lib/kb/expandAbbreviations.ts
    - src/lib/kb/preprocess.ts

key-decisions:
  - "normalize() rule order (Claude's Discretion): lowercase -> ё-fold -> NBSP -> quote strip -> number-marker -> stray-marker strip -> dash collapse -> trailing-punct strip -> whitespace collapse -> trim. Locked by the idempotence loop."
  - "Canonical number marker is «№» GLUED to the digit (`№3`), not a spaced ` № ` token — matches the human-written lemma-cases fixture form («эвакуационный выход №3») and keeps it one lemmatizable token."
  - "Number-marker regex matches latin n / no only at a word boundary before a digit (`\\bno`, `\\bn`); Cyrillic «н» is never a marker. Avoids corrupting Russian words."
  - "Dash collapse merges tokens between alphanumerics («ЛТР — левая труба» -> «лтр-левая труба») per the D-11 'no surrounding spaces between alphanumerics' rule — tests lock it."
  - "Abbreviation dictionary grown to 13 entries: material shorthands (борт./ж/б/а/б/м/к), tunnel infra (эв/тт/п/п/бк), site abbreviations (зб/лтр/гтр/ктр/ттк). Contents beyond the plan's required list are Claude's Discretion (D-10)."
  - "Site-abbreviation EXPANSION STRINGS (лтр->лефортовский тоннель, гтр->гагаринский тоннель, ктр->кутузовский тоннель, ттк->третье транспортное кольцо, зб->защитный блок) are STARTER GUESSES — the exact authoritative Гормост-Лефортово full names were not confirmed with the user. Refined via entity_aliases + the human-diffed 08-07 seed migration + Phase 13 correction learning. Low risk: in-code dict, no migration, no contract, explicitly a growth point."
  - "expandAbbreviations values are all lower-cased (the only pipeline consumer, preprocess(), lower-cases immediately via normalize())."
  - "preprocess() PreprocessResult interface is now local (not exported) so the module exports exactly one symbol per the Task 3 acceptance criterion. Nothing imported the type."
  - "TDD RED not committed (CLAUDE.md precedence, same as 08-01/08-02): npm run test must pass before every commit. RED was run locally per task, then GREEN committed as one commit."

patterns-established:
  - "D-11 normalization is a cross-phase invariant surface: Phase 9 ingest and Phase 11 dictation call normalize()/preprocess() verbatim; the case tables are the spec"
  - "Any lemmatize/normalize/dictionary change is checked by normalize.test.ts + expandAbbreviations.test.ts + preprocess.test.ts + the unchanged D-12a gate"

requirements-completed: [KB-04]

coverage:
  - id: D1
    description: "normalize() implements the full D-11 rule set (number-marker canonicalization, stray-marker strip, dash-variant collapse, quote strip, trailing-punctuation strip, ё-fold with й preserved, NBSP + whitespace collapse, trim) and is idempotent across the whole case table"
    requirement: KB-04
    verification:
      - kind: unit
        ref: "src/lib/kb/normalize.test.ts#normalize — full D-11 rule set (35-case table)"
        status: pass
      - kind: unit
        ref: "src/lib/kb/normalize.test.ts#normalize — idempotence across the whole case table (D-11)"
        status: pass
      - kind: unit
        ref: "src/lib/kb/normalize.test.ts#normalize — cross-phase invariants the planner named explicitly (№/N/# equality, U+00A0 -> ASCII space, dash-variant equality)"
        status: pass
    human_judgment: false
  - id: D2
    description: "expandAbbreviations() expands the curated D-10 dictionary case-insensitively at whitespace-token boundaries (substring occurrences left intact — threat T-08-10); ABBREVIATIONS exported as an эталон constant containing keys for борт./ж/б/эв/тт/п/п/лтр/гтр/ктр/ттк"
    requirement: KB-04
    verification:
      - kind: unit
        ref: "src/lib/kb/expandAbbreviations.test.ts#expandAbbreviations — curated D-10 dictionary (29-case table)"
        status: pass
      - kind: unit
        ref: "src/lib/kb/expandAbbreviations.test.ts#expandAbbreviations — case-insensitive matching"
        status: pass
      - kind: unit
        ref: "src/lib/kb/expandAbbreviations.test.ts#expandAbbreviations — exported dictionary constant (эталон)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The full-name EXPANSION STRINGS for the five Гормост-Лефортово site abbreviations (лтр/гтр/ктр/ттк/зб) are starter values chosen by the executor, not confirmed authoritative catalog names"
    verification:
      - kind: other
        ref: "Cross-checked against 08-CONTEXT.md D-21 / REQUIREMENTS KB-05 scope wording; лтр->лефортовский тоннель is well-grounded, гтр/ктр/ттк/зб are best-guess"
        status: unknown
    human_judgment: true
    rationale: "The exact authoritative Гормост-Лефортово full names (ГТР, КТР, ЗБ especially) are not documented in the planning artifacts and were flagged 'to be finalized with the user'. A human must confirm or correct them; the 08-07 seed migration (human-diffed) and Phase 13 correction learning are the designed refinement paths. Mechanism and coverage are fully tested (D2); only the Russian strings need an eyeball."
  - id: D4
    description: "preprocess() is the single locked D-09 code path (expandAbbreviations -> normalize -> token-wise lemmatize), exports exactly one symbol, produces identical output for the four consumer kinds, returns { normalized: '', lemmas: [] } for empty/whitespace input, and `normalized` is exactly normalize(expandAbbreviations(input))"
    requirement: KB-04
    verification:
      - kind: unit
        ref: "src/lib/kb/preprocess.test.ts#preprocess — stage order: expandAbbreviations runs before normalize (D-09/D-10)"
        status: pass
      - kind: unit
        ref: "src/lib/kb/preprocess.test.ts#preprocess — `normalized` is not independently computed (12-input table)"
        status: pass
      - kind: unit
        ref: "src/lib/kb/preprocess.test.ts#preprocess — identical output for the four consumer kinds (D-09 anti-variant)"
        status: pass
      - kind: unit
        ref: "src/lib/kb/preprocess.test.ts#preprocess — empty and whitespace-only input"
        status: pass
      - kind: unit
        ref: "src/lib/kb/preprocess.test.ts#preprocess — idempotent on its own normalized output"
        status: pass
    human_judgment: false
  - id: D5
    description: "No new npm dependency entered the base build; src/lib/kb/ stays pure and client-safe"
    requirement: KB-04
    verification:
      - kind: other
        ref: "git diff --stat package.json package-lock.json (empty)"
        status: pass
      - kind: unit
        ref: "src/lib/kb/purity.test.ts#src/lib/kb purity guard (D-08)"
        status: pass
    human_judgment: false

duration: 7min
completed: 2026-09-03
status: complete
---

# Phase 8 Plan 03: normalize() D-11 rule set + curated D-10 abbreviation dictionary + locked D-09 preprocess() Summary

**`normalize()` now enforces the full D-11 rule list (number-marker canonicalization, dash-variant collapse, quote and trailing-punctuation strip) and is idempotent across a 35-case table; `expandAbbreviations()` is a 13-entry curated dictionary exported as an эталон constant; `preprocess()` is a single, variant-free, test-locked code path proven identical for catalog names, alias surfaces, dictation text and Excel cells.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-09-03T09:13:33Z
- **Completed:** 2026-09-03T09:20:16Z
- **Tasks:** 3 (all `tdd="true"`, all built + committed)
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments
- **`normalize()` completed to the full D-11 rule set.** Added, as further chained linear `.replace()` steps: number-marker canonicalization (`№` / `#` / latin `N` / `NO` immediately before a digit → one `№` glued to that digit, so «№3», «N3», «# 3», «no3», «№ 3» all collapse to one form); stray `№`/`#` strip when not part of a marker+number; dash-variant collapse (hyphen, non-breaking hyphen, figure dash, en dash, em dash, horizontal bar → a single `-` with surrounding whitespace removed); quote strip (`« » " ' \``); trailing `. , ; :` strip. Rule order is Claude's Discretion, chosen so no rule re-feeds an earlier one and proven by an idempotence loop.
- **`normalize.test.ts`** — 78 assertions: a 35-row case table (ё/й, NBSP, quote strip, all five number-marker spellings, four dash variants, trailing punctuation, real-world combined inputs), an idempotence assertion applied to every case, the planner-named explicit invariants (`normalize('ЭВ №3') === normalize('ЭВ N3')` / `=== normalize('ЭВ # 3')`, a U+00A0 input whose output contains only ASCII spaces, dash-variant equality), and an exact single-export check.
- **`expandAbbreviations()` grown to a 13-entry curated D-10 dictionary** and `ABBREVIATIONS` is now an **exported эталон constant** (mirrors `SCHEDULES` in `src/lib/shifts.ts`). Entries: material shorthands `борт.` `ж/б` `а/б` `м/к`; tunnel infrastructure `эв` `тт` `п/п` `бк`; Гормост-Лефортово site abbreviations `зб` `лтр` `гтр` `ктр` `ттк`. Matching is whitespace-token-wise (substring occurrences never expanded — threat T-08-10), case-insensitive, whitespace-preserving. Keys keep their raw punctuation (runs before `normalize`); values are all lower-cased.
- **`expandAbbreviations.test.ts`** — 32 assertions: a 29-row case table, a case-insensitivity block, substring-safety cases (`тт` inside `аттракцион`/`светооттенок`, `зб` in `зборка`, `эв` in `эвкалипт` all left intact), and exported-constant checks (required keys present, every value a non-empty lower-cased string).
- **`preprocess()` composition locked (D-09).** Export surface narrowed to exactly `preprocess` (`PreprocessResult` is now a local interface); empty tokens dropped before `lemmatize`; header names the four consumer kinds and the index-build-vs-query-time divergence hazard (Pitfall 2 / T-08-08).
- **`preprocess.test.ts`** — 34 assertions: stage-order proof (`борт.`/`ж/б`/`п/п` still expand though `normalize` alone would strip/rewrite their punctuation), `preprocess(x).normalized === normalize(expandAbbreviations(x))` over a 12-input table, the four-consumer anti-variant assertion (one string fed as catalog name / alias surface / dictation fragment / Excel cell → one identical result object), the empty/whitespace contract with no empty lemma token, a declension lemma-sharing check («на Лефортовском тоннеле» shares every content lemma with «Лефортовский тоннель», differing only by the stop-token `на`), and a self-idempotence loop.
- Full suite **429 tests pass** (13 files); `src/lib/kb` quick suite **331 pass** (7 files). `npx tsc --noEmit` clean; `npm run lint` 0 errors / 47 warnings (baseline unchanged); `npm run build` green. `git diff package.json package-lock.json` empty — zero new dependencies. `src/components/journal/data.ts` untouched (the `norm` re-point is Plan 08-09).

## Task Commits

Each task was committed atomically (TDD RED run locally, GREEN committed — CLAUDE.md "tests pass before commit"):

1. **Task 1: Lock normalize() to the full D-11 rule set** — `a3d2143` (feat)
2. **Task 2: Curated abbreviation dictionary (D-10)** — `e572e7c` (feat)
3. **Task 3: Lock the preprocess() composition contract (D-09)** — `ef8080e` (refactor)

**Plan metadata:** _(this docs commit)_

## Files Created/Modified
- `src/lib/kb/normalize.ts` — **modified**: full D-11 rule set as a 10-step `.replace()` chain; header documents the chosen order and why idempotence holds.
- `src/lib/kb/normalize.test.ts` — **created**: 35-case table + idempotence loop + planner invariants + module-surface check (78 assertions).
- `src/lib/kb/expandAbbreviations.ts` — **modified**: 4-entry seed dict → 13-entry curated dictionary; `ABBREVIATIONS` now `export`ed; header marks it the Phase 13 growth point and points irregular surfaces at `entity_aliases`.
- `src/lib/kb/expandAbbreviations.test.ts` — **created**: 29-case table + case-insensitivity + substring-safety + exported-constant checks (32 assertions).
- `src/lib/kb/preprocess.ts` — **modified**: `PreprocessResult` made local (single export); `.filter(Boolean)` before `lemmatize`; header names the four consumer kinds + the divergence hazard.
- `src/lib/kb/preprocess.test.ts` — **created**: stage-order + `normalized` derivation + four-consumer anti-variant + empty/whitespace + self-idempotence (34 assertions).

## Decisions Made

- **normalize() rule order** (Claude's Discretion per 08-CONTEXT.md): lowercase → ё-fold → NBSP → quote strip → number-marker canonicalization → stray-marker strip → dash collapse → trailing-punctuation strip → whitespace collapse → trim. The order is chosen so no rule can re-introduce input for an earlier rule; `normalize.test.ts`'s idempotence loop over the whole case table is the proof.
- **Canonical number marker glued to the digit** (`№3`, not ` № `). Matches the human-written `lemma-cases.ru.ts` fixture form (`эвакуационный выход №3`) and keeps the marker+number a single lemmatizable token. Any spacing choice satisfies the D-11 equality property; the glued form is the least surprising.
- **latin `n`/`no` only at a word boundary before a digit** (`\bno`, `\bn` in the marker regex). Cyrillic «н» is never treated as a number marker, so Russian words are not corrupted (`\b` also prevents a mid-word latin `n` before a digit from matching).
- **Dash collapse merges tokens between alphanumerics** — `ЛТР — левая труба` → `лтр-левая труба`, per D-11's "single `-` with no surrounding spaces between alphanumerics". Tests lock the merged form.
- **Abbreviation dictionary contents beyond the plan's required list** are Claude's Discretion (D-10). Added `а/б`, `м/к`, `бк` alongside the nine required keys.
- **⚠ Site-abbreviation expansion strings are STARTER GUESSES.** `лтр → лефортовский тоннель` is well-grounded in D-21 / KB-05 wording ("транспортные тоннели ЛТР", "ЛТР левая/правая труба"). `гтр → гагаринский тоннель`, `ктр → кутузовский тоннель`, `ттк → третье транспортное кольцо`, `зб → защитный блок` are best-guess — the planning artifacts flagged the authoritative object list as "to be finalized with the user". This is low-risk (in-code dict, no migration, no cross-phase contract, explicitly a Phase 13 growth point) and refined by the human-diffed 08-07 seed migration + correction learning. See coverage deliverable **D3** (human_judgment).
- **All expansion values lower-cased** — the only pipeline consumer, `preprocess()`, lower-cases immediately via `normalize()`; standalone use is tests only.
- **`PreprocessResult` made local (not exported)** to satisfy Task 3's "exports exactly one symbol" acceptance criterion. Grep confirmed nothing outside `preprocess.ts` referenced the type; `resolve.ts` / `index.ts` use `preprocess` structurally.
- **TDD RED not committed** (CLAUDE.md precedence, identical to 08-01/08-02). CLAUDE.md requires `npm run test` to pass before every commit, which outranks a committed failing-test step. RED was run locally per task (new assertions fail against the 08-01 tracer `normalize`/seed dict), then GREEN committed as one commit per task. Task 3 is `refactor` (preprocess.ts change is non-behavioral: local interface + defensive `filter(Boolean)` where empty tokens never actually occurred).

## Deviations from Plan

**None affecting scope or behaviour.** One process note, carried over from 08-01/08-02:

1. **[CLAUDE.md precedence] TDD RED not committed.** The GSD `tdd="true"` flow suggests a committed `test(...)` RED step; CLAUDE.md forbids committing with a failing suite. Resolved by running RED locally then committing only GREEN. No behaviour impact — the tests are identical to what a RED-then-GREEN split would produce.

## Issues Encountered
None. Every hand-derived expected value matched the implementation on the first `vitest` run (78/78 normalize, 32/32 expandAbbreviations, 34/34 preprocess). `npm run test` / `tsc` / `lint` / `build` all green on the first full run after each task. No pre-existing tests broke — the resolver and D-12a fixtures contain no dashes, `№` markers or quotes in their match phrases, so the new `normalize` rules are transparent to them.

## User Setup Required
None — no external service configuration, no migrations in this plan (schema work is 08-06/08-07).

## Known Stubs / Planned Gaps

| Location | Gap | Resolved by |
|----------|-----|-------------|
| `src/lib/kb/expandAbbreviations.ts` | Expansion strings for `гтр` / `ктр` / `ттк` / `зб` are executor best-guesses; only `лтр` is well-grounded | **08-07** seed migration (human-diffed) + **Phase 13** correction learning; coverage **D3** routes this to a human |
| `src/lib/kb/resolve.ts` | ladder step 3 (fuzzy: lemma overlap + trigram Dice) still returns `unresolved` | **08-05** — unchanged by this plan |

No stub blocks this plan's goal. `normalize` / `expandAbbreviations` / `preprocess` are production implementations behind their frozen signatures; the resolver never invents an entity.

## Broken-windows Ledger
- Window **#2** (`expandAbbreviations.ts` 4-entry seed dict → 08-03): **fixed** — dictionary grown to 13 curated entries + exported эталон constant + `expandAbbreviations.test.ts`.
- Window **#3** (`normalize.ts` code-point rules only → 08-03): **fixed** — full D-11 rule set + `normalize.test.ts`.
- Window **#4** (`resolve.ts` fuzzy step) remains open by design (→ 08-05).
- New entry: coverage **D3** (site-abbreviation expansion strings need a human eyeball) is tracked in this SUMMARY, not as a broken window — it is a designed refinement point (08-07 + Phase 13), not a defect.

## TDD Gate Compliance
- Plan frontmatter is `type: execute`; all three tasks are `tdd="true"`.
- Task 1: `normalize.test.ts` written first, run RED locally against the 08-01 tracer `normalize` (marker/dash/quote/trailing-punct cases fail), then implemented to GREEN. One `feat` commit.
- Task 2: `expandAbbreviations.test.ts` written first, RED against the 4-entry seed dict (site abbreviations + substring-safety + exported-constant cases fail), then GREEN. One `feat` commit.
- Task 3: `preprocess.test.ts` written first, RED against the exported-interface surface + missing header (single-export assertion fails), then GREEN. One `refactor` commit (non-behavioral change).
- No committed `test(...)` RED commits by design (CLAUDE.md "tests pass before commit").

## Next Phase Readiness
- `normalize()` / `expandAbbreviations()` / `preprocess()` are production implementations behind their frozen D-07/D-09 signatures. 08-04 (`src/lib/api/knowledge.ts` + admin wiring), 08-05 (fuzzy layer), 08-07 (seed migration — reads `ABBREVIATIONS`) and Phase 9/11 all proceed against the locked pipeline.
- The D-11 case tables are the cross-phase spec — any future `normalize` change is checked by `normalize.test.ts` + `preprocess.test.ts` + the unchanged D-12a gate.
- **Action for a human before phase sign-off:** confirm or correct the `гтр` / `ктр` / `ттк` / `зб` expansion strings in `src/lib/kb/expandAbbreviations.ts` (coverage D3). Best done alongside the 08-07 seed-object diff.
- No blockers.

## Self-Check: PASSED

- `src/lib/kb/normalize.ts` — FOUND (full D-11 chain, single export)
- `src/lib/kb/normalize.test.ts` — FOUND (78 assertions)
- `src/lib/kb/expandAbbreviations.ts` — FOUND (13 entries, `ABBREVIATIONS` exported)
- `src/lib/kb/expandAbbreviations.test.ts` — FOUND (32 assertions)
- `src/lib/kb/preprocess.ts` — FOUND (single export)
- `src/lib/kb/preprocess.test.ts` — FOUND (34 assertions)
- Commit `a3d2143` — FOUND in git log
- Commit `e572e7c` — FOUND in git log
- Commit `ef8080e` — FOUND in git log
- `git diff --stat package.json package-lock.json` — empty (no dependency added)
- `npm run test` 429 pass / `npx tsc --noEmit` clean / `npm run lint` 0 errors 47 warnings / `npm run build` green

---
*Phase: 08-knowledge-base-schema-russian-resolver-catalog-vocabulary*
*Completed: 2026-09-03*
