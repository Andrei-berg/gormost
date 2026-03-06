-- Phase 04: Staff Management Schema
-- Creates professions, employee_positions, schedules, employee_assignments tables.
-- Extends users table with 13 new HR columns (all DEFAULT NULL for backward compat).
-- Updates employee_status CHECK constraint to include 6 new status types.
-- CRITICAL: user_id FK type is TEXT (not UUID) — matches existing users.user_id column.
-- Safe to run multiple times (IF NOT EXISTS / IF EXISTS guards on all DDL).

-- =============================================================================
-- Section 1: Extend users table (13 new HR columns, all backward-compatible)
-- =============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS first_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS middle_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS email TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT NULL CHECK (category IN ('ИТР', 'рабочий')),
  ADD COLUMN IF NOT EXISTS probation_start DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS probation_end DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS disability_group SMALLINT DEFAULT NULL CHECK (disability_group IN (1, 2, 3)),
  ADD COLUMN IF NOT EXISTS disability_notes TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS has_many_children BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS svo_type TEXT DEFAULT NULL CHECK (svo_type IN ('мобилизован', 'контракт', 'через_регион')),
  ADD COLUMN IF NOT EXISTS participates_in_stroyevaya BOOLEAN DEFAULT true;

-- =============================================================================
-- Section 2: Update employee_status CHECK constraint
-- Extend from 5 original values to all 11 status values
-- =============================================================================

ALTER TABLE employee_status
  DROP CONSTRAINT IF EXISTS employee_status_status_check,
  ADD CONSTRAINT employee_status_status_check
    CHECK (status IN (
      'Na_rabote', 'Otgul', 'Bolnichniy', 'Otpusk', 'Uvolen',
      'Komandirovka', 'Uchebniy_otpusk', 'Dekret',
      'Mobilizovan', 'SVO', 'Troydoustroyen_s_SVO'
    ));

-- =============================================================================
-- Section 3: Create professions table (lookup/reference table)
-- Source of truth: staffing schedule file (not shift schedule)
-- Unique key: (name, COALESCE(grade, '')) to handle NULL grades for ITR roles
-- =============================================================================

CREATE TABLE IF NOT EXISTS professions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  grade       TEXT DEFAULT NULL,
  category    TEXT NOT NULL CHECK (category IN ('ИТР', 'рабочий')),
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (name, COALESCE(grade, ''))
);

-- =============================================================================
-- Section 4: Create employee_positions table (SCD Type 2 — position history)
-- CRITICAL: user_id is TEXT (not UUID) — matches users.user_id type
-- profession_id is UUID — references professions.id (which is UUID)
-- created_by is TEXT — references users.user_id
-- Partial unique index enforces one active position per employee at a time
-- =============================================================================

CREATE TABLE IF NOT EXISTS employee_positions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  profession_id   UUID NOT NULL REFERENCES professions(id),
  started_at      DATE NOT NULL,
  ended_at        DATE DEFAULT NULL,
  change_reason   TEXT DEFAULT NULL CHECK (change_reason IN (
                    'прием', 'перевод', 'повышение', 'понижение', 'совмещение'
                  )),
  notes           TEXT DEFAULT NULL,
  created_by      TEXT DEFAULT NULL REFERENCES users(user_id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Only one active position (ended_at IS NULL) per employee at a time
CREATE UNIQUE INDEX IF NOT EXISTS employee_positions_current
  ON employee_positions (user_id)
  WHERE ended_at IS NULL;

-- Index for efficient position history lookups by employee
CREATE INDEX IF NOT EXISTS idx_employee_positions_user
  ON employee_positions (user_id);

-- =============================================================================
-- Section 5: Create schedules table (work schedule reference data)
-- 6 schedule types: сутки/3, 5/2, 3/3, 6/6, 15/15, 1/3
-- =============================================================================

CREATE TABLE IF NOT EXISTS schedules (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                TEXT UNIQUE NOT NULL,
  name                TEXT NOT NULL,
  work_days           SMALLINT NOT NULL,
  rest_days           SMALLINT NOT NULL,
  default_day_night   TEXT NOT NULL CHECK (default_day_night IN ('night', 'day', 'alternating')),
  is_shift_based      BOOLEAN DEFAULT false,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- Section 6: Create employee_assignments table (schedule + shift assignments)
-- CRITICAL: user_id is TEXT (not UUID) — matches users.user_id type
-- schedule_id is UUID — references schedules.id (which is UUID)
-- created_by is TEXT — references users.user_id
-- Partial unique index enforces one active assignment per employee at a time
-- =============================================================================

CREATE TABLE IF NOT EXISTS employee_assignments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  schedule_id           UUID NOT NULL REFERENCES schedules(id),
  shift_num             SMALLINT DEFAULT NULL CHECK (shift_num IN (1, 2, 3, 4)),
  rotation_group        TEXT DEFAULT NULL,
  foreman_name          TEXT DEFAULT NULL,
  shift_reference_date  DATE DEFAULT NULL,
  is_driver             BOOLEAN DEFAULT false,
  started_at            DATE NOT NULL,
  ended_at              DATE DEFAULT NULL,
  created_by            TEXT DEFAULT NULL REFERENCES users(user_id),
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- Only one active assignment (ended_at IS NULL) per employee at a time
CREATE UNIQUE INDEX IF NOT EXISTS employee_assignments_current
  ON employee_assignments (user_id)
  WHERE ended_at IS NULL;

-- Index for efficient assignment history lookups by employee
CREATE INDEX IF NOT EXISTS idx_employee_assignments_user
  ON employee_assignments (user_id);

-- =============================================================================
-- Rollback:
-- DROP TABLE IF EXISTS employee_assignments;
-- DROP TABLE IF EXISTS employee_positions;
-- DROP TABLE IF EXISTS schedules;
-- DROP TABLE IF EXISTS professions;
-- ALTER TABLE employee_status DROP CONSTRAINT IF EXISTS employee_status_status_check;
-- ALTER TABLE employee_status ADD CONSTRAINT employee_status_status_check
--   CHECK (status IN ('Na_rabote', 'Otgul', 'Bolnichniy', 'Otpusk', 'Uvolen'));
-- ALTER TABLE users
--   DROP COLUMN IF EXISTS last_name,
--   DROP COLUMN IF EXISTS first_name,
--   DROP COLUMN IF EXISTS middle_name,
--   DROP COLUMN IF EXISTS email,
--   DROP COLUMN IF EXISTS category,
--   DROP COLUMN IF EXISTS probation_start,
--   DROP COLUMN IF EXISTS probation_end,
--   DROP COLUMN IF EXISTS is_disabled,
--   DROP COLUMN IF EXISTS disability_group,
--   DROP COLUMN IF EXISTS disability_notes,
--   DROP COLUMN IF EXISTS has_many_children,
--   DROP COLUMN IF EXISTS svo_type,
--   DROP COLUMN IF EXISTS participates_in_stroyevaya;
-- =============================================================================
