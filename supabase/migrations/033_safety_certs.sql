-- Migration 033: Safety & Occupational Health module (ТБиОТ)
-- Tables: cert_types (catalog), employee_certs (records), cert_requirements (rules)
-- Role: SAFETY_ENGINEER gets their own panel at /safety

-- ============ CATALOG ============
CREATE TABLE cert_types (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text UNIQUE NOT NULL,
  name          text NOT NULL,
  cert_category text NOT NULL CHECK (cert_category IN ('Обучение','Аттестация','Допуск','Удостоверение')),
  period_months int,        -- null = no fixed period (by law / one-time)
  period_note   text,       -- human-readable period: '1–3 года', 'По закону'
  target_group  text,       -- who needs it: 'Все сотрудники', 'Электротехнический персонал'
  notes         text,
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    int NOT NULL DEFAULT 0
);

-- Seed with 24 types from Excel (виды аттестаций)
INSERT INTO cert_types (code, name, cert_category, period_months, period_note, target_group, notes, sort_order) VALUES
('OT',        'Охрана труда',                      'Обучение',      12,   '1 год',      'Все сотрудники',               'Обязательное базовое',    1),
('PTM',       'Пожарная безопасность (ПТМ)',        'Обучение',      36,   '1–3 года',   'Ответственные / персонал',     'По категории объекта',    2),
('ELECTRO',   'Электробезопасность (I–V)',          'Аттестация',    12,   '1 год',      'Электротехнический персонал',  'Группа по должности',     3),
('PROM_A1',   'Промышленная безопасность (А.1)',    'Аттестация',    60,   '5 лет',      'Руководители / специалисты',   'Ростехнадзор',            4),
('PROM_B',    'Промышленная безопасность (Б.1–Б.12)','Аттестация',  60,   '5 лет',      'По виду ОПО',                  'По объекту',              5),
('HEIGHT',    'Работы на высоте',                  'Допуск',        12,   '1 год',      'Рабочие / ИТР',                'С группами',              6),
('GAS',       'Газоопасные работы',                 'Допуск',        12,   '1 год',      'Персонал работ',               'Часто с медосмотром',     7),
('FIRE_WORK', 'Огневые работы',                    'Допуск',        12,   '1 год',      'Персонал работ',               'Наряд-допуск',            8),
('CONFINED',  'Замкнутые пространства',             'Допуск',        12,   '1 год',      'Персонал работ',               'Повышенная опасность',    9),
('SLING',     'Стропальщик',                        'Удостоверение', 24,   '1–3 года',   'Такелажники',                  'ПС',                     10),
('CRANE_OP',  'Машинист крана',                     'Удостоверение', 24,   '1–3 года',   'Операторы ПС',                 'Ростехнадзор',           11),
('LIFT',      'Подъемники / вышки',                 'Удостоверение', 24,   '1–3 года',   'Операторы',                    'ПС',                     12),
('PRESSURE',  'Сосуды под давлением',               'Аттестация',    24,   '1–3 года',   'Обслуживающий персонал',       'Ростехнадзор',           13),
('BOILER',    'Котлы и теплоустановки',             'Аттестация',    24,   '1–3 года',   'Персонал',                     'Энергетика',             14),
('NAKS',      'НАКС (сварка)',                      'Аттестация',    36,   '2–3 года',   'Сварщики',                     'По видам',               15),
('WELD_CTRL', 'Контроль сварки',                   'Аттестация',    60,   '3–5 лет',    'ОТК / инженеры',               'НАКС/НК',                16),
('FIRST_AID', 'Первая помощь',                      'Обучение',      12,   '1 год',      'Все / ответственные',          'Часто обязательно',      17),
('DRIVER_LIC','Водительское удостоверение',          'Удостоверение', null, 'По закону',  'Водители',                     'Категории',              18),
('TRACTOR',   'Тракторист-машинист',                'Удостоверение', null, 'По закону',  'Спецтехника',                  'Гостехнадзор',           19),
('ECO',       'Экологическая безопасность',         'Обучение',      60,   '3–5 лет',    'Ответственные',                'При необходимости',      20),
('WASTE',     'Обращение с отходами',               'Обучение',      60,   '3–5 лет',    'Ответственные',                'Экология',               21),
('RADIATION', 'Радиационная безопасность',          'Обучение',      60,   '3–5 лет',    'Спецперсонал',                 'Если требуется',         22),
('ACCESS',    'Допуск на объект',                   'Допуск',        null, 'По объекту', 'Все сотрудники',               'СКУД',                   23),
('INTERNAL',  'Внутренние удостоверения',           'Допуск',        null, 'По регламенту','По заказчику',               'Сахалин и т.п.',         24);

-- ============ EMPLOYEE CERTS ============
CREATE TABLE employee_certs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   text NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  cert_type_id  uuid NOT NULL REFERENCES cert_types(id) ON DELETE CASCADE,
  issued_at     date NOT NULL,
  expires_at    date,          -- null = open-ended (no expiry)
  doc_number    text,
  issuer        text,          -- 'Ростехнадзор', 'Внутренняя комиссия', etc.
  notes         text,
  created_by    text REFERENCES users(user_id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, cert_type_id)
);

-- ============ REQUIREMENTS ============
-- Defines which certs are required for which employees.
-- At least one matcher (role_level OR service_id OR position_pattern) should be set.
CREATE TABLE cert_requirements (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cert_type_id     uuid NOT NULL REFERENCES cert_types(id) ON DELETE CASCADE,
  role_level       text,   -- e.g. 'DRIVER', 'WORKER', 'FOREMAN'
  service_id       text REFERENCES services(service_id),
  position_pattern text,   -- ILIKE match against users.position, e.g. '%электрик%'
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ============ RLS (open — app enforces role checks) ============
ALTER TABLE cert_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_certs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cert_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cert_types_all" ON cert_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "employee_certs_all" ON employee_certs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "cert_requirements_all" ON cert_requirements FOR ALL USING (true) WITH CHECK (true);

-- ============ ROLLBACK ============
-- DROP TABLE IF EXISTS cert_requirements;
-- DROP TABLE IF EXISTS employee_certs;
-- DROP TABLE IF EXISTS cert_types;
