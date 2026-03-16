-- 017: Fix work_plans status CHECK constraint
-- Migration 003 defined CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED'))
-- but migrations 011+ added PLANNED, BOSS_CONFIRMED, ASSIGNED, IN_PROGRESS, DONE.
-- The old constraint silently blocks all updates to these statuses (no error shown
-- in frontend because Supabase returns error but callers ignored return value).

ALTER TABLE work_plans DROP CONSTRAINT IF EXISTS work_plans_status_check;

ALTER TABLE work_plans
  ADD CONSTRAINT work_plans_status_check
  CHECK (status IN (
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'REJECTED',
    'PLANNED',
    'BOSS_CONFIRMED',
    'ASSIGNED',
    'IN_PROGRESS',
    'DONE'
  ));

-- ROLLBACK:
-- ALTER TABLE work_plans DROP CONSTRAINT IF EXISTS work_plans_status_check;
-- ALTER TABLE work_plans ADD CONSTRAINT work_plans_status_check
--   CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED'));
