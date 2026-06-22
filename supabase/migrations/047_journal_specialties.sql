-- 047_journal_specialties.sql
-- What: optional detailed crew composition by specialty on journal plan items —
--       e.g. "11д + 3эл + 3итр" (дорожный/электрик/сантехник/слаботочник/сварщик/ИТР).
-- Why:  real участок plans break the crew down by specialty, not only by the
--       coarse рабочие/мастера/ИТР counts. Kept OPTIONAL (jsonb, default empty):
--       the quick steppers stay the lightweight default; specialties are an
--       optional expansion captured in the detailed form / inline row editor.
-- Format: jsonb array of { "code": text, "count": int }, order preserved.

alter table public.daily_plan_items
  add column if not exists specialties jsonb not null default '[]'::jsonb;

-- Rollback:
-- alter table public.daily_plan_items drop column if exists specialties;
