-- 013: Vehicle fleet enhancement
-- 1. Expand vehicle_type to include tunnel-specific types (TRACTOR, AERIAL, WASHER, LOADER)
-- 2. Add technical characteristics to vehicles (make, model, year, payload, seats, etc.)
-- 3. Add assigned_driver_id — permanently assigned driver per vehicle
-- 4. Create vehicle_breakdowns — breakdown journal with severity and repair tracking
-- 5. Add driver_user_id to vehicle_assignments — who drives this vehicle on this job

-- =============================================================================
-- Section 1: Expand vehicle_type CHECK constraint
-- Drop the auto-generated constraint and recreate with additional types
-- =============================================================================

ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_vehicle_type_check;

ALTER TABLE vehicles
  ADD CONSTRAINT vehicles_vehicle_type_check
  CHECK (vehicle_type IN (
    'CAR',      -- легковой
    'TRUCK',    -- грузовой
    'BUS',      -- автобус / вахтовка (перевозка рабочих)
    'SPECIAL',  -- спецтехника (общее)
    'TRACTOR',  -- трактор
    'AERIAL',   -- автовышка / люлька
    'WASHER',   -- моечная машина (промывка тоннеля)
    'LOADER'    -- погрузчик
  ));

-- =============================================================================
-- Section 2: Add technical characteristics columns to vehicles
-- All new columns are nullable for backward compat with existing rows
-- =============================================================================

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS fleet_number       TEXT,          -- гаражный / внутренний номер
  ADD COLUMN IF NOT EXISTS make               TEXT,          -- марка (КАМАЗ, Газель, LIEBHERR…)
  ADD COLUMN IF NOT EXISTS model              TEXT,          -- модель (5511, Next, …)
  ADD COLUMN IF NOT EXISTS year               SMALLINT,      -- год выпуска
  ADD COLUMN IF NOT EXISTS payload_kg         INTEGER,       -- грузоподъёмность (кг)
  ADD COLUMN IF NOT EXISTS seats              SMALLINT,      -- мест (для пассажирского/вахтовки)
  ADD COLUMN IF NOT EXISTS max_height_m       NUMERIC(4,1),  -- высота подъёма (для люльки)
  ADD COLUMN IF NOT EXISTS has_water_tank     BOOLEAN DEFAULT false, -- моечная машина
  ADD COLUMN IF NOT EXISTS garage_location    TEXT,          -- место стоянки / бокс
  ADD COLUMN IF NOT EXISTS assigned_driver_id TEXT REFERENCES users(user_id) ON DELETE SET NULL;

-- =============================================================================
-- Section 3: Add driver_user_id to vehicle_assignments
-- Records who actually drove the vehicle on a specific job
-- =============================================================================

ALTER TABLE vehicle_assignments
  ADD COLUMN IF NOT EXISTS driver_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL;

-- =============================================================================
-- Section 4: Create vehicle_breakdowns — breakdown / defect journal
-- Filled by mechanic or any authorized user when a problem is discovered
-- =============================================================================

CREATE TABLE IF NOT EXISTS vehicle_breakdowns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id       UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  reported_by      TEXT NOT NULL REFERENCES users(user_id),
  reported_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  description      TEXT NOT NULL,          -- what broke / defect description
  severity         TEXT NOT NULL DEFAULT 'MINOR'
                     CHECK (severity IN ('MINOR', 'MAJOR', 'CRITICAL')),
  status           TEXT NOT NULL DEFAULT 'OPEN'
                     CHECK (status IN ('OPEN', 'IN_REPAIR', 'RESOLVED')),
  resolved_at      TIMESTAMPTZ,            -- when RESOLVED
  resolution_notes TEXT,                   -- what was done to fix it
  mechanic_notes   TEXT,                   -- internal mechanic notes
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_breakdowns_vehicle  ON vehicle_breakdowns(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_breakdowns_status   ON vehicle_breakdowns(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_breakdowns_reported ON vehicle_breakdowns(reported_at DESC);

-- =============================================================================
-- Section 5: RLS for vehicle_breakdowns
-- =============================================================================

ALTER TABLE vehicle_breakdowns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicle_breakdowns_select" ON vehicle_breakdowns;
CREATE POLICY "vehicle_breakdowns_select"
  ON vehicle_breakdowns FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

DROP POLICY IF EXISTS "vehicle_breakdowns_insert" ON vehicle_breakdowns;
CREATE POLICY "vehicle_breakdowns_insert"
  ON vehicle_breakdowns FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "vehicle_breakdowns_update" ON vehicle_breakdowns;
CREATE POLICY "vehicle_breakdowns_update"
  ON vehicle_breakdowns FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "vehicle_breakdowns_delete" ON vehicle_breakdowns;
CREATE POLICY "vehicle_breakdowns_delete"
  ON vehicle_breakdowns FOR DELETE
  USING (true);

-- =============================================================================
-- ROLLBACK:
-- DROP TABLE IF EXISTS vehicle_breakdowns;
-- ALTER TABLE vehicle_assignments DROP COLUMN IF EXISTS driver_user_id;
-- ALTER TABLE vehicles
--   DROP COLUMN IF EXISTS fleet_number,
--   DROP COLUMN IF EXISTS make,
--   DROP COLUMN IF EXISTS model,
--   DROP COLUMN IF EXISTS year,
--   DROP COLUMN IF EXISTS payload_kg,
--   DROP COLUMN IF EXISTS seats,
--   DROP COLUMN IF EXISTS max_height_m,
--   DROP COLUMN IF EXISTS has_water_tank,
--   DROP COLUMN IF EXISTS garage_location,
--   DROP COLUMN IF EXISTS assigned_driver_id;
-- ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_vehicle_type_check;
-- ALTER TABLE vehicles ADD CONSTRAINT vehicles_vehicle_type_check
--   CHECK (vehicle_type IN ('CAR', 'TRUCK', 'SPECIAL', 'BUS'));
-- =============================================================================
