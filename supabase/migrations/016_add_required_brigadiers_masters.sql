-- Migration 016: add required_brigadiers and required_masters to work_plan_items
-- Service chief can now specify how many brigadiers and masters are needed per work item

ALTER TABLE work_plan_items
  ADD COLUMN IF NOT EXISTS required_brigadiers integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS required_masters    integer NOT NULL DEFAULT 0;

-- Rollback:
-- ALTER TABLE work_plan_items DROP COLUMN IF EXISTS required_brigadiers;
-- ALTER TABLE work_plan_items DROP COLUMN IF EXISTS required_masters;
