-- 014: Add is_driver flag to professions table
-- Allows automatic driver detection by profession rather than manual per-employee flag.
-- "Водитель автомобиля" and "Тракторист" are auto-marked as driver professions.
-- fetchDriverUsers() now reads through employee_positions → professions.is_driver=true

-- =============================================================================
-- Section 1: Add is_driver column to professions
-- =============================================================================

ALTER TABLE professions
  ADD COLUMN IF NOT EXISTS is_driver BOOLEAN NOT NULL DEFAULT false;

-- =============================================================================
-- Section 2: Auto-mark driver professions by name pattern
-- Covers: Водитель автомобиля, Тракторист — as seeded in migration 006
-- =============================================================================

UPDATE professions
  SET is_driver = true
  WHERE name ILIKE '%водитель%'
     OR name ILIKE '%тракторист%'
     OR name ILIKE '%машинист%';

-- =============================================================================
-- ROLLBACK:
-- UPDATE professions SET is_driver = false;
-- ALTER TABLE professions DROP COLUMN IF EXISTS is_driver;
-- =============================================================================
