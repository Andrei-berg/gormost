-- Adds work planning module: work_plans, work_plan_items, vehicles, vehicle_assignments
-- work_plans: shift work plans created by service heads, approved by chief engineer
-- work_plan_items: individual tasks within a plan (location, workers, time window)
-- vehicles: vehicle fleet managed by chief mechanic (status, breakdown details)
-- vehicle_assignments: links vehicles to specific work plan items (many-to-many)
-- New role CHIEF_ENGINEER is text-based — no schema change needed for users table

-- ============================================================
-- TABLE: work_plans
-- One plan per service per shift per date
-- Lifecycle: DRAFT → SUBMITTED → APPROVED (or REJECTED back to DRAFT)
-- ============================================================
CREATE TABLE IF NOT EXISTS work_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id      TEXT NOT NULL REFERENCES services(service_id) ON DELETE RESTRICT,
  plan_date       DATE NOT NULL,
  shift_type      TEXT NOT NULL CHECK (shift_type IN ('DAY', 'NIGHT')),
  status          TEXT NOT NULL DEFAULT 'DRAFT'
                    CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED')),
  created_by      TEXT NOT NULL REFERENCES users(user_id),
  submitted_at    TIMESTAMPTZ,
  approved_by     TEXT REFERENCES users(user_id),
  approved_at     TIMESTAMPTZ,
  chief_notes     TEXT,    -- chief engineer comments during review
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- prevent duplicate plans for same service/date/shift
  UNIQUE (service_id, plan_date, shift_type)
);

CREATE INDEX IF NOT EXISTS idx_work_plans_date_shift
  ON work_plans (plan_date, shift_type);

CREATE INDEX IF NOT EXISTS idx_work_plans_service_status
  ON work_plans (service_id, status);

-- ============================================================
-- TABLE: work_plan_items
-- Individual tasks within a plan
-- Workers stored as text array (names/positions, not FK to users)
-- because planning may include temporary/external staff
-- ============================================================
CREATE TABLE IF NOT EXISTS work_plan_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id          UUID NOT NULL REFERENCES work_plans(id) ON DELETE CASCADE,
  location         TEXT NOT NULL,           -- object / tunnel section
  work_description TEXT NOT NULL,           -- type of work
  workers          TEXT[] NOT NULL DEFAULT '{}',  -- list of worker names
  time_start       TIME,                    -- planned start (null = TBD)
  time_end         TIME,                    -- planned end   (null = TBD)
  sort_order       INTEGER NOT NULL DEFAULT 0,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_plan_items_plan_id
  ON work_plan_items (plan_id, sort_order);

-- ============================================================
-- TABLE: vehicles
-- Fleet registry managed by chief mechanic
-- Status updated in real time (ACTIVE / BROKEN / MAINTENANCE)
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,          -- make + model, e.g. "КамАЗ-5511"
  plate              TEXT NOT NULL UNIQUE,   -- license plate
  vehicle_type       TEXT NOT NULL DEFAULT 'TRUCK'
                       CHECK (vehicle_type IN ('CAR', 'TRUCK', 'SPECIAL', 'BUS')),
  status             TEXT NOT NULL DEFAULT 'ACTIVE'
                       CHECK (status IN ('ACTIVE', 'BROKEN', 'MAINTENANCE')),
  breakdown_details  TEXT,                   -- filled when status != ACTIVE
  notes              TEXT,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,  -- soft delete
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_status
  ON vehicles (status) WHERE is_active = TRUE;

-- ============================================================
-- TABLE: vehicle_assignments
-- Links a vehicle to a work plan item
-- Chief mechanic creates/removes assignments freely (before and during shift)
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicle_assignments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id     UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  plan_item_id   UUID NOT NULL REFERENCES work_plan_items(id) ON DELETE CASCADE,
  assigned_by    TEXT NOT NULL REFERENCES users(user_id),
  assigned_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes          TEXT,

  UNIQUE (vehicle_id, plan_item_id)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_item
  ON vehicle_assignments (plan_item_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_vehicle
  ON vehicle_assignments (vehicle_id);

-- ============================================================
-- Rollback:
-- DROP TABLE IF EXISTS vehicle_assignments;
-- DROP TABLE IF EXISTS vehicles;
-- DROP TABLE IF EXISTS work_plan_items;
-- DROP TABLE IF EXISTS work_plans;
-- ============================================================
