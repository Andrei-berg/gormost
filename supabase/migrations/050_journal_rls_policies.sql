-- 050_journal_rls_policies.sql
-- WHAT: Add permissive anon/authenticated RLS policies to the journal tables.
-- WHY:  RLS is ENABLED on journal_objects, journal_object_categories,
--       daily_plan_items and journal_shift_headers, but no policies exist for
--       them. The app's server client uses the ANON key, so with RLS on and
--       zero policies every read/write is denied. Symptom: adding a plan item
--       in /journal does "nothing" — creating a new journal_objects row fails
--       with "new row violates row-level security policy", createJournalObject
--       returns null, and addItem() silently aborts.
--       This mirrors the existing `anon_all_work_plans` policy pattern used
--       across the rest of the schema (FOR ALL TO anon, authenticated,
--       USING true / WITH CHECK true).

-- Make sure RLS is on (no-op if already enabled) so the policies take effect.
ALTER TABLE journal_objects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_object_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_plan_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_shift_headers      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_all_journal_objects           ON journal_objects;
DROP POLICY IF EXISTS anon_all_journal_object_categories ON journal_object_categories;
DROP POLICY IF EXISTS anon_all_daily_plan_items          ON daily_plan_items;
DROP POLICY IF EXISTS anon_all_journal_shift_headers     ON journal_shift_headers;

CREATE POLICY anon_all_journal_objects ON journal_objects
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY anon_all_journal_object_categories ON journal_object_categories
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY anon_all_daily_plan_items ON daily_plan_items
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY anon_all_journal_shift_headers ON journal_shift_headers
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ── ROLLBACK ────────────────────────────────────────────────────────────────
-- DROP POLICY IF EXISTS anon_all_journal_objects           ON journal_objects;
-- DROP POLICY IF EXISTS anon_all_journal_object_categories ON journal_object_categories;
-- DROP POLICY IF EXISTS anon_all_daily_plan_items          ON daily_plan_items;
-- DROP POLICY IF EXISTS anon_all_journal_shift_headers     ON journal_shift_headers;
