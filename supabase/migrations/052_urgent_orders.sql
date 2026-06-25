-- 052_urgent_orders.sql
-- WHAT: One unified model for «срочное поручение сверху», replacing the two old
--       mechanisms (Fast Track on work_plans.fast_track + the directives table).
--   * urgent_orders        — the order itself: source/authority, reference, priority,
--                            service, order type, object, shift, the task text, the
--                            affected source plan and its fate.
--   * urgent_order_workers — the crew assembled for the new task; each row records
--                            where the worker was pulled from (source plan) so the
--                            original brigade can be shown weakened.
-- WHY: «должен быть один механизм — залог минимизации ошибок». An urgent order is a
--      new, more important task that reforms brigades off their current work onto it;
--      the dispatcher assembles its crew right in the wizard and the foreman is alerted.

CREATE TABLE IF NOT EXISTS urgent_orders (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  created_by         text,
  -- ① что и от кого
  source             text NOT NULL,                       -- WorkSource (мэр/ДЖКХ/гл.офис/внутр.)
  source_ref         text,                                -- № поручения / письма
  source_org         text,                                -- организация-источник
  priority           text NOT NULL DEFAULT 'URGENT',      -- NORMAL | URGENT | IMMEDIATE
  service_id         text REFERENCES services(service_id),
  order_type         text,                                -- из service_order_types (name)
  location           text,
  work_text          text NOT NULL,                       -- суть работ
  plan_date          date NOT NULL,
  shift_type         text NOT NULL,                       -- DAY | NIGHT | AROUND
  -- ③ затронутый план + его судьба
  pull_mode          text NOT NULL DEFAULT 'NAMED',       -- BRIGADE | NAMED
  affected_plan_id   uuid REFERENCES work_plans(id) ON DELETE SET NULL,
  original_plan_fate text,                                -- REASSIGN | POSTPONE | CANCEL | WEAKENED
  suspended_until    date,
  partial_work_done  text,
  status             text NOT NULL DEFAULT 'ACTIVE'       -- ACTIVE | DONE | CANCELLED
);

CREATE TABLE IF NOT EXISTS urgent_order_workers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid NOT NULL REFERENCES urgent_orders(id) ON DELETE CASCADE,
  worker_id         text,                                 -- users.user_id (null if hand-typed)
  worker_name       text NOT NULL,
  role              text,                                 -- WorkAssignmentRole
  source_plan_id    uuid,                                 -- brigade pulled from (null = free)
  source_plan_name  text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_urgent_orders_plan_date ON urgent_orders(plan_date);
CREATE INDEX IF NOT EXISTS idx_urgent_order_workers_order ON urgent_order_workers(order_id);
CREATE INDEX IF NOT EXISTS idx_urgent_order_workers_source ON urgent_order_workers(source_plan_id);

-- RLS — анонимный серверный клиент (как у всех таблиц проекта): anon_all_* политики.
ALTER TABLE urgent_orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE urgent_order_workers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_all_urgent_orders        ON urgent_orders;
DROP POLICY IF EXISTS anon_all_urgent_order_workers ON urgent_order_workers;

CREATE POLICY anon_all_urgent_orders ON urgent_orders
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY anon_all_urgent_order_workers ON urgent_order_workers
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ── ROLLBACK ────────────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS urgent_order_workers;
-- DROP TABLE IF EXISTS urgent_orders;
