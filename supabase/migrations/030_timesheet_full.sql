-- ============================================================
-- migration 030: полный табельный учёт + переходящие смены
-- Что делает:
--   1. Расширяет shift_phases флагами переходящей 24ч-смены
--   2. Создаёт timesheet_entries — явные записи табеля Т-13
--      (одна строка = один сотрудник × один день)
-- Основание: ВТР дежурной смены «Гормост-Лефортово» 10.01.2025
--            ТК РФ ст. 91, 96, 297–301
-- ============================================================

-- 1. Расширяем shift_phases: флаги для переходящей 24ч-смены
ALTER TABLE shift_phases
  ADD COLUMN IF NOT EXISTS ends_next_day      boolean      DEFAULT false,
  ADD COLUMN IF NOT EXISTS next_day_hours     numeric(4,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_day_night_hrs numeric(4,2) DEFAULT 0;

COMMENT ON COLUMN shift_phases.ends_next_day IS
  'true = суточная смена 07:30→07:30, хвост переходит в следующий календарный день';
COMMENT ON COLUMN shift_phases.next_day_hours IS
  'часов хвоста смены в следующем дне (стандарт по ВТР = 7.5ч: 00:00–07:30)';
COMMENT ON COLUMN shift_phases.next_day_night_hrs IS
  'из них ночных по ТК РФ ст.96 (22:00–06:00), стандарт = 6ч (00:00–06:00)';

-- 2. Основная таблица табельных записей
CREATE TABLE IF NOT EXISTS timesheet_entries (
  id                    uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_date            date         NOT NULL,

  -- Код явки (коды Т-13 + вахтовые расширения)
  -- Я   = явка (полный рабочий день / полная суточная смена)
  -- ЯХ  = хвост переходящей смены (завершение в новом месяце)
  -- В   = выходной / день отдыха
  -- МВО = межвахтовый отдых (вахтовый метод, ст.301 ТК)
  -- ОТ  = ежегодный оплачиваемый отпуск
  -- ДО  = доп. отпуск без сохранения зарплаты
  -- Б   = временная нетрудоспособность (больничный)
  -- НН  = неявка по невыясненной причине
  -- П   = прогул
  entry_code            text         NOT NULL CHECK (entry_code IN (
                          'Я','ЯХ','В','МВО','ОТ','ДО','Б','НН','П'
                        )),

  hours_total           numeric(5,2) DEFAULT 0 CHECK (hours_total >= 0),
  hours_day             numeric(5,2) DEFAULT 0 CHECK (hours_day >= 0),
  hours_night           numeric(5,2) DEFAULT 0 CHECK (hours_night >= 0),  -- 22:00–06:00 по ТК
  hours_evening         numeric(5,2) DEFAULT 0 CHECK (hours_evening >= 0),-- 18:00–22:00
  hours_overtime        numeric(5,2) DEFAULT 0 CHECK (hours_overtime >= 0),

  -- Связь с источником
  source_shift_phase_id uuid         REFERENCES shift_phases(id) ON DELETE SET NULL,
  is_cross_month_tail   boolean      DEFAULT false,
  -- true = этот день — хвост суточной смены из предыдущего месяца
  -- entry_code = 'ЯХ', часы = 7.5 (00:00–07:30), ночных = 6 (00:00–06:00)

  -- Аудит
  generated_at          timestamptz  DEFAULT now(),
  generated_by          text         DEFAULT 'AUTO',  -- 'AUTO' или user_id
  notes                 text,

  UNIQUE (user_id, entry_date)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_timesheet_user_date  ON timesheet_entries (user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_timesheet_date_only  ON timesheet_entries (entry_date);
CREATE INDEX IF NOT EXISTS idx_timesheet_cross_tail ON timesheet_entries (is_cross_month_tail) WHERE is_cross_month_tail = true;

-- RLS
ALTER TABLE timesheet_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timesheet_select" ON timesheet_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
        AND (
          u.role_level IN ('ADMIN','BOSS','HR','HEAD','ZAMPORAB','CHIEF_ENGINEER')
          OR u.id = timesheet_entries.user_id
        )
    )
  );

CREATE POLICY "timesheet_insert_update" ON timesheet_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
        AND u.role_level IN ('ADMIN','HR')
    )
  );

-- ============================================================
-- Rollback:
-- DROP TABLE IF EXISTS timesheet_entries;
-- ALTER TABLE shift_phases
--   DROP COLUMN IF EXISTS ends_next_day,
--   DROP COLUMN IF EXISTS next_day_hours,
--   DROP COLUMN IF EXISTS next_day_night_hrs;
-- ============================================================
