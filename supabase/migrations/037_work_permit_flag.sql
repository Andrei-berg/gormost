-- Migration 037: add has_permit flag to work_plans
-- Tracks whether a work permit (наряд-допуск) has been printed for a given plan

ALTER TABLE work_plans
  ADD COLUMN IF NOT EXISTS has_permit       boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS permit_number    text,
  ADD COLUMN IF NOT EXISTS permit_issued_at timestamptz;

-- Rollback:
-- ALTER TABLE work_plans DROP COLUMN IF EXISTS has_permit;
-- ALTER TABLE work_plans DROP COLUMN IF EXISTS permit_number;
-- ALTER TABLE work_plans DROP COLUMN IF EXISTS permit_issued_at;
