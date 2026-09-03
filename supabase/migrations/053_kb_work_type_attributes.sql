-- 053_kb_work_type_attributes.sql
-- WHAT: agent-facing enrichment columns on work_types (D-01) and empty Титул
--       columns on journal_objects (D-03). Both tables pre-exist; work_types was
--       created directly in Supabase (no prior migration) — its live columns,
--       primary key and RLS state were confirmed on 2026-09-03 before writing
--       this file (see docs/catalog-map.md § "Live work_types DDL"):
--         work_type_id text PK, construction_id text FK→constructions,
--         work_name text, created_at timestamptz; RLS DISABLED.
-- WHY:  the resolver / agent load work_types WHERE service_id IS NOT NULL (the
--       "mature" subset) and prefill period + crew from these attributes (EXT-05,
--       Phase 11). journal_objects columns are frozen now, empty, so Phase 9
--       ingest populates them without rewriting a migration.

-- ── work_types: KB enrichment (D-01) ──────────────────────────────────────
alter table public.work_types
  add column if not exists service_id     text null references public.services(service_id),
  add column if not exists unit           text null,
  add column if not exists typical_period text null
    check (typical_period is null or typical_period in ('DAY','NIGHT','AROUND')),
  add column if not exists typical_crew   jsonb null;  -- locked keys: { "workers", "foremen", "itr", "vehicles" }

comment on column public.work_types.service_id is
  'D-01 maturity marker — resolver/agent load only rows where service_id IS NOT NULL';
comment on column public.work_types.typical_crew is
  'jsonb { "workers": int, "foremen": int, "itr": int, "vehicles": int } — mirrors the journal PlanItem crew counters, NOT the daily_plan_items.required_* columns';

-- ── journal_objects: Титул enrichment (D-03) — added empty, Phase 9 populates ─
alter table public.journal_objects
  add column if not exists inv_no     text null,
  add column if not exists area_m2    numeric null,
  add column if not exists title_meta jsonb not null default '{}'::jsonb;

-- No RLS block in this file:
--   * work_types has RLS DISABLED (confirmed 2026-09-03) — anon-key reads/writes
--     already succeed; the rebuilt «Виды работ» admin tab needs no policy.
--   * journal_objects has RLS enabled WITH anon_all_journal_objects (migration 050);
--     new columns inherit the existing table policy.

-- ── ROLLBACK ──────────────────────────────────────────────────────────────
-- alter table public.work_types
--   drop column if exists service_id,
--   drop column if exists unit,
--   drop column if exists typical_period,
--   drop column if exists typical_crew;
-- alter table public.journal_objects
--   drop column if exists inv_no,
--   drop column if exists area_m2,
--   drop column if exists title_meta;
