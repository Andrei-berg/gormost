-- 028_directives.sql
-- Директивные поручения от Главного инженера бригадам
-- Позволяет ГИ выдавать оперативные задания напрямую бригадам в работе
-- без прохождения стандартного цикла согласования планов

CREATE TABLE IF NOT EXISTS directives (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text        NOT NULL,
  description   text,
  priority      text        NOT NULL DEFAULT 'NORMAL'
                              CHECK (priority IN ('NORMAL', 'URGENT', 'IMMEDIATE')),
  plan_id       uuid        REFERENCES work_plans(id) ON DELETE SET NULL,
  created_by    text        NOT NULL,
  status        text        NOT NULL DEFAULT 'NEW'
                              CHECK (status IN ('NEW', 'ACCEPTED', 'IN_PROGRESS', 'DONE', 'CANCELLED')),
  suspend_plan  boolean     NOT NULL DEFAULT false,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE directives ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users (uses anon key in this app)
CREATE POLICY "directives_allow_all" ON directives
  FOR ALL USING (true) WITH CHECK (true);

-- ROLLBACK:
-- DROP TABLE IF EXISTS directives;
