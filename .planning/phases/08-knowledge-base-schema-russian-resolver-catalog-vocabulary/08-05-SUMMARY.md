---
phase: 08-knowledge-base-schema-russian-resolver-catalog-vocabulary
plan: 05
subsystem: api
tags: [russian-nlp, entity-resolution, fuzzy-matching, dice-coefficient, levenshtein, alias-collision, knowledge-base, vitest, pure-lib]

# Dependency graph
requires:
  - phase: 08-01
    provides: "frozen D-07 resolver contract (ResolveResult 3 shapes, KbIndex, KbEntry, KbConfig); resolveEntity ladder steps 1-2; buildKbIndex tracer; 9-case starter fixture"
  - phase: 08-02
    provides: "src/lib/kb/stem.ts vendored Snowball RU stemmer behind lemmatize()"
  - phase: 08-03
    provides: "normalize() full D-11 rule set; expandAbbreviations() 13-entry curated dictionary; locked preprocess() composition"
provides:
  - "src/lib/kb/similarity.ts — zero-import dice() (trigram Sorensen-Dice, pg_trgm padding, multiset intersection, [0,1] bounded, NaN-safe) + levenshtein() (two-row DP, tiebreak only)"
  - "src/lib/kb/resolve.ts ladder step 3 — fuzzy layer: 0.65·lemmaOverlap + 0.35·trigramDice over stopword-filtered lemma sets, capped 0.94, D-15 ambiguity rule applied literally, opts.type narrows before scoring"
  - "buildKbIndex — Partial<KbConfig> threshold override; alias surfaces emitted as weighted fuzzy entries; scope_object_id ignored (D-16)"
  - "src/lib/kb/collisions.ts — findAllAliasCollisions + findAliasConflicts, pure KB-03 predicate mirroring findAliasCollisions in src/lib/api/knowledge.ts (D-13)"
  - "src/lib/kb/__fixtures__/resolve-cases.ru.ts — 33-case D-22 battery (KB-04 SC#4 + Phase 10 golden-set seed)"
  - "similarity.test.ts / index.test.ts / resolve.test.ts / collisions.test.ts — 136 kb-suite assertions net-new"
affects: [08-06, 08-09, phase-09, phase-10, phase-11]

actuals:
  tokens: 12000
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Vendored string-similarity primitives as a pure zero-import module, header-cited to the deprecation of string-similarity (D-12b) — same pattern as the vendored Snowball stemmer"
    - "Fuzzy score = weighted (lemmaOverlap, trigramDice); overlap coefficient (intersection / smaller set) so a missing/extra descriptive word still resolves while a phrase sharing only a generic word ('тоннель') stays below low"
    - "Monotonic score ladder alias 1.00 > exact 0.95 > fuzzy (capped 0.94) so the number stays interpretable downstream and fuzzy can never outrank an exact hit"
    - "Scoring-time stopword filter for prepositions/particles lives in resolve.ts, NOT in preprocess() (which stays a pure text transform)"
    - "Threshold-nudge boundary test: build a second index with config.low set to a live fuzzy score, assert one step either side flips resolved<->unresolved"

key-files:
  created:
    - src/lib/kb/similarity.ts
    - src/lib/kb/similarity.test.ts
    - src/lib/kb/index.test.ts
    - src/lib/kb/collisions.ts
    - src/lib/kb/collisions.test.ts
  modified:
    - src/lib/kb/index.ts
    - src/lib/kb/resolve.ts
    - src/lib/kb/resolve.test.ts
    - src/lib/kb/__fixtures__/resolve-cases.ru.ts

key-decisions:
  - "Fuzzy weights LEMMA_WEIGHT 0.65 / TRIGRAM_WEIGHT 0.35, FUZZY_SCORE_CAP 0.94; thresholds kept at DEFAULT_KB_CONFIG low 0.6 / high 0.85 / tieMargin 0.08 (Claude's Discretion, CONTEXT § 'Claude's Discretion'). Calibrated empirically against the 33-case battery: real declension / abbreviation / missing-word variants land 0.74-0.94; the plausible-but-absent 'Серебряноборский тоннель' lands 0.51 and stays unresolved. Recorded in the resolve.ts header."
  - "lemmaOverlap uses the overlap coefficient (intersection / min set size), not Jaccard — a subset match (missing or extra word) scores high, a phrase sharing only a generic word does not."
  - "Alias surfaces are added to KbIndex.entries as fuzzy candidates carrying the ADMIN weight, so a declension of a curated surface scores through the same path a catalog name does. Duplicate (id, type) rows are collapsed in resolveEntity keeping the max score / max weight."
  - "similarity primitives vendored, not installed (D-12b): string-similarity is deprecated, dice-coefficient pulls n-gram. Keeps src/lib/kb pure (D-08) and git diff package.json empty (phase prohibition)."
  - "collisions.ts operates on the stored surface_norm field (mirroring the DB-side .eq('surface_norm') query), not a re-derived preprocess() output — D-13 says collisions must stay query-findable."
  - "TDD RED not committed (CLAUDE.md precedence, same as 08-01/02/03): npm run test must pass before every commit. RED run locally per task (a calibration harness printed live scores, then deleted), GREEN committed one feat commit per task."

patterns-established:
  - "Resolver ladder complete: exact alias (1.00) -> exact normalized name (0.95) -> fuzzy (<=0.94) -> unresolved. score is match-strength confidence, never a model probability."
  - "Any future change to weights/thresholds/stemmer is caught by the 33-case D-22 battery + the whole-fixture invariant loop in npm run test."

requirements-completed: [KB-01, KB-03, KB-04]

coverage:
  - id: D1
    description: "Vendored dice() (trigram Sorensen-Dice, [0,1], symmetric, NaN-safe on empty/1-char) + levenshtein() (identity 0, empty -> other length, single substitution 1), zero imports"
    requirement: KB-04
    verification:
      - kind: unit
        ref: "src/lib/kb/similarity.test.ts#dice — Sorensen-Dice over character trigrams"
        status: pass
      - kind: unit
        ref: "src/lib/kb/similarity.test.ts#levenshtein — classic edit distance"
        status: pass
      - kind: other
        ref: "git diff --stat package.json package-lock.json (empty)"
        status: pass
    human_judgment: false
  - id: D2
    description: "buildKbIndex completes the fuzzy postings: Partial<KbConfig> override into KbIndex.config; entries built through the same preprocess() used at query time; D-01 service_id filter + dangling-alias skip retained; scope_object_id ignored (D-16)"
    requirement: KB-01
    verification:
      - kind: unit
        ref: "src/lib/kb/index.test.ts#buildKbIndex — D-01 work_type filter"
        status: pass
      - kind: unit
        ref: "src/lib/kb/index.test.ts#buildKbIndex — dangling alias skip (D-02)"
        status: pass
      - kind: unit
        ref: "src/lib/kb/index.test.ts#buildKbIndex — scope_object_id is ignored (D-16)"
        status: pass
      - kind: unit
        ref: "src/lib/kb/index.test.ts#buildKbIndex — entries are built with the query-time preprocess"
        status: pass
      - kind: unit
        ref: "src/lib/kb/index.test.ts#buildKbIndex — config thresholds"
        status: pass
    human_judgment: false
  - id: D3
    description: "resolveEntity fuzzy layer: weighted lemma-overlap + trigram Dice, capped below exact, D-15 ambiguity rule literal (both top >= low within tieMargin -> ambiguous; else top1 >= low -> resolved fuzzy; else unresolved); opts.type narrows before scoring; alias weight orders/tiebreaks only, never promotes"
    requirement: KB-04
    verification:
      - kind: unit
        ref: "src/lib/kb/resolve.test.ts#resolveEntity — the D-22 Russian fixture battery (KB-04 SC#4)"
        status: pass
      - kind: unit
        ref: "src/lib/kb/resolve.test.ts#resolveEntity — ladder short-circuits (D-15)"
        status: pass
      - kind: unit
        ref: "src/lib/kb/resolve.test.ts#resolveEntity — threshold boundary (KB-04 edge: boundary)"
        status: pass
      - kind: unit
        ref: "src/lib/kb/resolve.test.ts#resolveEntity — opts.type narrows BEFORE scoring"
        status: pass
      - kind: unit
        ref: "src/lib/kb/resolve.test.ts#resolveEntity — alias weight orders but never promotes (D-15, T-08-18)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Invented-entity guard (T-08-01, KB-04 SC#4): unknown / plausible-but-absent / different-domain phrases return unresolved with no id; whole-fixture invariant asserts every resolved id is a member of the loaded id set"
    requirement: KB-04
    verification:
      - kind: unit
        ref: "src/lib/kb/resolve.test.ts#resolveEntity — the invented-entity guard (T-08-01, KB-04 SC#4)"
        status: pass
      - kind: unit
        ref: "src/lib/kb/resolve.test.ts#resolveEntity — whole-fixture invariant"
        status: pass
    human_judgment: false
  - id: D5
    description: "Pure alias-collision predicate (KB-03, D-13): same surface_norm + type + >1 canonical_id is a collision; same-id duplicate and cross-type same-surface are not; soft-warning form does not mutate/reject; a colliding surface resolves 'ambiguous'"
    requirement: KB-03
    verification:
      - kind: unit
        ref: "src/lib/kb/collisions.test.ts#findAllAliasCollisions — the KB-health form"
        status: pass
      - kind: unit
        ref: "src/lib/kb/collisions.test.ts#findAliasConflicts — the admin add-form soft-warning input"
        status: pass
      - kind: unit
        ref: "src/lib/kb/collisions.test.ts#a colliding surface provably resolves ambiguous (D-13 cross-check)"
        status: pass
    human_judgment: false

duration: ~15min
completed: 2026-09-03
status: complete
---

# Phase 8 Plan 05: Vendored fuzzy layer + the D-22 Russian battery + alias-collision predicate Summary

**The resolver ladder is complete — a Russian phrase now resolves through exact alias / exact name / vendored trigram-Dice + lemma-overlap fuzzy match, or an honest `unresolved` that never invents a catalog row — proven by a 33-case real-Russian battery in `npm run test`; alias collisions are detectable as pure logic and a colliding surface provably resolves `ambiguous`.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-03T12:34:00Z
- **Completed:** 2026-09-03T12:50:00Z
- **Tasks:** 3 (all `tdd="true"`, all built + committed)
- **Files modified:** 9 (5 created, 4 modified)

## Accomplishments

- **`src/lib/kb/similarity.ts`** — two pure zero-import functions. `dice(a, b)` is Sorensen-Dice over character trigrams with the pg_trgm padding convention (`"  " + s + " "`) so sub-trigram strings still yield grams and never hit 0/0 = NaN; comparison is a multiset intersection; result clamped to `[0, 1]`; `dice(x, x)` short-circuits to 1 (covers `dice('', '')`). `levenshtein(a, b)` is classic two-row DP, used ONLY as an equal-score tiebreak. Header records why vendored not installed (`string-similarity` deprecated, `dice-coefficient` drags `n-gram` — D-12b).
- **`buildKbIndex` completed** — second parameter is now `Partial<KbConfig>` merged over `DEFAULT_KB_CONFIG` into `KbIndex.config` (Phase 11 renders the chip from the same three numbers). Alias surfaces are emitted into `KbIndex.entries` as fuzzy candidates carrying the ADMIN `weight`, preprocessed through the identical `preprocess()`. The D-01 `service_id IS NOT NULL` filter, the dangling-`canonical_id` skip, and D-16 (scope ignored) are retained and pinned by `index.test.ts`.
- **`resolveEntity` ladder step 3** — replaces the Plan 08-01 `unresolved` fallthrough. Score = `0.65·lemmaOverlap + 0.35·trigramDice`, where `lemmaOverlap` is the overlap coefficient (`intersection / min set size`) over stopword-filtered lemma sets and `dice` runs over `nameNorm`; capped at `0.94` so fuzzy never outranks exact (`0.95`) or alias (`1.00`). Candidates ranked score desc → alias weight desc → Levenshtein asc → insertion order. D-15 applied literally: `strong = ranked.filter(score >= low)`; `strong.length >= 2 && strong[0].score - strong[1].score < tieMargin` → `ambiguous`; else `strong[0]` → `resolved` method `fuzzy`; else `unresolved`. `opts.type` filters the pool **before** scoring. Header records the chosen weights, thresholds and the monotonic-ordering rationale.
- **`__fixtures__/resolve-cases.ru.ts` grown 9 → 33 cases** — exact alias / exact name (10), abbreviation expansion (4: `борт. камень`, `ж/б плита`, `п/п`, `тт №3`), numeric-marker equivalence (`ЭВ №3` / `ЭВ N3` / bare `эвакуационный выход 3` → one entity), 4 declension variants (`на Лефортовском тоннеле`, `Лефортовским тоннелем`, `у Шереметьевского портала`, `Митьковского тоннеля`), missing/extra word, 5 unknowns (garbage, a plausible-but-absent `Серебряноборский тоннель`, two different-domain, one dangling alias), empty/whitespace, and two `ambiguous` outcomes (a D-13 collision surface + a fuzzy near-tie).
- **`src/lib/kb/collisions.ts`** — `findAllAliasCollisions(aliases)` returns every group where one `surface_norm` + `canonical_type` points at ≥ 2 distinct `canonical_id` (weight desc); `findAliasConflicts(prospective, existing)` returns the rows a prospective new alias would conflict with (the admin add-form soft-warning input, mirrors `findAliasCollisions` in `src/lib/api/knowledge.ts`). Neither rejects, filters or mutates — D-13 soft warning, both rows live.
- **Test totals:** kb quick suite **406 pass** (10 files, +75 net); full suite **`npm run test` 509 pass** (17 files). `npx tsc --noEmit` clean; `npm run lint` 0 errors / 47 warnings (baseline unchanged); `npm run build` green. `git diff package.json package-lock.json` empty — zero new dependencies.

## Task Commits

Each task committed atomically (TDD RED run locally via a throwaway calibration harness that printed live fuzzy scores, then deleted; GREEN committed — CLAUDE.md "tests pass before commit"):

1. **Task 1: Vendored similarity primitives + completed KbIndex fuzzy postings** — `1bb6931` (feat)
2. **Task 2: Fuzzy match ladder + the D-22 Russian fixture battery** — `00018ab` (feat)
3. **Task 3: Pure alias-collision predicate (KB-03)** — `33a48dc` (feat)

**Plan metadata:** _(this docs commit)_

## Files Created/Modified

- `src/lib/kb/similarity.ts` — **created**: `dice` + `levenshtein`, zero imports, D-12b header.
- `src/lib/kb/similarity.test.ts` — **created**: bounds / symmetry / NaN-safety / one-vs-two-edit ordering (20 assertions).
- `src/lib/kb/index.ts` — **modified**: `Partial<KbConfig>` override; alias fuzzy entries; D-16 comment.
- `src/lib/kb/index.test.ts` — **created**: D-01 filter, dangling-alias skip, scope-ignored, preprocess consistency, config defaults/override (17 assertions).
- `src/lib/kb/resolve.ts` — **modified**: ladder step 3 fuzzy layer; stopword set; `cmp` deterministic ordering; header records weights/thresholds/rationale.
- `src/lib/kb/resolve.test.ts` — **modified**: 55 assertions — battery loop, whole-fixture invariant, method short-circuits, invented-entity guard, threshold boundary, opts.type-before-scoring, alias-weight-orders-but-never-promotes, D-13 collision surface.
- `src/lib/kb/__fixtures__/resolve-cases.ru.ts` — **modified**: 9 → 33 cases; catalog grown to 7 objects / 1 service / 4 loadable work types; `expect` widened to `{type,canonicalName} | null | 'ambiguous'`.
- `src/lib/kb/collisions.ts` — **created**: `findAllAliasCollisions` + `findAliasConflicts`, imports `./types` only.
- `src/lib/kb/collisions.test.ts` — **created**: 13 assertions incl. the D-13 resolve-ambiguous cross-check.

## Decisions Made

- **Fuzzy weights / thresholds (Claude's Discretion).** `LEMMA_WEIGHT = 0.65`, `TRIGRAM_WEIGHT = 0.35`, `FUZZY_SCORE_CAP = 0.94`. Thresholds left at `DEFAULT_KB_CONFIG` (`low 0.6`, `high 0.85`, `tieMargin 0.08`). Calibrated empirically against the 33-case battery — a throwaway harness printed the live `score` for every fixture phrase. Real variants: `на Лефортовском тоннеле` 0.87, `Митьковского тоннеля` 0.89, `у Шереметьевского портала` 0.88, `пешеходный тоннель` (missing word) 0.85, `Лефортовский автодорожный тоннель` (extra word) 0.92, bare `эвакуационный выход 3` 0.74. The plausible-but-absent `Серебряноборский тоннель` scores **0.51** and stays `unresolved` — a comfortable margin below `low`. This is KB-04 SC#4 / the T-08-01 invented-entity guard; per the plan, `low` was not raised to rescue near-misses.
- **Overlap coefficient, not Jaccard.** `lemmaOverlap = intersection / min(|a|, |b|)`. A query that is a subset of an entry's content words (missing or extra descriptive word) still scores ~1.0 on the lemma term; a phrase like `Серебряноборский тоннель` that shares only the generic `тоннель` scores 0.5 because its distinguishing word matches nothing. Jaccard punished the legit missing-word cases too hard.
- **Alias surfaces as weighted fuzzy entries.** Added to `KbIndex.entries` so `на Лефортовском тоннеле` (a declension of the curated surface `Лефортовский тоннель`) scores through the same path as a catalog name. `resolveEntity` collapses duplicate `(type, id)` rows keeping the higher score, then higher weight. Alias `weight` participates **only** in ranking / equal-score tiebreaks — a dedicated test (`зелёный водопад в тумане ночью` against a weight-900 alias) asserts a below-`low` score is never lifted to `resolved` (D-15, T-08-18).
- **Similarity primitives vendored (D-12b).** `string-similarity` is deprecated; `dice-coefficient` pulls `n-gram`. A ~30-line zero-import module keeps `src/lib/kb/` pure (D-08), keeps `git diff package.json` empty (phase prohibition), and drops a supply-chain surface for no cost.
- **`collisions.ts` reads the stored `surface_norm` field**, mirroring the DB-side `.eq('surface_norm').eq('canonical_type').neq('canonical_id')` query in `src/lib/api/knowledge.ts` — D-13 requires collisions to stay query-findable. The resolver-side cross-check test uses aliases whose `surface_norm` already equals `preprocess(surface_raw).normalized` so both definitions line up.
- **TDD RED not committed (CLAUDE.md precedence, identical to 08-01/02/03).** `npm run test` must pass before every commit, which outranks a committed failing-test step. RED was run locally per task (new assertions fail against the 08-01 `unresolved` fallthrough / absent modules), then GREEN committed as one `feat` per task.

## Deviations from Plan

**None affecting scope or behaviour.** One process note, carried over from 08-01/02/03:

1. **[CLAUDE.md precedence] TDD RED not committed.** The GSD `tdd="true"` flow suggests a committed `test(...)` RED step; CLAUDE.md forbids committing with a failing suite. Resolved by running RED locally (plus a throwaway `_calib.test.ts` score-printing harness, deleted before commit) then committing only GREEN. No behaviour impact.

## Issues Encountered

None blocking. Two calibration adjustments during Task 2, both made before any commit:
- Jaccard lemma overlap pushed legit missing-word cases (`пешеходный тоннель`) below `low`; switched to the overlap coefficient.
- The scoring-time preposition stoplist was needed so `на Лефортовском тоннеле` / `у Шереметьевского портала` reach 1.0 on the lemma term rather than 0.67.

`npm run test` / `tsc` / `lint` / `build` all green on the first full run after each task.

## User Setup Required

None — no external service configuration, no migrations in this plan (schema work is 08-06/08-07).

## Known Stubs / Planned Gaps

**None.** The resolver ladder is complete end to end. `score` is match-strength confidence only (no model this phase). The site-abbreviation expansion strings (`гтр` / `ктр` / `ттк` / `зб`) flagged in 08-03 coverage D3 still need a human eyeball, but that is a pre-existing 08-03 item, not introduced here.

## Broken-windows Ledger

- Window **#4** (`src/lib/kb/resolve.ts` fuzzy step 3 returned `unresolved`): **fixed** — fuzzy layer implemented, `open_count` now 0.
- No new windows. No stubs, no skipped tests, no unrun `<verify>`.

## TDD Gate Compliance

- Plan frontmatter is `type: execute`; all three tasks are `tdd="true"`.
- Task 1: `similarity.test.ts` + `index.test.ts` written first, RED locally (modules absent / config-override + alias-entry assertions fail), then GREEN. One `feat` commit.
- Task 2: `resolve.test.ts` battery + fixture grown first, RED locally against the `unresolved` fallthrough (all fuzzy + ambiguous + boundary cases fail), calibrated via a throwaway harness, then GREEN. One `feat` commit.
- Task 3: `collisions.test.ts` written first, RED locally (module absent), then GREEN. One `feat` commit.
- No committed `test(...)` RED commits by design (CLAUDE.md "tests pass before commit").

## Self-Check: PASSED

- `src/lib/kb/similarity.ts` / `similarity.test.ts` / `index.test.ts` / `collisions.ts` / `collisions.test.ts` — FOUND
- `src/lib/kb/resolve.ts` / `__fixtures__/resolve-cases.ru.ts` — FOUND (modified)
- `08-05-SUMMARY.md` — FOUND
- Commits `1bb6931`, `00018ab`, `33a48dc` — FOUND in git log
- `npm run test` 509 pass / `npx tsc --noEmit` clean / `npm run lint` 0 errors 47 warnings / `npm run build` green / `git diff package.json package-lock.json` empty

---
*Phase: 08-knowledge-base-schema-russian-resolver-catalog-vocabulary*
*Completed: 2026-09-03*
