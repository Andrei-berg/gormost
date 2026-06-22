-- 045_journal_around_the_clock_shift.sql
-- What: allow a third shift value 'AROUND' (СУТКИ — around-the-clock, 24h duty
--       shift covering both the day-block and the night-block) on journal plan
--       items, in addition to the existing 'DAY' / 'NIGHT'.
-- Why:  real участок plans schedule some works for the whole 24h duty shift
--       (e.g. "2слаб(сутки)"), not only day or night. The work_plans approval
--       funnel is untouched — this only widens the lightweight journal table.

alter table public.daily_plan_items
  drop constraint if exists daily_plan_items_shift_type_check;

alter table public.daily_plan_items
  add constraint daily_plan_items_shift_type_check
  check (shift_type in ('DAY', 'NIGHT', 'AROUND'));

-- Rollback:
-- alter table public.daily_plan_items
--   drop constraint if exists daily_plan_items_shift_type_check;
-- alter table public.daily_plan_items
--   add constraint daily_plan_items_shift_type_check
--   check (shift_type in ('DAY', 'NIGHT'));
