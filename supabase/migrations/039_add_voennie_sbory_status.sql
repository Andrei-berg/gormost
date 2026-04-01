-- Migration 039: Add 'Voennie_sbory' to employee_status CHECK constraint
-- Adds the new "Прохождение военно-учебных сборов" status type.

ALTER TABLE employee_status
  DROP CONSTRAINT IF EXISTS employee_status_status_check,
  ADD CONSTRAINT employee_status_status_check
    CHECK (status IN (
      'Na_rabote', 'Otgul', 'Bolnichniy', 'Otpusk', 'Uvolen',
      'Komandirovka', 'Uchebniy_otpusk', 'Dekret',
      'Mobilizovan', 'SVO', 'Troydoustroyen_s_SVO',
      'Voennie_sbory'
    ));

-- Rollback:
-- ALTER TABLE employee_status
--   DROP CONSTRAINT IF EXISTS employee_status_status_check,
--   ADD CONSTRAINT employee_status_status_check
--     CHECK (status IN (
--       'Na_rabote', 'Otgul', 'Bolnichniy', 'Otpusk', 'Uvolen',
--       'Komandirovka', 'Uchebniy_otpusk', 'Dekret',
--       'Mobilizovan', 'SVO', 'Troydoustroyen_s_SVO'
--     ));
