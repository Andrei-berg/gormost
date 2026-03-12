-- 010_fix_rls_policies.sql
-- Fix RLS (Row Level Security) for all tables used by the app.
-- The app uses Supabase anon key (not Supabase Auth), so we need permissive
-- policies for the anon role, or simply disable RLS for demo tables.
--
-- This makes the demo system fully functional without Supabase Auth integration.
-- For production, replace with proper auth-based policies.

-- ── employee_status ──────────────────────────────────────────────────────────
ALTER TABLE employee_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_employee_status" ON employee_status;
CREATE POLICY "anon_all_employee_status" ON employee_status
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ── users ────────────────────────────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_users" ON users;
CREATE POLICY "anon_all_users" ON users
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ── work_plans ───────────────────────────────────────────────────────────────
ALTER TABLE work_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_work_plans" ON work_plans;
CREATE POLICY "anon_all_work_plans" ON work_plans
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ── work_plan_items ──────────────────────────────────────────────────────────
ALTER TABLE work_plan_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_work_plan_items" ON work_plan_items;
CREATE POLICY "anon_all_work_plan_items" ON work_plan_items
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ── action_log ───────────────────────────────────────────────────────────────
-- action_log might already exist as changelog or similar
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'action_log') THEN
    ALTER TABLE action_log ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "anon_all_action_log" ON action_log;
    CREATE POLICY "anon_all_action_log" ON action_log
      FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ROLLBACK:
-- ALTER TABLE employee_status DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE work_plans DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE work_plan_items DISABLE ROW LEVEL SECURITY;
