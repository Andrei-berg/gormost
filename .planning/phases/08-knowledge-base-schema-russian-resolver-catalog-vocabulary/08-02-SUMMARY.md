---
phase: 08-knowledge-base-schema-russian-resolver-catalog-vocabulary
plan: 02
subsystem: api
tags: [russian-nlp, stemmer, snowball, lemmatize, entity-resolution, knowledge-base, vitest, pure-lib]

# Dependency graph
requires:
  - phase: 08-01
    provides: "src/lib/kb/ module tree with final synchronous signatures; stem() identity stub + lemmatize() swap point; __fixtures__ file convention"
provides:
  - "src/lib/kb/stem.ts — vendored zero-dependency Russian Snowball stemmer (RV/R2 regions; perfective gerund / reflexive+adjectival/verb/noun; terminal и; derivational ост/ость in R2; superlative + нн-undouble + soft sign); replaces the 08-01 identity stub, signature unchanged"
  - "src/lib/kb/stem.test.ts — 100 assertions: 77 word/stem pairs across every step + declension-collapse families + degenerate/non-Russian guards"
  - "src/lib/kb/__fixtures__/lemma-cases.ru.ts — 29 real «вариант → каноника» pairs (D-12a gate data)"
  - "src/lib/kb/lemmatize.test.ts — the D-12a MANDATORY gate: imports only lemmatize + preprocess, never ./stem, so it survives an implementation swap"
  - "D-12 lemmatizer spike CLOSED — recommendation KEEP VENDORED, zero dependency added"
affects: [08-03, 08-04, 08-05, 08-06, 08-07, 08-08, 08-09, phase-09, phase-11]

actuals:
  tokens: 4000
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Vendored published algorithm as a pure zero-import module, header-cited to its source of truth (mirrors src/lib/shifts.ts BASE_DATE citation)"
    - "Implementation-agnostic fixture gate: the D-12a test imports the swap-point module (lemmatize) and never the implementation (stem), so a spike replacement is tested by the identical file"
    - "Lemma-set comparison with a preposition/particle stoplist — «на Лефортовском тоннеле» shares a lemma set with «Лефортовский тоннель» without making lemmatize itself stateful"

key-files:
  created:
    - src/lib/kb/stem.test.ts
    - src/lib/kb/lemmatize.test.ts
    - src/lib/kb/__fixtures__/lemma-cases.ru.ts
  modified:
    - src/lib/kb/stem.ts

key-decisions:
  - "D-12 spike closed as KEEP VENDORED — az (deNULL/Az.js) fails spike bar #1 (synchronous) by its documented async Az.Morph.init(path, callback) DAWG loader; no package installed, package.json / package-lock.json untouched. Autonomous per the phase standing checkpoint instruction; the expected outcome per 08-RESEARCH.md Open Questions #3."
  - "stem() implements strict Snowball (the а/я before a group-1 perfective-gerund / participle / verb ending is a context condition, not deleted), not the looser Dobrovsky JS variant — matches snowballstem.org and the snowball-stemmers oracle."
  - "TDD RED not committed (CLAUDE.md precedence, same as 08-01): npm run test must pass before every commit, which outranks a committed failing-test step. RED for both tdd tasks was run locally, then GREEN committed — Task 1 as one feat, Task 2 as one test commit."
  - "«камень» fleeting vowel is an accepted Porter limitation (камень→камен, камня→камн). бортовой-камень declension fixtures pair oblique-with-oblique; the nominative is covered through the «борт. камень» abbreviation pair. No real-world variant was deleted to green the gate (08-02-PLAN.md Task 2 guidance)."

patterns-established:
  - "Snowball region maths (markRV / markR2) transcribed from the gopast-v / gopast-non-v spec primitives; ending groups are named module-level constants so a failing test pair maps back to a step"
  - "Fixture gate comparator lives in the test, not in the pipeline — lemmatize / preprocess stay pure and synchronous"

requirements-completed: [KB-04]

coverage:
  - id: D1
    description: "Vendored zero-dependency Russian Snowball stemmer replacing the 08-01 identity stub; declension variants of one lexeme reduce to one stem"
    requirement: KB-04
    verification:
      - kind: unit
        ref: "src/lib/kb/stem.test.ts#stem() — official Snowball Russian sample subset (77 pairs)"
        status: pass
      - kind: unit
        ref: "src/lib/kb/stem.test.ts#stem() — declension families collapse to one stem (Pitfall 2)"
        status: pass
      - kind: unit
        ref: "src/lib/kb/stem.test.ts#stem() — degenerate and non-Russian input is returned unchanged"
        status: pass
      - kind: other
        ref: "git diff --stat package.json package-lock.json (empty — no dependency added)"
        status: pass
    human_judgment: false
  - id: D2
    description: "D-12a mandatory fixture gate — 29 real Russian variant/canonical pairs (declensions, abbreviation expansions, prepositional phrases) run in npm run test; implementation-agnostic (no ./stem import)"
    requirement: KB-04
    verification:
      - kind: unit
        ref: "src/lib/kb/lemmatize.test.ts#lemmatize — D-12a fixture gate (variant ⇔ canonical)"
        status: pass
      - kind: unit
        ref: "src/lib/kb/lemmatize.test.ts#lemmatize — stays a synchronous single-argument string function (D-07/D-12)"
        status: pass
    human_judgment: false
  - id: D3
    description: "D-12 lemmatizer spike closed with a recorded decision; base-build lemmatizer is the vendored synchronous stemmer, no npm dependency added"
    requirement: KB-04
    verification:
      - kind: other
        ref: "npm run build (Compiled successfully in 3.8s); npx vitest run src/lib/kb (181 pass)"
        status: pass
      - kind: other
        ref: "four-bar spike result recorded in ## Decisions Made (synchronous NO / fixture-green not-reached / build-green not-reached / dependency-added NO)"
        status: pass
    human_judgment: true
    rationale: "Task 3 is a blocking checkpoint:human-verify. Executed autonomously per the phase standing instruction (KEEP VENDORED needs no human action and adds no dependency). A human may still review the recorded spike four-bar result before phase sign-off."

duration: 15min
completed: 2026-09-03
status: complete
---

# Phase 8 Plan 02: Vendored Russian Snowball stemmer + D-12a lemma gate + D-12 spike closed Summary

**`stem.ts` now transcribes the published Snowball Russian algorithm (RV/R2 regions, four ordered steps) as a zero-dependency pure function, locked by a 100-assertion sample-vocabulary test and a 29-pair implementation-agnostic `lemma-cases.ru.ts` gate; the D-12 pure-JS-lemmatizer spike is closed KEEP VENDORED with no npm dependency.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-03T08:52:00Z
- **Completed:** 2026-09-03T09:07:00Z
- **Tasks:** 3 (Task 1 built + committed; Task 2 built + committed; Task 3 spike closed, decision recorded)
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments
- **Vendored Snowball Russian stemmer** (`src/lib/kb/stem.ts`): direct transcription of `snowballstem.org/algorithms/russian/stemmer.html` — `markRV` / `markR2` region maths from the `gopast v` / `gopast non-v` primitives; named ending-group constants (perfective gerund groups 1/2, reflexive, adjective, participle groups 1/2, verb groups 1/2, noun, derivational); the four steps in order (step 1 gerund → reflexive → adjectival|verb|noun; step 2 terminal и; step 3 derivational ост/ость in R2 only; step 4 superlative ейш/ейше + нн-undouble + soft sign). Zero `import` statements. Guards for empty / single-char / non-Cyrillic / vowel-less tokens return the input unchanged. Signature `stem(token: string): string` untouched — every caller stays as-is.
- **`stem.test.ts`** — 100 assertions: 77 word/stem pairs exercising every step (вагон/ремонт/тоннель noun families, красный/бортовой/лефортовский/шереметьевский adjective families, прочитав… gerunds, учился/училась/учится reflexive, делать/делал/делают verbs, полезность/полезный derivational, красивейший/длинный step 4, решётка ё-fold), plus explicit declension-collapse `Set` checks and degenerate/non-Russian guard cases.
- **`__fixtures__/lemma-cases.ru.ts`** — 29 real `{ variant, canonical, note }` pairs from D-12a + RESEARCH Pitfall 2: nominative/genitive/dative/instrumental/prepositional/plural of Лефортовский & Шереметьевский тоннель, бортовой камень, эвакуационный выход, пешеходный переход; 5 plural/singular work-type nouns; and 3 abbreviation pairs (`борт. камень`, `борт. камня`, `ЭВ №3`) marked `viaPreprocess`. Contains the literal strings `Лефортовск`, `борт`, `ЭВ`.
- **`lemmatize.test.ts`** — the D-12a MANDATORY gate: header names it as such; imports only `lemmatize` + `preprocess` (for the abbreviation pairs, comparing `preprocess(variant).lemmas` to `preprocess(canonical).lemmas`), never `./stem`. Non-abbreviation pairs compare lemma **sets** with a preposition/particle stoplist so «на Лефортовском тоннеле» matches «Лефортовский тоннель». Also asserts `lemmatize` returns a string (not a promise) and that a 6-form тоннель declension family reduces to one lemma.
- **D-12 spike closed** — see Decisions. No package installed; `git diff --stat package.json package-lock.json` empty; `npm run build` green.
- Full suite **279 tests pass** (141 baseline from 08-01 + 100 stem + 32 lemmatize + 6 pre-existing kb… net), `npx tsc --noEmit` clean, `npm run lint` 0 errors / 47 warnings (baseline unchanged), `npm run build` green.

## Task Commits

1. **Task 1: Vendored Russian Snowball stemmer (zero dependencies)** — `5ab012c` (feat)
2. **Task 2: D-12a fixture gate — lemma-cases.ru.ts + lemmatize.test.ts** — `dee8503` (test)
3. **Task 3: Close the D-12 lemmatizer spike** — no code; decision `KEEP VENDORED` recorded below.

**Plan metadata:** _(this docs commit)_

## Files Created/Modified
- `src/lib/kb/stem.ts` — **modified**: identity stub body replaced with the full Snowball Russian transcription; header cites `snowballstem.org/algorithms/russian/stemmer.html`; zero imports.
- `src/lib/kb/stem.test.ts` — **created**: 100 assertions over the official sample-vocabulary subset + step probes + guards.
- `src/lib/kb/__fixtures__/lemma-cases.ru.ts` — **created**: 29 `LemmaCase` pairs; `viaPreprocess?: boolean` flag marks the abbreviation/№ pairs.
- `src/lib/kb/lemmatize.test.ts` — **created**: the D-12a gate; implementation-agnostic; runs in `npm run test`.

## Decisions Made

### D-12 lemmatizer spike — CLOSED, recommendation KEEP VENDORED

Single named candidate: `az` (deNULL/Az.js). Four-bar hard pass result:

| Bar | Result | Basis |
|-----|--------|-------|
| 1. Synchronous (no init callback, no promise) | **NO** | `az` exposes only `Az.Morph.init(path, callback)` — an asynchronous binary-DAWG-dictionary loader. There is no synchronous entry point; calling it from a Vitest node test cannot be done synchronously. Breaks the D-07/D-08 sync contract at the API level. |
| 2. Fixture-green (`lemma-cases.ru.ts`) | **NOT REACHED** | Blocked by bar #1 — the gate cannot invoke an async morphology loader synchronously. |
| 3. `npm run build` green | **NOT REACHED** | Candidate not installed. 08-RESEARCH.md § "Alternatives Considered" additionally notes the DAWG binary payload + Next.js 16 bundling friction. |
| 4. No new runtime dependency in the base build | **YES (confirmed)** | Nothing installed. `git diff --stat package.json package-lock.json` prints nothing. |

Any "no" closes the spike with the vendored stemmer retained → **KEEP VENDORED**. `az` is `[ASSUMED]` / treat-as-SUS in 08-RESEARCH.md § "Package Legitimacy Audit"; installing it to confirm a documented async-init blocker would add supply-chain risk (threat T-08-SC) for zero information gain, and would itself require the blocking package-legitimacy checkpoint. Not done. `src/lib/kb/lemmatize.ts` still exports a synchronous `lemmatize(token: string): string`; it still delegates to `stem()`.

This checkpoint was executed autonomously under the phase standing instruction (return only for genuine human-action / blocking-human gates; KEEP VENDORED needs no human action and adds no dependency).

### Other decisions
- **Strict Snowball, not the Dobrovsky JS variant.** In group 1 of perfective gerund / participle / verb, the preceding `а`/`я` is a context condition and is **kept**; only the ending's own letters are cut. Matches `snowballstem.org` and the `snowball-stemmers` oracle. (e.g. `прочитав` → `прочита`, keeping the `а`.)
- **TDD RED not committed (CLAUDE.md precedence).** CLAUDE.md requires `npm run test` to pass before every commit, which outranks a committed failing-test step (identical call to 08-01). RED was run locally for both `tdd` tasks, then GREEN committed — Task 1 as one `feat`, Task 2 as one `test` commit.
- **`камень` fleeting vowel accepted.** `камень` → `камен` but every oblique form → `камн`; no Porter stemmer resolves this. The бортовой-камень declension fixtures pair oblique-with-oblique and the nominative is covered via the `борт. камень` abbreviation pair, so no real-world variant was deleted to green the gate (per 08-02-PLAN.md Task 2 guidance). Documented in the fixture header.

## Deviations from Plan

**None affecting scope or behaviour.** One process note, carried over from 08-01 and driven by CLAUDE.md taking precedence over the generic executor TDD flow:

1. **[CLAUDE.md precedence] TDD RED not committed.** The GSD `tdd="true"` flow suggests a committed `test(...)` RED step; CLAUDE.md forbids committing with a failing suite. Resolved by running RED locally (stem.test.ts fails against the identity stub; lemmatize.test.ts fails against a pass-through) then committing only GREEN. No behaviour impact.

## Issues Encountered
None. Every hand-traced expected stem matched the implementation on the first `vitest` run (100/100 stem, 32/32 lemmatize). `npm run test` / `tsc` / `lint` / `build` all green on the first full run after each task.

## User Setup Required
None — no external service configuration, no migrations in this plan (schema work is 08-06/08-07).

## Next Phase Readiness
- `stem()` / `lemmatize()` are production implementations behind their frozen signatures. 08-03 (grow `normalize` + `expandAbbreviations`, add `normalize.test.ts` / `expandAbbreviations.test.ts`) and 08-05 (fuzzy layer) proceed against real morphology.
- The D-12a gate is live in `npm run test` — any future `lemmatize` change (including a later spike) is checked by `lemmatize.test.ts` unchanged.
- Broken-windows: window #1 (`src/lib/kb/stem.ts` identity stub) marked **fixed** in `.planning/WINDOWS.md`. Windows #2 (`expandAbbreviations` seed dict → 08-03), #3 (`normalize` code-point rules → 08-03), #4 (`resolve` fuzzy step → 08-05) remain open by design.
- No blockers.

## TDD Gate Compliance
- Plan frontmatter is `type: execute` (not `type: tdd`); Tasks 1 & 2 are `tdd="true"`.
- Task 1: `stem.test.ts` written first, run RED locally against the 08-01 identity stub (declension-family and step assertions fail), then implemented to GREEN. Committed as one `feat` commit per CLAUDE.md "tests pass before commit". No committed `test(...)` RED commit by design.
- Task 2: `lemma-cases.ru.ts` + `lemmatize.test.ts` written first; RED verified locally by pointing `lemmatize` at a pass-through (declension pairs fail), then GREEN against the vendored stemmer. Committed as one `test` commit.

## Self-Check: PASSED

- `src/lib/kb/stem.ts` — FOUND (modified, zero imports, header cites `snowballstem.org`)
- `src/lib/kb/stem.test.ts` — FOUND
- `src/lib/kb/__fixtures__/lemma-cases.ru.ts` — FOUND (29 pairs; contains `Лефортовск`, `борт`, `ЭВ`)
- `src/lib/kb/lemmatize.test.ts` — FOUND (no `./stem` import)
- Commit `5ab012c` — FOUND in git log
- Commit `dee8503` — FOUND in git log
- `git diff --stat package.json package-lock.json` — empty (no dependency added)

---
*Phase: 08-knowledge-base-schema-russian-resolver-catalog-vocabulary*
*Completed: 2026-09-03*
