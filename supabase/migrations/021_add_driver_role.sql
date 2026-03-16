-- Migration 021: add DRIVER to role_level CHECK constraint
-- Allows creating users with role_level = 'DRIVER' (водитель транспортного средства)

-- Step 1: fix any rows with unknown role_level values before adding constraint
UPDATE users
SET role_level = 'WORKER'
WHERE role_level NOT IN (
  'ADMIN', 'BOSS', 'ZAMPORAB', 'HEAD', 'DISPATCHER', 'FOREMAN',
  'TRANSPORT', 'COMPLAINTS', 'WORKER', 'CHIEF_ENGINEER',
  'SPECIALIST', 'HR', 'DRIVER'
);

-- Step 2: drop old constraint if exists, then re-add with DRIVER included
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_level_check;

ALTER TABLE users ADD CONSTRAINT users_role_level_check
  CHECK (role_level IN (
    'ADMIN', 'BOSS', 'ZAMPORAB', 'HEAD', 'DISPATCHER', 'FOREMAN',
    'TRANSPORT', 'COMPLAINTS', 'WORKER', 'CHIEF_ENGINEER',
    'SPECIALIST', 'HR', 'DRIVER'
  ));

-- ROLLBACK:
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_level_check;
-- ALTER TABLE users ADD CONSTRAINT users_role_level_check
--   CHECK (role_level IN (
--     'ADMIN', 'BOSS', 'ZAMPORAB', 'HEAD', 'DISPATCHER', 'FOREMAN',
--     'TRANSPORT', 'COMPLAINTS', 'WORKER', 'CHIEF_ENGINEER',
--     'SPECIALIST', 'HR'
--   ));
