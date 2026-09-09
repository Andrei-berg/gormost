-- 056_entity_aliases_collision_unique_fix.sql
-- WHAT: redefine uq_entity_aliases_surface to include canonical_id, so the D-13
--       "soft alias collision" is actually storable — a surface may resolve to
--       MORE THAN ONE canonical entity of the same canonical_type, and both rows
--       must coexist (the phrase then resolves `ambiguous`).
-- WHY:  migration 054's index keyed only (surface_norm, canonical_type,
--       coalesce(scope_object_id::text,'')). That makes the confirmed-collision
--       path impossible: after an ADMIN confirms past the soft warning in
--       AliasManagerTab, createEntityAlias does a plain .insert and Postgres
--       raises a unique_violation instead of keeping both rows — contradicting
--       D-13, collisions.ts, resolve.ts (ambiguous status) and the locked
--       resolve.test.ts collision assertions. Adding canonical_id to the key is
--       strictly MORE permissive, so no existing row can violate the new index.
--       A genuine exact duplicate (same surface_norm + canonical_type + scope +
--       canonical_id) is still rejected — that is the "true duplicate" the UI
--       surfaces as a readable error (UAT step 5), unchanged.
--       Depends on migration 054 (creates the table + the old index).

drop index if exists public.uq_entity_aliases_surface;

-- Uniqueness now also keys on canonical_id: the SAME surface_norm may point at
-- several distinct canonical entities of one type (that IS the D-13 collision),
-- but the exact (surface, type, scope, canonical) tuple may not repeat.
-- Expression index over coalesce(scope_object_id::text,'') — same portability
-- reason as migration 054 (the PG15 NULLS NOT DISTINCT keyword form is rejected
-- by the Supabase SQL Editor validator; the expression index works on PG13+).
create unique index if not exists uq_entity_aliases_surface
  on public.entity_aliases
  (surface_norm, canonical_type, coalesce(scope_object_id::text, ''), canonical_id);

-- ── ROLLBACK ──────────────────────────────────────────────────────────────
-- drop index if exists public.uq_entity_aliases_surface;
-- create unique index if not exists uq_entity_aliases_surface
--   on public.entity_aliases
--   (surface_norm, canonical_type, coalesce(scope_object_id::text, ''));
-- -- NOTE: the rollback fails if a confirmed D-13 collision row already exists
-- -- (two canonical_ids for one surface) — delete one of the colliding rows first.
