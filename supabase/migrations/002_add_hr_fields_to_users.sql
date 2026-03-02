-- Adds date_hired and date_fired to users table for staff lifecycle management
-- Uses ADD COLUMN IF NOT EXISTS for idempotent re-runs
-- DEFAULT NULL ensures existing rows are not affected (backward compatible)
-- date_hired: set when ADMIN hires/onboards an employee
-- date_fired: set when ADMIN dismisses; combined with is_active=false (soft-delete)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS date_hired DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS date_fired DATE DEFAULT NULL;

-- Rollback:
-- ALTER TABLE users DROP COLUMN IF EXISTS date_hired;
-- ALTER TABLE users DROP COLUMN IF EXISTS date_fired;
