-- Phase 8 KB migrations — verification. Run after 01 → 02 → 03 all succeed.

-- (a) work_types enrichment columns — expect 4 rows
select column_name
from information_schema.columns
where table_name = 'work_types'
  and column_name in ('service_id','unit','typical_period','typical_crew')
order by column_name;

-- (b) seeded aliases — expect 28  (0 with no error = RLS policy missing / blocking read)
select count(*) as alias_count from public.entity_aliases;

-- (c) seeded objects — expect 8 rows
select id, name, category_id
from public.journal_objects
where created_by = 'migration-055'
order by id;

-- (d) attributed work types — expect 5 rows  [ALREADY CONFIRMED OK]
select work_type_id, service_id, typical_period, typical_crew
from public.work_types
where service_id is not null
order by work_type_id;
