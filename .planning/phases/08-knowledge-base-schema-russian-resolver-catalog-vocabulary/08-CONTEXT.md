# Phase 8: Knowledge base — schema, Russian resolver, catalog vocabulary - Context

**Gathered:** 2026-09-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a grounded, **Гормост-Лефортово-scoped** vocabulary and a deterministic resolver:

- Enrichment attributes on the existing `work_types` (чья служба, ед.изм., типовой период, типовой состав).
- Enrichment columns on `journal_objects` (инв.№, площадь, meta) — added now, populated by Phase 9.
- A polymorphic `entity_aliases` table (surface → canonical object/construction/work_type/service).
- A shared Russian preprocessing pipeline (`expandAbbreviations → normalize → lemmatize`) used identically by catalog, aliases, dictation (Phase 11) and Excel cells (Phase 9).
- A **pure, in-memory, deterministic** resolver `resolveEntity(phrase, kbIndex)` returning a real catalog ID or explicit nothing (`resolved` / `ambiguous` / `unresolved`).
- Admin UI: rebuilt «Виды работ» tab + a new alias-manager tab.
- Starter seed data + a Russian fixture set proving the resolver, covered by `npm run test`.
- `docs/catalog-map.md` documenting how the catalogs relate.

**No LLM in this phase.** No provider adapters, no `/api/agent/*` routes, no eval harness (Phase 10). The resolver is the only "intelligence" and it is pure code.

**Out of scope (deferred — see Deferred Ideas):** scope-aware alias resolution, KB construction table + Конструктив ingest (Phase 9), `pg_trgm`/SQL fuzzy, serverless lemmatizer, KB-health dashboard, low-confidence review queue, bulk attribute operations beyond a single "set service for selected".
</domain>

<decisions>
## Implementation Decisions

### KB schema shape (Area 1)
- **D-01:** The KB is an **enrichment layer**, not a `kb_*` island. Enrich the existing `work_types` table directly: `ALTER TABLE work_types ADD COLUMN service_id text NULL REFERENCES services, unit text NULL, typical_period text NULL CHECK (typical_period IN ('DAY','NIGHT','AROUND')), typical_crew jsonb NULL`. No `kb_work_types`, no bridge columns. Resolver/agent load only rows where `service_id IS NOT NULL` (the "mature" subset falls out naturally). — **Reversibility:** one-way — undoing means a migration dropping columns plus rewriting the resolver's KB-index build and the admin tab; the research `ARCHITECTURE.md` `kb_work_types` design is explicitly **not** taken.
- **D-02:** Canonical **object identity = a `journal_objects` row**. The resolver returns `journal_objects.id`; Phase 11 "Создать черновики" uses it directly (the `daily_plan_items.object_id` FK is already satisfied). No `kb_locations` table. — **Reversibility:** one-way — the whole downstream write path (Phase 11) assumes this; changing it later orphans drafts.
- **D-03:** Титул enrichment columns are added to `journal_objects` **in Phase 8**, empty: `inv_no text NULL`, `area_m2 numeric NULL`, `title_meta jsonb NOT NULL DEFAULT '{}'`. Phase 9 populates them. Freeze `journal_objects` shape now so Phase 9 (which may run in parallel with Phase 10) does not rewrite migrations. — **Reversibility:** costly — a later migration + Phase 9 rework.
- **D-04:** **No KB construction table in Phase 8.** Keep `'construction'` in the `entity_aliases.canonical_type` enum (extensible), but build no construction storage. Phase 9 decides where Конструктив rows land (`journal_constructions` vs enriching admin `constructions`).
- **D-05:** The KB-05 catalog map lives in a **new `docs/catalog-map.md`** (living doc) + one pointer line in `CLAUDE.md` — NOT in the stale `.planning/codebase/ARCHITECTURE.md`. It must exist before Phase 9 coding starts. It maps: admin tree (`objects`/`constructions`/`work_types`/`categories`) ↔ `journal_objects`/`journal_object_categories` ↔ `work_permit_catalog` ↔ KB enrichment (`work_types` new columns + `entity_aliases`).

### Resolver architecture (Area 2)
- **D-06:** **All matching happens in TypeScript, in memory.** `resolveEntity(phrase, kbIndex, opts?)` is a pure function; `kbIndex` is built once from `journal_objects` + `work_types` (with `service_id`) + `entity_aliases` + `services`. No DB round-trip inside the resolver. `pg_trgm` is **not** introduced in Phase 8. — **Reversibility:** costly — the pure contract is what makes KB-04 testable; moving fuzzy to SQL later means an async contract and DB mocks in tests.
- **D-07:** Locked resolver contract (Phase 9 and Phase 11 depend on it verbatim):
  ```
  resolveEntity(phrase: string, index: KbIndex, opts?: { type?: CanonicalType }) => ResolveResult
  ResolveResult =
    | { status: 'resolved',   id: string, type: CanonicalType, score: number, method: 'alias' | 'exact' | 'fuzzy' }
    | { status: 'ambiguous',  candidates: Array<{ id: string, type: CanonicalType, score: number }> }  // ranked desc
    | { status: 'unresolved', normalized: string }
  ```
  `score` = **resolution confidence** derived from match strength (exact alias > exact normalized name > lemma overlap > trigram). It is NOT the model's self-confidence (there is no model here). Two config thresholds map score → 🟢 `resolved` / 🟡 `ambiguous` / 🔴 `unresolved`. `opts.type` narrows the search space (in dictation the field is already known). — **Reversibility:** one-way — published cross-phase contract.
- **D-08:** Code lives in **`src/lib/kb/`**: `normalize.ts`, `expandAbbreviations.ts`, `stem.ts`, `lemmatize.ts`, `preprocess.ts`, `resolve.ts`, `index.ts` (builds `KbIndex`), `__fixtures__/`, plus `*.test.ts` beside each. Pure, client-safe (no `import 'server-only'`). CRUD is a separate `src/lib/api/knowledge.ts` dispatched via `/api/db`. Keep `src/lib/kb/` cleanly separate from the future provider-dependent `src/lib/agent/` (Phase 10).

### Russian preprocessing pipeline (Area 3)
- **D-09:** Three-stage pipeline, one exported `preprocess(s)` = `expandAbbreviations(s)` → `normalize(s)` → token-wise `lemmatize()`. Applied **identically** to catalog names, alias surfaces, dictation text and Excel cells.
- **D-10:** `expandAbbreviations()` is a **separate function** with a curated in-code dictionary (`борт. → бортовой`, `ж/б → железобетонный`, `эв → эвакуационный выход`, `тт → транспортный тоннель`, `п/п → пешеходный переход`, `ЛТР/ГТР/КТР/ТТК`, …). Tested and grown independently (Phase 13 correction-learning feeds it).
- **D-11:** `normalize()` — deterministic, no dictionary: lowercase; `ё→е` (keep `й`); NBSP + multi-space → single space; trim; `№`/`N`/`#` → single ` № ` marker; all dash variants → single `-` with surrounding spaces stripped between alphanumerics; strip trailing punctuation `. , ; :` and quotes `« » " '`; numeric tokens (`3`, `№3`, `no3`) → one canonical token form.
- **D-12:** `lemmatize()` is a **swappable module** behind `(token: string) => string`. Ship a **vendored Russian Porter stemmer** in `src/lib/kb/stem.ts` (~60 lines, zero dependencies) as the guaranteed implementation and the KB-04 fallback. The Phase 8 plan **includes an explicit spike task**: try a pure-JS lemmatizer (`az` / `azes` / pymorphy2-equivalent). Adopt it only if it passes the fixture gate AND builds cleanly on Vercel; any dependency it drags in goes to a separate sign-off line in the plan. — **Reversibility:** reversible — the module boundary + fixture gate make swapping the implementation local. Serverless pymorphy2 is **rejected** (breaks D-06 purity, adds infra).
- **D-12a:** **Fixture gate** `src/lib/kb/__fixtures__/lemma-cases.ru.ts` — real `вариант → каноника` pairs (declensions, abbreviations, `на Лефортовском тоннеле`, `борт. камень`, `ЭВ №3`). A mandatory `npm run test` case; any `lemmatize` implementation must pass it.
- **D-12b:** No new npm dependency in the base build — the stemmer is vendored code.

### Alias collisions & ambiguity (Area 4)
- **D-13:** Collision in the alias manager (a new `surface_norm` that already resolves to a **different** canonical of the same type) = **soft warning**. Inline banner "«…» уже привязан к <X>. Всё равно добавить?"; ADMIN confirms; both rows live; that surface then resolves `ambiguous`. No hard block, no `conflicted` flag column — collisions are always findable by query (`surface_norm` with >1 distinct `canonical_id`).
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
  plus a non-unique index on `(canonical_type, canonical_id)` for "aliases for entity X" + the collision query. Ships with `anon_all_entity_aliases` and a rollback section in the same migration. — **Reversibility:** one-way — table shape is a migration + a cross-phase contract.
- **D-15:** Resolver ambiguity rule: an **exact alias or exact normalized-name hit** → immediately `resolved` (`method: 'alias' | 'exact'`), candidates are not collected. Only in the **fuzzy** layer: if `score(top1) - score(top2) < tieMargin` (config) and both `>= low` → `ambiguous` with ranked candidates; otherwise `top1 >= low` → `resolved` with its score (Phase 11 renders 🟡 itself when score sits in the mid band). Alias `weight` orders candidates and breaks ordering ties — it never promotes a fuzzy guess to `resolved`.
- **D-16:** `scope_object_id` column exists from day one and the alias manager can set it, but `resolveEntity` **ignores scope in v3.0** (no `opts.scopeObjectId` filtering). Scope-aware resolution is v3.x.

### Admin UI (Area 5)
- **D-17:** Rebuild the `/admin` → «Виды работ» tab as a **dedicated editor** (not the generic inline `CrudTab`); `src/components/head/WorkPermitCatalogEditor.tsx` is the precedent. Editable per work type: service dropdown (5 canonical services), `unit` free text with a suggest datalist (`м²`, `п.м.`, `шт.`, `м³`, `компл.`, `т`), `typical_period` segmented toggle день/ночь/сутки → stored `'DAY' | 'NIGHT' | 'AROUND'`, and 4 crew counters → `typical_crew jsonb` with **LOCKED keys** `{ "workers", "foremen", "itr", "vehicles" }` (exact match to `daily_plan_items` columns). Persistence via normal `updateWorkType` through `/api/db` (KB-02 SC#2: values persist across reload).
- **D-18:** "Won't-get-stuck" affordances in the tab: search box; filter chips «Без службы» / «Не заполнено» (period or crew missing); each row shows its `construction → object` breadcrumb for disambiguation; checkbox multi-select + a single lightweight bulk action «Проставить службу выбранным». Anything richer (bulk period/crew, CSV) is v3.x.
- **D-19:** New `/admin` tab **«Синонимы»** (alias manager): search by surface or canonical; list rows with a `source` badge (seed/manual/voice/correction), `weight`, and the resolved canonical entity name; add form = type selector + entity picker (reuse the `ObjectCombobox` pattern) + surface input, running the D-13 collision check on submit; edit `weight` + `scope_object_id`; delete. KB-03 SC#3 (search, source visible, collision warning) is covered here.
- **D-20:** All `knowledge.ts` mutation functions (`createEntityAlias`, `updateEntityAlias`, `deleteEntityAlias`, and any dedicated work-type-attribute writer) are added to `ROLE_RESTRICTED` in `src/app/api/db/route.ts` as **ADMIN-only**. `src/lib/api-client.ts` gets a hand-kept typed wrapper for each.

### Seed data & fixtures (Area 6)
- **D-21:** Phase 8 **hand-seeds via migration**, all marked as starter data (Phase 9 ingest refines, does not duplicate — IMP-05 dedup keys off the normalized+lemmatized name):
  - Canonical Гормост-Лефортово objects into `journal_objects` (+ any missing `journal_object_categories`; add a `BRIDGE` category if needed). Starter list from KB-05 scope: ЛТР (левая/правая труба), Шереметьевский тоннель, Митьковский тоннель, Нижегородский тоннель, пешеходные тоннели ТТК участка, ЗБ ЛТР, ЗБ ГТР, мосты участка. **The exact authoritative object list is to be finalized with the user during planning** — seed it as a starter.
  - Starter `entity_aliases` (~25–30 rows, `source='seed'`): roadmap examples + obvious abbreviations (`ЛТ` / `ЛТР` / `Лефортовский тоннель`, `борт. камень` / `БК` / `бортовой камень`, `ЭВ №N` / `аварийный выход N`, `п/п`, `тоннель ТТР`, …).
  - Starter attribution for ~10–15 of the most common `work_types` (`service_id` + `typical_period` + `typical_crew`) so the resolver has meaningful targets and the tests bite.
- **D-22:** Resolver fixture set `src/lib/kb/__fixtures__/resolve-cases.ru.ts` — ~30 cases `{ phrase, expect: { type, canonicalName } | null, note }` covering: exact-alias hit, case/declension variant, abbreviation expansion, multi-word object name, **unknown → `null`** (no invented entity, reported unresolved), near-tie → `ambiguous`. This file **is** the KB-04 SC#4 fixture set and the seed of the Phase 10 golden set (~30, grows every correction).

### Migrations (planner finalizes numbering — next free is 053)
- **D-23:** Suggested split, each self-contained with `anon_all_*` (where a new table) + rollback:
  - `053_kb_work_type_attributes.sql` — `ALTER work_types` (D-01) + `ALTER journal_objects` (D-03). Both tables already exist; **verify their live columns via Supabase `list_tables` / MCP before writing the ALTER** — `work_types` has no prior migration in the repo, it was created directly in Supabase.
  - `054_entity_aliases.sql` — create table (D-14) + `anon_all_entity_aliases` + indexes + seed aliases (D-21) + rollback.
  - `055_kb_seed_lefortovo.sql` — seed `journal_objects` (+ categories) + starter work-type attribution (D-21) + rollback keyed to the seeded ids/names.

### Claude's Discretion
- Exact abbreviation dictionary contents, exact `normalize()` regex ordering, `tieMargin` / threshold default values, fixture wording — planner/executor choose, tests lock them.
- Whether journal's `norm()` in `src/components/journal/data.ts` is re-pointed at `src/lib/kb/normalize.ts` or left alone — one canonical implementation is the goal; planner decides the migration path.
- Migration file numbers (053–055 is a suggestion).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & scope (authoritative)
- `.planning/ROADMAP.md` § "Phase 8: Knowledge base — schema, Russian resolver, catalog vocabulary" — goal, 5 success criteria, 3 phase flags.
- `.planning/REQUIREMENTS.md` § "KB — База знаний" — KB-01…KB-05 full text; § "Out of Scope" table; § "Future Requirements (v3.x)".

### Research (context — read before planning)
- `.planning/research/SUMMARY.md` § "Reconciliation Note 1" (enrichment vs 4th-island — decided as enrichment, D-01/D-02), § "Implications for Roadmap → Phase 8", § "Shared open questions".
- `.planning/research/PITFALLS.md` — Pitfall 8 (Russian morphology/declension), Pitfall 9 (RLS/auth for new tables + audio blobs), Pitfall 11 (catalog fragmentation).
- `.planning/research/ARCHITECTURE.md` §§ "New tables" / "Pattern 4" (lines ~268–411) — the proposed `kb_locations`/`kb_constructions`/`kb_work_types`/`kb_aliases` design. **REFERENCE ONLY — superseded by D-01/D-02. Do NOT build `kb_work_types`/`kb_locations`.** Useful for the `agent_parse_log` shape (a Phase 10 concern, not this phase).

### Codebase conventions
- `CLAUDE.md` § "Database" (field types), § "RLS invariant" (`anon_all_<table>` in the creating migration — mirror `anon_all_work_plans`; migration 050 is the cautionary tale), § "API & Auth" (`/api/db` dispatcher, `ROLE_RESTRICTED`), § "Testing" (TDD, tests beside source, current suite 98), § "Journal planner", § "Two schedule эталоны" (`SHIFT_HOURS` day/night/round).
- `.planning/codebase/CONVENTIONS.md`, `.planning/codebase/STRUCTURE.md` — general (note: `.planning/codebase/ARCHITECTURE.md` is dated 2025-03-01, pre-June-2026 overhaul — treat CLAUDE.md as authoritative on current structure).

### DB shape the resolver targets
- `supabase/migrations/042_journal_daily_plans.sql` — `journal_objects`, `journal_object_categories`, `daily_plan_items` original shape.
- `supabase/migrations/045_journal_around_the_clock_shift.sql` — `daily_plan_items.shift_type` ∈ `DAY|NIGHT|AROUND` (drives `typical_period`).
- `supabase/migrations/051_journal_publish_and_workers.sql` — `daily_plan_items.published`, `worker_names`.
- `supabase/migrations/050_journal_rls_policies.sql` — RLS-on-without-policy cautionary tale.

### To be authored in this phase
- `docs/catalog-map.md` — **new, a Phase 8 deliverable** (KB-05 SC#5). Must exist before Phase 9 coding. Maps admin tree ↔ journal catalog ↔ work-permit catalog ↔ KB enrichment.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/journal/data.ts` → `norm()` — minimal normalizer (lowercase, `ё→е`, whitespace). Far short of KB-04; supersede with `src/lib/kb/normalize.ts` and ideally re-point this at it (one canonical impl).
- `src/components/journal/ObjectCombobox.tsx` — free-text + fuzzy-suggest + create-on-the-fly pattern. The alias-manager entity picker reuses it; Phase 11 preview reuses it (REV-01).
- `src/lib/api/journal.ts` — `fetchJournalObjects`, `createJournalObject`, `updateJournalObject`.
- `src/lib/api/catalog.ts` — `fetchWorkTypes`, `updateWorkType`, `fetchServices`, `fetchConstructions`.
- `src/components/head/WorkPermitCatalogEditor.tsx` — precedent for a richer admin catalog editor (vs the generic `CrudTab`).
- `src/app/admin/page.tsx` — `Tab` union + `tabs[]` array + `WorkTypesTab`/`CrudTab`/`ChangelogTab`; add an `aliases` tab, rebuild the `work_types` tab.
- `src/lib/api-client.ts` — hand-kept typed wrappers; add one per new `knowledge.ts` fn.
- `src/app/api/db/route.ts` — `ROLE_RESTRICTED` map (currently only `*User` fns); add KB mutations ADMIN-only.

### Established Patterns
- `/api/db` is a single RPC dispatcher: any function exported from a `src/lib/api/*` module (re-exported by the `src/lib/api.ts` barrel) is automatically callable by name. New `src/lib/api/knowledge.ts` fns are picked up automatically; gate sensitive ones in `ROLE_RESTRICTED`.
- Every new table needs `ALTER TABLE … ENABLE ROW LEVEL SECURITY` + `CREATE POLICY anon_all_<t> … FOR ALL TO anon, authenticated USING(true) WITH CHECK(true)` **in the same migration** (RLS on + no policy = silent denial).
- Migrations: clear filename, top comment (what + why), rollback section at bottom. Agent writes them; a human runs them in the Supabase SQL Editor.
- Panel pages: thin orchestrator + `useLoadData` → `{ loading, error, reload }`; `PanelLoader` / `DataErrorBanner`; `useConfirm()` — never `window.confirm/alert`.
- Tests beside source (`foo.ts` → `foo.test.ts`), Vitest, **pure logic only**. Current suite: 98 tests; Phase 8 adds `src/lib/kb/*.test.ts` (normalize, expandAbbreviations, stem, lemma-gate, resolve, alias scoring).
- TS strict, no `any`. Comments in English. Dark theme default; light mode only via CSS tokens in `globals.css` — never `isLight ? … : …` in JS.

### Integration Points
- New module `src/lib/kb/` (pure, client-safe): `preprocess.ts` (`expandAbbreviations → normalize → lemmatize`), `stem.ts` (vendored Porter-RU), `lemmatize.ts` (swappable), `resolve.ts` (`resolveEntity`), `index.ts` (`buildKbIndex`), `__fixtures__/{resolve,lemma}-cases.ru.ts`.
- New `src/lib/api/knowledge.ts` — CRUD for `entity_aliases` + work-type attribute writes; barrel-export from `src/lib/api.ts`; ADMIN-gate in `ROLE_RESTRICTED`; typed wrappers in `api-client.ts`.
- `src/app/admin/page.tsx` — 2 tab changes (rebuild `work_types`, add `aliases`).
- Migrations `053`–`055` (numbering per planner).
- New `docs/catalog-map.md` + a pointer line in `CLAUDE.md`.
</code_context>

<specifics>
## Specific Ideas

- User's steering phrase, applied throughout: **"тип топ, чтобы потом не встряли"** — for every ambiguous call, take the option that avoids a later migration or contract break even at more upfront cost. Concretely: schema columns added now not later (D-03), resolver contract frozen with 3 explicit statuses (D-07), `lemmatize` as a swappable module + mandatory fixture gate (D-12/D-12a), `scope_object_id` column present from day one though unused (D-16), `entity_aliases` DDL fully locked including `surface_raw` for audit (D-14).
- Prefer vendored code over an npm dependency where reasonable (Porter-RU stemmer in-repo, D-12b).
- `typical_crew` jsonb keys are locked to `{ workers, foremen, itr, vehicles }` to mirror `daily_plan_items` columns 1:1 (D-17) — no translation layer later.
</specifics>

<deferred>
## Deferred Ideas

- **Scope-aware alias resolution** (resolver filtering by `scope_object_id` — one abbreviation meaning different things across ЛТР/ГТР/ТТК/ЗБ) — v3.x. Column ships now (D-16); logic later.
- **KB construction storage + Конструктив ingest** — Phase 9 decides placement (`journal_constructions` vs enriching admin `constructions`). `'construction'` stays in the `canonical_type` enum.
- **`pg_trgm` / SQL-side fuzzy match** — a performance optimization only; revisit if the in-memory resolver proves slow at real catalog size. Contract (D-07) does not change.
- **Serverless pymorphy2 lemmatizer** — rejected (breaks the pure-resolver invariant D-06, adds a deploy artifact). The Phase 8 spike is a pure-JS lemmatizer only.
- **Bulk attribute operations** beyond a single "set service for selected rows" (bulk period/crew, CSV up/download) — v3.x.
- **Conflict-review screen** for colliding aliases — v3.x. Collisions are query-findable; a soft warning is enough for v3.0 (D-13).
- **KB-health dashboard** (work types without a service, objects without aliases, most-corrected phrases) — v3.x (already in REQUIREMENTS "Future").
- **Low-confidence review queue** — v3.x (roadmap decision).
- **Vercel plan / `maxDuration` verification** — a Phase 10 concern (LLM/STT routes); not relevant to Phase 8.

### Phase flags resolved
- *"No verified JS Russian lemmatization library"* → D-12: vendored Porter-RU stemmer is the guaranteed implementation; a pure-JS lemmatizer spike is an explicit Phase 8 plan task behind the D-12a fixture gate; the resolver contract is unaffected either way.
- *"Reconciliation between the three catalogs is undocumented"* → D-05: `docs/catalog-map.md` is a Phase 8 deliverable, authored before Phase 9 coding.
- *"Confirm KB is an enrichment layer, not a standalone 4th catalog"* → **CONFIRMED** (D-01, D-02).

### Reviewed Todos (not folded)
None — no pending todos matched Phase 8.
</deferred>

---

*Phase: 8-knowledge-base-schema-russian-resolver-catalog-vocabulary*
*Context gathered: 2026-09-02*
