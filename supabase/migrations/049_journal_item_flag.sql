-- 049_journal_item_flag.sql
-- What: an optional «тип строки» flag on journal plan items for standing /
--       conditional entries that aren't ordinary scheduled work:
--         BY_ORDER — «по распоряжению» (выполняется по команде, не по графику)
--         STANDBY  — дежурство / резерв (напр. «Водитель на АВР дежурный»)
--         NOTICE   — важное указание (напр. «ОРГАНИЗАЦИЯ ВЫЕЗДА ПВР!!!»)
-- Why:  real участок plans carry such standing/conditional lines; they need to
--       read differently from ordinary work. NULL = ordinary work (default).

alter table public.daily_plan_items
  add column if not exists item_flag text
  check (item_flag is null or item_flag in ('BY_ORDER', 'STANDBY', 'NOTICE'));

-- Rollback:
-- alter table public.daily_plan_items drop column if exists item_flag;
