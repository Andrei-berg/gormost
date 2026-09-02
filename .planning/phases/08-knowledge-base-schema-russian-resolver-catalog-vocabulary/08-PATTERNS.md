# Phase 8: Knowledge base — schema, Russian resolver, catalog vocabulary - Pattern Map

**Mapped:** 2026-09-02
**Files analyzed:** 33 (new + modified)
**Analogs found:** 33 / 33 (every file has a concrete in-repo analog)

Read-only pass. The only file written by this agent is this PATTERNS.md.

---

## File Classification

### New — pure KB lib (`src/lib/kb/`, client-safe, zero deps, no `@/lib/api`, no `server-only`)

| New file | Role | Data flow | Closest analog | Match quality |
|----------|------|-----------|----------------|---------------|
| `src/lib/kb/types.ts` | types/contract | — | `src/lib/journalStats.ts` (top `export interface` block) | role-match |
| `src/lib/kb/normalize.ts` (+ `.test.ts`) | utility (pure transform) | transform | `src/components/journal/data.ts` → `norm` (line 96-98) | exact (same job, stricter) |
| `src/lib/kb/expandAbbreviations.ts` (+ `.test.ts`) | utility (dict transform) | transform | `src/lib/shifts.ts` `SCHEDULES` эталон + helper; `journal/data.ts` `SPECIALTIES` const table | role-match |
| `src/lib/kb/stem.ts` (+ `.test.ts`) | utility (vendored algorithm) | transform | `src/lib/shifts.ts` (pure, dated top-comment, hardcoded constants + JSDoc) | role-match |
| `src/lib/kb/lemmatize.ts` (+ `.test.ts`) | utility (swappable module) | transform | `src/lib/workSchedule.ts` (single-source module re-exported everywhere) | role-match |
| `src/lib/kb/preprocess.ts` (+ `.test.ts`) | utility (composition) | transform | `src/lib/journalStats.ts` `aggregateJournal` (pure compose over pure helpers) | role-match |
| `src/lib/kb/index.ts` (+ `.test.ts`) — `buildKbIndex(rows)` | utility (pure transform) | batch/transform | `src/lib/journalStats.ts` `aggregateJournal(items)` — rows in, index object out, `Map` accumulators | exact (structural) |
| `src/lib/kb/resolve.ts` (+ `.test.ts`) — `resolveEntity` | utility (pure resolver) | request-response (sync) | `src/lib/shifts.ts` `getShiftForDate` / `isWorkerOnDuty` (pure, discriminated return) | role-match |
| `src/lib/kb/__fixtures__/resolve-cases.ru.ts` | test fixture (data) | — | `src/lib/*.test.ts` table-driven cases (no dedicated fixture dir exists yet — new convention) | no analog (new) |
| `src/lib/kb/__fixtures__/lemma-cases.ru.ts` | test fixture (data) | — | same | no analog (new) |
| `src/lib/kb/purity.test.ts` (D-08 guard) | test | — | — (new; grep-style test) | no analog (new) |

### New — API domain module (server side, auto-dispatched by `/api/db`)

| New file | Role | Data flow | Closest analog | Match quality |
|----------|------|-----------|----------------|---------------|
| `src/lib/api/knowledge.ts` | service (CRUD module) | CRUD / request-response | `src/lib/api/journal.ts` (throw-on-error Russian messages) + `src/lib/api/catalog.ts` (WORK TYPES block) | exact |

### Modified — wiring

| File | Role | Change | Closest analog (in-file precedent) |
|------|------|--------|-----------------------------------|
| `src/lib/api.ts` | barrel | add `export * from './api/knowledge'` | every existing line in the file |
| `src/app/api/db/route.ts` | route (dispatcher) | add 4 KB mutations to `ROLE_RESTRICTED` as `['ADMIN']` | existing `createUser/updateUser/deleteUser` entries (lines 12-16) |
| `src/lib/api-client.ts` | client wrappers | one `call('fn', [args])` wrapper per `knowledge.ts` fn + import `EntityAlias` type | `fetchWorkTypes`/`createWorkType`/`updateWorkType` (lines 157-170), `createJournalObject` (910-919), `createWorkPermitType` (956) |
| `src/app/admin/page.tsx` | page (thin tab router) | extend `Tab` union, add `tabs[]` entries, swap `<WorkTypesTab/>` → `<WorkTypeAttributesTab/>`, add `<AliasManagerTab/>` | `tabs[]` array (48-57) + `{tab === ...}` block (75-82) |
| `src/components/journal/data.ts` | reference/mappers | (Discretion) re-point `norm` → re-export from `@/lib/kb/normalize` | `norm` at lines 96-98; only importer is `ObjectCombobox.tsx` |

### New — admin UI components (`src/components/admin/`, client components)

| New file | Role | Data flow | Closest analog | Match quality |
|----------|------|-----------|----------------|---------------|
| `src/components/admin/WorkTypeAttributesTab.tsx` | component (dedicated editor) | CRUD / request-response | `src/components/head/WorkPermitCatalogEditor.tsx` (dedicated editor, per-row expand, save-diff-only) + `admin/page.tsx` `UsersTab` (search + filter chips + inline table) | exact (D-17 names it) |
| `src/components/admin/AliasManagerTab.tsx` | component (CRUD + collision warn) | CRUD / request-response | `WorkPermitCatalogEditor.tsx` `CreateTypeForm` (add form) + `admin/page.tsx` `UsersTab` (search) + `journal/ObjectCombobox.tsx` (entity picker) | role-match / composite |

### New — migrations (`supabase/migrations/`)

| New file | Role | Change | Closest analog | Match quality |
|----------|------|--------|----------------|---------------|
| `053_kb_work_type_attributes.sql` | migration | `ALTER work_types` +4 cols, `ALTER journal_objects` +3 cols | `047`/`048`/`051` (`ADD COLUMN IF NOT EXISTS`); no RLS block (mirror the "no policy needed for ALTER" note) | role-match |
| `054_entity_aliases.sql` | migration (new table) | `CREATE TABLE` + unique expression index + `anon_all_entity_aliases` + seed + rollback | `042_journal_daily_plans.sql` (table + index + seed + rollback) fused with `050_journal_rls_policies.sql` (policy block) | exact |
| `055_kb_seed_lefortovo.sql` | migration (seed) | seed `journal_objects` (+ categories) + starter `work_types` attribution + rollback | `042` seed block (`insert ... on conflict (id) do nothing`) | exact |

### New — docs

| New file | Role | Closest analog |
|----------|------|----------------|
| `docs/catalog-map.md` | doc (living) | RESEARCH.md § "Catalog Map — Raw Material" is the raw input; no `docs/*.md` precedent in repo — freeform |
| `CLAUDE.md` pointer line | doc edit | existing "Key Files" bullets in CLAUDE.md |

---

## Pattern Assignments

### `src/lib/kb/types.ts` (types, no analog needed — contract is frozen in CONTEXT D-07)

Take the type bodies **verbatim** from RESEARCH.md § "Code Examples → `types.ts`" (lines 470-503). Key locks:
- `TypicalCrew = { workers: number; foremen: number; itr: number; vehicles: number }` — keys mirror `src/components/journal/data.ts` `PlanItem` (lines 39-42), **NOT** the `required_*` column names. Add a comment mapping each key → its `daily_plan_items.required_*` column (Pitfall 5).
- `TypicalPeriod = 'DAY' | 'NIGHT' | 'AROUND'` — matches `daily_plan_items.shift_type` check and `journal/data.ts` `Period` (line 9).
- `CanonicalType = 'object' | 'construction' | 'work_type' | 'service'`.

Module-header comment style — copy from `src/lib/journalStats.ts:1-2`:
```typescript
// Aggregation of journal daily plan items for the boss dashboard (...). Pure + testable.
import type { DailyPlanItem, SpecialtyCount } from '@/types'
export interface JournalServiceStat { ... }
```

### `src/lib/kb/normalize.ts` (utility, transform)

**Analog:** `src/components/journal/data.ts` lines 96-98:
```typescript
// Normalize for fuzzy object matching: lowercase, ё→е, collapse spaces.
export const norm = (s: string) =>
  s.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim()
```
This is the seed. D-11 makes it stricter (№/N/# marker, dash variants, quote strip, trailing punct, numeric token canonicalization). Shape to copy is in RESEARCH.md § "Pattern 1" (lines 306-318). Regex ordering is Claude's Discretion — `normalize.test.ts` locks it. **Single named export `normalize`.**

**Re-point (Discretion, D-11 note):** after `normalize.ts` is test-locked, change `journal/data.ts:97` to
`export { normalize as norm } from '@/lib/kb/normalize'` and eyeball `/journal` add-row. Only consumer is `ObjectCombobox.tsx` (2 call sites: `matches` filter line 29, `exact` check line 35).

### `src/lib/kb/stem.ts` (utility, vendored algorithm)

**Analog for file shape:** `src/lib/shifts.ts:1-4` — dated top comment explaining the source-of-truth + a JSDoc on the exported function:
```typescript
// Утилита для расчёта смен
// База: 2 января 2025 = 4 смена (...)
```
For `stem.ts`: cite `snowballstem.org/algorithms/russian/stemmer.html` in the header. Single export `export function stem(token: string): string`. `stem.test.ts` seeded from the official sample vocabulary (RESEARCH § "Standard Stack" row 1). Zero imports.

### `src/lib/kb/lemmatize.ts` (utility, swappable module)

**Analog:** `src/lib/workSchedule.ts` — the "single source, everyone derives" module pattern (CLAUDE.md § "Two schedule эталоны"). Ship:
```typescript
import { stem } from './stem'
// Swap point (D-12): (token) => string. v3.0 default delegates to the vendored stemmer.
export function lemmatize(token: string): string { return stem(token) }
```
`lemmatize.test.ts` = the D-12a fixture gate, imports `./__fixtures__/lemma-cases.ru.ts`.

### `src/lib/kb/preprocess.ts` (utility, composition)

**Analog:** `src/lib/journalStats.ts` `aggregateJournal` — a pure function composing pure helpers (`import { requiresWorkPermit } from './highRiskWorks'`). Here:
```typescript
import { expandAbbreviations } from './expandAbbreviations'
import { normalize } from './normalize'
import { lemmatize } from './lemmatize'
// D-09: identical path for catalog names, alias surfaces, dictation text, Excel cells.
export function preprocess(s: string): { normalized: string; lemmas: string[] } { ... }
```

### `src/lib/kb/index.ts` — `buildKbIndex(rows)` (utility, pure transform)

**Analog:** `src/lib/journalStats.ts` `aggregateJournal(items: DailyPlanItem[]): JournalStats` (lines 29+) — the exact structural template:
- Takes already-fetched arrays, returns one aggregate object.
- Uses `const svc = new Map<string, ...>()` accumulators (line 30).
- Pure, no I/O, no `@/lib/api` import — only `import type` from `@/types`.

`buildKbIndex` signature: `(rows: { objects: JournalObject[]; workTypes: KbWorkType[]; aliases: EntityAlias[]; services: Service[] }) => KbIndex`. Only include `workTypes` where `service_id != null` (D-01). Skip aliases whose `canonical_id` is not in the loaded rows (Security Domain — dangling polymorphic ref; add a test for the skip).

Note: `/api/db` `serialize()` (route.ts:18-22) wraps `Map`/`Set` returns and `api-client.ts` `call()` (lines 48-53) unwraps them — but `buildKbIndex` is pure lib called client-side after fetching, so its `Map` fields never cross the RPC boundary. Fine.

### `src/lib/kb/resolve.ts` — `resolveEntity` (utility, sync resolver)

**Analog:** `src/lib/shifts.ts` `getShiftForDate` / `isWorkerOnDuty` — pure, sync, returns a structured discriminated value; heavy JSDoc. Skeleton + match-ladder is in RESEARCH.md § "Code Examples → `resolve.ts`" (lines 508-540) and § "Pattern 2" (lines 321-333) — **take verbatim**, thresholds (`low`/`high`/`tieMargin`) are Discretion locked by `resolve.test.ts`. Imports only `./types` and `./preprocess`. Add a header comment: `score` = resolution confidence from match strength only, NOT model probability (Pitfall 4).

### `src/lib/api/knowledge.ts` (service, CRUD)

**Analog:** `src/lib/api/journal.ts` in full — same `import { supabase } from '../supabase'`, same throw-on-error with Russian messages:
```typescript
export async function createJournalObject(obj: Partial<JournalObject>): Promise<JournalObject | null> {
  const { data, error } = await supabase.from('journal_objects').insert(obj).select().single()
  if (error) throw new Error(`Не удалось создать объект журнала: ${error.message}`)
  return data as JournalObject | null
}
```
Also mirror `src/lib/api/catalog.ts` lines 100-119 (WORK TYPES: `fetchWorkTypes` uses `.select('*')` → picks up new columns for free; `updateWorkType` uses generic `.update(updates)` → carries new columns for free).

Full CRUD shape for `knowledge.ts` is spelled out in RESEARCH.md § "Code Examples → `src/lib/api/knowledge.ts`" (lines 628-673): `fetchEntityAliases`, `createEntityAlias`, `updateEntityAlias`, `deleteEntityAlias`, `findAliasCollisions(surfaceNorm, type, canonicalId)` (D-13 — returns rows with same `surface_norm`+`canonical_type` but different `canonical_id`; UI shows soft warning, never blocks), `updateWorkTypeAttributes(workTypeId, attrs)` (dedicated ADMIN-gated writer per D-17/D-20, `.eq('work_type_id', workTypeId)`).

`EntityAlias` type: add to `src/types/index.ts` near `JournalObject` (line 1053) OR export from `src/lib/kb/types.ts` and re-export. Body in RESEARCH lines 491-502.

### `src/lib/api.ts` (barrel)

Add exactly one line after line 15 (`export * from './api/journal'` neighbourhood):
```typescript
export * from './api/knowledge'
```
Dispatcher (`route.ts:32`) picks up every export by name automatically.

### `src/app/api/db/route.ts` (dispatcher)

**Analog:** the `ROLE_RESTRICTED` object itself (lines 12-16). Extend to:
```typescript
const ROLE_RESTRICTED: Record<string, RoleLevel[]> = {
  createUser: ['ADMIN', 'BOSS', 'HR', 'ZAMPORAB'],
  updateUser: ['ADMIN', 'BOSS', 'HR', 'ZAMPORAB'],
  deleteUser: ['ADMIN', 'BOSS', 'HR', 'ZAMPORAB'],
  // ── KB (Phase 8) — ADMIN-only mutations (D-20) ──
  createEntityAlias:        ['ADMIN'],
  updateEntityAlias:        ['ADMIN'],
  deleteEntityAlias:        ['ADMIN'],
  updateWorkTypeAttributes: ['ADMIN'],
}
```
Reads (`fetchEntityAliases`, `findAliasCollisions`) stay open — matches `fetchWorkTypes` being open today (A7). Enforcement is lines 35-38 (already present). No other change to this file.

### `src/lib/api-client.ts` (hand-kept wrappers)

**Analog:** lines 157-170 (work types) and 910-919 (journal objects):
```typescript
export function fetchWorkTypes(constructionId?: string): Promise<WorkType[]> {
  return call('fetchWorkTypes', [constructionId])
}
export function updateWorkType(wtId: string, updates: Partial<WorkType>): Promise<WorkType | null> {
  return call('updateWorkType', [wtId, updates])
}
```
Add, in a new `// ============ KNOWLEDGE BASE ============` section, one wrapper per `knowledge.ts` fn:
```typescript
export function fetchEntityAliases(): Promise<EntityAlias[]> { return call('fetchEntityAliases', []) }
export function createEntityAlias(a: Partial<EntityAlias>): Promise<EntityAlias | null> { return call('createEntityAlias', [a]) }
export function updateEntityAlias(id: string, patch: Partial<EntityAlias>): Promise<EntityAlias | null> { return call('updateEntityAlias', [id, patch]) }
export function deleteEntityAlias(id: string): Promise<boolean> { return call('deleteEntityAlias', [id]) }
export function findAliasCollisions(surfaceNorm: string, type: CanonicalType, canonicalId: string): Promise<EntityAlias[]> { return call('findAliasCollisions', [surfaceNorm, type, canonicalId]) }
export function updateWorkTypeAttributes(workTypeId: string, attrs: Partial<...>): Promise<boolean> { return call('updateWorkTypeAttributes', [workTypeId, attrs]) }
```
Add `EntityAlias, CanonicalType` to the `import type { ... } from '@/types'` block (lines 4-25). Kept in sync MANUALLY (file header comment + CLAUDE.md).

### `src/app/admin/page.tsx` (thin tab router)

**Current shape to mirror:**
- `Tab` union — line 35: `type Tab = 'users' | 'shifts' | 'services' | 'categories' | 'objects' | 'constructions' | 'work_types' | 'changelog'` → add `| 'aliases'` (work-types keeps its id).
- `tabs[]` array — lines 48-57 (`{ id, label, emoji }`). Insert after the `work_types` entry (line 55):
  ```typescript
  { id: 'work_types', label: 'Виды работ', emoji: '🔧' },
  { id: 'aliases',    label: 'Синонимы',   emoji: '🔗' },
  ```
- Render block — lines 75-82. Change line 81 and add one:
  ```typescript
  {tab === 'work_types' && <WorkTypeAttributesTab />}   {/* was <WorkTypesTab /> */}
  {tab === 'aliases'    && <AliasManagerTab />}
  ```
- Add imports at top: `import WorkTypeAttributesTab from '@/components/admin/WorkTypeAttributesTab'` and `import AliasManagerTab from '@/components/admin/AliasManagerTab'` (mirrors the existing `import ShiftTab from '@/components/admin/ShiftTab'` at line 15).
- The inline `WorkTypesTab` function (lines 619-631) and its `CrudTab` usage become dead — delete `WorkTypesTab` and its now-unused imports (`createWorkType`, `deleteWorkType` if unused elsewhere in the file) to keep lint baseline (0 err).

**Existing wiring precedent:** `ShiftTab` is the one already-extracted tab component (imported line 15, rendered line 76 `<ShiftTab session={session} hidePhases />`). `CrudTab` (lines 452-568, generic, `any`-typed with one `eslint-disable`) and `ChangelogTab` (633-672, own `load` + table) stay untouched. Do NOT copy the `eslint-disable @typescript-eslint/no-explicit-any` into new code.

### `src/components/admin/WorkTypeAttributesTab.tsx` (dedicated editor)

**Primary analog:** `src/components/head/WorkPermitCatalogEditor.tsx`. Copy these patterns:
- **Self-loading with `alive` guard** (lines 38-45):
  ```typescript
  useEffect(() => {
    let alive = true
    Promise.all([fetchWorkTypes(), fetchConstructions(), fetchServices()]).then(([w, c, s]) => {
      if (alive) { ... }
    })
    return () => { alive = false }
  }, [...])
  ```
- **`load()` callback reused by mutations** (lines 30-34) — event handlers call `await load()` after a write, never raw fetch.
- **Per-row local edit state + save-diff-only** — `EnabledRow` (lines 189-255): local `useState` seeded from the row, `ovOrNull(val, def)` idiom (line 202) to persist only changed fields, a `busy` flag per row id (line 23, `setBusy(t.id)` / `setBusy(null)`).
- **`<select>` from `fetchServices()`** — lines 112-118 pattern.

**Secondary analog:** `admin/page.tsx` `UsersTab` (lines 176-449) for the tab chrome:
- search input (lines 252-257), filter chip buttons (lines 275-291 — the `filterStatus`/`filterShift` toggle-button pattern → reuse for «Без службы» / «Не заполнено»),
- `glass rounded-2xl overflow-hidden` table wrapper (line 351), `form-select` class, `bg-white/5` / `text-white/40` theme classes (dark canonical, no `isLight` in JS).

**Field specifics (D-17):** `unit` `<input list=...>` datalist with `м²`,`п.м.`,`шт.`,`м³`,`компл.`,`т`; `typical_period` 3-way segmented toggle (день/ночь/сутки → `'DAY'|'NIGHT'|'AROUND'`) — model on the filter-chip button group; 4 number steppers → `typical_crew` object with locked keys `{ workers, foremen, itr, vehicles }`. `construction → object` breadcrumb per row from an in-memory join of `fetchConstructions()` (D-18). Persist via `updateWorkTypeAttributes(work_type_id, { service_id, unit, typical_period, typical_crew })`. Bulk «Проставить службу выбранным» = checkbox column + one button looping `updateWorkTypeAttributes`.

**Do NOT** use `CrudTab` (RESEARCH Anti-Patterns — can't do toggles/steppers/breadcrumbs/bulk-select).

### `src/components/admin/AliasManagerTab.tsx` (CRUD + collision warn)

**Analogs (composite):**
- Tab chrome + search + inline table + delete button → `admin/page.tsx` `UsersTab` (search line 252-257; `InlineText`/`InlineSelect` cells lines 90-173 for editing `weight` / `scope_object_id` in place; row delete button lines 434-438).
- Add-form (collapsible `+ Создать` → form → submit) → `WorkPermitCatalogEditor.tsx` `CreateTypeForm` (lines 258-331): `openForm` toggle, local field state, `submit()` that calls the create fn then resets.
- Entity picker → `src/components/journal/ObjectCombobox.tsx` in full (free-text + `norm`-based `matches` filter + "create/pick" affordance). D-19 says reuse this pattern per `canonical_type`; for `work_type`/`service` swap the row source but keep the structure (lines 27-38 `matches`/`exact` memo, lines 52-78 dropdown).
- Collision soft-warning → `useConfirm()` from `src/components/ConfirmDialog.tsx` (imported in `admin/page.tsx:16`, used e.g. line 221: `if (!(await confirmDialog('...', { confirmLabel: '...' }))) return`). On submit: call `findAliasCollisions(...)`; if non-empty, `await confirmDialog('«…» уже привязан к <X>. Всё равно добавить?')` before `createEntityAlias`. NEVER `window.confirm`.
- `source` badge (seed/manual/voice/correction) → mimic the `hasOverride` pill in `WorkPermitCatalogEditor.tsx:214` (`text-[9px] px-1.5 py-0.5 rounded bg-blue-500/15 ...`).

Resolve `canonical_id` → display name by looking it up in the already-loaded `journal_objects` / `work_types` / `services` arrays (no extra fetch).

### Migration `053_kb_work_type_attributes.sql`

**Analog:** `047`/`048`/`051` for `ADD COLUMN IF NOT EXISTS` idempotency; full text is in RESEARCH.md § "Code Examples → migration 053" (lines 545-575) — **take verbatim**. Header comment style from `042_journal_daily_plans.sql:1-6` and `050:1-13` (`-- 0NN_name.sql` / `-- WHAT:` / `-- WHY:`). No RLS block (both tables already policied — journal_objects via 050; work_types confirm via `list_tables`). Commented `-- ── ROLLBACK ──` block at bottom (mirror `042:54-57`).

**GATED PREREQUISITE (Pitfall 7, D-23):** first schema task runs `mcp__supabase-gormost__list_tables` (schema `public`, tables `work_types`, `journal_objects`, `journal_object_categories`, `services`, `daily_plan_items`) + `get_advisors` for RLS, and pastes the real `work_types` DDL into the plan and `docs/catalog-map.md` BEFORE writing 053. If `work_types` has RLS on with no policy, add `anon_all_work_types` to 053 (mirror 050).

### Migration `054_entity_aliases.sql`

**Analog:** `042_journal_daily_plans.sql` (CREATE TABLE + `create index if not exists` + seed `on conflict do nothing` + rollback) fused with `050_journal_rls_policies.sql` (the `ENABLE ROW LEVEL SECURITY` + `DROP POLICY IF EXISTS` + `CREATE POLICY anon_all_<t> ... FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)` block, lines 15-35). Full text in RESEARCH.md § "Code Examples → migration 054" (lines 579-626) — **take verbatim**.

**Critical (Pitfall 1):** use the **unique expression index** as the primary uniqueness mechanism, NOT `UNIQUE NULLS NOT DISTINCT`:
```sql
create unique index if not exists uq_entity_aliases_surface
  on public.entity_aliases (surface_norm, canonical_type, coalesce(scope_object_id::text, ''));
```
Plus non-unique `idx_entity_aliases_canonical on (canonical_type, canonical_id)`. Seed ~25-30 `source='seed'` rows (D-21), ids cross-referenced to the 055 seed. `id uuid primary key default gen_random_uuid()` — already proven at `042:17`.

### Migration `055_kb_seed_lefortovo.sql`

**Analog:** the seed block of `042_journal_daily_plans.sql:44-52`:
```sql
insert into journal_object_categories (id, name, emoji, sort_order) values
  ('TUN', 'Туннели', '🚇', 1), ...
on conflict (id) do nothing;
```
Seed canonical Гормост-Лефортово `journal_objects` (+ a `BRIDGE` category row if needed) and starter `work_types` attribution (`update ... set service_id=..., typical_period=..., typical_crew='{...}'::jsonb where work_type_id=...`). All marked starter data. Rollback keyed to the exact seeded ids/names.

**GATED (Open Q #2):** `checkpoint:human-verify` during planning — pull current `journal_objects` via `fetchJournalObjects`, diff against the KB-05 list with the user, finalize the object list before writing 055.

### `docs/catalog-map.md`

No repo precedent (no `docs/*.md`). Raw material is RESEARCH.md § "Catalog Map — Raw Material" (lines 711-800) — the four stores table, the FK/join-key block, "which store is canonical for what". Must document: (1) `entity_aliases.canonical_id` targets per type (object→`journal_objects.id`, work_type→`work_types.work_type_id`, service→`services.service_id`, construction→nothing in v3.0); (2) `daily_plan_items` has NO `work_type_id` — resolved work types feed prefill only; (3) resolver `score` semantics (Pitfall 4). Add one pointer line to `CLAUDE.md` § "Key Files" (mirror existing bullet style, e.g. the `src/lib/journalStats.ts` line).

---

## Shared Patterns

### Pure-module + TDD (all `src/lib/kb/*`)
**Source:** `src/lib/journalStats.ts`, `src/lib/shifts.ts`, `src/lib/workSchedule.ts`
**Apply to:** every `src/lib/kb/*.ts`
- Dated/sourced top comment; `import type` from `@/types` only (kb also imports sibling kb modules).
- Named exports, no default. Test file beside source (`foo.ts` → `foo.test.ts`), Vitest, table-driven cases.
- **D-08 guard:** no `import 'server-only'`, no `@/lib/api` import anywhere under `src/lib/kb/`. `purity.test.ts` (or a lint rule) greps the tree. The `supabase` client import lives ONLY in `src/lib/api/knowledge.ts`.

### API domain module → dispatch → wrapper (3 edits)
**Source:** `src/lib/api/journal.ts` + `src/lib/api.ts:14` + `src/app/api/db/route.ts:12-16` + `src/lib/api-client.ts:157-170`
**Apply to:** `knowledge.ts` and its wiring
1. New `src/lib/api/*.ts` using `import { supabase } from '../supabase'`, throw `new Error('Не удалось …: ${error.message}')` on error.
2. `export * from './api/knowledge'` in the barrel.
3. Mutations → `ROLE_RESTRICTED` as `['ADMIN']`; one hand-written `call('fn', [args])` wrapper per fn in `api-client.ts` (+ type import).

### Admin tab component
**Source:** `src/components/head/WorkPermitCatalogEditor.tsx` (dedicated editor: `alive`-guarded self-load, `load()` reused by mutations, per-row local state, `ovOrNull` save-diff, per-id `busy` flag) + `src/app/admin/page.tsx` `UsersTab` (search input, filter-chip toggle buttons, `glass rounded-2xl` table, `form-select`, `InlineText`/`InlineSelect` cells)
**Apply to:** `WorkTypeAttributesTab.tsx`, `AliasManagerTab.tsx`
- Loading/error: `useLoadData` → `{ loading, error, reload }` + `PanelLoader` / `DataErrorBanner` from `src/components/DataState.tsx` (CLAUDE.md house pattern).
- Confirmations: `useConfirm()` from `src/components/ConfirmDialog.tsx` — never `window.confirm`/`alert`.
- Theme: dark utility classes canonical (`bg-white/5`, `text-white/40`, `bg-blue-600`); no `isLight ? … : …` in JS.

### Migration conventions
**Source:** `042_journal_daily_plans.sql`, `050_journal_rls_policies.sql`
**Apply to:** `053`, `054`, `055`
- Header: `-- 0NN_name.sql` + `-- WHAT:` + `-- WHY:`.
- New table → `ENABLE ROW LEVEL SECURITY` + `DROP POLICY IF EXISTS` + `CREATE POLICY anon_all_<t> ON <t> FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)` **in the same file** (SC#1 grep; migration 050 is the cautionary tale).
- `ADD COLUMN IF NOT EXISTS`, `create index if not exists`, seed with `on conflict … do nothing`.
- Commented `-- ── ROLLBACK ──` block at bottom, keyed to exact objects created.
- Agent writes the file; a human runs it in the Supabase SQL Editor (plan for round-trip latency; the editor's client-side validator is real — Pitfall 1).

---

## No Analog Found

| File | Role | Reason | Planner guidance |
|------|------|--------|------------------|
| `src/lib/kb/__fixtures__/resolve-cases.ru.ts` | test fixture | No `__fixtures__` dir exists; tests today inline their cases | New convention. `{ phrase, expect: {type, canonicalName} \| null, note }[]`, ~30 cases (D-22). |
| `src/lib/kb/__fixtures__/lemma-cases.ru.ts` | test fixture | same | `вариант → каноника` pairs (D-12a). |
| `src/lib/kb/purity.test.ts` | test (grep guard) | No precedent for a "this dir imports nothing forbidden" test | Read the `src/lib/kb/*.ts` files, assert no `server-only` / `@/lib/api` substring (D-08). |
| `src/lib/kb/stem.ts` internals | vendored algorithm | No stemmer in repo | Transcribe from snowballstem.org; validate against `snowball-stemmers` offline as oracle (do NOT depend). |
| `docs/catalog-map.md` | doc | No `docs/*.md` in repo | Freeform; content skeleton in RESEARCH § "Catalog Map — Raw Material". |

---

## Metadata

**Analog search scope:** `src/lib/api/`, `src/lib/` (pure modules), `src/components/admin/`, `src/components/head/`, `src/components/journal/`, `src/app/admin/`, `src/app/api/db/`, `supabase/migrations/`, `src/types/`
**Files scanned:** `catalog.ts`, `journal.ts`, `api.ts`, `api-client.ts`, `route.ts` (db), `admin/page.tsx`, `WorkPermitCatalogEditor.tsx`, `ObjectCombobox.tsx`, `journal/data.ts`, `journalStats.ts`, `shifts.ts`, `042/050 migrations`, `types/index.ts`
**Key cross-phase facts confirmed:** `updateWorkType` / `fetchWorkTypes` use generic `.update`/`.select('*')` (new columns free); `/api/db` auto-dispatches barrel exports by name; `ROLE_RESTRICTED` currently only gates `*User`; `norm()` sole importer is `ObjectCombobox.tsx`; `TypicalCrew` keys = `PlanItem` keys (`workers/foremen/itr/vehicles`), NOT `required_*` columns.
**Pattern extraction date:** 2026-09-02

---

## PATTERN MAPPING COMPLETE

**Phase:** 8 - Knowledge base — schema, Russian resolver, catalog vocabulary
**Files classified:** 33
**Analogs found:** 33 / 33 (28 exact/role-match, 5 new-convention with a documented skeleton)

### Coverage
- Files with exact analog: 14 (api module, wiring edits, migrations, normalize, buildKbIndex, both admin tabs)
- Files with role-match analog: 14 (kb pure modules against journalStats/shifts/workSchedule)
- Files with no analog: 5 (2 fixture files, purity test, stem internals, catalog-map doc — all have a RESEARCH skeleton)

### Key Patterns Identified
- **Pure lib**: every `src/lib/kb/*` mirrors `journalStats.ts`/`shifts.ts` — sourced top comment, `import type` only, named exports, beside-file Vitest table tests; D-08 purity guarded by a grep test.
- **API**: `knowledge.ts` = `journal.ts` clone (throw-on-error Russian messages); wired via 3 edits (barrel line, `ROLE_RESTRICTED: ['ADMIN']`, hand-kept `call()` wrappers).
- **Admin UI**: `WorkPermitCatalogEditor.tsx` is the dedicated-editor template (`alive` self-load, `load()` reuse, per-row local state, `ovOrNull` diff-save, `busy` flag); `UsersTab` supplies search/filter-chip/table chrome; `ObjectCombobox` is the entity picker; `useConfirm()` for the D-13 collision warning.
- **Migrations**: 042 (table+index+seed+rollback) + 050 (`anon_all_<t>` policy block) are the combined template; unique **expression index** replaces `NULLS NOT DISTINCT` (Pitfall 1); `list_tables` gate before 053 (Pitfall 7).

### File Created
`/home/user/Projects/gormost/.planning/phases/08-knowledge-base-schema-russian-resolver-catalog-vocabulary/08-PATTERNS.md`

### Ready for Planning
Pattern mapping complete. Planner can reference analog files + line numbers directly in PLAN.md action steps.
