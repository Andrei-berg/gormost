-- Migration 035c: add shift_number column to employee_certs (missed in 035)
ALTER TABLE employee_certs ADD COLUMN IF NOT EXISTS shift_number text;
