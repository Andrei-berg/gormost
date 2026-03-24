-- Migration 035: Cert module v2 — expand employee_certs + add 15 cert types + SAFETY_ENGINEER user
-- Why: inженер ТБиОТ предоставила реальную таблицу удостоверений (Excel, ~700 записей)
--      Нужны: nullable employee_id (для несвязанных записей из импорта),
--             дополнительные поля (протокол, ОБ/ПА, первичное/очередное, бессрочно, сдал/забрал),
--             новые типы удостоверений из Excel.
-- Rollback: see bottom of file

-- ============ 1. EXPAND employee_certs ============

-- Make employee_id nullable (for unlinked import records)
ALTER TABLE employee_certs ALTER COLUMN employee_id DROP NOT NULL;

-- Add full_name for unlinked records (when employee_id IS NULL)
ALTER TABLE employee_certs ADD COLUMN IF NOT EXISTS full_name text;

-- Add protocol number (№ протокола / № протокола об аттестации)
ALTER TABLE employee_certs ADD COLUMN IF NOT EXISTS protocol_number text;

-- Add planned refresher date (Дата ОБ/ПА — обучение / проверка аттестации)
ALTER TABLE employee_certs ADD COLUMN IF NOT EXISTS ob_pa_date date;

-- Add renewal type: первичное / очередное / повторное / бессрочное
ALTER TABLE employee_certs ADD COLUMN IF NOT EXISTS renewal_type text
  CHECK (renewal_type IN ('первичное', 'очередное', 'повторное', 'бессрочное'));

-- Add indefinite flag (бессрочно — cert never expires, e.g. работы на высоте по старым нормам)
ALTER TABLE employee_certs ADD COLUMN IF NOT EXISTS is_indefinite boolean NOT NULL DEFAULT false;

-- Add return/handover status (сдал удостоверение / не сдал / забрал)
ALTER TABLE employee_certs ADD COLUMN IF NOT EXISTS return_status text
  CHECK (return_status IN ('сдал', 'не сдал', 'забрал'));

-- ============ 2. REBUILD UNIQUE CONSTRAINT ============
-- Old constraint UNIQUE(employee_id, cert_type_id) doesn't work with nullable employee_id

-- Drop old unique constraint (may have different names depending on creation order)
DO $$ BEGIN
  ALTER TABLE employee_certs DROP CONSTRAINT IF EXISTS employee_certs_employee_id_cert_type_id_key;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Unique for LINKED records (employee_id IS NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS employee_certs_linked_uniq
  ON employee_certs (employee_id, cert_type_id)
  WHERE employee_id IS NOT NULL;

-- Unique for UNLINKED records (match by full_name + cert_type)
CREATE UNIQUE INDEX IF NOT EXISTS employee_certs_unlinked_uniq
  ON employee_certs (full_name, cert_type_id)
  WHERE employee_id IS NULL;

-- Constraint: at least one of employee_id or full_name must be set
ALTER TABLE employee_certs DROP CONSTRAINT IF EXISTS employee_or_name_required;
ALTER TABLE employee_certs ADD CONSTRAINT employee_or_name_required
  CHECK (employee_id IS NOT NULL OR full_name IS NOT NULL);

-- ============ 3. ADD MISSING CERT TYPES ============

INSERT INTO cert_types (code, name, cert_category, period_months, period_note, target_group, notes, is_active, sort_order)
VALUES
-- Brigade leader certification (Бригадир)
('BRIGADIER',       'Бригадир',                              'Удостоверение', 36,   '3 года',     'Бригадиры',                    'Внутренняя аттестация на 3 года', true, 25),

-- Work at height — 4 separate groups
('HEIGHT_SCAFFOLD', 'Высота — с подмащиванием',              'Допуск',        NULL, 'Бессрочно',  'Рабочие',                      '1-я группа, выдано до 2022 — бессрочно', true, 26),
('HEIGHT_1',        'Высота 1 группа (без подмащивания)',    'Допуск',        36,   '3 года',     'Рабочие / ИТР',                'Без применения средств подмащивания', true, 27),
('HEIGHT_2',        'Высота 2 группа',                       'Допуск',        36,   '3 года',     'Бригадиры / мастера',          'Без применения средств подмащивания', true, 28),
('HEIGHT_3',        'Высота 3 группа',                       'Допуск',        60,   '5 лет',      'Руководители / ответственные', 'Организация и контроль работ на высоте', true, 29),

-- Suspended platform (люлька)
('GONDOLA',         'Рабочий подвесной люльки',              'Удостоверение', 12,   '1 год',      'Рабочие',                      'ПА ежегодно', true, 30),

-- Sandblaster (пескоструйщик)
('SANDBLAST',       'Пескоструйщик',                         'Удостоверение', NULL, 'Бессрочно',  'Рабочие',                      'Профессиональный допуск, бессрочно', true, 31),

-- Insulator (изолировщик на гидроизоляции)
('INSULATOR',       'Изолировщик на гидроизоляции',          'Удостоверение', 36,   '3 года',     'Рабочие',                      NULL, true, 32),

-- Earthworks (земляные работы)
('EARTHWORKS',      'Земляные работы',                       'Допуск',        36,   '3 года',     'Руководители / ИТР',           NULL, true, 33),

-- Machinery operators
('COMPRESSOR_OP',   'Машинист компрессорной установки',      'Удостоверение', 12,   '1 год',      'Операторы',                    'Ростехнадзор / ОПО', true, 34),
('FACADE_LIFT_OP',  'Машинист фасадного подъёмника',         'Удостоверение', 12,   '1 год',      'Операторы',                    'Ростехнадзор', true, 35),
('MANIPULATOR_OP',  'Машинист крана-манипулятора',           'Удостоверение', 12,   '1 год',      'Операторы ПС',                 'Ростехнадзор, ПС', true, 36),

-- OT sub-programs (existing OT = general; these are specific programs)
('OT_A',            'ОТ — Программа А (руководители)',       'Обучение',      36,   '3 года',     'Руководители / ИТР',           'Охрана труда, программа А', true, 37),
('OT_B',            'ОТ — Программа Б (работники)',          'Обучение',      36,   '3 года',     'Рабочие',                      'Охрана труда, программа Б', true, 38),
('OT_SIZ',          'ОТ — СИЗ',                              'Обучение',      36,   '3 года',     'Все сотрудники',               'Средства индивидуальной защиты', true, 39)

ON CONFLICT (code) DO NOTHING;

-- Mark old generic HEIGHT as inactive (replaced by HEIGHT_1/2/3/SCAFFOLD)
UPDATE cert_types SET is_active = false WHERE code = 'HEIGHT';

-- ============ 4. ADD SAFETY_ENGINEER USER ============
-- Default PIN: 5555 (инженер ТБиОТ должна сменить при первом входе)

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

-- ============ ROLLBACK ============
-- ALTER TABLE employee_certs ALTER COLUMN employee_id SET NOT NULL;
-- ALTER TABLE employee_certs DROP COLUMN IF EXISTS full_name;
-- ALTER TABLE employee_certs DROP COLUMN IF EXISTS protocol_number;
-- ALTER TABLE employee_certs DROP COLUMN IF EXISTS ob_pa_date;
-- ALTER TABLE employee_certs DROP COLUMN IF EXISTS renewal_type;
-- ALTER TABLE employee_certs DROP COLUMN IF EXISTS is_indefinite;
-- ALTER TABLE employee_certs DROP COLUMN IF EXISTS return_status;
-- DROP INDEX IF EXISTS employee_certs_linked_uniq;
-- DROP INDEX IF EXISTS employee_certs_unlinked_uniq;
-- ALTER TABLE employee_certs DROP CONSTRAINT IF EXISTS employee_or_name_required;
-- CREATE UNIQUE INDEX employee_certs_employee_id_cert_type_id_key ON employee_certs(employee_id, cert_type_id);
-- DELETE FROM cert_types WHERE code IN ('BRIGADIER','HEIGHT_SCAFFOLD','HEIGHT_1','HEIGHT_2','HEIGHT_3','GONDOLA','SANDBLAST','INSULATOR','EARTHWORKS','COMPRESSOR_OP','FACADE_LIFT_OP','MANIPULATOR_OP','OT_A','OT_B','OT_SIZ');
-- UPDATE cert_types SET is_active = true WHERE code = 'HEIGHT';
-- DELETE FROM users WHERE user_id = 'USR-SAFETY-001';
