-- Migration 035b: Add SAFETY_ENGINEER to role_level constraint + insert user
-- Run this AFTER 035_cert_module_v2.sql (which failed at the INSERT step)

-- Step 1: expand role_level CHECK to include SAFETY_ENGINEER
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_level_check;

ALTER TABLE users ADD CONSTRAINT users_role_level_check
  CHECK (role_level IN (
    'ADMIN', 'BOSS', 'ZAMPORAB', 'HEAD', 'DISPATCHER', 'FOREMAN',
    'TRANSPORT', 'COMPLAINTS', 'WORKER', 'CHIEF_ENGINEER',
    'SPECIALIST', 'HR', 'DRIVER', 'SAFETY_ENGINEER'
  ));

-- Step 2: insert SAFETY_ENGINEER user (PIN: 5555)
INSERT INTO users (user_id, full_name, tab_number, role_level, service_id, is_active, pin_code, position)
VALUES (
  'USR-SAFETY-001',
  'Инженер ТБиОТ',
  'USR-SAFETY-001',
  'SAFETY_ENGINEER',
  NULL,
  true,
  '5555',
  'Инженер по технике безопасности и охране труда'
)
ON CONFLICT (user_id) DO NOTHING;

-- Rollback:
-- DELETE FROM users WHERE user_id = 'USR-SAFETY-001';
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_level_check;
-- ALTER TABLE users ADD CONSTRAINT users_role_level_check
--   CHECK (role_level IN (
--     'ADMIN', 'BOSS', 'ZAMPORAB', 'HEAD', 'DISPATCHER', 'FOREMAN',
--     'TRANSPORT', 'COMPLAINTS', 'WORKER', 'CHIEF_ENGINEER',
--     'SPECIALIST', 'HR', 'DRIVER'
--   ));
