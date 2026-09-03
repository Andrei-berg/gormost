-- 055_kb_seed_lefortovo.sql
-- WHAT: starter Гормост-Лефортово vocabulary for the KB (KB-01, KB-02, KB-05, D-21):
--         1. journal_object_categories — a new 'BRIDGE' category (мосты участка).
--         2. journal_objects — 8 canonical участок objects with deterministic uuids.
--         3. work_types — starter agent attribution (service_id / unit / typical_period /
--            typical_crew) for the 5 rows that exist live (2026-09-03 dump).
--         4. entity_aliases — 28 source='seed' surface→canonical rows.
--       Depends on migrations 053 (work_types + journal_objects columns) and 054
--       (entity_aliases table + anon_all policy) being applied FIRST.
-- WHY:  the resolver has meaningful targets only once work_types rows carry a
--       service_id (buildKbIndex filters on service_id IS NOT NULL, D-01) and
--       entity_aliases holds real surfaces. Every automated gate in Phase 8 passes
--       from hand-written types and pure functions — this seed is what makes the
--       phase's DB-facing behaviour real. Starter data only: Phase 9 ingest dedups
--       on the normalized + lemmatized name and refines these rows rather than
--       duplicating them (IMP-05, D-21).
--
-- IDEMPOTENCY: every insert uses ON CONFLICT DO NOTHING against a deterministic id;
--   work_types attribution is UPDATE ... WHERE work_type_id = <existing id>. Running
--   this file twice does not duplicate the catalog.
--
-- surface_norm INVARIANT: every entity_aliases.surface_norm literal below is the
--   exact output of preprocess(surface_raw).normalized from src/lib/kb/preprocess.ts
--   — asserted by src/lib/kb/seed-aliases.test.ts, which parses this file (D-14, D-09).
--   ЛТР / ГТР / ТТК / ЗБ / ЭВ etc. are expanded by src/lib/kb/expandAbbreviations.ts
--   before normalization, which is why several norms read as the full phrase.

-- ── 1. journal_object_categories: 'BRIDGE' (D-21 — мосты участка) ──────────────
-- The KB-05 scope names "мосты участка". No authoritative bridge names are
-- recorded in the planning artifacts, so the category is created ready but seeded
-- with no rows — a human adds the bridge objects (see 08-07 SUMMARY, Task 1).
insert into public.journal_object_categories (id, name, emoji, sort_order) values
  ('BRIDGE', 'Мосты', '🌉', 6)
on conflict (id) do nothing;

-- ── 2. journal_objects: canonical Гормост-Лефортово objects (D-02, D-21) ───────
-- Object identity for the resolver is a journal_objects row — NOT a parallel
-- entity table. Deterministic uuids so the alias seed and the rollback block can
-- both reference them and a re-run cannot duplicate the catalog.
insert into public.journal_objects (id, name, category_id, address, created_by) values
  ('10000000-0000-4000-8000-000000000001', 'Лефортовский тоннель (левая труба)',  'TUN',   'участок Гормост-Лефортово', 'migration-055'),
  ('10000000-0000-4000-8000-000000000002', 'Лефортовский тоннель (правая труба)', 'TUN',   'участок Гормост-Лефортово', 'migration-055'),
  ('10000000-0000-4000-8000-000000000003', 'Шереметьевский тоннель',              'TUN',   'участок Гормост-Лефортово', 'migration-055'),
  ('10000000-0000-4000-8000-000000000004', 'Митьковский тоннель',                 'TUN',   'участок Гормост-Лефортово', 'migration-055'),
  ('10000000-0000-4000-8000-000000000005', 'Нижегородский тоннель',               'TUN',   'участок Гормост-Лефортово', 'migration-055'),
  ('10000000-0000-4000-8000-000000000006', 'Пешеходный тоннель ТТК',              'PED',   'участок Гормост-Лефортово', 'migration-055'),
  ('10000000-0000-4000-8000-000000000007', 'Защитный блок ЛТР',                   'OTHER', 'участок Гормост-Лефортово', 'migration-055'),
  ('10000000-0000-4000-8000-000000000008', 'Защитный блок ГТР',                   'OTHER', 'участок Гормост-Лефортово', 'migration-055')
on conflict (id) do nothing;

-- ── 3. work_types: starter agent attribution (D-01, D-17) ─────────────────────
-- Only 5 work_types rows exist live (2026-09-03). D-21 asks for ~10-15; the live
-- catalog is demo-scale, so all 5 are attributed here and Phase 9 ingest brings
-- the real Гормост-Лефортово work catalog. typical_crew keys are LOCKED to
-- { workers, foremen, itr, vehicles } (D-17); typical_period ∈ DAY|NIGHT|AROUND.
update public.work_types set
  service_id = 'SRV-ENG', unit = 'шт.', typical_period = 'NIGHT',
  typical_crew = '{"workers": 2, "foremen": 1, "itr": 0, "vehicles": 1}'::jsonb
where work_type_id = 'WORK-LIGHT-BULB';

update public.work_types set
  service_id = 'SRV-ENG', unit = 'шт.', typical_period = 'DAY',
  typical_crew = '{"workers": 2, "foremen": 1, "itr": 1, "vehicles": 1}'::jsonb
where work_type_id = 'WORK-ELEC-CHECK';

update public.work_types set
  service_id = 'SRV-VENT', unit = 'шт.', typical_period = 'DAY',
  typical_crew = '{"workers": 2, "foremen": 1, "itr": 0, "vehicles": 1}'::jsonb
where work_type_id = 'WORK-VENT-FILTER';

update public.work_types set
  service_id = 'SRV-VENT', unit = 'м²', typical_period = 'NIGHT',
  typical_crew = '{"workers": 3, "foremen": 1, "itr": 0, "vehicles": 1}'::jsonb
where work_type_id = 'WORK-VENT-CLEAN';

update public.work_types set
  service_id = 'SRV-FIRE', unit = 'шт.', typical_period = 'DAY',
  typical_crew = '{"workers": 2, "foremen": 1, "itr": 1, "vehicles": 0}'::jsonb
where work_type_id = 'WORK-FIRE-TEST';

-- ── 4. entity_aliases: 28 source='seed' surfaces (D-21) ───────────────────────
-- canonical_id is polymorphic (no FK): 'object' → journal_objects.id,
-- 'service' → services.service_id, 'work_type' → work_types.work_type_id.
-- Prefer irregular forms the stemmer cannot reach — the alias table is the
-- primary mechanism, fuzzy matching is the fallback (08-RESEARCH.md Pitfall 2).
insert into public.entity_aliases (surface_raw, surface_norm, canonical_type, canonical_id, weight, source, created_by) values
  ('ЛТР левая труба',                   'лефортовский тоннель левая труба',                'object',    '10000000-0000-4000-8000-000000000001', 100, 'seed', 'migration-055'),
  ('левая труба Лефортовского тоннеля', 'левая труба лефортовского тоннеля',               'object',    '10000000-0000-4000-8000-000000000001', 100, 'seed', 'migration-055'),
  ('ЛТ',                                'лт',                                              'object',    '10000000-0000-4000-8000-000000000001',  80, 'seed', 'migration-055'),
  ('Лефортовский автодорожный тоннель', 'лефортовский автодорожный тоннель',               'object',    '10000000-0000-4000-8000-000000000001', 100, 'seed', 'migration-055'),
  ('ЛТР правая труба',                  'лефортовский тоннель правая труба',               'object',    '10000000-0000-4000-8000-000000000002', 100, 'seed', 'migration-055'),
  ('правая труба Лефортовского тоннеля','правая труба лефортовского тоннеля',              'object',    '10000000-0000-4000-8000-000000000002', 100, 'seed', 'migration-055'),
  ('Шереметьевский',                    'шереметьевский',                                  'object',    '10000000-0000-4000-8000-000000000003', 100, 'seed', 'migration-055'),
  ('Шереметьевский портал',             'шереметьевский портал',                           'object',    '10000000-0000-4000-8000-000000000003', 100, 'seed', 'migration-055'),
  ('Митьковский',                       'митьковский',                                     'object',    '10000000-0000-4000-8000-000000000004', 100, 'seed', 'migration-055'),
  ('Митьковского тоннеля',              'митьковского тоннеля',                            'object',    '10000000-0000-4000-8000-000000000004', 100, 'seed', 'migration-055'),
  ('Нижегородский',                     'нижегородский',                                   'object',    '10000000-0000-4000-8000-000000000005', 100, 'seed', 'migration-055'),
  ('пешеходный тоннель ТТК',            'пешеходный тоннель третье транспортное кольцо',   'object',    '10000000-0000-4000-8000-000000000006', 100, 'seed', 'migration-055'),
  ('подземный переход ТТК',             'подземный переход третье транспортное кольцо',    'object',    '10000000-0000-4000-8000-000000000006', 100, 'seed', 'migration-055'),
  ('ЗБ ЛТР',                            'защитный блок лефортовский тоннель',              'object',    '10000000-0000-4000-8000-000000000007', 100, 'seed', 'migration-055'),
  ('защитный блок левой трубы',         'защитный блок левой трубы',                       'object',    '10000000-0000-4000-8000-000000000007', 100, 'seed', 'migration-055'),
  ('ЗБ ГТР',                            'защитный блок гагаринский тоннель',               'object',    '10000000-0000-4000-8000-000000000008', 100, 'seed', 'migration-055'),
  ('защитная камера ГТР',               'защитная камера гагаринский тоннель',             'object',    '10000000-0000-4000-8000-000000000008', 100, 'seed', 'migration-055'),
  ('энергетики',                        'энергетики',                                      'service',   'SRV-ENG',                             100, 'seed', 'migration-055'),
  ('СГЭ',                               'сгэ',                                             'service',   'SRV-ENG',                             100, 'seed', 'migration-055'),
  ('вентиляционщики',                   'вентиляционщики',                                 'service',   'SRV-VENT',                            100, 'seed', 'migration-055'),
  ('служба ЭВС',                        'служба эвс',                                      'service',   'SRV-VENT',                            100, 'seed', 'migration-055'),
  ('пожарные',                          'пожарные',                                        'service',   'SRV-FIRE',                            100, 'seed', 'migration-055'),
  ('ПБ',                                'пб',                                              'service',   'SRV-FIRE',                             80, 'seed', 'migration-055'),
  ('замена лампочек',                   'замена лампочек',                                 'work_type', 'WORK-LIGHT-BULB',                     100, 'seed', 'migration-055'),
  ('чистка вентиляции',                 'чистка вентиляции',                               'work_type', 'WORK-VENT-CLEAN',                     100, 'seed', 'migration-055'),
  ('замена вентфильтров',               'замена вентфильтров',                             'work_type', 'WORK-VENT-FILTER',                    100, 'seed', 'migration-055'),
  ('проверка электрики',               'проверка электрики',                              'work_type', 'WORK-ELEC-CHECK',                     100, 'seed', 'migration-055'),
  ('тест пожарной сигнализации',        'тест пожарной сигнализации',                      'work_type', 'WORK-FIRE-TEST',                      100, 'seed', 'migration-055')
on conflict do nothing;

-- ── ROLLBACK ──────────────────────────────────────────────────────────────────
-- delete from public.entity_aliases where source = 'seed' and created_by = 'migration-055';
-- update public.work_types set service_id = null, unit = null, typical_period = null, typical_crew = null
--   where work_type_id in ('WORK-LIGHT-BULB','WORK-ELEC-CHECK','WORK-VENT-FILTER','WORK-VENT-CLEAN','WORK-FIRE-TEST');
-- delete from public.journal_objects where id in (
--   '10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',
--   '10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000004',
--   '10000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000006',
--   '10000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000008');
-- delete from public.journal_object_categories where id = 'BRIDGE';
