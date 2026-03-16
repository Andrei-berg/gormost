-- Migration 022: merge "сутки/3" into "1/3" — same schedule, redundant duplicate
-- 179 employees on сутки/3 → reassigned to 1/3
-- сутки/3 record deleted from schedules table

-- Step 1: reassign all employees from сутки/3 to 1/3
UPDATE employee_assignments
SET schedule_id = (SELECT id FROM schedules WHERE code = '1/3' LIMIT 1)
WHERE schedule_id = (SELECT id FROM schedules WHERE code = 'сутки/3' LIMIT 1);

-- Step 2: rename 1/3 to generic "Суточный" (covers all суточный staff)
UPDATE schedules SET name = 'Суточный' WHERE code = '1/3';

-- Step 3: delete сутки/3 from schedules
DELETE FROM schedules WHERE code = 'сутки/3';

-- ROLLBACK:
-- INSERT INTO schedules (code, name) VALUES ('сутки/3', 'Суточный');  -- need original id
-- UPDATE employee_assignments SET schedule_id = <old_id> WHERE ... -- not easily reversible
-- UPDATE schedules SET name = 'Диспетчерский суточный' WHERE code = '1/3';
