-- Migration 024: Add planned/actual departure and return dates to employee_status
-- Purpose: HR needs to track scheduled vs actual leave dates for planning.
-- Applies to: Otgul, Bolnichniy, Otpusk, Komandirovka, Uchebniy_otpusk,
--             Dekret, Mobilizovan, SVO, Troydoustroyen_s_SVO

ALTER TABLE employee_status
  ADD COLUMN IF NOT EXISTS planned_departure DATE,    -- planned date of leaving
  ADD COLUMN IF NOT EXISTS planned_return    DATE,    -- planned date of return
  ADD COLUMN IF NOT EXISTS actual_departure  DATE,    -- actual date of leaving
  ADD COLUMN IF NOT EXISTS actual_return     DATE;    -- actual date of return

-- All new columns are nullable — no migration of existing rows needed.

-- Rollback:
-- ALTER TABLE employee_status DROP COLUMN IF EXISTS planned_departure;
-- ALTER TABLE employee_status DROP COLUMN IF EXISTS planned_return;
-- ALTER TABLE employee_status DROP COLUMN IF EXISTS actual_departure;
-- ALTER TABLE employee_status DROP COLUMN IF EXISTS actual_return;
