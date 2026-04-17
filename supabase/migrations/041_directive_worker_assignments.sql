-- Migration 041: Directive worker assignments + service order types
-- Extends directives table with service/order-type/location columns.
-- Adds directive_worker_assignments to track individual workers pulled from brigades.
-- Adds service_order_types catalog for per-service work order types.

-- ── 1. Extend directives table ──────────────────────────────────────────────
ALTER TABLE directives
  ADD COLUMN IF NOT EXISTS service_id  TEXT,
  ADD COLUMN IF NOT EXISTS order_type  TEXT,
  ADD COLUMN IF NOT EXISTS location    TEXT;

-- ── 2. Directive worker assignments ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS directive_worker_assignments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  directive_id        UUID NOT NULL REFERENCES directives(id) ON DELETE CASCADE,
  worker_id           TEXT NOT NULL,
  worker_name         TEXT NOT NULL,
  source_plan_id      TEXT,            -- work_plans.id they were pulled from
  source_plan_name    TEXT,            -- human-readable brigade description
  assigned_at         TIMESTAMPTZ DEFAULT now(),
  assigned_by         TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dwa_directive  ON directive_worker_assignments(directive_id);
CREATE INDEX IF NOT EXISTS idx_dwa_worker     ON directive_worker_assignments(worker_id);

-- ── 3. Service order types catalog ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_order_types (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id  TEXT NOT NULL,
  name        TEXT NOT NULL,
  sort_order  INT  DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sot_service ON service_order_types(service_id);

-- Seed data — order types per service
INSERT INTO service_order_types (service_id, name, sort_order) VALUES
  -- SRV-ENG — Инженерные системы
  ('SRV-ENG', 'Наряд на ремонт инженерных систем',       1),
  ('SRV-ENG', 'Наряд на плановое техобслуживание',        2),
  ('SRV-ENG', 'Аварийный наряд — инженерные системы',     3),
  ('SRV-ENG', 'Наряд на диагностику систем',              4),
  -- SRV-STR — Строительная служба
  ('SRV-STR', 'Наряд на строительные работы',             1),
  ('SRV-STR', 'Наряд на демонтажные работы',              2),
  ('SRV-STR', 'Аварийный наряд — конструкции',            3),
  ('SRV-STR', 'Наряд на сварочные работы',                4),
  -- SRV-FIRE — Пожарная безопасность
  ('SRV-FIRE', 'Наряд на проверку систем ПБ',             1),
  ('SRV-FIRE', 'Наряд на ремонт оборудования ПБ',         2),
  ('SRV-FIRE', 'Аварийный наряд — пожарная безопасность', 3),
  ('SRV-FIRE', 'Наряд на испытание систем ПБ',            4),
  -- SRV-VENT — Вентиляция
  ('SRV-VENT', 'Наряд на ремонт вентиляции',              1),
  ('SRV-VENT', 'Наряд на регламентное ТО',                2),
  ('SRV-VENT', 'Аварийный наряд — вентиляция',            3),
  ('SRV-VENT', 'Наряд на замену фильтров и элементов',    4),
  -- SRV-CCTV — Видеонаблюдение
  ('SRV-CCTV', 'Наряд на ремонт системы ССТВ',            1),
  ('SRV-CCTV', 'Наряд на установку оборудования ССТВ',    2),
  ('SRV-CCTV', 'Аварийный наряд — система ССТВ',          3),
  ('SRV-CCTV', 'Наряд на ТО системы видеонаблюдения',     4)
ON CONFLICT DO NOTHING;

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS service_order_types;
-- DROP TABLE IF EXISTS directive_worker_assignments;
-- ALTER TABLE directives DROP COLUMN IF EXISTS service_id;
-- ALTER TABLE directives DROP COLUMN IF EXISTS order_type;
-- ALTER TABLE directives DROP COLUMN IF EXISTS location;
