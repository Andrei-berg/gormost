-- Migration 019: Add extended vehicle fields from fleet inventory
-- Adds chassis, equipment specs, unit (участок), current location, deployment

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS chassis           varchar,   -- базовое шасси: КАМАЗ 65115, ГАЗ C42R33
  ADD COLUMN IF NOT EXISTS equipment_specs   varchar,   -- оснащение: АГП-14Р (14м), Телескопический (54м)
  ADD COLUMN IF NOT EXISTS unit              varchar,   -- участок: Лефортово, АВР, Зеленоград, Восток…
  ADD COLUMN IF NOT EXISTS current_location  varchar,   -- место нахождения: на участке, ДТП, Элефант Люберцы
  ADD COLUMN IF NOT EXISTS deployment        varchar;   -- командировка: Валдай, Курск, Луганск (если в откомандировании)

-- Update vehicle_type CHECK to include new types KMU and CRANE
-- (if there is a check constraint on vehicle_type, update it)
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_vehicle_type_check;
ALTER TABLE vehicles ADD CONSTRAINT vehicles_vehicle_type_check
  CHECK (vehicle_type IN ('CAR','TRUCK','SPECIAL','BUS','TRACTOR','AERIAL','WASHER','LOADER','KMU','CRANE'));

-- Rollback:
-- ALTER TABLE vehicles DROP COLUMN IF EXISTS deployment;
-- ALTER TABLE vehicles DROP COLUMN IF EXISTS current_location;
-- ALTER TABLE vehicles DROP COLUMN IF EXISTS unit;
-- ALTER TABLE vehicles DROP COLUMN IF EXISTS equipment_specs;
-- ALTER TABLE vehicles DROP COLUMN IF EXISTS chassis;
-- ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_vehicle_type_check;
-- ALTER TABLE vehicles ADD CONSTRAINT vehicles_vehicle_type_check
--   CHECK (vehicle_type IN ('CAR','TRUCK','SPECIAL','BUS','TRACTOR','AERIAL','WASHER','LOADER'));
