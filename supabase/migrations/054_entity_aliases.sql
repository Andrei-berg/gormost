-- 054_entity_aliases.sql
-- WHAT: polymorphic surface-form → canonical-entity alias table (KB-01, D-14) +
--       permissive RLS policy (mirrors anon_all_work_plans / migration 050) +
--       one unique expression index + one lookup index. No seed rows here.
-- WHY:  the resolver's PRIMARY match mechanism for irregular Russian forms that
--       fuzzy matching misses (БК, ЭВ №3, «Лефортовский тоннель», «тт №3 КТР»).
--       canonical_id is polymorphic with NO foreign key — one column cannot point
--       at four tables. Targets per canonical_type:
--         'object'       → journal_objects.id        (uuid, stringified)
--         'work_type'    → work_types.work_type_id   (text)
--         'service'      → services.service_id       (text)
--         'construction' → nothing in v3.0 — enum value reserved only (D-04)
--       See docs/catalog-map.md for the full cross-reference map.
--       Seed aliases are migration 055 (Plan 08-07): those rows reference the
--       journal_objects ids that 055 itself creates.

create table if not exists public.entity_aliases (
  id              uuid primary key default gen_random_uuid(),
  surface_raw     text not null,                 -- as entered, for display / audit
  surface_norm    text not null,                 -- preprocess(surface_raw).normalized
  canonical_type  text not null
    check (canonical_type in ('object','construction','work_type','service')),
  canonical_id    text not null,                 -- polymorphic, no FK (see header)
  scope_object_id uuid null
    references public.journal_objects(id) on delete cascade,  -- present from day one; resolveEntity ignores scope in v3.0 (D-16)
  weight          smallint not null default 100,
  source          text not null
    check (source in ('seed','manual','voice','correction')),
  created_by      text,
  created_at      timestamptz not null default now()
);

comment on table public.entity_aliases is
  'Polymorphic surface→canonical alias table. canonical_id has NO FK: object→journal_objects.id, work_type→work_types.work_type_id, service→services.service_id, construction→(reserved, no storage in v3.0). scope_object_id is unused by the resolver in v3.0 (D-16).';

-- Uniqueness: the same surface_norm + canonical_type + (scope, or "global" when
-- scope_object_id IS NULL) may not repeat. Enforced by an expression index over
-- coalesce(scope_object_id::text, ''), NOT by the PG15 unique-constraint variant
-- that treats nulls as equal — that keyword form is portable only to PG15+ and
-- the Supabase SQL Editor validator has rejected it (supabase/supabase#13267).
-- The expression index works on every Postgres 13+ and is the primary mechanism,
-- not a fallback.
create unique index if not exists uq_entity_aliases_surface
  on public.entity_aliases (surface_norm, canonical_type, coalesce(scope_object_id::text, ''));

-- "aliases for entity X" + the D-13 collision query (surface_norm resolving to
-- more than one distinct canonical_id of the same canonical_type).
create index if not exists idx_entity_aliases_canonical
  on public.entity_aliases (canonical_type, canonical_id);

-- ── RLS: permissive anon/authenticated policy in the SAME file as the table ──
-- (CLAUDE.md RLS invariant; SC#1; migration 050 is the cautionary tale — RLS on
--  with no policy = every read returns [] and every write fails silently.)
alter table public.entity_aliases enable row level security;
drop policy if exists anon_all_entity_aliases on public.entity_aliases;
create policy anon_all_entity_aliases on public.entity_aliases
  for all to anon, authenticated using (true) with check (true);

-- ── ROLLBACK ──────────────────────────────────────────────────────────────
-- drop table if exists public.entity_aliases;  -- also drops uq_entity_aliases_surface,
--                                              -- idx_entity_aliases_canonical and
--                                              -- policy anon_all_entity_aliases
