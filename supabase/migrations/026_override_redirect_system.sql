-- 026_override_redirect_system.sql
-- Override/Redirect mechanism for work plans.
-- Handles scenarios where an order from Мэрия / ДЖКХ / ГУ Гормост
-- requires immediate execution, possibly pulling an active brigade
-- from their current assignment.

-- ── 1. Update work_plans status CHECK constraint ─────────────────────
ALTER TABLE work_plans DROP CONSTRAINT IF EXISTS work_plans_status_check;

ALTER TABLE work_plans
  ADD CONSTRAINT work_plans_status_check
  CHECK (status IN (
    'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED',
    'PLANNED', 'BOSS_CONFIRMED', 'ASSIGNED', 'IN_PROGRESS', 'DONE',
    'FAST_TRACK',  -- bypasses approval chain for emergency/external orders
    'REDIRECTED',  -- brigade was pulled off this plan by a higher-priority task
    'SUSPENDED'    -- plan paused temporarily, will be resumed later
  ));

-- ── 2. New columns on work_plans ─────────────────────────────────────

-- Priority and source
ALTER TABLE work_plans
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'ROUTINE'
    CHECK (priority IN ('ROUTINE', 'URGENT', 'EMERGENCY', 'CRITICAL', 'OVERRIDE')),
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'INTERNAL'
    CHECK (source IN ('INTERNAL', 'MAIN_OFFICE', 'DJKH', 'MAYOR')),
  ADD COLUMN IF NOT EXISTS source_ref  TEXT,   -- official letter / order reference number
  ADD COLUMN IF NOT EXISTS source_org  TEXT,   -- name of issuing organisation
  ADD COLUMN IF NOT EXISTS fast_track  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS fast_track_reason TEXT;

-- Execution tracking
ALTER TABLE work_plans
  ADD COLUMN IF NOT EXISTS started_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS started_by      TEXT,          -- user_id
  ADD COLUMN IF NOT EXISTS paused_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pause_reason    TEXT,
  ADD COLUMN IF NOT EXISTS completed_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_by    TEXT,          -- user_id
  ADD COLUMN IF NOT EXISTS completion_note TEXT,          -- brief report
  ADD COLUMN IF NOT EXISTS suspended_until DATE,          -- resume date for SUSPENDED plans
  ADD COLUMN IF NOT EXISTS parent_redirect_id UUID;       -- FK set after work_redirects is created

-- ── 3. work_redirects — journal of every brigade redirect ────────────
CREATE TABLE IF NOT EXISTS work_redirects (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The plan from which the brigade was pulled
  from_plan_id      UUID NOT NULL REFERENCES work_plans(id) ON DELETE CASCADE,
  from_status       TEXT NOT NULL,          -- plan status at moment of redirect
  partial_work_done TEXT,                   -- what the brigade completed before redirect

  -- The new override plan they were sent to (may be NULL if created after)
  to_plan_id        UUID REFERENCES work_plans(id),

  -- Who ordered this and why
  ordered_by_source TEXT NOT NULL
    CHECK (ordered_by_source IN ('INTERNAL', 'MAIN_OFFICE', 'DJKH', 'MAYOR')),
  order_reference   TEXT,                   -- letter №, verbal order ref, etc.
  order_text        TEXT NOT NULL,          -- what needs to be done

  -- Who processed the redirect in the system
  redirected_by     TEXT NOT NULL,          -- user_id
  redirected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Scope of redirect
  affected_users    TEXT[] NOT NULL DEFAULT '{}',  -- user_ids of affected workers
  full_brigade      BOOLEAN NOT NULL DEFAULT TRUE,

  -- Fate of the original plan
  original_plan_fate TEXT NOT NULL
    CHECK (original_plan_fate IN (
      'REASSIGN',  -- assign a different brigade ASAP
      'POSTPONE',  -- resume later (suspended_until)
      'CANCEL'     -- cancel entirely
    )),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: all authenticated users can read; management roles can insert/update
ALTER TABLE work_redirects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "work_redirects_select" ON work_redirects
  FOR SELECT USING (true);

CREATE POLICY "work_redirects_insert" ON work_redirects
  FOR INSERT WITH CHECK (true);

CREATE POLICY "work_redirects_update" ON work_redirects
  FOR UPDATE USING (true);

-- ── 4. work_assignments — track if an assignee was redirected ────────
ALTER TABLE work_assignments
  ADD COLUMN IF NOT EXISTS assignment_status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (assignment_status IN ('ACTIVE', 'REDIRECTED', 'COMPLETED')),
  ADD COLUMN IF NOT EXISTS redirect_id UUID REFERENCES work_redirects(id);

-- ── ROLLBACK ──────────────────────────────────────────────────────────
-- ALTER TABLE work_assignments DROP COLUMN IF EXISTS redirect_id;
-- ALTER TABLE work_assignments DROP COLUMN IF EXISTS assignment_status;
-- DROP TABLE IF EXISTS work_redirects;
-- ALTER TABLE work_plans DROP COLUMN IF EXISTS parent_redirect_id;
-- ALTER TABLE work_plans DROP COLUMN IF EXISTS suspended_until;
-- ALTER TABLE work_plans DROP COLUMN IF EXISTS completion_note;
-- ALTER TABLE work_plans DROP COLUMN IF EXISTS completed_by;
-- ALTER TABLE work_plans DROP COLUMN IF EXISTS completed_at;
-- ALTER TABLE work_plans DROP COLUMN IF EXISTS pause_reason;
-- ALTER TABLE work_plans DROP COLUMN IF EXISTS paused_at;
-- ALTER TABLE work_plans DROP COLUMN IF EXISTS started_by;
-- ALTER TABLE work_plans DROP COLUMN IF EXISTS started_at;
-- ALTER TABLE work_plans DROP COLUMN IF EXISTS fast_track_reason;
-- ALTER TABLE work_plans DROP COLUMN IF EXISTS fast_track;
-- ALTER TABLE work_plans DROP COLUMN IF EXISTS source_org;
-- ALTER TABLE work_plans DROP COLUMN IF EXISTS source_ref;
-- ALTER TABLE work_plans DROP COLUMN IF EXISTS source;
-- ALTER TABLE work_plans DROP COLUMN IF EXISTS priority;
-- ALTER TABLE work_plans DROP CONSTRAINT IF EXISTS work_plans_status_check;
-- ALTER TABLE work_plans ADD CONSTRAINT work_plans_status_check CHECK (status IN (
--   'DRAFT','SUBMITTED','APPROVED','REJECTED',
--   'PLANNED','BOSS_CONFIRMED','ASSIGNED','IN_PROGRESS','DONE'));
