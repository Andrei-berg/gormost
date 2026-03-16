-- 018: Fix all pending schema issues
-- 1. Drop ALL check constraints on work_plans.status (regardless of auto-generated name)
--    and re-add with full list of statuses
-- 2. Add missing columns to work_plan_items (migrations 012 + 016 may not have been run)
-- 3. Create cross_service_requests table (migration 015 may not have been run)
-- 4. Create work_assignments table (migration 012 may not have been run)

-- ============================================================
-- STEP 1: Fix work_plans.status check constraint
-- Drop by finding actual constraint name, not guessing it
-- ============================================================

DO $$
DECLARE
  con_name TEXT;
BEGIN
  FOR con_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
    WHERE t.relname = 'work_plans'
      AND c.contype = 'c'
      AND a.attname = 'status'
  LOOP
    EXECUTE 'ALTER TABLE work_plans DROP CONSTRAINT IF EXISTS ' || quote_ident(con_name);
  END LOOP;
END;
$$;

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

-- ============================================================
-- STEP 2: Add missing columns to work_plan_items (from 012 + 016)
-- ============================================================

ALTER TABLE work_plan_items
  ADD COLUMN IF NOT EXISTS required_workers    SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS required_foremen    SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS required_vehicles   SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS required_brigadiers INTEGER  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS required_masters    INTEGER  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_redirected       BOOLEAN  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS redirect_reason     TEXT     DEFAULT NULL;

-- ============================================================
-- STEP 3: Create cross_service_requests (from 015)
-- ============================================================

CREATE TABLE IF NOT EXISTS cross_service_requests (
  id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  from_plan_item_id  UUID        REFERENCES work_plan_items(id) ON DELETE CASCADE,
  from_plan_id       UUID        REFERENCES work_plans(id)      ON DELETE CASCADE,
  from_service_id    TEXT        NOT NULL,
  to_service_id      TEXT        NOT NULL,
  description        TEXT        NOT NULL DEFAULT '',
  needed_count       INT         NOT NULL DEFAULT 1,
  time_start         TEXT,
  time_end           TEXT,
  status             TEXT        NOT NULL DEFAULT 'PENDING'
                                 CHECK (status IN ('PENDING', 'CONFIRMED', 'DECLINED')),
  response_note      TEXT,
  responded_by       TEXT,
  responded_at       TIMESTAMPTZ,
  created_by         TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cross_service_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cross_service_requests_all" ON cross_service_requests;
CREATE POLICY "cross_service_requests_all" ON cross_service_requests
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_csr_to_service   ON cross_service_requests(to_service_id);
CREATE INDEX IF NOT EXISTS idx_csr_from_service ON cross_service_requests(from_service_id);
CREATE INDEX IF NOT EXISTS idx_csr_from_plan    ON cross_service_requests(from_plan_id);

-- ============================================================
-- STEP 4: Create work_assignments (from 012)
-- ============================================================

CREATE TABLE IF NOT EXISTS work_assignments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_item_id   UUID NOT NULL REFERENCES work_plan_items(id) ON DELETE CASCADE,
  user_id        TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  role           TEXT NOT NULL DEFAULT 'WORKER'
                   CHECK (role IN ('WORKER', 'BRIGADIER', 'MASTER', 'DRIVER')),
  assigned_by    TEXT REFERENCES users(user_id),
  assigned_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (plan_item_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_work_assignments_plan_item ON work_assignments(plan_item_id);
CREATE INDEX IF NOT EXISTS idx_work_assignments_user      ON work_assignments(user_id);

ALTER TABLE work_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "work_assignments_select" ON work_assignments;
CREATE POLICY "work_assignments_select"
  ON work_assignments FOR SELECT USING (true);

DROP POLICY IF EXISTS "work_assignments_write" ON work_assignments;
CREATE POLICY "work_assignments_write"
  ON work_assignments FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- STEP 5: Add zamporab approval columns to work_plans (from 011)
-- ============================================================

ALTER TABLE work_plans
  ADD COLUMN IF NOT EXISTS zamporab_approved_by TEXT REFERENCES users(user_id),
  ADD COLUMN IF NOT EXISTS zamporab_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fact_start           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fact_finish          TIMESTAMPTZ;

-- ROLLBACK (partial — drops added columns/tables only):
-- ALTER TABLE work_plan_items DROP COLUMN IF EXISTS required_workers, DROP COLUMN IF EXISTS required_foremen, ... ;
-- DROP TABLE IF EXISTS cross_service_requests;
-- DROP TABLE IF EXISTS work_assignments;
