-- Migration 032: Driver manual shift planning
-- Purpose: Stores manual shift overrides for drivers.
-- Auto-computed schedule (from group template) is shown as default;
-- records here override specific days (e.g. substitution, sick leave, schedule change).

CREATE TABLE IF NOT EXISTS driver_manual_shifts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shift_date  date        NOT NULL,

  -- Shift type override:
  --   I   = Смена I  (день, 07:45–19:45)
  --   II  = Смена II (ночь, 19:45–07:45)
  --   OFF = выходной/отгул (явная отмена автоматической смены)
  shift_type  text        NOT NULL CHECK (shift_type IN ('I', 'II', 'OFF')),

  notes       text,
  created_by  uuid        REFERENCES users(id),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),

  UNIQUE (user_id, shift_date)
);

CREATE INDEX IF NOT EXISTS idx_dms_user_date ON driver_manual_shifts (user_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_dms_date      ON driver_manual_shifts (shift_date);

ALTER TABLE driver_manual_shifts ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read (needed for roster/OnDutyMonitor)
CREATE POLICY "dms_select" ON driver_manual_shifts
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only ADMIN / HR / ZAMPORAB / DISPATCHER can write
CREATE POLICY "dms_write" ON driver_manual_shifts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id::text = auth.uid()::text
        AND u.role_level IN ('ADMIN','HR','ZAMPORAB','DISPATCHER')
    )
  );

-- =============================================================================
-- Rollback:
-- DROP TABLE IF EXISTS driver_manual_shifts;
-- =============================================================================
