-- Migration 027: Custom X/Y schedule for drivers
-- Adds custom_work_days / custom_rest_days columns to employee_assignments
-- and inserts the X/Y schedule type ("произвольная вахта") into schedules.
-- Used for drivers with non-standard rotation (e.g. 4/4, 5/3, 7/7).

-- =============================================================================
-- Section 1: Add X/Y schedule row
-- =============================================================================

INSERT INTO schedules (code, name, work_days, rest_days, default_day_night, is_shift_based)
VALUES ('X/Y', 'Произвольная вахта', 0, 0, 'day', false)
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- Section 2: Add custom_work_days / custom_rest_days to employee_assignments
-- =============================================================================

ALTER TABLE employee_assignments
  ADD COLUMN IF NOT EXISTS custom_work_days INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custom_rest_days  INTEGER DEFAULT NULL;

COMMENT ON COLUMN employee_assignments.custom_work_days IS
  'Used with X/Y schedule: number of working days per cycle';
COMMENT ON COLUMN employee_assignments.custom_rest_days IS
  'Used with X/Y schedule: number of rest days per cycle';

-- =============================================================================
-- Rollback:
--   ALTER TABLE employee_assignments DROP COLUMN IF EXISTS custom_work_days;
--   ALTER TABLE employee_assignments DROP COLUMN IF EXISTS custom_rest_days;
--   DELETE FROM schedules WHERE code = 'X/Y';
-- =============================================================================
