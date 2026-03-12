-- 011: Extend work_plans for full approval chain and execution tracking
-- Adds zamporab confirmation step + PLANNED/IN_PROGRESS/DONE statuses

-- Add zamporab approval fields
ALTER TABLE work_plans ADD COLUMN IF NOT EXISTS zamporab_approved_by TEXT REFERENCES users(user_id);
ALTER TABLE work_plans ADD COLUMN IF NOT EXISTS zamporab_approved_at TIMESTAMPTZ;

-- Add fact_start and fact_finish for execution tracking
ALTER TABLE work_plans ADD COLUMN IF NOT EXISTS fact_start TIMESTAMPTZ;
ALTER TABLE work_plans ADD COLUMN IF NOT EXISTS fact_finish TIMESTAMPTZ;

-- Note: status column is TEXT — new values (PLANNED, IN_PROGRESS, DONE) are valid
-- after frontend update. No enum migration needed.

-- RLS policies for new columns (covered by existing policy from 010)

-- ROLLBACK:
-- ALTER TABLE work_plans DROP COLUMN IF EXISTS zamporab_approved_by;
-- ALTER TABLE work_plans DROP COLUMN IF EXISTS zamporab_approved_at;
-- ALTER TABLE work_plans DROP COLUMN IF EXISTS fact_start;
-- ALTER TABLE work_plans DROP COLUMN IF EXISTS fact_finish;
