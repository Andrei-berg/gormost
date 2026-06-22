-- 046_journal_shift_headers.sql
-- What: a per-(date × shift) header for the journal — "шапка дня": дежурный
--       мастер, водитель смены, Отв. (кто выдаёт наряд). Entered once per shift
--       by the journal operator and reused across every наряд of that shift.
-- Why:  the real участок plan carries a shift header (deputy/foreman papers).
--       The documented bridge is Отв. → "наряд-допуск выдал" (issuedBy). One
--       entry feeds many permits — max leverage, journal entry stays lightweight.

create table if not exists public.journal_shift_headers (
  id           uuid primary key default gen_random_uuid(),
  plan_date    date not null,
  shift_type   text not null check (shift_type in ('DAY', 'NIGHT', 'AROUND')),
  duty_master  text,                 -- дежурный мастер смены
  shift_driver text,                 -- водитель смены (напр. "8/11")
  issuer       text,                 -- Отв. — кто выдаёт наряд (→ issuedBy)
  note         text,
  created_by   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (plan_date, shift_type)
);

create index if not exists idx_journal_shift_headers_date
  on public.journal_shift_headers (plan_date);

-- Rollback:
-- drop table if exists public.journal_shift_headers;
