-- Migration 031: Driver schedule groups
-- Purpose: Add 2/2 schedule type + driver_group_number field for 17 driver template groups
-- Based on: ГРАФИКИ СМЕННОСТИ ВОДИТЕЛИ ЛЕФОРТОВО Q2 2026 (Excel)

-- =============================================================================
-- Section 1: Add 2/2 schedule to schedules table
-- =============================================================================
INSERT INTO schedules (code, name, work_days, rest_days, default_day_night, is_shift_based)
VALUES ('2/2', 'Двухдневная вахта', 2, 2, 'day', false)
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- Section 2: Add driver_group_number to employee_assignments
-- Stores which of the 17 schedule groups (from Excel) this driver belongs to.
-- NULL for non-drivers or drivers without a group assignment.
-- =============================================================================
ALTER TABLE employee_assignments
  ADD COLUMN IF NOT EXISTS driver_group_number SMALLINT CHECK (driver_group_number BETWEEN 1 AND 17);

-- =============================================================================
-- Rollback:
-- ALTER TABLE employee_assignments DROP COLUMN IF EXISTS driver_group_number;
-- DELETE FROM schedules WHERE code = '2/2';
-- =============================================================================
