-- 009_seed_role_users.sql
-- Create test accounts for all roles so demo navigation works.
-- All accounts use PIN = 1111 for easy demo login.
-- Safe to re-run: ON CONFLICT DO NOTHING.
--
-- ACCOUNTS CREATED:
--   Tab     PIN   Role            Name
--   1001    1111  DISPATCHER      Начальник смены (демо)
--   1002    1111  ZAMPORAB        Зам.прораба (демо)
--   1003    1111  FOREMAN         Мастер СТР (демо)
--   1004    1111  FOREMAN         Мастер ЭЛ (демо)
--   1005    1111  FOREMAN         Мастер ПБ (демо)
--   1006    1111  HEAD            Нач. Строительной службы (демо)
--   1007    1111  HEAD            Нач. Инженерных систем (демо)
--   1008    1111  HEAD            Нач. Пожарной безопасности (демо)
--   1009    1111  HEAD            Нач. Вентиляции (демо)
--   1010    1111  HEAD            Нач. Видеонаблюдения (демо)
--   1011    1111  CHIEF_ENGINEER  Главный инженер (демо)
--   1012    1111  BOSS            Начальник участка (демо)
--   1013    1111  TRANSPORT       Главный механик (демо)
--   1014    1111  COMPLAINTS      Диспетчер жалоб (демо)

INSERT INTO users (
  user_id, tab_number, full_name,
  last_name, first_name, middle_name,
  role_level, pin_code, is_active, position,
  service_id, category, date_hired
) VALUES
  ('demo-dispatcher', '1001', 'Начальник смены (демо)',
   'Демо', 'Диспетчер', null,
   'DISPATCHER', '1111', true, 'Начальник смены',
   null, 'ИТР', current_date),

  ('demo-zamporab', '1002', 'Зам. прораба (демо)',
   'Демо', 'Зам.Прораба', null,
   'ZAMPORAB', '1111', true, 'Заместитель прораба',
   null, 'ИТР', current_date),

  ('demo-foreman-str', '1003', 'Мастер СТР (демо)',
   'Демо', 'Мастер-СТР', null,
   'FOREMAN', '1111', true, 'Мастер участка',
   'SRV-STR', 'ИТР', current_date),

  ('demo-foreman-eng', '1004', 'Мастер ЭЛ (демо)',
   'Демо', 'Мастер-ЭЛ', null,
   'FOREMAN', '1111', true, 'Мастер участка',
   'SRV-ENG', 'ИТР', current_date),

  ('demo-foreman-fire', '1005', 'Мастер ПБ (демо)',
   'Демо', 'Мастер-ПБ', null,
   'FOREMAN', '1111', true, 'Мастер участка',
   'SRV-FIRE', 'ИТР', current_date),

  ('demo-head-str', '1006', 'Нач. Строительной сл. (демо)',
   'Демо', 'Нач-СТР', null,
   'HEAD', '1111', true, 'Начальник службы',
   'SRV-STR', 'ИТР', current_date),

  ('demo-head-eng', '1007', 'Нач. Инженерных сист. (демо)',
   'Демо', 'Нач-ЭЛ', null,
   'HEAD', '1111', true, 'Начальник службы',
   'SRV-ENG', 'ИТР', current_date),

  ('demo-head-fire', '1008', 'Нач. Пожарной безоп. (демо)',
   'Демо', 'Нач-ПБ', null,
   'HEAD', '1111', true, 'Начальник службы',
   'SRV-FIRE', 'ИТР', current_date),

  ('demo-head-vent', '1009', 'Нач. Вентиляции (демо)',
   'Демо', 'Нач-ВЕНТ', null,
   'HEAD', '1111', true, 'Начальник службы',
   'SRV-VENT', 'ИТР', current_date),

  ('demo-head-cctv', '1010', 'Нач. Видеонаблюдения (демо)',
   'Демо', 'Нач-CCTV', null,
   'HEAD', '1111', true, 'Начальник службы',
   'SRV-CCTV', 'ИТР', current_date),

  ('demo-chief', '1011', 'Главный инженер (демо)',
   'Демо', 'Гл-Инженер', null,
   'CHIEF_ENGINEER', '1111', true, 'Главный инженер',
   null, 'ИТР', current_date),

  ('demo-boss', '1012', 'Начальник участка (демо)',
   'Демо', 'Начальник', null,
   'BOSS', '1111', true, 'Начальник участка',
   null, 'ИТР', current_date),

  ('demo-transport', '1013', 'Главный механик (демо)',
   'Демо', 'Механик', null,
   'TRANSPORT', '1111', true, 'Главный механик',
   null, 'ИТР', current_date),

  ('demo-complaints', '1014', 'Диспетчер жалоб (демо)',
   'Демо', 'Жалобы', null,
   'COMPLAINTS', '1111', true, 'Диспетчер жалоб',
   null, 'ИТР', current_date)

ON CONFLICT (user_id) DO NOTHING;

-- ROLLBACK:
-- DELETE FROM users WHERE user_id LIKE 'demo-%';
