-- Migration 008: Fix service_id for seeded employees
--
-- Problem: 007_seed_employees.sql omitted service_id from the INSERT column list.
-- All 270 seeded employees have service_id = NULL and are silently excluded from the
-- /hr page by the filter: employees.filter(e => e.user.service_id !== null)
--
-- Fix: Assign all active seeded employees to SRV-STR (Строительная служба) as a
-- placeholder. This is a bulk default — the actual service breakdown is not available
-- from the roster data (roster-merged.json has no service_id field).
--
-- Action required after running: ADMIN should open the /hr admin view and reassign
-- employees to their correct services (SRV-ENG, SRV-FIRE, SRV-VENT, SRV-CCTV as needed).
-- Employees whose correct service is SRV-STR require no change.
--
-- Scope: active employees only (is_active = true). Dismissed employees (is_active = false)
-- remain with service_id = NULL — they appear in the DismissedSection which does not
-- filter by service_id.
--
-- Prerequisites: Verify 'SRV-STR' exists in the services table before running:
--   SELECT service_id, service_name FROM services WHERE service_id = 'SRV-STR';

UPDATE users
SET service_id = 'SRV-STR'
WHERE service_id IS NULL
  AND is_active = true;

-- Verification: after running, 0 rows should remain with service_id IS NULL and is_active = true
-- SELECT COUNT(*) FROM users WHERE service_id IS NULL AND is_active = true;
-- Expected result: 0

-- ============================================================
-- ROLLBACK
-- ============================================================
-- To undo: set service_id back to NULL for all active workers currently assigned to SRV-STR
-- WARNING: this also nullifies any subsequent manual service reassignments done via admin panel.
-- Only run rollback immediately after migration if the migration was incorrect.
--
-- ROLLBACK statement:
-- UPDATE users
-- SET service_id = NULL
-- WHERE service_id = 'SRV-STR'
--   AND is_active = true;
