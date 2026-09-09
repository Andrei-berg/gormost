---
phase: 08-knowledge-base-schema-russian-resolver-catalog-vocabulary
reviewed: 2026-09-09T00:00:00Z
depth: standard
files_reviewed: 36
files_reviewed_list:
  - src/app/admin/page.tsx
  - src/app/api/db/route.ts
  - src/components/admin/AliasManagerTab.tsx
  - src/components/admin/WorkTypeAttributesTab.tsx
  - src/components/journal/data.ts
  - src/lib/api-client.ts
  - src/lib/api/knowledge.gating.test.ts
  - src/lib/api/knowledge.ts
  - src/lib/api.ts
  - src/lib/kb/collisions.test.ts
  - src/lib/kb/collisions.ts
  - src/lib/kb/expandAbbreviations.test.ts
  - src/lib/kb/expandAbbreviations.ts
  - src/lib/kb/__fixtures__/lemma-cases.ru.ts
  - src/lib/kb/__fixtures__/resolve-cases.ru.ts
  - src/lib/kb/index.test.ts
  - src/lib/kb/index.ts
  - src/lib/kb/lemmatize.test.ts
  - src/lib/kb/lemmatize.ts
  - src/lib/kb/normalize.test.ts
  - src/lib/kb/normalize.ts
  - src/lib/kb/preprocess.test.ts
  - src/lib/kb/preprocess.ts
  - src/lib/kb/purity.test.ts
  - src/lib/kb/resolve.test.ts
  - src/lib/kb/resolve.ts
  - src/lib/kb/seed-aliases.test.ts
  - src/lib/kb/similarity.test.ts
  - src/lib/kb/similarity.ts
  - src/lib/kb/stem.test.ts
  - src/lib/kb/stem.ts
  - src/lib/kb/types.ts
  - src/types/index.ts
  - supabase/migrations/053_kb_work_type_attributes.sql
  - supabase/migrations/054_entity_aliases.sql
  - supabase/migrations/055_kb_seed_lefortovo.sql
findings:
  critical: 1
  warning: 7
  info: 4
  total: 12
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-09-09
**Depth:** standard
**Files Reviewed:** 36
**Status:** issues_found

## Summary

The pure `src/lib/kb/` layer is well-built: heavily table-tested, genuinely import-free
(purity guard passes), synchronous, and the resolver ladder / scoring is coherent. The
persistence layer, the two admin tabs, and the three migrations carry the defects.

The headline problem is a schema/feature contradiction: migration 054's unique index makes
the D-13 "soft alias collision" flow — described at length in `collisions.ts`, `resolve.ts`,
`AliasManagerTab.tsx` and locked by `resolve.test.ts` — **impossible to reach through the
real create path**. The admin confirm dialog promises "both rows stay" and then the write
throws a raw Postgres unique-violation.

Secondary themes: `WorkTypeAttributesTab` has no error handling on any of its four mutation
call sites (stuck busy state, silent data loss), `createEntityAlias` / `updateEntityAlias`
spread caller input unchecked (contradicting the deliberate whitelist in
`updateWorkTypeAttributes` and letting a caller divorce `surface_norm` from `surface_raw`),
and `normalize()` never strips parentheses although the seeded object names contain
`(левая труба)` / `(правая труба)`, which poisons the lemma/trigram signal for those rows.

## Critical Issues

### CR-01: D-13 alias collision cannot be created — unique index omits `canonical_id`, confirm dialog misleads the ADMIN

**File:** `supabase/migrations/054_entity_aliases.sql:43-44` (with `src/lib/api/knowledge.ts:25-32` and `src/components/admin/AliasManagerTab.tsx:156-187`)

**Issue:**
The unique index is
```sql
create unique index uq_entity_aliases_surface
  on public.entity_aliases (surface_norm, canonical_type, coalesce(scope_object_id::text, ''));
```
It does **not** include `canonical_id`. So at most one canonical may exist for a given
`(surface_norm, canonical_type, scope)`. But the whole D-13 feature is "one surface → two
distinct `canonical_id` of the same type → both rows live → the surface resolves
`ambiguous`":
- `collisions.ts` defines the predicate for exactly that shape.
- `resolve.ts:99-105` returns `ambiguous` for a multi-hit alias bucket.
- `resolve.test.ts:204-213` (`'спорный участок'`) and `collisions.test.ts:127-150` lock it.
- `AliasManagerTab.tsx:160-166` shows `«…» уже привязан к «…». Всё равно добавить?` and the
  body text `Обе записи останутся — существующая не удаляется и не блокируется`.

`AliasManagerTab.handleAdd` runs `findAliasCollisions`, shows that confirm, and on "Всё
равно добавить" calls `createEntityAlias`, which does a plain
`supabase.from('entity_aliases').insert(row)` (no `onConflict`). With the default scope
(`scopeObjectId` is `''` → `null` for both rows) the second insert violates
`uq_entity_aliases_surface` and throws. The user sees the confirm's promise, clicks through,
and gets a red box containing `duplicate key value violates unique constraint
"uq_entity_aliases_surface"`. The `findAliasCollisions` DB query, the soft-warning banner
and the whole D-13 admin path are dead code for the common (global-scope) case.

**Fix:** add `canonical_id` to the unique index so genuine duplicates
(same surface + type + **same** canonical + scope) are still rejected while a
different-canonical collision is allowed — matching `findAllAliasCollisions` semantics:
```sql
create unique index uq_entity_aliases_surface
  on public.entity_aliases
     (surface_norm, canonical_type, canonical_id, coalesce(scope_object_id::text, ''));
```
If instead the intent really is "one canonical per surface+type+scope", then remove the
D-13 confirm-and-continue flow from `AliasManagerTab` and the `ambiguous`-via-alias branch
claims, because they describe behaviour the schema forbids.

## Warnings

### WR-01: `WorkTypeAttributesTab` — no error handling on any mutation; failed calls leave the row/bar permanently disabled

**File:** `src/components/admin/WorkTypeAttributesTab.tsx:133-146, 316-336, 454-467`

**Issue:** `runBulkService`, `AttrRow.save`, `AttrRow.del` and `CreateWorkTypeForm.submit`
each `await` an api-client call with no `try/catch`. `api-client.call` throws on any
non-2xx (`403 Недостаточно прав`, RLS denial, FK violation on `service_id`, network). When
it throws:
- `setBusy(false)` / `setBulkRunning(false)` never runs → the row's Save/Delete buttons or
  the whole bulk bar stay `disabled` until a full tab reload;
- no message is shown to the user — the failure is silent;
- `runBulkService` aborts mid-loop, having written some of `selected` and not the rest,
  with no indication which.

This is inconsistent with `AliasManagerTab`, which wraps every mutation in `try/catch` and
renders `rowError` / `addError`. CLAUDE.md's panel convention (surface errors, never leave
a dead control) is not met here.

**Fix:** wrap each call:
```ts
try {
  await updateWorkTypeAttributes(wt.work_type_id, attrs)
  await onReload()
} catch (e) {
  setRowError(e instanceof Error ? e.message : 'Ошибка сохранения')
} finally {
  setBusy(false)
}
```
and add a `rowError` slot to `AttrRow` (mirror `AliasRow`). For `runBulkService`, catch per
iteration and collect the failures.

### WR-02: `CreateWorkTypeForm.submit` clears and closes the form even when the create fails

**File:** `src/components/admin/WorkTypeAttributesTab.tsx:454-467`

**Issue:** After `await createWorkType(...)` the code unconditionally runs `setId('')`,
`setConstructionId('')`, `setName('')` and `await onCreated()` (which closes the form).
`createWorkType` returns `null` on failure (see `api-client.ts:162`) and throws on a
transport/permission error. Either way the ADMIN's typed input is wiped with no feedback and
they cannot tell whether the work type was created.

**Fix:** check the result and keep the form open on failure:
```ts
const created = await createWorkType({...}).catch(() => null)
if (!created) { setError('Не удалось создать вид работ'); setSaving(false); return }
```

### WR-03: `AttrRow` shows an enabled "Сохранить" for every row whose `typical_crew` is null (most of a fresh catalog)

**File:** `src/components/admin/WorkTypeAttributesTab.tsx:46-47, 304, 313-314`

**Issue:** `crew` state initialises to `wt.typical_crew ?? EMPTY_CREW`. `crewDirty` is
`!crewEqual(wt.typical_crew, normCrew(crew))`, and `crewEqual(null, {0,0,0,0})` is `false`
because of the `!!a` guard. So for any work type with `typical_crew === null` (everything
not touched by the 055 seed), `crewDirty` is `true` on mount, `dirty` is `true`, and the
Save button is enabled with nothing changed. Clicking it writes
`{workers:0,foremen:0,itr:0,vehicles:0}` where there was `null` — a spurious null→object
migration on rows the ADMIN never edited.

**Fix:** treat "null crew vs all-zero crew" as equal:
```ts
const crewDirty = (() => {
  const n = normCrew(crew)
  const isZero = n.workers === 0 && n.foremen === 0 && n.itr === 0 && n.vehicles === 0
  if (!wt.typical_crew) return !isZero
  return !crewEqual(wt.typical_crew, n)
})()
```

### WR-04: `createEntityAlias` / `updateEntityAlias` spread caller input unchecked

**File:** `src/lib/api/knowledge.ts:25-32, 35-46`

**Issue:** `createEntityAlias` builds the insert row as `{ ...a, surface_raw, surface_norm }`
and `updateEntityAlias` builds the patch as `{ ...patch }`. This directly contradicts the
comment two functions down ("Caller input is never spread — the four keys are whitelisted
explicitly") and the T-08-13 rationale. Concrete consequences (all reachable by any caller
that clears the ADMIN gate — the app trusts ADMIN, but the invariant is still unguarded):
- `updateEntityAlias(id, { surface_norm: 'whatever' })` writes `surface_norm` divorced from
  `surface_raw`. `buildKbIndex` self-heals (it recomputes from `surface_raw`, ignoring the
  column), but `findAliasCollisions` keys its query on `.eq('surface_norm', …)`, so the
  D-13 collision detection silently stops finding that row. This breaks the D-14 invariant
  that `seed-aliases.test.ts` exists to protect.
- `created_by` is never populated from the verified session (`route.ts` has `auth` but
  `knowledge.ts` functions don't receive it), and `AliasManagerTab` never passes it, so
  every manually-created alias has `created_by = null` — the audit column is dead.
- `id`, `created_at`, `source` are all caller-settable.

**Fix:** whitelist explicitly, the same way `updateWorkTypeAttributes` does:
```ts
const row = {
  surface_raw,
  surface_norm: preprocess(surface_raw).normalized,
  canonical_type: a.canonical_type,
  canonical_id: a.canonical_id,
  scope_object_id: a.scope_object_id ?? null,
  weight: a.weight ?? 100,
  source: a.source ?? 'manual',
}
```
and in `updateEntityAlias` never accept `surface_norm` from the patch — always derive it, or
reject the patch if `surface_norm` is present without `surface_raw`.

### WR-05: `normalize()` leaves parentheses/brackets in place, poisoning lemmas and trigrams for the seeded object names

**File:** `src/lib/kb/normalize.ts:30-42` and `supabase/migrations/055_kb_seed_lefortovo.sql:41-42`

**Issue:** The D-11 rule set strips quotes `« » " ' \``, dashes and trailing punctuation but
not `(` `)` `[` `]`. Migration 055 seeds
`'Лефортовский тоннель (левая труба)'` / `'(правая труба)'`. `buildKbIndex` runs the object
name through `preprocess`, producing `nameNorm = 'лефортовский тоннель (левая труба)'` and
tokens `['лефортовский','тоннель','(левая','труба)']`. `stem('труба)')` returns `'трба)'`
(the trailing `)` blocks the noun-ending match and the region scan), which never equals
`stem('трубе') = 'труб'`. So a non-seeded declension like `«в левой трубе Лефортовского
тоннеля»` scores its content overlap against a corrupted lemma set and can land below
`config.low`. Today this is masked only because the 055 seed hand-writes paren-free aliases
for those two objects; any object name with parens added later has no such safety net.

**Fix:** add a paren/bracket strip to `normalize()` (before the whitespace-collapse step)
and extend `normalize.test.ts`, or stop putting parenthetical qualifiers in
`journal_objects.name` and model "левая/правая труба" as a separate attribute.

### WR-06: fuzzy layer resolves a single generic content word to the sole entity that contains it — bypasses the invented-entity guard

**File:** `src/lib/kb/resolve.ts:65-70, 113-154`

**Issue:** `lemmaOverlap` is the overlap coefficient (`intersection / min(|a|,|b|)`). When the
query reduces to one content lemma, `min` is 1 and any single shared lemma gives overlap
`1.0`, so `raw = 0.65·1.0 + 0.35·dice`. For `resolveEntity('тоннель', index)` against a
catalog that contains exactly one tunnel-named row, `dice('тоннель','лефортовский тоннель')
≈ 0.5`, giving `raw ≈ 0.825 ≥ low (0.6)` → `{ status: 'resolved', method: 'fuzzy' }`. The
"invented-entity guard" (`Серебряноборский тоннель` → unresolved) only holds because that
phrase carries a *second*, unmatched content word. A bare generic term has nothing to drag
the score down. With the current multi-tunnel seed this surfaces as `ambiguous` rather than
a wrong pick, but a catalog slice with one matching row will mis-resolve.

**Fix:** require a minimum absolute lemma-intersection (e.g. `inter >= 2` unless the entry
itself has only one content lemma), or floor the effective denominator so a one-word query
can't reach `1.0` overlap, and add a fixture for the single-generic-word case.

### WR-07: alias to a `service_id IS NULL` work type renders as healthy but is silently dropped by the resolver

**File:** `src/components/admin/AliasManagerTab.tsx:103, 108-116` vs `src/lib/kb/index.ts:32-37, 58-59`

**Issue:** `buildKbIndex` builds `idsByType.work_type` from only the rows with
`service_id != null` (D-01), and drops any alias whose `canonical_id` is not in that set as
"dangling". But `AliasManagerTab` builds `wtName` from the full `fetchWorkTypes()` result,
so an alias pointing at an immature (null-service) work type shows a real name and **not**
the `⚠ битая ссылка` marker. The ADMIN sees a valid-looking alias that `resolveEntity` will
never match, with no diagnostic.

**Fix:** in `canonicalName`, treat a `work_type` whose `service_id` is null the same as a
missing row (return `null`), or add a distinct "не загружается в распознавание (нет службы)"
badge.

## Info

### IN-01: `buildKbIndex.exactNameNorm` is first-write-wins across all entity types

**File:** `src/lib/kb/index.ts:44-56`

`exactNameNorm` is keyed on the normalized string only, and objects are inserted before work
types before services. If two entities of different types share a normalized name, the
later type is absent from the exact-match short-circuit: a type-less query for that string
always returns the object, and a `{ type: 'service' }` query loses its exact hit and falls
through to fuzzy. Low probability with real data, no test covers it. Consider keying by
`type + ' ' + normalized` and having `resolveEntity` look up `opts.type` first.

### IN-02: `updateEntityAlias` recomputes `surface_norm` only when `surface_raw` is in the patch

**File:** `src/lib/api/knowledge.ts:35-46`

Even setting aside WR-04, note that `buildKbIndex` ignores the stored `surface_norm` column
entirely (it re-derives from `surface_raw` at index build, `index.ts:62`). The column is
consumed only by `findAliasCollisions` and the `AliasManagerTab` search box. So if the
`preprocess` pipeline ever changes, runtime-created rows' `surface_norm` values go stale and
collision detection quietly drifts, while the resolver stays correct. A periodic
"re-normalize all aliases" maintenance path, or dropping the column and computing the
collision query in memory, would remove the divergence risk. `seed-aliases.test.ts` guards
only the migration literals, not runtime rows.

### IN-03: abbreviation immediately followed by punctuation is not expanded

**File:** `src/lib/kb/expandAbbreviations.ts:49-57`

`expandAbbreviations` runs before `normalize` (D-09) and matches whole whitespace-delimited
tokens. `«ЭВ, №3»` tokenises as `['ЭВ,', ...]`, and `'эв,'` is not a dictionary key, so the
abbreviation is missed for any surface where a comma/period/paren abuts the key. The seed
data avoids this, but dictation text (Phase 11) will not. Consider stripping leading/trailing
punctuation from a token before the dictionary lookup (keeping the original token when there
is no hit).

### IN-04: `WorkTypeAttributesTab` uses ungated `createWorkType` / `deleteWorkType`

**File:** `src/components/admin/WorkTypeAttributesTab.tsx:6, 333, 457`

Only `updateWorkTypeAttributes` is in `ROLE_RESTRICTED`. `createWorkType` and
`deleteWorkType` are plain `api/catalog` exports reachable by any valid session through
`/api/db`. The tab itself is `<AuthGuard roles={['ADMIN']}>`, so the UI is fine, but the new
tab is a reminder that the catalog write endpoints have no server-side role gate. Pre-existing,
out of strict phase scope — noted for completeness.

---

_Reviewed: 2026-09-09_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
