-- 020_shift_phases.sql
-- Add 2/2 schedule + shift_phases table for explicit day/night phase management
-- Variant 2: phases stored as DB records, not computed from single anchor date.
-- Enables manual override, historical audit, and accurate payroll.

-- Add 2/2 schedule code
INSERT INTO schedules (code, name, work_days, rest_days, default_day_night, is_shift_based)
VALUES ('2/2', 'График 2/2 (два через два)', 2, 2, 'alternating', false)
ON CONFLICT (code) DO NOTHING;

-- shift_phases: explicit phase records per employee
-- Each record defines a period [valid_from, valid_to) where the employee
-- works a specific phase (day/night) with a given cycle anchor date.
-- valid_to = NULL means the phase is still active.
-- anchor_date = the first working day of this phase block (used for cycle offset).
CREATE TABLE IF NOT EXISTS shift_phases (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   TEXT        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  valid_from    DATE        NOT NULL,
  valid_to      DATE        DEFAULT NULL,
  phase         TEXT        NOT NULL CHECK (phase IN ('day', 'night')),
  anchor_date   DATE        NOT NULL,   -- first workday of this phase block (cycle reference)
  schedule_code TEXT        NOT NULL,   -- '2/2' | '3/3' | '6/6' | '15/15'
  notes         TEXT,
  created_by    TEXT        REFERENCES users(user_id),
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shift_phases_employee
  ON shift_phases (employee_id);

CREATE INDEX IF NOT EXISTS idx_shift_phases_lookup
  ON shift_phases (employee_id, valid_from DESC);

CREATE INDEX IF NOT EXISTS idx_shift_phases_active
  ON shift_phases (employee_id) WHERE valid_to IS NULL;

-- RLS: same pattern as other tables
ALTER TABLE shift_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read shift_phases"
  ON shift_phases FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated write shift_phases"
  ON shift_phases FOR ALL TO authenticated USING (true);

-- ============ ROLLBACK ============
-- DROP TABLE IF EXISTS shift_phases;
-- DELETE FROM schedules WHERE code = '2/2';
