-- 029_cancelled_status.sql
-- Добавляет статус CANCELLED в work_plans
-- Используется для явного закрытия просроченных/нереализованных планов

-- Пересоздаём constraint с CANCELLED
ALTER TABLE work_plans DROP CONSTRAINT IF EXISTS work_plans_status_check;

ALTER TABLE work_plans ADD CONSTRAINT work_plans_status_check
  CHECK (status = ANY (ARRAY[
    'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED',
    'PLANNED', 'BOSS_CONFIRMED', 'ASSIGNED',
    'IN_PROGRESS', 'DONE',
    'FAST_TRACK', 'REDIRECTED', 'SUSPENDED',
    'CANCELLED'
  ]::text[]));

-- ROLLBACK:
-- ALTER TABLE work_plans DROP CONSTRAINT IF EXISTS work_plans_status_check;
-- ALTER TABLE work_plans ADD CONSTRAINT work_plans_status_check
--   CHECK (status = ANY (ARRAY[
--     'DRAFT','SUBMITTED','APPROVED','REJECTED','PLANNED','BOSS_CONFIRMED',
--     'ASSIGNED','IN_PROGRESS','DONE','FAST_TRACK','REDIRECTED','SUSPENDED'
--   ]::text[]));
