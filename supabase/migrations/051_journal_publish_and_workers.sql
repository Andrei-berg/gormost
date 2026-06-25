-- 051_journal_publish_and_workers.sql
-- WHAT: Two new columns on daily_plan_items:
--   * published      — boolean gate; when true the row is mirrored read-only
--                      into the dispatcher / zamporab / head "План дня" view.
--   * worker_names   — jsonb array of named crew members, format
--                      [{ "user_id": "...", "name": "...", "role": "WORKER" }],
--                      picked per service. Feeds the work-permit composition.
-- WHY: The journal is a stats/printing tool; the operator publishes a shift to
--      let other panels see the day plan (no work_plans funnel), and records the
--      brigade by name so наряд-допуск composition auto-fills by department.

ALTER TABLE daily_plan_items
  ADD COLUMN IF NOT EXISTS published    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS worker_names jsonb   NOT NULL DEFAULT '[]'::jsonb;

-- ── ROLLBACK ────────────────────────────────────────────────────────────────
-- ALTER TABLE daily_plan_items DROP COLUMN IF EXISTS published;
-- ALTER TABLE daily_plan_items DROP COLUMN IF EXISTS worker_names;
