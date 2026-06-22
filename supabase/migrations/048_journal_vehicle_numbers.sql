-- 048_journal_vehicle_numbers.sql
-- What: optional list of concrete garage (fleet) numbers per journal plan item —
--       e.g. "335, 196, 533с, 091" — instead of only a vehicle counter.
-- Why:  real участок plans name transport by garage number, not a count; the
--       garage number is the dispatcher/master's primary vehicle identifier.
--       Kept OPTIONAL (jsonb, default empty): the truck stepper stays the
--       lightweight default; numbers are an optional detail. When present they
--       are authoritative (count derives from the list).
-- Format: jsonb array of text, order preserved, e.g. ["335","196","533с"].

alter table public.daily_plan_items
  add column if not exists vehicle_numbers jsonb not null default '[]'::jsonb;

-- Rollback:
-- alter table public.daily_plan_items drop column if exists vehicle_numbers;
