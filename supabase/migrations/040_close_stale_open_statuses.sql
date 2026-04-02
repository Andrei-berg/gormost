-- Migration 040: Close stale open-ended employee_status records
--
-- Problem: setEmployeeStatus only inserted new rows without closing previous
-- open-ended ones (date_to IS NULL). This caused employees who returned to work
-- to still appear in absence reports.
--
-- Fix: for every open-ended record that has a NEWER record for the same employee,
-- set its date_to = (next record's date_from - 1 day).
--
-- Safe to run multiple times (only affects rows with date_to IS NULL that have
-- a newer sibling record).

UPDATE employee_status AS old
SET date_to = (
  SELECT (newer.date_from::date - INTERVAL '1 day')::date
  FROM employee_status newer
  WHERE newer.user_id = old.user_id
    AND newer.date_from > old.date_from
  ORDER BY newer.date_from ASC
  LIMIT 1
)
WHERE old.date_to IS NULL
  AND EXISTS (
    SELECT 1
    FROM employee_status newer
    WHERE newer.user_id = old.user_id
      AND newer.date_from > old.date_from
  );

-- Rollback: no safe rollback (data was already corrupted — this is a data repair).
-- To inspect what will be changed before running:
--
-- SELECT old.id, old.user_id, old.status, old.date_from, old.date_to,
--        (
--          SELECT newer.date_from
--          FROM employee_status newer
--          WHERE newer.user_id = old.user_id AND newer.date_from > old.date_from
--          ORDER BY newer.date_from ASC LIMIT 1
--        ) AS next_date_from
-- FROM employee_status old
-- WHERE old.date_to IS NULL
--   AND EXISTS (
--     SELECT 1 FROM employee_status newer
--     WHERE newer.user_id = old.user_id AND newer.date_from > old.date_from
--   );
