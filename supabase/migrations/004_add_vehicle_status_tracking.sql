-- Adds status tracking fields to vehicles table
-- status_changed_at: when the current status was set (for "broken for X days" display)
-- maintenance_until: estimated return date (filled by mechanic when MAINTENANCE)

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS maintenance_until  DATE;

-- Backfill: existing rows get status_changed_at = updated_at
UPDATE vehicles SET status_changed_at = updated_at WHERE status_changed_at IS NULL;

-- Rollback:
-- ALTER TABLE vehicles DROP COLUMN IF EXISTS status_changed_at;
-- ALTER TABLE vehicles DROP COLUMN IF EXISTS maintenance_until;
