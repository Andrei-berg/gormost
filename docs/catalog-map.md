# Catalog Map — reference-data stores and how they relate

**Status:** living document. Created 2026-09-03 (Phase 8, KB-05 / D-05).
Phase 9 updates it when Конструктив (construction) placement is decided.

**Why this file exists:** Gormost has three pre-existing reference-data catalogs that
were never reconciled on paper, plus a fourth enrichment layer added in Phase 8. An
agent (or a developer) that guesses at which store owns object identity, or points an
alias at the wrong table, produces broken draft rows. This map is the single answer to
"which store is canonical for what".

---

## The four reference-data stores

| # | Store | Tables | PK / id type | Created by | RLS state (live, 2026-09-03) |
|---|-------|--------|--------------|-----------|------------------------------|
| 1 | **Admin catalog tree** — пооперационный справочник for the `requests` domain | `categories` → `objects` → `constructions` → `work_types` | `category_id` / `object_id` / `construction_id` / `work_type_id` — **all `text`** | migrations 001–018 for the first three; **`work_types` has NO migration — it was created directly in Supabase** | `categories` / `objects` / `constructions` / `work_types`: **RLS disabled** (legacy public `SELECT` policies present but inert). Writes via the anon key succeed. |
| 2 | **Journal catalog** — lightweight daily planner | `journal_object_categories` → `journal_objects` | `journal_object_categories.id` `text`; **`journal_objects.id` `uuid`** (`gen_random_uuid()`) | migration 042 | RLS **enabled** + `anon_all_journal_objects` / `anon_all_journal_object_categories` via migration **050** |
| 3 | **Work-permit catalog** — наряд-допуск виды работ | `work_permit_types`, `work_permit_service_types` | `work_permit_types.id` `text` (slug); link PK `(service_id, type_id)` | migration 043 | RLS **enabled**, **no `anon_all_*` policy in 043** (predates the invariant) — flag for verification; not touched by Phase 8 |
| 4 | **KB enrichment (Phase 8, new)** | `work_types` **+4 columns** (D-01), `journal_objects` **+3 columns** (D-03), **`entity_aliases`** (D-14) | `entity_aliases.id` `uuid` | migrations 053 / 054 / 055 | `work_types` RLS stays disabled (no policy change needed); `journal_objects` already policied; **`entity_aliases` gets `anon_all_entity_aliases` in migration 054, same file** |

`services` (`service_id` `text` PK, `service_name`, `created_at`; RLS disabled) is a
single shared table — `SRV-ENG`, `SRV-STR`, `SRV-FIRE`, `SRV-VENT`, `SRV-CCTV` — joined
by every store above.

---

## Cross-references (foreign keys & join keys)

```
categories.category_id          ◄─ objects.category_id
objects.object_id               ◄─ constructions.object_id
constructions.construction_id   ◄─ work_types.construction_id        (FK work_types_construction_id_fkey, ON DELETE CASCADE — confirmed live)
services.service_id             ◄─ work_types.service_id             (NEW — migration 053, D-01, nullable, FK to services)
services.service_id             ◄─ work_permit_service_types.service_id
work_permit_types.id            ◄─ work_permit_service_types.type_id (ON DELETE CASCADE)

journal_object_categories.id    ◄─ journal_objects.category_id       (text FK)
journal_objects.id              ◄─ daily_plan_items.object_id        (uuid FK, ON DELETE CASCADE)
services.service_id             ◄─ daily_plan_items.service_id       (text FK)
journal_objects.id              ◄─ entity_aliases.scope_object_id    (NEW — migration 054, uuid FK, nullable, ON DELETE CASCADE)

entity_aliases.canonical_id  ── (text, NO foreign key — polymorphic) ──►
    canonical_type = 'object'       → journal_objects.id            (store 2)   ◄── resolver object identity (D-02)
    canonical_type = 'work_type'    → work_types.work_type_id       (store 1)
    canonical_type = 'service'      → services.service_id           (shared)
    canonical_type = 'construction' → nothing in v3.0 — enum value reserved only (D-04)
```

**`entity_aliases.canonical_id` is polymorphic and carries no foreign key** — no single
FK can point at four different tables. `buildKbIndex` (Plan 08-05) silently skips a
`canonical_id` it cannot resolve against the loaded rows; `scope_object_id` *does* carry
`ON DELETE CASCADE` so a deleted journal object cannot leave a dangling scoped alias
(threat T-08-25).

**`daily_plan_items` HAS NO `work_type_id`** — confirmed against the live column list on
2026-09-03. Work on a plan row is free text in `work_text`. Therefore a resolved work
type feeds **`typical_period` / `typical_crew` prefill only** (EXT-05, Phase 11); there is
no draft-write path that needs a work-type foreign key, and none should be added.

---

## Which store is canonical for what (the answer KB-05 needs)

- **Objects the agent resolves, and objects Phase 11 «Создать черновики» writes** →
  **store 2, `journal_objects`** (D-02). The resolver returns `journal_objects.id`
  directly; the `daily_plan_items.object_id` FK is already satisfied by it. The admin
  `objects` tree (store 1) belongs to the `requests` domain and is **not** the agent's
  target. `entity_aliases` rows with `canonical_type='object'` point at
  `journal_objects.id`, never at `objects.object_id`.
- **Work-type vocabulary + service binding + typical period/crew** → **store 1,
  `work_types`**, enriched in place (D-01). Only rows with `service_id IS NOT NULL` enter
  `KbIndex` — that filter *is* the "mature subset" marker; there is no separate maturity flag.
- **Наряд-допуск wording** → **store 3** (`work_permit_types` /
  `work_permit_service_types`), untouched by Phase 8. Recorded here so Phase 9 does not
  confuse наряд-допуск formulations with the `work_types` vocabulary.
- **Services** → the single `services` table, shared by all stores.
- **Constructions** → store 1 only. The KB reserves `'construction'` as an
  `entity_aliases.canonical_type` value but stores nothing for it in v3.0 (D-04); Phase 9
  decides placement (`journal_constructions` vs enriching admin `constructions`).

The KB is **not** a parallel fourth entity tree. There is no `kb_work_types`,
`kb_locations`, `kb_objects` or `kb_constructions` table and none will be created — the
`.planning/codebase/ARCHITECTURE.md` island design is superseded by D-01/D-02.

---

## Two facts that get re-derived wrongly — stated once, here

1. **`daily_plan_items` has no work-type foreign key.** Work is `work_text` (free text).
   A resolved `work_types` row supplies `typical_period` and `typical_crew` as *prefill
   values* for the plan-row crew steppers and the день/ночь/сутки toggle — it is never
   persisted as a relation. Do not add `daily_plan_items.work_type_id`.
2. **The resolver `score` is resolution confidence from match strength, not a model
   probability.** There is no model in the resolver (Phase 8 has no LLM). `score` is a
   monotonic ranking of match quality: exact alias hit > exact normalized name > lemma
   overlap > trigram similarity. Phase 11 renders the 🟢/🟡/🔴 chip by comparing `score`
   to two config thresholds; the resolver itself only distinguishes
   `resolved` / `ambiguous` / `unresolved` (D-07).

---

## KB enrichment columns (added by migration 053) and `entity_aliases` (migration 054)

### `work_types` +4 (D-01)

| Column | Type | Notes |
|--------|------|-------|
| `service_id` | `text` NULL → `services(service_id)` | the D-01 maturity marker — resolver/agent load only `service_id IS NOT NULL` rows |
| `unit` | `text` NULL | ед. изм.: `м²`, `п.м.`, `шт.`, `м³`, `компл.`, `т` (free text with a suggest datalist in the admin editor) |
| `typical_period` | `text` NULL, `CHECK (typical_period IS NULL OR typical_period IN ('DAY','NIGHT','AROUND'))` | день / ночь / сутки; one value outside the set is rejected by the database |
| `typical_crew` | `jsonb` NULL | locked key set `{ "workers", "foremen", "itr", "vehicles" }` — mirrors the journal `PlanItem` crew counters (`src/components/journal/data.ts`), **not** the `daily_plan_items.required_*` column names |

### `journal_objects` +3 (D-03 — added empty in Phase 8, populated by Phase 9)

| Column | Type | Notes |
|--------|------|-------|
| `inv_no` | `text` NULL | инвентарный номер (Титул) |
| `area_m2` | `numeric` NULL | площадь |
| `title_meta` | `jsonb` NOT NULL DEFAULT `'{}'` | remaining Титул fields, shape decided in Phase 9 |

### `entity_aliases` (D-14, migration 054)

Polymorphic surface-form → canonical-entity table. Full DDL in
`supabase/migrations/054_entity_aliases.sql`. Key points:

- `id uuid` PK `default gen_random_uuid()`.
- `surface_raw` (as entered, for audit) + `surface_norm` (`preprocess(surface_raw)`).
- `canonical_type text CHECK IN ('object','construction','work_type','service')`.
- `canonical_id text` — polymorphic, no FK (targets per `canonical_type` above).
- `scope_object_id uuid NULL → journal_objects(id) ON DELETE CASCADE` — column exists
  from day one; `resolveEntity` **ignores scope in v3.0** (D-16), scope-aware resolution
  is v3.x.
- `weight smallint NOT NULL DEFAULT 100`, `source text CHECK IN
  ('seed','manual','voice','correction')`, `created_by text`, `created_at timestamptz`.
- Uniqueness: a **unique expression index** `uq_entity_aliases_surface` over
  `(surface_norm, canonical_type, coalesce(scope_object_id::text, ''))` — **not**
  `UNIQUE NULLS NOT DISTINCT`, which the Supabase SQL Editor validator has rejected
  (RESEARCH Pitfall 1). This is the primary mechanism, not a fallback.
- Non-unique index `idx_entity_aliases_canonical` over `(canonical_type, canonical_id)`
  for "aliases for entity X" and the D-13 collision query.
- Ships with `anon_all_entity_aliases` (`FOR ALL TO anon, authenticated USING (true)
  WITH CHECK (true)`) in the same migration file (CLAUDE.md RLS invariant; SC#1).
- Seed rows are migration **055** (Plan 08-07), not 054 — the seed aliases reference the
  `journal_objects` ids that 055 itself creates.

---

## Live `work_types` DDL as dumped 2026-09-03

Obtained via the Supabase Management API (`POST /v1/projects/{ref}/database/query`) against
project `wwwtsvboqffzbnliuiun` — the `supabase-gormost` MCP tools are not reachable from a
spawned executor agent (project-scoped `.mcp.json`), so the equivalent read-only
introspection was run directly.

```
work_types  (no migration file — created directly in Supabase)
  work_type_id     text                     not null   -- PK: work_types_pkey
  construction_id  text                     null       -- FK work_types_construction_id_fkey → constructions(construction_id) ON DELETE CASCADE
  work_name        text                     not null
  created_at       timestamp with time zone null       default now()

  RLS: DISABLED (relrowsecurity = false).
       Legacy policy "Все могут читать виды работ" (role public, SELECT, USING true)
       is present but inert while RLS is off. Anon-key writes succeed.
  ⇒ migration 053 adds NO anon_all_work_types policy — none is needed.
```

For comparison, the live shapes of the other tables touched or referenced by Phase 8
(dumped the same day):

```
services              service_id text PK not null, service_name text not null, created_at timestamptz;  RLS disabled
journal_objects       id uuid PK default gen_random_uuid(), name text not null, category_id text not null,
                      address text not null default '', created_by text, created_at timestamptz not null default now();
                      RLS enabled + anon_all_journal_objects  ⇒ migration 053's 3 new columns need no policy
daily_plan_items      … work_text text not null … NO work_type_id column …  RLS enabled + anon_all_daily_plan_items
entity_aliases        does not exist yet (created by migration 054)
```
