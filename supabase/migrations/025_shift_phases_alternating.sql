-- Migration 025: Add is_alternating flag to shift_phases
-- Purpose: For 15/15 schedules, enables automatic monthly phase alternation
-- (DAY → NIGHT → DAY → ...) computed from anchor_date, without creating
-- a new phase record every month.
--
-- is_alternating = false (default): phase is fixed for the entire valid_from..valid_to period
-- is_alternating = true: phase alternates every calendar month starting from anchor_date month
--   Even months from anchor → base phase; Odd months → opposite phase

ALTER TABLE shift_phases
  ADD COLUMN IF NOT EXISTS is_alternating BOOLEAN NOT NULL DEFAULT false;

-- Rollback:
-- ALTER TABLE shift_phases DROP COLUMN IF EXISTS is_alternating;
