-- Migration 034: vehicle type requirements + plan recall
-- Adds typed vehicle requirements (replaces single count) to work_plan_items.
-- "Recall" (SUBMITTED → DRAFT) is handled in application code, no DB change needed.

ALTER TABLE work_plan_items
  ADD COLUMN IF NOT EXISTS required_vehicle_types JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Rollback:
-- ALTER TABLE work_plan_items DROP COLUMN IF EXISTS required_vehicle_types;
