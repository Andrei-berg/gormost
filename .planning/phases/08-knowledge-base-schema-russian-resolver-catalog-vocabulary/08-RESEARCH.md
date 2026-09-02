# Phase 8: Knowledge base — schema, Russian resolver, catalog vocabulary - Research

**Researched:** 2026-09-02
**Domain:** Controlled-vocabulary grounding — Postgres schema enrichment + deterministic Russian-text entity resolver (pure TS) + admin CRUD, on Next.js 16 / Supabase / Vercel
**Confidence:** HIGH on codebase patterns & schema; MEDIUM on Russian lemmatization tooling; HIGH on the "vendor, don't depend" call

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**KB schema shape (Area 1)**
- **D-01:** KB is an **enrichment layer**, not a `kb_*` island. Enrich `work_types` directly: `ALTER TABLE work_types ADD COLUMN service_id text NULL REFERENCES services, unit text NULL, typical_period text NULL CHECK (typical_period IN ('DAY','NIGHT','AROUND')), typical_crew jsonb NULL`. No `kb_work_types`, no bridge columns. Resolver/agent load only rows where `service_id IS NOT NULL`. One-way.
- **D-02:** Canonical **object identity = a `journal_objects` row**. Resolver returns `journal_objects.id`. No `kb_locations`. One-way.
- **D-03:** Титул enrichment columns added to `journal_objects` **in Phase 8**, empty: `inv_no text NULL`, `area_m2 numeric NULL`, `title_meta jsonb NOT NULL DEFAULT '{}'`. Phase 9 populates. Freeze shape now.
- **D-04:** **No KB construction table in Phase 8.** Keep `'construction'` in the `entity_aliases.canonical_type` enum, build no construction storage.
- **D-05:** KB-05 catalog map lives in a **new `docs/catalog-map.md`** (living doc) + one pointer line in `CLAUDE.md` — NOT in `.planning/codebase/ARCHITECTURE.md`. Must exist before Phase 9 coding. Maps admin tree (`objects`/`constructions`/`work_types`/`categories`) ↔ `journal_objects`/`journal_object_categories` ↔ `work_permit_catalog` ↔ KB enrichment.

**Resolver architecture (Area 2)**
- **D-06:** **All matching in TypeScript, in memory.** `resolveEntity(phrase, kbIndex, opts?)` is pure; `kbIndex` built once from `journal_objects` + `work_types` (with `service_id`) + `entity_aliases` + `services`. No DB round-trip inside the resolver. No `pg_trgm` in Phase 8. Costly to reverse.
- **D-07:** Locked resolver contract (Phase 9 & 11 depend verbatim):
  ```
  resolveEntity(phrase: string, index: KbIndex, opts?: { type?: CanonicalType }) => ResolveResult
  ResolveResult =
    | { status: 'resolved',   id: string, type: CanonicalType, score: number, method: 'alias' | 'exact' | 'fuzzy' }
    | { status: 'ambiguous',  candidates: Array<{ id: string, type: CanonicalType, score: number }> }  // ranked desc
    | { status: 'unresolved', normalized: string }
  ```
  `score` = resolution confidence from match strength (exact alias > exact normalized name > lemma overlap > trigram). Two config thresholds map score → 🟢/🟡/🔴. `opts.type` narrows the search space. One-way (published contract).
- **D-08:** Code lives in **`src/lib/kb/`**: `normalize.ts`, `expandAbbreviations.ts`, `stem.ts`, `lemmatize.ts`, `preprocess.ts`, `resolve.ts`, `index.ts` (builds `KbIndex`), `__fixtures__/`, plus `*.test.ts` beside each. Pure, client-safe (no `import 'server-only'`). CRUD is a separate `src/lib/api/knowledge.ts` dispatched via `/api/db`. Keep `src/lib/kb/` separate from the future `src/lib/agent/` (Phase 10).

**Russian preprocessing pipeline (Area 3)**
- **D-09:** Three-stage pipeline, one exported `preprocess(s)` = `expandAbbreviations(s)` → `normalize(s)` → token-wise `lemmatize()`. Applied identically to catalog names, alias surfaces, dictation text, Excel cells.
- **D-10:** `expandAbbreviations()` is a **separate function** with a curated in-code dictionary (`борт. → бортовой`, `ж/б → железобетонный`, `эв → эвакуационный выход`, `тт → транспортный тоннель`, `п/п → пешеходный переход`, `ЛТР/ГТР/КТР/ТТК`, …). Tested and grown independently.
- **D-11:** `normalize()` — deterministic, no dictionary: lowercase; `ё→е` (keep `й`); NBSP + multi-space → single space; trim; `№`/`N`/`#` → single ` № ` marker; all dash variants → single `-` with surrounding spaces stripped between alphanumerics; strip trailing punctuation `. , ; :` and quotes `« » " '`; numeric tokens (`3`, `№3`, `no3`) → one canonical token form.
- **D-12:** `lemmatize()` is a **swappable module** behind `(token: string) => string`. Ship a **vendored Russian Porter stemmer** in `src/lib/kb/stem.ts` (~60 lines, zero deps) as the guaranteed implementation and the KB-04 fallback. Plan **includes an explicit spike task**: try a pure-JS lemmatizer (`az` / pymorphy2-equivalent). Adopt only if it passes the fixture gate AND builds cleanly on Vercel; any dependency drag goes to a separate sign-off line. Reversible. Serverless pymorphy2 is **rejected**.
- **D-12a:** **Fixture gate** `src/lib/kb/__fixtures__/lemma-cases.ru.ts` — real `вариант → каноника` pairs. Mandatory `npm run test` case; any `lemmatize` implementation must pass it.
- **D-12b:** No new npm dependency in the base build — the stemmer is vendored code.

**Alias collisions & ambiguity (Area 4)**
- **D-13:** Collision in the alias manager (a new `surface_norm` already resolving to a **different** canonical of the same type) = **soft warning**. Inline banner "«…» уже привязан к <X>. Всё равно добавить?"; ADMIN confirms; both rows live; that surface then resolves `ambiguous`. No hard block, no `conflicted` flag column.
- **D-14:** `entity_aliases` DDL (locked):
  ```
  id             uuid primary key default gen_random_uuid()
  surface_raw    text not null                  -- as entered, for display/audit
  surface_norm   text not null                  -- preprocess(surface_raw)
  canonical_type text not null check (canonical_type in ('object','construction','work_type','service'))
  canonical_id   text not null                  -- journal_objects.id / work_types.work_type_id / services.service_id, stringified
  scope_object_id uuid null references journal_objects(id) on delete cascade
  weight         smallint not null default 100
  source         text not null check (source in ('seed','manual','voice','correction'))
  created_by     text
  created_at     timestamptz not null default now()
  unique nulls not distinct (surface_norm, canonical_type, scope_object_id)   -- PG15+; fallback: unique expression index on coalesce(scope_object_id::text,'')
  ```
  plus a non-unique index on `(canonical_type, canonical_id)`. Ships with `anon_all_entity_aliases` and a rollback section in the same migration. One-way.
- **D-15:** Resolver ambiguity rule: an **exact alias or exact normalized-name hit** → immediately `resolved` (`method: 'alias' | 'exact'`), candidates not collected. Only in the **fuzzy** layer: if `score(top1) - score(top2) < tieMargin` (config) and both `>= low` → `ambiguous` with ranked candidates; otherwise `top1 >= low` → `resolved` with its score. Alias `weight` orders candidates and breaks ordering ties — never promotes a fuzzy guess to `resolved`.
- **D-16:** `scope_object_id` column exists from day one and the alias manager can set it, but `resolveEntity` **ignores scope in v3.0**. Scope-aware resolution is v3.x.

**Admin UI (Area 5)**
- **D-17:** Rebuild `/admin` → «Виды работ» as a **dedicated editor** (not the generic inline `CrudTab`); `src/components/head/WorkPermitCatalogEditor.tsx` is the precedent. Editable per work type: service dropdown (5 canonical services), `unit` free text with a suggest datalist (`м²`, `п.м.`, `шт.`, `м³`, `компл.`, `т`), `typical_period` segmented toggle день/ночь/сутки → stored `'DAY' | 'NIGHT' | 'AROUND'`, 4 crew counters → `typical_crew jsonb` with **LOCKED keys** `{ "workers", "foremen", "itr", "vehicles" }`. Persistence via normal `updateWorkType` through `/api/db`.
- **D-18:** "Won't-get-stuck" affordances: search box; filter chips «Без службы» / «Не заполнено»; each row shows its `construction → object` breadcrumb; checkbox multi-select + a single bulk action «Проставить службу выбранным». Richer bulk (period/crew, CSV) is v3.x.
- **D-19:** New `/admin` tab **«Синонимы»** (alias manager): search by surface or canonical; list rows with a `source` badge, `weight`, resolved canonical name; add form = type selector + entity picker (reuse the `ObjectCombobox` pattern) + surface input, running the D-13 collision check on submit; edit `weight` + `scope_object_id`; delete.
- **D-20:** All `knowledge.ts` mutation functions (`createEntityAlias`, `updateEntityAlias`, `deleteEntityAlias`, and any dedicated work-type-attribute writer) added to `ROLE_RESTRICTED` in `src/app/api/db/route.ts` as **ADMIN-only**. `src/lib/api-client.ts` gets a hand-kept typed wrapper for each.

**Seed data & fixtures (Area 6)**
- **D-21:** Phase 8 **hand-seeds via migration**, all marked as starter data:
  - Canonical Гормост-Лефортово objects into `journal_objects` (+ any missing `journal_object_categories`; add a `BRIDGE` category if needed). Starter list from KB-05 scope: ЛТР (левая/правая труба), Шереметьевский тоннель, Митьковский тоннель, Нижегородский тоннель, пешеходные тоннели ТТК участка, ЗБ ЛТР, ЗБ ГТР, мосты участка. **Exact authoritative object list to be finalized with the user during planning.**
  - Starter `entity_aliases` (~25–30 rows, `source='seed'`).
  - Starter attribution for ~10–15 of the most common `work_types` (`service_id` + `typical_period` + `typical_crew`).
- **D-22:** Resolver fixture set `src/lib/kb/__fixtures__/resolve-cases.ru.ts` — ~30 cases `{ phrase, expect: { type, canonicalName } | null, note }` covering: exact-alias hit, case/declension variant, abbreviation expansion, multi-word object name, **unknown → `null`**, near-tie → `ambiguous`. This file **is** the KB-04 SC#4 fixture set and the seed of the Phase 10 golden set.

**Migrations (planner finalizes numbering — next free is 053)**
- **D-23:** Suggested split, each self-contained with `anon_all_*` (where a new table) + rollback:
  - `053_kb_work_type_attributes.sql` — `ALTER work_types` (D-01) + `ALTER journal_objects` (D-03). **Verify live columns via Supabase `list_tables` / MCP before writing the ALTER** — `work_types` has no prior migration in the repo.
  - `054_entity_aliases.sql` — create table (D-14) + `anon_all_entity_aliases` + indexes + seed aliases (D-21) + rollback.
  - `055_kb_seed_lefortovo.sql` — seed `journal_objects` (+ categories) + starter work-type attribution (D-21) + rollback keyed to the seeded ids/names.

### Claude's Discretion
- Exact abbreviation dictionary contents, exact `normalize()` regex ordering, `tieMargin` / threshold default values, fixture wording — planner/executor choose, tests lock them.
- Whether journal's `norm()` in `src/components/journal/data.ts` is re-pointed at `src/lib/kb/normalize.ts` or left alone — one canonical implementation is the goal; planner decides the migration path.
- Migration file numbers (053–055 is a suggestion).

### Deferred Ideas (OUT OF SCOPE)
- Scope-aware alias resolution (resolver filtering by `scope_object_id`) — v3.x. Column ships now (D-16); logic later.
- KB construction storage + Конструктив ingest — Phase 9.
- `pg_trgm` / SQL-side fuzzy match — performance optimization, later. Contract (D-07) does not change.
- Serverless pymorphy2 lemmatizer — rejected.
- Bulk attribute operations beyond "set service for selected rows" — v3.x.
- Conflict-review screen for colliding aliases — v3.x.
- KB-health dashboard — v3.x.
- Low-confidence review queue — v3.x.
- Vercel plan / `maxDuration` verification — Phase 10 concern; not relevant to Phase 8.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description (from REQUIREMENTS.md § "KB — База знаний") | Research Support |
|----|-------------------------------------------------------|------------------|
| **KB-01** | Create `entity_aliases` (`surface` normalized, `canonical_type` object\|construction\|work_type\|service, `canonical_id`, `scope_object_id?`, `weight`, `source` seed\|manual\|voice\|correction, `created_by`) with `anon_all_entity_aliases` policy | D-14 locks the DDL. § "Code Examples → migration 054" gives the exact `CREATE TABLE` + RLS + index block, with the `NULLS NOT DISTINCT` decision resolved (use the expression-index fallback — § "Pitfall 1"). Mirror `anon_all_work_plans` / migration 050. |
| **KB-02** | Add agent attributes to `work_types` — `service_id`, `unit`, `typical_period` (день/ночь/сутки), `typical_crew` (jsonb: рабочие/мастера/ИТР/техника); editable in `/admin` → «Виды работ» | D-01 locks the `ALTER`. § "Code Examples → migration 053". `work_types` live shape is **unconfirmed** (no repo migration) — § "Open Questions #1", planner must run `list_tables` first. Admin editor precedent = `WorkPermitCatalogEditor.tsx` (§ "Pattern 3"). `typical_crew` key mapping to `daily_plan_items` columns — § "Pitfall 5". |
| **KB-03** | ADMIN alias CRUD: search, show `source`, collision warning «one phrase → two canonicals» | D-13 (soft warning) + D-19 (tab spec). Collision query = `surface_norm` with >1 distinct `canonical_id` of the same `canonical_type`. Entity picker reuses `ObjectCombobox` pattern (§ "Pattern 3"). Mutations ADMIN-gated (D-20, § "Code Examples → ROLE_RESTRICTED"). |
| **KB-04** | Resolver maps phrase → catalog entity by exact alias + fuzzy match via a shared RU normalization/lemmatization pipeline (ё→е, `№`, abbreviations, declensions), applied identically to catalog / aliases / dictation / Excel; no match above threshold → 🔴, stays free text, entity NOT invented | D-06/D-07/D-09–D-12. § "Pattern 1" (pipeline), § "Pattern 2" (resolver scoring), § "Standard Stack" (stemmer + fuzzy = vendored, zero deps), § "Don't Hand-Roll", § "Pitfall 2/3/4". Fixture gate D-12a / D-22. |
| **KB-05** | Catalog scope = Гормост-Лефортово участок only; KB linked to `journal_objects`, not a 4th entity island | D-02 + D-05. § "Catalog Map — Raw Material" is the raw input for `docs/catalog-map.md`. § "Pitfall 6" (fragmentation). Resolver returns `journal_objects.id` directly usable by Phase 11 «Создать черновики» (the `daily_plan_items.object_id` FK). |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

| Directive | Bearing on Phase 8 |
|-----------|--------------------|
| **RLS invariant** — every new table needs `CREATE POLICY anon_all_<t> FOR ALL TO anon, authenticated USING(true) WITH CHECK(true)` **in the same migration that creates it**; migration 050 is the cautionary tale (RLS on + no policy = silent empty reads / denied writes). | `entity_aliases` migration MUST include `anon_all_entity_aliases`. `ALTER`-only migrations (053) do not need a policy (tables already policied — journal_objects via 050; work_types — see Open Questions #1). |
| **Migrations:** agent writes files in `supabase/migrations/`, human runs them in the Supabase SQL Editor. Clear filename, top comment (what + why), rollback section at bottom. | Schema iteration has human round-trip latency — plan for it. The SQL Editor's client-side validator is a real constraint (§ "Pitfall 1"). |
| **DB field types:** `approved_by_head: string|null` (user_id), `approved_by_zamporab/boss: boolean|null`. | Not directly touched, but the pattern "jsonb/text nullable enrichment column" is the house style — follow it for `typical_crew`, `title_meta`. |
| **API & Auth:** `/api/db` is the single RPC endpoint; any function exported from a `src/lib/api/*` module (re-exported by the `src/lib/api.ts` barrel) is auto-callable by name; sensitive functions gated by `ROLE_RESTRICTED` in `src/app/api/db/route.ts`. | New `src/lib/api/knowledge.ts` → add `export * from './api/knowledge'` to `src/lib/api.ts`. All mutations → `ROLE_RESTRICTED` ADMIN-only (D-20). `api-client.ts` wrappers are **hand-kept, one per fn** (kept in sync MANUALLY). |
| **Testing:** `npm run test` (Vitest) MUST pass before any commit — same rule as `npm run build`. New business logic requires tests **before** implementation (TDD). Tests beside source (`foo.ts` → `foo.test.ts`). Tests cover **pure logic only** — not UI, not API calls. Current suite: 98 tests. | Every file in `src/lib/kb/` gets a `.test.ts`. `normalize`, `expandAbbreviations`, `stem`, `lemmatize` (fixture gate), `resolve`, `index` builder, alias scoring. Do NOT test the admin components or `knowledge.ts`. |
| **Component architecture:** `page.tsx` = state + loadData only (~50 lines); each UI section = separate file in `src/components/[panel]/`; `useLoadData` → `{ loading, error, reload }`; `PanelLoader` / `DataErrorBanner`; `useConfirm()` — never `window.confirm/alert`. | New `src/components/admin/AliasManagerTab.tsx` + `WorkTypeAttributesTab.tsx` (or similar). `admin/page.tsx` currently keeps tab bodies inline as functions — the two new tabs should be extracted to files (D-17 dedicated-editor spirit). Collision confirm dialog = `useConfirm()`. |
| **Theming:** dark theme default; dark utility classes canonical in components; light mode ONLY via CSS tokens in `globals.css` — never `isLight ? … : …` in JS. | New admin tabs use the same Tailwind classes as `admin/page.tsx` (`bg-white/5`, `glass rounded-2xl`, `form-select`, `text-white/40`). |
| **TS strict, no `any`. Comments in English.** | `KbIndex`, `ResolveResult`, `CanonicalType`, `TypicalCrew`, `EntityAlias` types. `CrudTab` uses one `eslint-disable` for `any` — do not copy that into new code. |
| **Lint baseline:** 0 errors, 47 warnings — do not grow it. | `npm run lint` after each task. |
| **Don't install new major dependencies without asking.** | Reinforces D-12b: zero new npm deps. Stemmer + fuzzy matcher are **vendored code**. The lemmatizer spike, if it adopts a package, needs an explicit sign-off line in the plan. |
| **Don't refactor working code unless explicitly asked.** | The `norm()` re-point (Claude's Discretion) is the one sanctioned refactor — scope it tightly (§ "Runtime State Inventory"). |

---

## Summary

Phase 8 is a **schema + pure-logic** phase with a well-trodden path in this codebase: additive migrations following the `anon_all_<table>` invariant, a new `src/lib/api/*` domain module auto-dispatched through `/api/db`, hand-kept `api-client.ts` wrappers, and two `/admin` tabs. The only genuinely novel surface is the deterministic Russian resolver in `src/lib/kb/` — and CONTEXT.md has already locked its architecture (pure function, frozen 3-status contract, swappable `lemmatize` behind a fixture gate). Research therefore de-risks the **open** parts, not the decided ones.

**Three findings that change how the plan should be written:**

1. **Vendor everything; add zero npm dependencies.** The Russian Snowball/Porter stemmer is a ~100–150-line pure function derived from a published algorithm with an official test vocabulary. The fuzzy layer (trigram/Dice similarity + a Levenshtein tiebreak) is ~40 lines of well-understood code. The one named spike candidate, `az` (deNULL/Az.js), is a 2016-era, ~1.3k-weekly-download library that loads binary DAWG dictionaries at runtime via an async `Az.Morph.init(path, cb)` call — awkward under Next.js bundling and in tension with D-08's "pure, client-safe, no async init". `natural` carries a huge transitive dependency tree (`mongoose`, `pg`, `redis`, `memjs`…) and is a non-starter. The spike should be **timeboxed and expected to fail the "builds cleanly, no dep drag" bar** — the vendored stemmer is the real deliverable.

2. **`UNIQUE NULLS NOT DISTINCT` is a documented Supabase SQL-Editor hazard.** The feature exists in the live database (Supabase runs Postgres 15+; migration 042 already uses `gen_random_uuid()`), but Supabase Studio's client-side statement validator has a history of rejecting `NULLS NOT DISTINCT` with a bogus `syntax error at or near "NULLS"`. Since migrations are pasted into that editor by a human, **plan the D-14 fallback (a unique expression index on `coalesce(scope_object_id::text,'')`) as the primary path**, not the contingency.

3. **`work_types` has no migration in this repo and `daily_plan_items` has no `work_type_id`.** The `work_types` table was created directly in Supabase (D-23 flags this) — its live column list is genuinely unknown and MUST be dumped via `mcp__supabase-gormost__list_tables` before migration 053 is written. Separately, `daily_plan_items` stores work as free `work_text` with **no work-type FK** — so resolved work types feed `typical_period`/`typical_crew` prefill (EXT-05) only; there is no draft-write path that needs a `work_type_id`. Document both facts in `docs/catalog-map.md`.

**Primary recommendation:** Build `src/lib/kb/` bottom-up and test-first — `normalize` → `expandAbbreviations` → `stem` (vendored) → `lemmatize` (wraps stem; fixture gate) → `preprocess` → `index` (KbIndex builder) → `resolve` (scoring + 3-status contract). Land migrations 053/054/055 with the expression-index unique constraint and `anon_all_entity_aliases`. Add `src/lib/api/knowledge.ts` + barrel export + `ROLE_RESTRICTED` + `api-client.ts` wrappers. Rebuild the «Виды работ» admin tab as a dedicated editor and add a «Синонимы» tab, both mirroring `WorkPermitCatalogEditor.tsx`. Author `docs/catalog-map.md` from the raw material in this document. Run `list_tables` before touching `work_types`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Russian phrase → canonical catalog ID resolution (`resolveEntity`) | **Shared pure lib (`src/lib/kb/`)** — runs client or server | — | D-06/D-08: pure, in-memory, deterministic, no DB round-trip, client-safe. Phase 11 dictation review calls it in the browser; Phase 9 ingest calls it server-side. Must not `import 'server-only'`. |
| Normalization / abbreviation / stemming pipeline (`preprocess`) | **Shared pure lib (`src/lib/kb/`)** | — | D-09: identical code path for catalog names, alias surfaces, dictation text, Excel cells. Any tier that has text calls it. |
| `KbIndex` construction (`buildKbIndex`) | **Shared pure lib** (pure transform) | API layer supplies the raw rows | D-06: `index.ts` takes already-fetched `journal_objects` + `work_types` + `entity_aliases` + `services` arrays and returns an index object. Fetching is the caller's job. |
| KB CRUD (`entity_aliases` read/write, `work_types` attribute write) | **API / Backend (`src/lib/api/knowledge.ts` via `/api/db`)** | Supabase (persistence + RLS) | CLAUDE.md: plain reference-data CRUD goes through the existing RPC dispatcher; inherits auth + role gating. Mutations ADMIN-gated in `ROLE_RESTRICTED` (D-20). |
| Alias collision detection | **API / Backend** (query) + **Admin UI** (present the warning) | — | D-13: collision = a DB query (`surface_norm` with >1 distinct `canonical_id`); the soft-warning banner + confirm is UI (`useConfirm()`). |
| Admin editing surface («Виды работ» rebuild, «Синонимы» tab) | **Frontend (`src/components/admin/*`, client components)** | API layer for load/save | D-17/D-19. Mirrors `WorkPermitCatalogEditor.tsx`. `admin/page.tsx` stays a thin tab router. |
| Schema (columns, constraints, seed data, RLS policy) | **Database / Storage (`supabase/migrations/053–055`)** | — | D-01/D-03/D-14/D-21/D-23. Agent writes SQL files; human runs them. |
| Catalog reconciliation doc | **Docs (`docs/catalog-map.md`)** | — | D-05. Living doc, must precede Phase 9. |

**No capability in this phase belongs in a Vercel Edge/serverless AI route** — that tier arrives in Phase 10. The resolver is pure code, not a network call.

---

## Standard Stack

### Core — everything here is **vendored code, not an npm install** (D-12b, CLAUDE.md "don't install…")

| Component | What it is | Where it lives | Why vendored |
|-----------|-----------|----------------|--------------|
| **Russian Porter/Snowball stemmer** | The Snowball "Russian stemming algorithm": RV/R1/R2 region rules + 4 steps (perfective gerund / reflexive+adjective/verb/noun; terminal `и`; derivational `ост/ость` in R2; undouble `н` / superlative / soft sign). Published algorithm + official sample vocabulary at snowballstem.org. A hand port is ~100–150 lines of regex groups; a lean 4-step version fits D-12's "~60 lines" target if written tightly. | `src/lib/kb/stem.ts` (+ `stem.test.ts` seeded from the official sample vocabulary) | Zero deps, MIT-compatible (algorithm is public domain / BSD), stable for 20 years, small enough to read in a review. Reference JS ports exist (`snowball-stemmers`, `mazko/jssnowball`, `natural`'s `PorterStemmerRu`) to check the port against — **do not depend on them**, transcribe and test. `[CITED: snowballstem.org/algorithms/russian/stemmer.html]` |
| **`lemmatize(token) => string`** | Thin module wrapping `stem()` by default. The swap point (D-12). Ships identical to `stem` in v3.0; the spike may replace the internals. | `src/lib/kb/lemmatize.ts` (+ `lemmatize.test.ts` = the D-12a fixture gate `__fixtures__/lemma-cases.ru.ts`) | D-12: module boundary + fixture gate make the implementation swap local and safe. |
| **Trigram / Sørensen–Dice similarity** | `dice(a, b)` over character trigrams (or bigrams) → 0..1. Industry guidance: Dice gives a smoother score distribution than raw Levenshtein for short strings and matches on shared n-grams, which suits inflected multi-word RU names. ~15 lines. | `src/lib/kb/resolve.ts` (or a small `similarity.ts`) | `string-similarity` (the classic Dice package) is **deprecated / no longer supported**; `dice-coefficient` pulls `n-gram`. Not worth a dependency for 15 lines. `[CITED: npm view string-similarity → "Package no longer supported"]` |
| **Levenshtein distance (tiebreak only)** | `lev(a, b) => number`, used only when Dice ties two candidates (the documented hybrid: Dice for ranking, Levenshtein to disambiguate equal scores). ~25 lines (classic two-row DP). | `src/lib/kb/resolve.ts` | `fastest-levenshtein` (zero deps, 2022) and `leven@4` (zero deps, ESM-only) both exist and both are fine, but 25 lines of DP is not worth a dep and keeps the resolver import-graph empty (D-08 purity). |

### Supporting — already in the repo, reuse as-is

| Asset | Purpose | Phase 8 use |
|-------|---------|-------------|
| `src/components/journal/data.ts` → `norm()` | `s.toLowerCase().replace(/ё/g,'е').replace(/\s+/g,' ').trim()` | The seed of `normalize.ts`; supersede and (Claude's Discretion) re-point. |
| `src/components/journal/ObjectCombobox.tsx` | Free-text + fuzzy-suggest + create-on-the-fly picker | The «Синонимы» add-form entity picker reuses this pattern (D-19). |
| `src/components/head/WorkPermitCatalogEditor.tsx` | Dedicated per-service catalog editor (modal, load-on-open, per-row expand, save-diff-only) | The template for the rebuilt «Виды работ» tab (D-17). |
| `src/app/admin/page.tsx` — `Tab` union + `tabs[]` + `CrudTab` / `WorkTypesTab` | Tab registration pattern | Add `'aliases'` (and a new id for the rebuilt work-types editor if kept separate) to `Tab`; add entries to `tabs[]`; swap `<WorkTypesTab/>` for the new dedicated component. |
| `src/lib/api/catalog.ts` — `fetchWorkTypes`, `updateWorkType`, `fetchServices`, `fetchConstructions` | Existing CRUD | `updateWorkType` already does a generic `.update(updates)` — it will carry the new columns with **no change** once the migration lands. `fetchWorkTypes` `select('*')` picks them up automatically. |
| `src/lib/api/journal.ts` — `fetchJournalObjects`, `fetchJournalObjectCategories`, `createJournalObject`, `updateJournalObject` | Existing CRUD | `fetchJournalObjects` feeds `buildKbIndex`. `updateJournalObject` will carry `inv_no`/`area_m2`/`title_meta` once migration lands (Phase 9 uses it). |
| `src/lib/useLoadData.ts` | `{ loading, error, reload }` hook | Both new admin tabs. |
| `src/components/ConfirmDialog.tsx` → `useConfirm()` | Confirm/notice dialogs | The D-13 collision soft-warning ("Всё равно добавить?"). |
| `src/components/DataState.tsx` → `PanelLoader`, `DataErrorBanner` | Loading / error UI | Both new admin tabs. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff / why rejected |
|------------|-----------|-------------------------|
| Vendored stemmer | `az` (deNULL/Az.js) full morphology | D-12 spike candidate. 2016-era, ~1.3k weekly downloads, loads binary DAWG dicts via async `Az.Morph.init(path, cb)` — bundling friction under Next.js 16, async init conflicts with D-08's pure/sync module shape, dict payload adds weight. Spike it, expect it to miss the "builds cleanly + no dep drag" bar. `[CITED: github.com/deNULL/Az.js wiki/Az.Morph]` |
| Vendored stemmer | `natural` (`PorterStemmerRu`) | Transitive deps include `mongoose`, `pg`, `redis`, `memjs`, `dotenv` — absurd for a stemmer. Violates CLAUDE.md + D-12b. Reject outright. `[VERIFIED: npm view natural dependencies — mongoose/pg/redis/memjs present]` |
| Vendored stemmer | `snowball-stemmers` / `snowball-stemmer.jsx` (Mazko ports) | Zero-runtime-dep, 32k weekly downloads, but still an npm dependency for something transcribable in ~120 lines, and the `.jsx` variant drags a build toolchain notion. Use as a **correctness oracle** for the vendored port, not as a dependency. |
| Vendored Dice | `string-similarity` | Deprecated ("Package no longer supported"). |
| In-memory TS fuzzy | Postgres `pg_trgm` | Explicitly out of scope for Phase 8 (D-06, Deferred). Contract (D-07) stays sync. |
| `UNIQUE NULLS NOT DISTINCT` constraint | Unique **expression index** on `coalesce(scope_object_id::text,'')` | **This is the recommended primary**, not the alternative — see § "Pitfall 1". |

**Installation:** None. `npm install` is not run in this phase. If the lemmatizer spike adopts a package, that is a **separate, explicit sign-off line** in the plan (D-12 / CLAUDE.md), gated behind a `checkpoint:human-verify`.

---

## Package Legitimacy Audit

> Phase 8 installs **no** external packages (D-12b). The table below covers the D-12 spike candidates so the planner can gate the spike task correctly.

| Package | Registry | Age / last publish | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-------------------|-----------|-------------|---------|-------------|
| `az` | npm | first pub 2016-06-16; `0.2.3` re-pub ~2022 | ~1.3k/wk | github.com/deNULL/Az.js | seam: **OK**; researcher: **treat as SUS** (stale, low downloads, runtime DAWG-dict loader) | **SPIKE ONLY.** If the spike adopts it → `checkpoint:human-verify` + separate plan sign-off line (D-12). Default expectation: not adopted. `[ASSUMED]` package identity (surfaced via WebSearch). |
| `natural` | npm | actively maintained (2026-02) | ~1.3M/wk | github.com/NaturalNode/natural | **OK** but **REJECTED on dependency weight** (`mongoose`/`pg`/`redis`/`memjs`/`dotenv` transitive) | Do not use. Not in the plan. |
| `snowball-stemmers` | npm | 2016 (stable) | ~32k/wk | github.com/mazko/jssnowball | **OK** | **Not a dependency.** Use offline as a correctness oracle for the vendored `stem.ts` port. |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** `az` — researcher judgement (seam says OK). The plan's spike task must not silently `npm install az`; adoption requires the D-12 sign-off line + human checkpoint.

---

## Architecture Patterns

### System Architecture Diagram — the resolve path (data flow, not files)

```
                         ┌─────────────────────────────────────────────────────┐
   caller (Phase 9        │                  src/lib/kb/  (pure, sync, no deps) │
   ingest / Phase 11      │                                                     │
   dictation review)      │   raw phrase ──► preprocess() ─────────────┐        │
        │                 │                   │                        │        │
        │ fetch rows      │        expandAbbreviations()  (D-10 dict)   │        │
        ▼                 │                   │                        ▼        │
  journal_objects  ─────► │              normalize()  (D-11)     normalized str │
  work_types (svc≠null) ─►│                   │                        │        │
  entity_aliases   ─────► │        token-wise lemmatize() ──► stem()   │        │
  services         ─────► │                   │              (vendored) │        │
        │                 │                   ▼                        │        │
        │                 │            lemma token list                │        │
        ▼                 │                                            ▼        │
  buildKbIndex(rows) ────►│  KbIndex {                          resolveEntity(  │
   (pure transform)       │    aliasBySurfaceNorm: Map          phrase, index,  │
        │                 │    exactNameNorm:      Map          opts?)          │
        ▼                 │    lemmaPostings / trigram buckets   │              │
     KbIndex ─────────────►│    weight, canonical_type, id     ──┘              │
                          │           │                                        │
                          │           ▼   match ladder (D-15):                 │
                          │   1. exact alias hit      ─► resolved (alias)       │
                          │   2. exact normalized name ─► resolved (exact)      │
                          │   3. fuzzy: lemma-overlap + trigram Dice,           │
                          │      rank desc, weight breaks ties;                 │
                          │      top1-top2 < tieMargin & both ≥ low             │
                          │        ─► ambiguous {candidates[]}                  │
                          │      else top1 ≥ low ─► resolved (fuzzy, score)     │
                          │      else            ─► unresolved {normalized}     │
                          └─────────────────────────────────────────────────────┘
                                          │
                                          ▼
                     ResolveResult  (3 shapes, D-07) ──► caller renders 🟢/🟡/🔴
                                                          NEVER invents an entity
```

The API layer (`src/lib/api/knowledge.ts`) and the admin UI sit **outside** this box — they populate `entity_aliases` and `work_types` attributes that later become `KbIndex` inputs. They never call `resolveEntity`.

### Recommended Project Structure (new files only)

```
src/lib/kb/
├── normalize.ts             # D-11 — deterministic string cleanup, no dictionary
├── normalize.test.ts
├── expandAbbreviations.ts   # D-10 — curated in-code abbrev dictionary + expander
├── expandAbbreviations.test.ts
├── stem.ts                  # D-12 — vendored Russian Porter/Snowball stemmer, zero deps
├── stem.test.ts             # seeded from snowballstem.org official sample vocabulary
├── lemmatize.ts             # D-12 — (token)=>string; wraps stem() by default (swap point)
├── lemmatize.test.ts        # D-12a — imports __fixtures__/lemma-cases.ru.ts (MANDATORY gate)
├── preprocess.ts            # D-09 — expandAbbreviations -> normalize -> token-wise lemmatize
├── preprocess.test.ts
├── index.ts                 # buildKbIndex(rows) -> KbIndex   (pure transform)
├── index.test.ts
├── resolve.ts               # D-06/D-07/D-15 — resolveEntity(phrase, index, opts?)
├── resolve.test.ts          # imports __fixtures__/resolve-cases.ru.ts (KB-04 SC#4)
├── types.ts                 # KbIndex, ResolveResult, CanonicalType, TypicalCrew, EntityAlias, KbWorkType
└── __fixtures__/
    ├── lemma-cases.ru.ts    # D-12a
    └── resolve-cases.ru.ts  # D-22 (~30 cases; also the Phase 10 golden-set seed)

src/lib/api/knowledge.ts     # entity_aliases CRUD + work-type attribute writer; barrel-exported
src/components/admin/
├── WorkTypeAttributesTab.tsx  # D-17 rebuilt «Виды работ» (dedicated editor)
└── AliasManagerTab.tsx        # D-19 «Синонимы»

supabase/migrations/
├── 053_kb_work_type_attributes.sql   # ALTER work_types + ALTER journal_objects
├── 054_entity_aliases.sql            # CREATE + anon_all_entity_aliases + indexes + seed aliases
└── 055_kb_seed_lefortovo.sql         # seed journal_objects (+ categories) + starter work-type attribution

docs/catalog-map.md                   # D-05 — new living doc; CLAUDE.md gets a pointer line
```

### Pattern 1: The shared preprocessing pipeline (`preprocess.ts`)

**What:** one exported `preprocess(s: string): string[]` (or `{ normalized: string, lemmas: string[] }`) = `expandAbbreviations(s)` → `normalize(s)` → split → `lemmatize()` per token.
**When to use:** every place a Russian phrase is compared to the catalog — index build time (catalog names, alias surfaces) and query time (dictation, Excel cells). Same function, no variants.
**Build order (TDD):** `normalize` first (pure, easiest to lock), then `expandAbbreviations` (dictionary), then `stem` (against the official vocabulary), then `lemmatize` (fixture gate), then `preprocess` (composition test), then `index`, then `resolve`.
**Example (shape — executor writes the regexes, tests lock them per Claude's Discretion):**
```typescript
// src/lib/kb/normalize.ts — D-11. Deterministic, dictionary-free.
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/ё/g, 'е')                       // ё→е, keep й
    .replace(/ /g, ' ')                  // NBSP → space
    .replace(/[№n#]\s*(?=\d)/gi, ' № ')       // №/N/# before a number → ' № '
    .replace(/\s*[-–—―]\s*/g, '-')            // dash variants → single '-', trim around
    .replace(/[«»"'`]/g, '')                  // quotes out
    .replace(/[.,;:]+(?=\s|$)/g, '')          // trailing punctuation
    .replace(/\s+/g, ' ')
    .trim()
}
```

### Pattern 2: The resolver contract & scoring (`resolve.ts`) — D-07 / D-15 (verbatim, frozen)

**What:** `resolveEntity(phrase, index, opts?)` returns exactly one of `resolved` / `ambiguous` / `unresolved`. Never throws for "not found"; never returns a synthesized name.
**Match ladder (in order, short-circuit):**
1. `preprocess(phrase)` → `surface_norm`. Exact hit in `index.aliasBySurfaceNorm` (filtered by `opts.type` if given) → `{ status:'resolved', method:'alias', score: <max>, id, type }`. If that surface maps to >1 distinct canonical (a D-13 collision) → `{ status:'ambiguous', candidates }` ordered by alias `weight` desc.
2. Exact hit on `index.exactNameNorm` (normalized canonical name) → `{ status:'resolved', method:'exact', score: <slightly below alias-max> }`.
3. Fuzzy: score every candidate = `w1·lemmaSetOverlap + w2·trigramDice` (weights are Claude's Discretion, tests lock). Rank desc; `weight` breaks equal scores. Then:
   - `top1.score >= low` and `top1.score - top2.score < tieMargin` and `top2.score >= low` → `ambiguous` (ranked `candidates`).
   - else `top1.score >= low` → `resolved` (`method:'fuzzy'`, `score: top1.score`).
   - else → `{ status:'unresolved', normalized }`.
**`score` semantics:** resolution confidence from match strength — `alias > exact > lemma-overlap > trigram`. Not a model probability. Phase 11 renders the 🟢/🟡/🔴 chip from `score` vs the two config thresholds; the resolver itself only distinguishes `resolved`/`ambiguous`/`unresolved`.
**`opts.type`:** narrows the candidate set to one `CanonicalType` (dictation knows the field). When absent, all four types compete.

### Pattern 3: Dedicated admin editor (mirror `WorkPermitCatalogEditor.tsx`)

**What:** a client component that (a) loads its own data on mount/tab-open via `Promise.all([...])` inside a `useEffect` guarded by `alive`, or `useLoadData`; (b) renders rows with per-row local edit state; (c) on save, calls a single `/api/db`-dispatched writer and then `reload()`; (d) **saves only diffs** (`ovOrNull(val, def)` idiom).
**«Виды работ» rebuild (D-17):** rows = `fetchWorkTypes()` joined in memory to `fetchConstructions()` for the `construction → object` breadcrumb (D-18). Per row: service `<select>` (5 options from `fetchServices()`), `unit` `<input list=...>` datalist (`м²`,`п.м.`,`шт.`,`м³`,`компл.`,`т`), `typical_period` 3-way segmented toggle (день/ночь/сутки → `'DAY'|'NIGHT'|'AROUND'`), 4 number steppers → `typical_crew` object. Filter chips «Без службы» (`service_id==null`), «Не заполнено» (`typical_period==null || typical_crew==null`). Checkbox column + one bulk button «Проставить службу выбранным». Persist via `updateWorkType(id, { service_id, unit, typical_period, typical_crew })` — **no new API function needed for the write** unless the planner wants a narrower ADMIN-gated `updateWorkTypeAttributes` (D-20 implies a dedicated writer to gate; simplest is to add `updateWorkType` to `ROLE_RESTRICTED` or add `updateWorkTypeAttributes` in `knowledge.ts`).
**«Синонимы» (D-19):** search box (matches `surface_raw`/`surface_norm` or resolved canonical name); list rows → `source` badge (seed/manual/voice/correction), `weight`, canonical entity name (resolved by looking up `canonical_id` in the already-loaded objects/work_types/services); add form = `canonical_type` selector + entity picker (`ObjectCombobox` pattern, but per-type) + `surface_raw` input → on submit run collision check (`fetchEntityAliases` already loaded, or a dedicated `checkAliasCollision(surfaceNorm, type)` in `knowledge.ts`) → if collision, `useConfirm()` banner "«…» уже привязан к <X>. Всё равно добавить?" → `createEntityAlias`. Row actions: edit `weight` + `scope_object_id`, delete.

### Pattern 4: New API domain module + dispatch + wrappers

**What:** `src/lib/api/knowledge.ts` exports plain async functions using the shared `supabase` client (from `../supabase`), same shape as `catalog.ts` / `journal.ts` (`.from('entity_aliases').select('*')`, `.insert(...).select().single()`, throw on `error` with a Russian message like `journal.ts` does).
**Wire-up (3 edits):**
1. `src/lib/api.ts` — add `export * from './api/knowledge'`.
2. `src/app/api/db/route.ts` — add each mutation to `ROLE_RESTRICTED` as `['ADMIN']` (D-20). Reads (`fetchEntityAliases`) can stay open (any valid session) — matches how `fetchWorkTypes` is open today.
3. `src/lib/api-client.ts` — add one hand-written wrapper per function (`export function createEntityAlias(a: Partial<EntityAlias>): Promise<EntityAlias|null> { return call('createEntityAlias', [a]) }`). Kept in sync MANUALLY (CLAUDE.md).

### Pattern 5: Migration file conventions (mirror 050 / 042)

- Top comment: `-- 0NN_name.sql` + `-- WHAT:` + `-- WHY:`.
- New table → `ENABLE ROW LEVEL SECURITY` + `DROP POLICY IF EXISTS` + `CREATE POLICY anon_all_<t> ON <t> FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)` in the **same file**.
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (idempotent — matches 047/048/051).
- Seed with `ON CONFLICT ... DO NOTHING` (matches 042's category seed).
- `-- ── ROLLBACK ──` block at the bottom, commented out, keyed to the exact objects created.

### Anti-Patterns to Avoid

- **`import 'server-only'` anywhere in `src/lib/kb/`** — breaks D-08 (Phase 11 imports the resolver into a client component). The `supabase` client import belongs in `src/lib/api/knowledge.ts`, never in `src/lib/kb/`.
- **Async `lemmatize`** — the spike must not turn `lemmatize` into `Promise<string>` (would ripple into `preprocess`, `resolve`, and the frozen D-07 contract). If a candidate needs async dict init, it fails the spike.
- **Testing the admin components or `knowledge.ts`** — CLAUDE.md: tests are pure logic only. Test `src/lib/kb/*` and nothing else new.
- **A generic `any`-typed `CrudTab` for «Виды работ»** — D-17 says dedicated editor; `CrudTab` can't do segmented toggles, steppers, breadcrumbs, or bulk-select.
- **`pg_trgm`, a `kb_work_types` table, a `kb_locations` table, a construction table** — all explicitly excluded (D-01/D-02/D-04).
- **`window.confirm` for the collision warning** — use `useConfirm()` (CLAUDE.md).
- **Growing `daily_plan_items` with a `work_type_id`** — out of scope; the resolver's work-type output feeds prefill, not a FK.

---

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---------|-------------|-------------|-----|
| Russian morphology (declensions → stem) | A bespoke ending-stripper invented from scratch | Transcribe the **published Snowball Russian algorithm** into `stem.ts`, test against its **official sample vocabulary** | 20-year-stable spec, known edge cases, free test set. A DIY stripper will mis-handle `й`/`ь`, R2-only derivational suffixes, `н`-undoubling. `[CITED: snowballstem.org/algorithms/russian/stemmer.html]` |
| String similarity ranking | Raw `includes()` / `toLowerCase()` matching (what `ObjectCombobox` does today — fine for a 6-item dropdown, wrong for a resolver) | Trigram **Sørensen–Dice** for ranking + **Levenshtein** as the equal-score tiebreak (documented hybrid) | Dice gives a smooth 0..1 usable as `score`; the hybrid is the standard fuzzy-match recipe. `[CITED: github.com/seamusabshere/fuzzy_match; freecodecamp fuzzy-string-matching]` |
| Unique-with-nullable-column constraint | `NULLS NOT DISTINCT` pasted into the Supabase SQL Editor and hoping | Unique **expression index** `ON entity_aliases (surface_norm, canonical_type, coalesce(scope_object_id::text, ''))` | Supabase Studio's validator has rejected `NULLS NOT DISTINCT`; the expression index is portable to every Postgres 13+ and needs no editor cooperation. `[CITED: github.com/supabase/supabase/issues/13267]` |
| UUID default | `pgcrypto` extension dance | `gen_random_uuid()` — core since PG13, **already used** by `journal_objects` in migration 042 | `[VERIFIED: supabase/migrations/042_journal_daily_plans.sql:17]` |
| Loading/error UI in the new tabs | Custom spinners / try-catch banners | `useLoadData` + `PanelLoader` + `DataErrorBanner` | CLAUDE.md house pattern. |
| Confirm dialog | `window.confirm` | `useConfirm()` from `ConfirmDialog.tsx` | CLAUDE.md. |
| Entity picker in «Синонимы» | New combobox | The `ObjectCombobox.tsx` free-text+suggest pattern (D-19) | Already solved, already themed. |

**Key insight:** the whole phase is "assemble known pieces under a frozen contract." The only thing being *invented* is the abbreviation dictionary (D-10) and the fixture sets (D-12a/D-22) — and those are data, locked by tests, not algorithms.

---

## Runtime State Inventory

> Phase 8 is **greenfield schema + new pure lib** — no rename/rebrand. The only migration-of-existing-behaviour is the optional `norm()` re-point (Claude's Discretion). Covered here because it is the one place existing runtime behaviour can shift.

| Category | Items found | Action required |
|----------|-------------|------------------|
| Stored data | **None.** New table `entity_aliases` + new nullable columns only. No existing rows rewritten (seed uses `ON CONFLICT DO NOTHING`). `work_types` / `journal_objects` gain columns, all `NULL`/default. | None. |
| Live service config | **None.** No external service knows about the KB. | None. |
| OS-registered state | **None.** | None. |
| Secrets / env vars | **None.** No new env var (D-12b: no new dep, no provider). `NEXT_PUBLIC_SUPABASE_*` unchanged. | None. |
| Build artifacts | **None** for the schema/lib work. If the lemmatizer spike ever `npm install`s a package (not expected), `package-lock.json` + `node_modules` change and Vercel rebuilds — that is the sign-off gate. | Spike task: do not commit a lockfile change without the D-12 sign-off line. |
| **Existing runtime behaviour — `norm()`** | `src/components/journal/data.ts` `norm()` is imported by **`src/components/journal/ObjectCombobox.tsx` only** (2 call sites: the `matches` filter and the `exact` check). It is the fuzzy-suggest for the manual "add plan row" object field. | If re-pointed at `src/lib/kb/normalize.ts` (D-11 is stricter — strips `№`, dashes, quotes), `ObjectCombobox` suggestions change slightly (more aggressive matching). Low risk, but it is a **behaviour change to a shipped screen** — planner decides: (a) leave `norm()` alone and accept two normalizers, or (b) re-export `norm` from `data.ts` as `export { normalize as norm } from '@/lib/kb/normalize'` and eyeball `/journal` add-row. Recommend (b) with a manual check, as a **final task** after `normalize.ts` is locked by its tests. |

**Nothing found in every other category — verified by:** grep of `supabase/migrations/` (no `work_types` migration; `daily_plan_items` has no `work_type_id`), grep of `src/` for `norm(` importers, and reading `src/lib/api.ts` (barrel) + `src/app/api/db/route.ts` (`ROLE_RESTRICTED` currently only `*User`).

---

## Common Pitfalls

### Pitfall 1: `UNIQUE NULLS NOT DISTINCT` rejected by the Supabase SQL Editor

**What goes wrong:** the D-14 DDL is pasted into Supabase Studio's SQL Editor and fails with `syntax error at or near "NULLS"` even though the live Postgres (15+) supports the feature. Root cause: Studio's client-side statement validator (libpg-query) has lagged the Postgres grammar for this construct.
**Why it happens:** migrations here are human-run through that editor (CLAUDE.md), so the editor's parser — not just the server — has to accept the SQL.
**How to avoid:** ship the D-14 **fallback as the primary**:
```sql
create unique index if not exists uq_entity_aliases_surface
  on entity_aliases (surface_norm, canonical_type, coalesce(scope_object_id::text, ''));
```
This enforces exactly the intended rule (two aliases with the same `surface_norm` + `canonical_type` and both `scope_object_id IS NULL` collide) on every Postgres 13+ with no editor dependency. If the planner still wants the native constraint, add it as a **second, commented** option in the migration with a note to try it first and fall back.
**Warning signs:** the human reports a `NULLS` syntax error; the constraint silently missing after "successful" run.
`[CITED: github.com/supabase/supabase/issues/13267; github.com/orgs/supabase/discussions/16991]`

### Pitfall 2: Russian morphology in matching & dedup (research PITFALLS.md Pitfall 8)

**What goes wrong:** «на Лефортовском тоннеле» / «у Шереметьевского портала» / «борт. камень» / «ЭВ №3» don't match canonical nominatives with naive `includes()`/Levenshtein. Also bites Phase 9 dedup (near-duplicate rows differing only by case ending).
**Why it happens:** fuzzy matching prototyped with English assumptions; morphology libs aren't in the JS toolbelt.
**How to avoid:** the D-09 pipeline applied **identically** at index time and query time; the `entity_aliases` table is the **primary** mechanism for irregular cases (BK, ЭВ №3, «тт №3 КТР»), fuzzy is the fallback. Seed aliases aggressively (D-21). The D-12a/D-22 fixtures must include real declined and abbreviated variants.
**Warning signs:** resolver misses matches that differ only by case ending; alias table stays tiny; `resolve.test.ts` has only nominative-case cases.

### Pitfall 3: Hallucination-adjacent — the resolver inventing an entity (research PITFALLS.md Pitfall 1)

**What goes wrong:** an unknown phrase gets coerced to the nearest catalog row instead of returning `unresolved`, so Phase 11 writes a `daily_plan_items` row pointing at the wrong `journal_objects.id`.
**How to avoid:** the `low` threshold must be honestly calibrated against `resolve-cases.ru.ts` — the **unknown-phrase cases must return `unresolved`**, not a low-score `resolved`. D-22 mandates ≥1 such case; add several (garbage input, a real-sounding but absent tunnel). This is KB-04 SC#4 and the invented-entity-rate=0 guard.
**Warning signs:** every fixture phrase resolves to *something*; no test asserts `status === 'unresolved'`.

### Pitfall 4: `score` conflated with model confidence

**What goes wrong:** downstream (Phase 11) treats `score` as a probability and wires it to a queue threshold.
**How to avoid:** document in `resolve.ts` and `docs/catalog-map.md` that `score` is **resolution confidence from match strength only** (D-07). Keep the mapping `alias-hit > exact-name > lemma-overlap > trigram` monotonic so the number is interpretable. There is no model in Phase 8.

### Pitfall 5: `typical_crew` keys drift from `daily_plan_items` columns

**What goes wrong:** D-17 locks `typical_crew` keys to `{ workers, foremen, itr, vehicles }`, but the `daily_plan_items` **columns** are `required_workers`, `required_foremen`, `required_itr`, `required_vehicles`. An executor "matching the columns" could name the jsonb keys `required_*` and break Phase 11's EXT-05 prefill, or vice-versa.
**Why it happens:** "exact match to `daily_plan_items` columns" in D-17 actually means the **UI `PlanItem` type** (`src/components/journal/data.ts` lines 39–42: `workers` / `foremen` / `itr` / `vehicles`), not the raw column names.
**How to avoid:** lock the four keys in `src/lib/kb/types.ts` as `type TypicalCrew = { workers: number; foremen: number; itr: number; vehicles: number }` and add a one-line comment naming them as the journal `PlanItem` crew counters (`src/components/journal/data.ts` lines 39–42) — not as the `daily_plan_items` column names, which is exactly the drift this pitfall describes. A `types.ts` test can assert the key set.
`[VERIFIED: src/components/journal/data.ts:39-42 — workers/foremen/itr/vehicles; supabase/migrations/042_journal_daily_plans.sql:33-36 — required_workers/required_foremen/required_itr/required_vehicles]`

### Pitfall 6: Re-fragmenting the catalog (research PITFALLS.md Pitfall 11)

**What goes wrong:** despite D-01/D-02, an executor adds a `kb_objects`-flavoured helper table or points `entity_aliases.canonical_id` for objects at admin `objects.object_id` instead of `journal_objects.id`.
**How to avoid:** `canonical_id` for `canonical_type='object'` is **always** `journal_objects.id` (uuid, stringified). For `work_type` it is `work_types.work_type_id`; for `service`, `services.service_id`. Put this table in `docs/catalog-map.md` and in a comment on the `entity_aliases` migration. A resolver test builds `KbIndex` from `journal_objects` fixtures and asserts a resolved object `id` is one of them.

### Pitfall 7: `work_types` ALTER written against the wrong live shape

**What goes wrong:** migration 053 assumes `work_types` columns from `src/types/index.ts` (`work_type_id`, `construction_id`, `work_name`, `created_at`) but the table was hand-created in Supabase and may differ (extra columns, different PK name, no FK).
**How to avoid:** the **first task** touching the schema runs `mcp__supabase-gormost__list_tables` (schema `public`, tables `work_types`, `journal_objects`, `journal_object_categories`, `services`, `daily_plan_items`) and pastes the real DDL into the plan / `docs/catalog-map.md` before 053 is written. D-23 already calls for this — make it a gated first step, not an afterthought.
`[VERIFIED: grep of supabase/migrations/ — no file creates or alters work_types]`

### Pitfall 8: RLS policy omitted on `entity_aliases` (research PITFALLS.md Pitfall 9; CLAUDE.md migration 050)

**What goes wrong:** `CREATE TABLE entity_aliases` + `ENABLE ROW LEVEL SECURITY` (or Supabase enabling it by default) with no policy → every read returns `[]`, every write fails silently. The alias manager "saves" but the list stays empty.
**How to avoid:** `anon_all_entity_aliases` in migration 054, mirroring 050 exactly. Success criterion #1 for the phase is literally "grep the migrations, no new table without a policy."

### Pitfall 9: The lemmatizer spike balloons the phase

**What goes wrong:** the spike task turns into a multi-day yak-shave wiring `az`'s DAWG loader into Next.js, or evaluating five libraries.
**How to avoid:** timebox it (one task, explicit budget), single candidate (`az`), pass/fail = "runs sync in a Vitest node test AND passes `lemma-cases.ru.ts` AND `npm run build` stays green with no new runtime dep." Any "no" → keep the vendored stemmer, close the spike. D-12 already frames it this way; the plan must not let it expand.

---

## Code Examples

> Shapes and DDL. Regex specifics, threshold numbers, dictionary contents, and fixture wording are Claude's Discretion — tests lock them.

### `types.ts` — the frozen contract types (D-07)

```typescript
// src/lib/kb/types.ts
export type CanonicalType = 'object' | 'construction' | 'work_type' | 'service'

export type ResolveResult =
  | { status: 'resolved';   id: string; type: CanonicalType; score: number; method: 'alias' | 'exact' | 'fuzzy' }
  | { status: 'ambiguous';  candidates: Array<{ id: string; type: CanonicalType; score: number }> } // ranked desc
  | { status: 'unresolved'; normalized: string }

export interface KbIndex {
  aliasBySurfaceNorm: Map<string, Array<{ id: string; type: CanonicalType; weight: number }>>
  exactNameNorm:      Map<string, { id: string; type: CanonicalType }>
  // per-type postings for the fuzzy layer (lemma set + trigram bucket), built by buildKbIndex
  entries: Array<{ id: string; type: CanonicalType; nameNorm: string; lemmas: string[]; weight: number }>
  config: { low: number; high: number; tieMargin: number }
}

// D-17: keys mirror src/components/journal/data.ts PlanItem, NOT the required_* column names.
export type TypicalCrew = { workers: number; foremen: number; itr: number; vehicles: number }
export type TypicalPeriod = 'DAY' | 'NIGHT' | 'AROUND'

export interface EntityAlias {
  id: string
  surface_raw: string
  surface_norm: string
  canonical_type: CanonicalType
  canonical_id: string
  scope_object_id: string | null
  weight: number
  source: 'seed' | 'manual' | 'voice' | 'correction'
  created_by: string | null
  created_at: string
}
```

### `resolve.ts` — entry point (skeleton, D-07/D-15)

```typescript
// src/lib/kb/resolve.ts  — pure, sync, zero imports outside src/lib/kb/
import type { KbIndex, ResolveResult, CanonicalType } from './types'
import { preprocess } from './preprocess'

export function resolveEntity(
  phrase: string,
  index: KbIndex,
  opts?: { type?: CanonicalType },
): ResolveResult {
  const { normalized, lemmas } = preprocess(phrase)

  // 1. exact alias
  const aliasHits = (index.aliasBySurfaceNorm.get(normalized) ?? [])
    .filter(h => !opts?.type || h.type === opts.type)
  if (aliasHits.length === 1) {
    return { status: 'resolved', method: 'alias', score: 1, id: aliasHits[0].id, type: aliasHits[0].type }
  }
  if (aliasHits.length > 1) {
    const candidates = [...aliasHits]
      .sort((a, b) => b.weight - a.weight)
      .map(h => ({ id: h.id, type: h.type, score: 1 }))
    return { status: 'ambiguous', candidates }
  }

  // 2. exact normalized name
  const exact = index.exactNameNorm.get(normalized)
  if (exact && (!opts?.type || exact.type === opts.type)) {
    return { status: 'resolved', method: 'exact', score: 0.95, id: exact.id, type: exact.type }
  }

  // 3. fuzzy — lemma-set overlap + trigram Dice, weight breaks ties (see Pattern 2)
  //    ... returns 'resolved' (fuzzy) | 'ambiguous' | { status: 'unresolved', normalized }
}
```

### migration `053_kb_work_type_attributes.sql` (verify live shape first — Pitfall 7)

```sql
-- 053_kb_work_type_attributes.sql
-- WHAT: agent-facing enrichment columns on work_types (D-01) and empty Титул
--       columns on journal_objects (D-03). Both tables pre-exist; work_types was
--       created directly in Supabase (no prior migration) — its live columns were
--       confirmed via `list_tables` on 2026-09-DD before writing this file.
-- WHY:  the resolver / agent load work_types WHERE service_id IS NOT NULL (the
--       "mature" subset) and prefill period + crew from these attributes (EXT-05).
--       journal_objects columns are frozen now so Phase 9 ingest need not rewrite migrations.

alter table public.work_types
  add column if not exists service_id     text null references public.services(service_id),
  add column if not exists unit           text null,
  add column if not exists typical_period text null check (typical_period is null or typical_period in ('DAY','NIGHT','AROUND')),
  add column if not exists typical_crew   jsonb null;   -- { "workers": int, "foremen": int, "itr": int, "vehicles": int }

alter table public.journal_objects
  add column if not exists inv_no     text null,
  add column if not exists area_m2    numeric null,
  add column if not exists title_meta jsonb not null default '{}'::jsonb;

-- No RLS block: both tables already have policies (journal_objects via 050;
-- work_types confirmed policied via list_tables on 2026-09-DD).

-- ── ROLLBACK ──────────────────────────────────────────────────────────────
-- alter table public.work_types
--   drop column if exists service_id, drop column if exists unit,
--   drop column if exists typical_period, drop column if exists typical_crew;
-- alter table public.journal_objects
--   drop column if exists inv_no, drop column if exists area_m2, drop column if exists title_meta;
```

### migration `054_entity_aliases.sql` (unique via expression index — Pitfall 1)

```sql
-- 054_entity_aliases.sql
-- WHAT: polymorphic surface-form → canonical-entity alias table (KB-01, D-14) +
--       permissive RLS policy (mirrors anon_all_work_plans / migration 050) +
--       indexes + ~25-30 starter rows (source='seed', D-21).
-- WHY:  the resolver's primary match mechanism for irregular Russian forms
--       (БК, ЭВ №3, «Лефортовский тоннель»). canonical_id: object=journal_objects.id,
--       work_type=work_types.work_type_id, service=services.service_id (stringified).

create table if not exists public.entity_aliases (
  id              uuid primary key default gen_random_uuid(),
  surface_raw     text not null,
  surface_norm    text not null,
  canonical_type  text not null check (canonical_type in ('object','construction','work_type','service')),
  canonical_id    text not null,
  scope_object_id uuid null references public.journal_objects(id) on delete cascade,
  weight          smallint not null default 100,
  source          text not null check (source in ('seed','manual','voice','correction')),
  created_by      text,
  created_at      timestamptz not null default now()
);

-- Uniqueness: same surface_norm + canonical_type + (scope or "global") may not repeat.
-- Expression index instead of `UNIQUE NULLS NOT DISTINCT` — portable, and the
-- Supabase SQL Editor validator has rejected NULLS NOT DISTINCT (issue #13267).
create unique index if not exists uq_entity_aliases_surface
  on public.entity_aliases (surface_norm, canonical_type, coalesce(scope_object_id::text, ''));

-- "aliases for entity X" + the D-13 collision query.
create index if not exists idx_entity_aliases_canonical
  on public.entity_aliases (canonical_type, canonical_id);

alter table public.entity_aliases enable row level security;
drop policy if exists anon_all_entity_aliases on public.entity_aliases;
create policy anon_all_entity_aliases on public.entity_aliases
  for all to anon, authenticated using (true) with check (true);

-- ── SEED (starter aliases, source='seed') ────────────────────────────────
-- insert into public.entity_aliases (surface_raw, surface_norm, canonical_type, canonical_id, source) values
--   ('Лефортовский тоннель', 'лефортовский тоннель', 'object', '<journal_objects.id>', 'seed'),
--   ('ЛТ',  'лт',  'object', '<same id>', 'seed'),
--   ('борт. камень', 'бортовои камень', 'work_type', '<work_types.work_type_id>', 'seed'),
--   ...  (~25-30 rows; ids resolved against the 055 seed)
-- on conflict do nothing;

-- ── ROLLBACK ──────────────────────────────────────────────────────────────
-- drop table if exists public.entity_aliases;   -- drops its indexes + policy
```

### `src/lib/api/knowledge.ts` — CRUD shape (mirror `journal.ts`)

```typescript
import { supabase } from '../supabase'
import type { EntityAlias, CanonicalType } from '@/types' // or a KB types re-export

export async function fetchEntityAliases(): Promise<EntityAlias[]> {
  const { data } = await supabase.from('entity_aliases').select('*').order('surface_norm')
  return (data ?? []) as EntityAlias[]
}

export async function createEntityAlias(a: Partial<EntityAlias>): Promise<EntityAlias | null> {
  const { data, error } = await supabase.from('entity_aliases').insert(a).select().single()
  if (error) throw new Error(`Не удалось создать синоним: ${error.message}`)
  return data as EntityAlias | null
}

export async function updateEntityAlias(id: string, patch: Partial<EntityAlias>): Promise<EntityAlias | null> {
  const { data, error } = await supabase.from('entity_aliases').update(patch).eq('id', id).select().single()
  if (error) throw new Error(`Не удалось обновить синоним: ${error.message}`)
  return data as EntityAlias | null
}

export async function deleteEntityAlias(id: string): Promise<boolean> {
  const { error } = await supabase.from('entity_aliases').delete().eq('id', id)
  if (error) throw new Error(`Не удалось удалить синоним: ${error.message}`)
  return true
}

// D-13 collision check — returns existing aliases with the same surface_norm+type
// but a different canonical_id. UI shows the soft warning; does not block.
export async function findAliasCollisions(surfaceNorm: string, canonicalType: CanonicalType, canonicalId: string): Promise<EntityAlias[]> {
  const { data } = await supabase.from('entity_aliases').select('*')
    .eq('surface_norm', surfaceNorm).eq('canonical_type', canonicalType).neq('canonical_id', canonicalId)
  return (data ?? []) as EntityAlias[]
}

// Optional dedicated ADMIN-gated work-type attribute writer (D-17/D-20).
export async function updateWorkTypeAttributes(
  workTypeId: string,
  attrs: { service_id?: string | null; unit?: string | null; typical_period?: 'DAY'|'NIGHT'|'AROUND'|null; typical_crew?: unknown },
): Promise<boolean> {
  const { error } = await supabase.from('work_types').update(attrs).eq('work_type_id', workTypeId)
  if (error) throw new Error(`Не удалось сохранить атрибуты вида работ: ${error.message}`)
  return true
}
```

### `src/app/api/db/route.ts` — ROLE_RESTRICTED additions (D-20)

```typescript
const ROLE_RESTRICTED: Record<string, RoleLevel[]> = {
  createUser: ['ADMIN', 'BOSS', 'HR', 'ZAMPORAB'],
  updateUser: ['ADMIN', 'BOSS', 'HR', 'ZAMPORAB'],
  deleteUser: ['ADMIN', 'BOSS', 'HR', 'ZAMPORAB'],
  // ── KB (Phase 8) — ADMIN-only mutations ──
  createEntityAlias:        ['ADMIN'],
  updateEntityAlias:        ['ADMIN'],
  deleteEntityAlias:        ['ADMIN'],
  updateWorkTypeAttributes: ['ADMIN'],
}
```

### `src/app/admin/page.tsx` — tab registration

```typescript
type Tab = 'users' | 'shifts' | 'services' | 'categories' | 'objects'
         | 'constructions' | 'work_types' | 'aliases' | 'changelog'
//                                          ^^^^^^^^^ new

const tabs: { id: Tab; label: string; emoji: string }[] = [
  // ...
  { id: 'work_types', label: 'Виды работ', emoji: '🔧' },
  { id: 'aliases',    label: 'Синонимы',   emoji: '🔗' },   // new (D-19)
  { id: 'changelog',  label: 'Журнал',     emoji: '📋' },
]

{tab === 'work_types' && <WorkTypeAttributesTab />}  {/* D-17 — replaces inline WorkTypesTab */}
{tab === 'aliases'    && <AliasManagerTab />}         {/* D-19 */}
```

---

## Catalog Map — Raw Material for `docs/catalog-map.md` (KB-05 / D-05)

> This section is the **input** the executor turns into `docs/catalog-map.md`. Confirm the `work_types` live columns via `list_tables` before finalizing.

### The four reference-data stores

| # | Store | Tables | PK / id type | Created by | RLS |
|---|-------|--------|--------------|-----------|-----|
| 1 | **Admin catalog tree** (пооперационный справочник for `requests`) | `categories` → `objects` → `constructions` → `work_types` | `category_id` / `object_id` / `construction_id` / `work_type_id` — all `text` | migrations 001–018 for the first three; **`work_types` has NO migration — created directly in Supabase** | pre-050 pattern; `work_types` RLS status **unconfirmed** — check via `list_tables` |
| 2 | **Journal catalog** (lightweight daily planner) | `journal_object_categories` → `journal_objects` | `journal_object_categories.id` `text`; `journal_objects.id` `uuid` (`gen_random_uuid()`) | migration 042 | `anon_all_*` via migration **050** |
| 3 | **Work-permit catalog** (наряд-допуск viды работ) | `work_permit_types`, `work_permit_service_types` | `work_permit_types.id` `text` (slug); link PK `(service_id, type_id)` | migration 043 | **no `anon_all_*` in 043** (predates the invariant) — verify |
| 4 | **KB enrichment (Phase 8, new)** | `work_types` **+4 cols** (D-01), `journal_objects` **+3 cols** (D-03), `entity_aliases` (D-14) | `entity_aliases.id` `uuid` | migrations 053–055 | `entity_aliases` gets `anon_all_entity_aliases` in 054 |

### Cross-references (FKs & join keys)

```
categories.category_id ◄─ objects.category_id
objects.object_id      ◄─ constructions.object_id
constructions.construction_id ◄─ work_types.construction_id        (per src/types + admin UI; confirm live)
services.service_id    ◄─ work_types.service_id            (NEW, D-01, nullable)
services.service_id    ◄─ work_permit_service_types.service_id
work_permit_types.id   ◄─ work_permit_service_types.type_id

journal_object_categories.id ◄─ journal_objects.category_id       (text FK)
journal_objects.id           ◄─ daily_plan_items.object_id        (uuid FK, ON DELETE CASCADE)
services.service_id          ◄─ daily_plan_items.service_id       (text FK)
journal_objects.id           ◄─ entity_aliases.scope_object_id    (NEW, uuid FK, nullable, ON DELETE CASCADE)

entity_aliases.canonical_id  ── (string, NO FK — polymorphic) ──►
    canonical_type='object'      → journal_objects.id            (store 2)  ◄── resolver identity (D-02)
    canonical_type='work_type'   → work_types.work_type_id       (store 1)
    canonical_type='service'     → services.service_id
    canonical_type='construction'→ (nothing in v3.0 — enum value reserved, D-04)

daily_plan_items HAS NO work_type_id — work is stored as free text `work_text`.
    ⇒ a resolved work_type feeds typical_period / typical_crew PREFILL (EXT-05), not a FK.
```

### Which store is canonical for what (the answer KB-05 needs)

- **Objects the agent resolves & Phase 11 writes** → **store 2, `journal_objects`** (D-02). The admin `objects` tree (store 1) is the `requests` domain and is **not** the agent's target. `entity_aliases` object rows point at `journal_objects.id`.
- **Work-type vocabulary + service binding + typical period/crew** → **store 1, `work_types`**, enriched in place (D-01). Only rows with `service_id IS NOT NULL` enter `KbIndex`.
- **Наряд-допуск wording** → **store 3**, untouched by Phase 8; noted in the map so Phase 9 doesn't confuse it with the work-type vocabulary.
- **Services** → the single `services` table (`SRV-ENG/STR/FIRE/VENT/CCTV`), shared by all stores.
- **Constructions** → store 1 only; the KB reserves the `'construction'` alias type but stores nothing (D-04); Phase 9 decides placement.

### Known data-shape facts (from repo — confirm `work_types` via MCP)

```
journal_objects            (migration 042 + Phase 8 additions)
  id uuid pk default gen_random_uuid()
  name text not null
  category_id text not null → journal_object_categories(id)
  address text not null default ''
  created_by text
  created_at timestamptz not null default now()
  -- Phase 8 (053): inv_no text, area_m2 numeric, title_meta jsonb not null default '{}'

journal_object_categories  (migration 042)
  id text pk            -- seeded: TUN, HOUSE, SOC, ROAD, PED, OTHER
  name text not null
  emoji text not null default '📍'
  sort_order smallint not null default 0
  created_at timestamptz not null default now()
  -- D-21 may add a 'BRIDGE' category for мосты участка

daily_plan_items           (migrations 042/045/047/048/049/051)
  id uuid pk; plan_date date; shift_type text check in ('DAY','NIGHT','AROUND')  [045]
  object_id uuid not null → journal_objects(id) on delete cascade
  service_id text not null → services(service_id)
  work_text text not null                       -- NO work_type_id
  required_workers|required_foremen|required_itr|required_vehicles smallint not null default 0
  specialties jsonb default '[]'  [047];  vehicle_numbers jsonb default '[]'  [048]
  item_flag text check null|BY_ORDER|STANDBY|NOTICE  [049]
  worker_names jsonb not null default '[]'  [051];  published boolean not null default false  [051]
  note text; created_by text; created_at; updated_at

work_types                 (NO MIGRATION — created in Supabase; src/types + catalog.ts imply:)
  work_type_id text pk
  construction_id text  (→ constructions.construction_id)
  work_name text
  created_at timestamptz
  -- Phase 8 (053): service_id text → services, unit text, typical_period text, typical_crew jsonb
  -- ⚠ CONFIRM the above four existing columns + PK name + RLS via list_tables before ALTER

services                   (early migration)
  service_id text pk        -- SRV-ENG, SRV-STR, SRV-FIRE, SRV-VENT, SRV-CCTV
  service_name text
  created_at timestamptz
```

---

## State of the Art

| Old approach | Current approach | When changed | Impact on Phase 8 |
|--------------|------------------|--------------|-------------------|
| `UNIQUE (a, b)` where a NULL `b` silently allows duplicates | `UNIQUE NULLS NOT DISTINCT (a, b)` (PG15) **or** unique expression index on `coalesce(b::text,'')` | Postgres 15 (2022) | Use the expression index — Supabase Studio validator lag (Pitfall 1). |
| `pgcrypto.gen_random_uuid()` | core `gen_random_uuid()` | Postgres 13 | Already used (migration 042). No extension needed. |
| `string-similarity` (Dice) npm package | deprecated; vendor ~15 lines or use `dice-coefficient` | 2023 | Vendor it (D-12b spirit). |
| `natural` monolith for NLP | pick tiny focused libs or vendor | ongoing | `natural` now drags `mongoose`/`pg`/`redis` — never for a stemmer. |
| pymorphy2-as-a-service for JS morphology | vendored Snowball stemmer; full lemmatization stays a Python concern | — | D-12 rejects serverless pymorphy2; spike `az` only, expect stemming-only. |

**Deprecated / outdated / not-in-repo:**
- `.planning/codebase/ARCHITECTURE.md` `kb_locations`/`kb_work_types`/`kb_constructions`/`kb_aliases` island design — **superseded by D-01/D-02**. Do not build.
- `azes` npm package (named in CONTEXT.md D-12 as a spike candidate) — **does not exist on npm** (`npm view azes` → 404). The candidate is `az` (deNULL/Az.js).
- `string-similarity` npm — deprecated, "no longer supported."

---

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|-------|---------|---------------|
| A1 | `work_types` live columns are `work_type_id` (pk), `construction_id`, `work_name`, `created_at` — inferred from `src/types/index.ts` + `src/lib/api/catalog.ts`, **not** from a migration or `list_tables` | Catalog Map, Pitfall 7 | Migration 053 `ALTER` could fail or target a wrong PK/FK. **Mitigation: D-23 + Pitfall 7 mandate `list_tables` as the first schema task.** |
| A2 | `work_types` has a permissive RLS policy (or RLS disabled) so the new columns are readable/writable without a policy change | migration 053 example | If RLS is on with no policy, the rebuilt «Виды работ» tab reads empty. Confirm via `list_tables` / `get_advisors`; add `anon_all_work_types` to 053 if missing. |
| A3 | Supabase project `wwwtsvboqffzbnliuiun` runs Postgres 15+ (so `NULLS NOT DISTINCT` is *server*-supported even though we use the fallback) | Pitfall 1 | Negligible — the expression-index fallback works on PG13+. Migration 042's `gen_random_uuid()` already proves PG13+. |
| A4 | `az` (deNULL/Az.js) loads DAWG dictionaries via an async `Az.Morph.init(path, cb)` and has no synchronous Node entry point | Standard Stack, Alternatives | If wrong, the spike might succeed — good outcome, just means the spike task adopts it (with the D-12 sign-off). Doesn't change the plan's default path. `[ASSUMED from Az.js wiki]` |
| A5 | A tightly-written vendored Russian stemmer fits ~60–150 lines (D-12 says "~60"); the official Snowball JS is ~200+ | Standard Stack | If it lands at 200 lines, that's still fine (zero deps, tested). Line count is not a gate; the fixture gate is. |
| A6 | The «Виды работ» write can reuse the generic `updateWorkType` (already `.update(updates)`), OR a new `updateWorkTypeAttributes` is added purely to have an ADMIN-gated name | Pattern 3, Code Examples | If `updateWorkType` is added to `ROLE_RESTRICTED` it also locks the existing inline `WorkTypesTab` edit (which is being replaced anyway) — low risk. Planner picks one. |
| A7 | `entity_aliases` reads may stay open (any valid session), only writes ADMIN-gated | Pattern 4 | If the parse log / alias list is deemed sensitive later, add `fetchEntityAliases` to `ROLE_RESTRICTED`. Not a v3.0 concern (no PII in aliases). |
| A8 | Re-pointing `norm()` at `normalize.ts` is safe for `/journal` add-row (only 2 call sites, both in `ObjectCombobox`) | Runtime State Inventory | Slightly more aggressive matching in the suggest dropdown. Recommend a manual eyeball as a final task; fully reversible. |

---

## Open Questions

1. **`work_types` live schema — MUST resolve before migration 053.**
   - What we know: no migration in the repo creates or alters it; `src/types/index.ts` + `catalog.ts` imply `work_type_id` / `construction_id` / `work_name` / `created_at`.
   - What's unclear: exact column list, PK name, whether `construction_id` is a real FK, and the RLS policy state.
   - Recommendation: first schema task runs `mcp__supabase-gormost__list_tables` (+ `get_advisors` for RLS) and records the DDL in the plan and `docs/catalog-map.md`. Gate 053 behind it.

2. **Authoritative Гормост-Лефортово object list (D-21).**
   - What we know: KB-05 scope names ЛТР (левая/правая труба), Шереметьевский / Митьковский / Нижегородский тоннели, пешеходные тоннели ТТК участка, ЗБ ЛТР, ЗБ ГТР, мосты участка.
   - What's unclear: exact canonical names, count, category assignment (need a `BRIDGE` category?), and which are already rows in `journal_objects` today (any prod journal use may have created some on the fly).
   - Recommendation: `checkpoint:human-verify` during planning — pull current `journal_objects` via `fetchJournalObjects`, diff against the KB-05 list with the user, finalize the 055 seed. Seed is explicitly "starter"; Phase 9 dedups on the normalized+lemmatized name (IMP-05).

3. **Lemmatizer spike outcome (D-12).**
   - What we know: `az` is the only named candidate; `natural` is out; serverless pymorphy2 is rejected.
   - What's unclear: whether `az` can run sync in a Vitest node env and pass `lemma-cases.ru.ts` without a build-breaking dep.
   - Recommendation: timeboxed spike task, single candidate, hard pass/fail = "sync + fixture-green + `npm run build` green + no new runtime dep." Default outcome: keep the vendored stemmer. Any package adoption → separate plan sign-off line + `checkpoint:human-verify`.

4. **`norm()` re-point (Claude's Discretion).**
   - Recommendation: (b) re-export `norm` from `data.ts` as `normalize` from `@/lib/kb/normalize` after `normalize.ts` is test-locked, with a manual `/journal` add-row eyeball. One canonical implementation is the stated goal.

5. **Dedicated work-type writer vs. reusing `updateWorkType` (A6).**
   - Recommendation: add `updateWorkTypeAttributes` in `knowledge.ts` (narrow surface, clean `ROLE_RESTRICTED` entry, no impact on the `requests` catalog path). Planner's call.

---

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | build + Vitest | ✓ | v22.22.2 | — |
| npm | scripts | ✓ | 10.9.7 | — |
| Vitest | `npm run test` (KB-04 gate, TDD) | ✓ | `vitest@4.1.2` (`vitest.config.ts`: `environment: 'node'`, `include: ['src/**/*.test.ts','src/**/*.test.tsx']`) | — |
| TypeScript | `npx tsc --noEmit` | ✓ | `typescript@5.9.3` (strict) | — |
| ESLint | `npm run lint` (0 err / 47 warn baseline) | ✓ | `eslint@9` flat config (`eslint src`) | — |
| Supabase project | migrations 053–055 run by human in SQL Editor | ✓ | Postgres 15+ (project `wwwtsvboqffzbnliuiun`); `gen_random_uuid()` in use since migration 042 | — |
| `mcp__supabase-gormost__list_tables` / `execute_sql` | confirm `work_types` live shape (Open Q #1) | ✓ (MCP server `supabase-gormost` configured in `.mcp.json`) | — | human runs `\d work_types` in SQL Editor and pastes output |
| Next.js build | Vercel deploy; `src/lib/kb/` must bundle client-safe | ✓ | `next@16.1.1` | — |
| New npm packages | **none** (D-12b) | N/A | — | vendored code |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** MCP `list_tables` — if the researcher/planner cannot invoke it, the human runs `\d work_types; \d journal_objects` in the Supabase SQL Editor and pastes the result into the plan before migration 053.

---

## Validation Architecture

> `workflow.nyquist_validation` not disabled → section included. CLAUDE.md already mandates TDD for business logic, so this aligns with house rules.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.ts` (`environment: 'node'`, `vite-tsconfig-paths` for `@/` aliases) |
| Quick run command | `npx vitest run src/lib/kb` |
| Full suite command | `npm run test` (`vitest run` — currently 98 tests, must stay green) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test type | Automated command | File exists? |
|--------|----------|-----------|-------------------|-------------|
| KB-04 | `normalize()` — ё→е, №/N/#, dashes, quotes, NBSP, trailing punct, numeric token canonicalization (D-11) | unit | `npx vitest run src/lib/kb/normalize.test.ts` | ❌ Wave 0 |
| KB-04 | `expandAbbreviations()` — curated dict expands `борт.`/`ж/б`/`эв`/`тт`/`п/п`/`ЛТР`… (D-10) | unit | `npx vitest run src/lib/kb/expandAbbreviations.test.ts` | ❌ Wave 0 |
| KB-04 | `stem()` — vendored Russian Porter/Snowball, passes the official sample vocabulary | unit | `npx vitest run src/lib/kb/stem.test.ts` | ❌ Wave 0 |
| KB-04 | `lemmatize()` — passes `__fixtures__/lemma-cases.ru.ts` (declensions, abbrevs, «на Лефортовском тоннеле», «борт. камень», «ЭВ №3») — **D-12a mandatory gate** | unit | `npx vitest run src/lib/kb/lemmatize.test.ts` | ❌ Wave 0 |
| KB-04 | `preprocess()` — composition: expand → normalize → token-wise lemmatize, applied identically to catalog/alias/dictation/Excel inputs (D-09) | unit | `npx vitest run src/lib/kb/preprocess.test.ts` | ❌ Wave 0 |
| KB-01/KB-04 | `buildKbIndex(rows)` — pure transform from `journal_objects`+`work_types`(svc≠null)+`entity_aliases`+`services` into `KbIndex` maps/postings | unit | `npx vitest run src/lib/kb/index.test.ts` | ❌ Wave 0 |
| KB-04 | `resolveEntity()` — the D-22 fixture set (~30 cases): exact-alias, declension variant, abbrev expansion, multi-word object, **unknown → `unresolved` (not invented)**, near-tie → `ambiguous`; 3-status contract shape (D-07); `opts.type` narrowing; alias `weight` orders candidates & never promotes fuzzy (D-15) | unit | `npx vitest run src/lib/kb/resolve.test.ts` | ❌ Wave 0 |
| KB-03 | alias collision predicate — a `surface_norm`+`canonical_type` with >1 distinct `canonical_id` is flagged (pure helper, if extracted) | unit | `npx vitest run src/lib/kb` | ❌ Wave 0 |
| KB-01/KB-05 | migration grep — no new table without `anon_all_<t>` (SC#1) | manual/CI grep | `grep -L anon_all supabase/migrations/054*.sql` (expect no output) | manual |
| KB-02 | ADMIN sets service/unit/period/crew, persists across reload (SC#2) | manual UAT | `/gsd-verify-work` conversational UAT | manual |
| KB-03 | ADMIN searches aliases, sees `source`, gets collision warning (SC#3) | manual UAT | `/gsd-verify-work` | manual |
| KB-05 | `docs/catalog-map.md` exists and maps all four stores (SC#5) | manual review | file present + reviewed | manual |
| (guard) | `src/lib/kb/*` imports nothing from `src/lib/api`, no `server-only` (D-08) | unit | a test that reads the files / `grep -r "server-only\|/lib/api" src/lib/kb` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/kb` + `npm run lint` + `npx tsc --noEmit`.
- **Per wave merge:** `npm run test` (full 98 + new) + `npm run build`.
- **Phase gate:** full suite green, `npm run build` green, migration grep clean, before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `src/lib/kb/normalize.test.ts` — KB-04
- [ ] `src/lib/kb/expandAbbreviations.test.ts` — KB-04
- [ ] `src/lib/kb/stem.test.ts` — KB-04 (seed from snowballstem.org sample vocabulary)
- [ ] `src/lib/kb/lemmatize.test.ts` + `__fixtures__/lemma-cases.ru.ts` — KB-04, D-12a
- [ ] `src/lib/kb/preprocess.test.ts` — KB-04
- [ ] `src/lib/kb/index.test.ts` — KB-01
- [ ] `src/lib/kb/resolve.test.ts` + `__fixtures__/resolve-cases.ru.ts` — KB-04, D-22
- [ ] `src/lib/kb/purity.test.ts` (or a lint rule) — D-08 guard (no `server-only`, no `@/lib/api` import)
- [ ] Framework install: none — Vitest already configured.

---

## Security Domain

> `security_enforcement` not `false` → section included.

### Applicable ASVS categories

| ASVS category | Applies | Standard control in this phase |
|---------------|---------|-------------------------------|
| V1 Architecture | yes | The resolver is a **guardrail**, not a generator: `resolveEntity` returns a real ID or `unresolved` — it structurally cannot emit an invented entity (KB-04, research Pitfall 1). Documented in `resolve.ts` + `docs/catalog-map.md`. |
| V2 Authentication | no (reuses existing `gormost_token` cookie + `/api/db` session check) | — |
| V4 Access Control | yes | All KB **mutations** ADMIN-only via `ROLE_RESTRICTED` (D-20). Reads follow the existing open-to-any-session pattern (`fetchWorkTypes` is open today). No new route — `/api/db` inherits `verifySessionToken`. |
| V5 Input Validation | yes | `canonical_type` and `source` are `CHECK` constraints in the DDL; `typical_period` is a `CHECK`. `surface_raw` is stored verbatim for audit but only ever rendered as text (React escapes) — never `dangerouslySetInnerHTML`. The alias `surface` is user input but is consumed only by `preprocess()` (pure string ops) and equality/trigram comparison — no injection surface. |
| V6 Cryptography | no | — |
| V7 Error Handling / Logging | partial | `knowledge.ts` throws Russian-message errors like `journal.ts`; `/api/db` maps to `{ error }` + 500. No secrets in messages. |
| V13 API | yes | New functions are auto-exposed by the `/api/db` dispatcher the moment they're barrel-exported — the `ROLE_RESTRICTED` entries (D-20) are the gate. **Verification step:** after adding `knowledge.ts`, confirm every mutation name appears in `ROLE_RESTRICTED`. |

### Known threat patterns for this stack

| Pattern | STRIDE | Standard mitigation |
|---------|--------|---------------------|
| RLS-on-without-policy → silent data loss on `entity_aliases` | Denial of Service (self-inflicted) | `anon_all_entity_aliases` in migration 054 (CLAUDE.md invariant; SC#1 grep). |
| Non-ADMIN edits the alias table / work-type attributes via `/api/db` (shared demo PIN `1234`) | Elevation of Privilege / Tampering | `ROLE_RESTRICTED: ['ADMIN']` for all four mutations (D-20). |
| Stored XSS via `surface_raw` in the «Синонимы» list | Tampering | Render as React text only; no raw HTML. `surface_raw` is display/audit only. |
| Resolver coerces an unknown phrase to a real ID → wrong `journal_objects` link downstream | Tampering (data integrity) | Honest `low` threshold; `resolve-cases.ru.ts` asserts unknown → `unresolved` (Pitfall 3, KB-04 SC#4). |
| Polymorphic `canonical_id` with no FK → dangling reference if an object/work_type is deleted | Integrity | `scope_object_id` has `ON DELETE CASCADE`; `canonical_id` is intentionally FK-less (polymorphic) — `buildKbIndex` simply skips aliases whose `canonical_id` isn't in the loaded rows. Add an index-build test for the skip. Document in the catalog map. |
| Prompt injection / LLM abuse | — | **Not in scope** — no LLM in Phase 8 (arrives Phase 10). |

---

## Sources

### Primary (HIGH confidence) — read this session
- `.planning/phases/08-.../08-CONTEXT.md` — D-01…D-23, Claude's Discretion, Deferred (authoritative).
- `.planning/REQUIREMENTS.md` § "KB — База знаний" — KB-01…KB-05 full text; Out of Scope; Future (v3.x).
- `.planning/research/SUMMARY.md` (Reconciliation Note 1, Implications → Phase 8, Shared open questions), `.planning/research/PITFALLS.md` (Pitfalls 8, 9, 11 + "Looks Done But Isn't").
- Repo, read directly:
  - `supabase/migrations/042_journal_daily_plans.sql` (journal_objects/journal_object_categories/daily_plan_items DDL; `gen_random_uuid()`), `045` (shift_type `DAY|NIGHT|AROUND`), `047`/`048`/`049`/`051` (daily_plan_items columns), `050` (RLS `anon_all_*` pattern + cautionary tale), `043` (work_permit_types/_service_types DDL, no `anon_all_*`).
  - `src/types/index.ts` (`WorkType`, `JournalObject`, `JournalObjectCategory`, `DailyPlanItem`, `SERVICE_META`), `src/lib/api/catalog.ts`, `src/lib/api/journal.ts`, `src/lib/api.ts` (barrel), `src/app/api/db/route.ts` (`ROLE_RESTRICTED`), `src/lib/api-client.ts` (wrapper shape).
  - `src/app/admin/page.tsx` (`Tab` union, `tabs[]`, `CrudTab`, `WorkTypesTab`), `src/components/head/WorkPermitCatalogEditor.tsx` (dedicated-editor precedent), `src/components/journal/ObjectCombobox.tsx` + `src/components/journal/data.ts` (`norm()` + `PlanItem` crew keys), `src/components/journal/JournalApp.tsx` (`resolveObjectId`).
  - `package.json`, `vitest.config.ts` (deps, no NLP/fuzzy libs present; Vitest 4, node env).
  - grep: `work_types` has no migration; `daily_plan_items` has no `work_type_id`; `norm(` imported only by `ObjectCombobox.tsx`.
- `gsd-tools query package-legitimacy check --ecosystem npm az natural snowball-stemmers` — verdicts + signals.

### Secondary (MEDIUM confidence) — web, this session
- snowballstem.org — Russian stemming algorithm (RV/R1/R2, 4 steps, suffix groups, official sample vocabulary); Projects page (Mazko / Prisyazhnyuk JS ports).
- `npm view` — `az@0.2.3` (deps: none, 2016 first pub, MIT), `natural@8.1.1` (deps include mongoose/pg/redis/memjs), `snowball-stemmers@0.6.0`, `string-similarity@4.0.4` **deprecated**, `fastest-levenshtein@1.0.16`, `leven@4.1.0` (ESM), `dice-coefficient` (→ `n-gram`).
- github.com/deNULL/Az.js wiki (`Az.Morph.init(path, cb)` async DAWG dictionary loading).
- github.com/supabase/supabase issues #13267 + discussions #16991 — Supabase SQL Editor rejects `UNIQUE NULLS NOT DISTINCT`.
- freecodecamp "Fuzzy string matching with PostgreSQL", github.com/seamusabshere/fuzzy_match — Dice-for-ranking + Levenshtein-tiebreak hybrid; Dice smoother than Levenshtein for short strings.
- Supabase changelog / docs — projects run Postgres 15 or 17.

### Tertiary (LOW confidence)
- `azes` npm package (named in D-12) — **404, does not exist**; candidate is `az`.
- Exact `az` Node-vs-browser init behaviour not verified by running it — treated as ASSUMED (A4).
- Line count of a vendored RU stemmer ("~60") — estimate; the fixture gate, not line count, is the acceptance bar.

---

## Metadata

**Confidence breakdown:**
- Standard stack (vendor stemmer + fuzzy, zero deps): **HIGH** — algorithm published with test data; deps rejected on concrete evidence (`natural` tree, `string-similarity` deprecation, `az` staleness).
- Schema / migrations / catalog map: **HIGH** for stores 2–4 (read from migrations); **MEDIUM** for `work_types` live shape (no migration — flagged as Open Q #1, gated on `list_tables`).
- Architecture patterns (admin tab, `/api/db` dispatch, api-client wrappers, RLS migration): **HIGH** — read directly from the codebase, multiple precedents.
- Resolver design: **HIGH** — contract is frozen by CONTEXT.md; research only fills in the fuzzy-scoring recipe.
- Russian lemmatization tooling: **MEDIUM** — `az` behaviour assumed not verified by execution; spike is explicitly designed to resolve this.
- `NULLS NOT DISTINCT` Supabase hazard: **MEDIUM** — issues are from 2023; may be fixed in current Studio, but the fallback is free insurance.

**Research date:** 2026-09-02
**Valid until:** ~2026-10-02 (stable domain; the one moving part is the Supabase SQL Editor's `NULLS NOT DISTINCT` support — re-check if the plan chooses the native constraint).
