-- 038_status_metadata.sql
-- Add metadata jsonb column to employee_status for structured status-specific data
-- (order numbers, sick leave numbers, volunteer type, etc.)

ALTER TABLE employee_status ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT NULL;

-- Rollback:
-- ALTER TABLE employee_status DROP COLUMN IF EXISTS metadata;
