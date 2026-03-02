-- Creates employee_status append-only event log for HR module
-- Every status change is a new INSERT — rows are NEVER updated or deleted
-- The most recent row for a user on or before today is their "current" status
-- Presence-by-default: employees with NO row for today are treated as Na_rabote in TypeScript

CREATE TABLE IF NOT EXISTS employee_status (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  status      TEXT NOT NULL CHECK (status IN ('Na_rabote', 'Otgul', 'Bolnichniy', 'Otpusk', 'Uvolen')),
  date_from   DATE NOT NULL,
  date_to     DATE,           -- NULL = open-ended (no known end date); set equal to date_from for single-day entries
  reason      TEXT,
  created_by  TEXT NOT NULL REFERENCES users(user_id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient "latest status per user" and period range queries (Phase 05)
CREATE INDEX IF NOT EXISTS idx_employee_status_user_date
  ON employee_status (user_id, date_from DESC);

-- Rollback:
-- DROP TABLE IF EXISTS employee_status;
-- DROP INDEX IF EXISTS idx_employee_status_user_date;
