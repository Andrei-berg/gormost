-- 023: Replace DRIVER role with ITR in work_assignments
-- Drivers are assigned by chief mechanic, not by site foreman.
-- ITR (инженерно-технические работники) added as a role for engineers/technicians.

-- Update the CHECK constraint to replace DRIVER with ITR
ALTER TABLE work_assignments
  DROP CONSTRAINT IF EXISTS work_assignments_role_check;

ALTER TABLE work_assignments
  ADD CONSTRAINT work_assignments_role_check
  CHECK (role IN ('WORKER', 'BRIGADIER', 'MASTER', 'ITR'));

-- Migrate existing DRIVER rows to WORKER (if any exist)
UPDATE work_assignments SET role = 'WORKER' WHERE role = 'DRIVER';

-- =============================================================================
-- ROLLBACK:
-- ALTER TABLE work_assignments DROP CONSTRAINT IF EXISTS work_assignments_role_check;
-- ALTER TABLE work_assignments ADD CONSTRAINT work_assignments_role_check
--   CHECK (role IN ('WORKER', 'BRIGADIER', 'MASTER', 'DRIVER'));
-- =============================================================================
