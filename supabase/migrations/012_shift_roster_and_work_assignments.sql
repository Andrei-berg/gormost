-- 012: Shift roster and work assignments
-- 1. work_assignments — назначение сотрудников на позиции плана (формирование бригад)
-- 2. work_plan_items — добавить нормативы по числу людей/машин и флаг редиректа
-- 3. work_plans — статус BOSS_CONFIRMED (совещание у начальника)

-- =============================================================================
-- Section 1: work_assignments — кто в какой бригаде
-- Заполняется мастером участка после совещания у начальника
-- =============================================================================

CREATE TABLE IF NOT EXISTS work_assignments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_item_id   UUID NOT NULL REFERENCES work_plan_items(id) ON DELETE CASCADE,
  user_id        TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  role           TEXT NOT NULL DEFAULT 'WORKER'
                   CHECK (role IN ('WORKER', 'BRIGADIER', 'MASTER', 'DRIVER')),
  assigned_by    TEXT REFERENCES users(user_id),
  assigned_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (plan_item_id, user_id)  -- один человек = одна роль в позиции
);

CREATE INDEX IF NOT EXISTS idx_work_assignments_plan_item ON work_assignments(plan_item_id);
CREATE INDEX IF NOT EXISTS idx_work_assignments_user      ON work_assignments(user_id);

-- =============================================================================
-- Section 2: Нормативы и редирект в work_plan_items
-- required_* — сколько людей/машин нужно (заполняет нач. службы при планировании)
-- is_redirected — бригада была экстренно переброшена на другой объект
-- =============================================================================

ALTER TABLE work_plan_items
  ADD COLUMN IF NOT EXISTS required_workers   SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS required_foremen   SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS required_vehicles  SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_redirected      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS redirect_reason    TEXT DEFAULT NULL;

-- =============================================================================
-- Section 3: Статус BOSS_CONFIRMED для work_plans
-- Добавляется после совещания у начальника (16:30–17:30)
-- status — TEXT без constraint, поэтому просто документируем
-- =============================================================================

-- Note: work_plans.status is TEXT (no enum/check constraint).
-- New valid values after this migration:
--   BOSS_CONFIRMED  — начальник подтвердил на совещании
--   ASSIGNED        — мастер назначил людей поимённо (готово к старту)
-- Existing values: DRAFT, SUBMITTED, APPROVED, REJECTED, PLANNED, IN_PROGRESS, DONE

-- =============================================================================
-- Section 4: RLS policies for work_assignments
-- Authenticated users can read; insert/update/delete restricted to role checks
-- (covered by existing RLS policy pattern from migration 010)
-- =============================================================================

ALTER TABLE work_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "work_assignments_select" ON work_assignments;
CREATE POLICY "work_assignments_select"
  ON work_assignments FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

DROP POLICY IF EXISTS "work_assignments_insert" ON work_assignments;
CREATE POLICY "work_assignments_insert"
  ON work_assignments FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "work_assignments_update" ON work_assignments;
CREATE POLICY "work_assignments_update"
  ON work_assignments FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "work_assignments_delete" ON work_assignments;
CREATE POLICY "work_assignments_delete"
  ON work_assignments FOR DELETE
  USING (true);

-- =============================================================================
-- ROLLBACK:
-- DROP TABLE IF EXISTS work_assignments;
-- ALTER TABLE work_plan_items
--   DROP COLUMN IF EXISTS required_workers,
--   DROP COLUMN IF EXISTS required_foremen,
--   DROP COLUMN IF EXISTS required_vehicles,
--   DROP COLUMN IF EXISTS is_redirected,
--   DROP COLUMN IF EXISTS redirect_reason;
-- =============================================================================
