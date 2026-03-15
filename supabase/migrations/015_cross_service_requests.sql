-- 015_cross_service_requests.sql
-- Digitizes cross-service coordination (previously done by phone/in-person).
-- A service chief can attach a request to a plan item asking another service
-- to send workers for a specific task (e.g., ventilation asks electrical to connect 220V).
-- The receiving service chief confirms or declines; they then create their own plan item.

CREATE TABLE cross_service_requests (
  id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  from_plan_item_id  UUID        REFERENCES work_plan_items(id) ON DELETE CASCADE,
  from_plan_id       UUID        REFERENCES work_plans(id)      ON DELETE CASCADE,
  from_service_id    TEXT        NOT NULL,
  to_service_id      TEXT        NOT NULL,
  description        TEXT        NOT NULL,
  needed_count       INT         NOT NULL DEFAULT 1,
  time_start         TEXT,
  time_end           TEXT,
  status             TEXT        NOT NULL DEFAULT 'PENDING'
                                 CHECK (status IN ('PENDING', 'CONFIRMED', 'DECLINED')),
  response_note      TEXT,
  responded_by       TEXT        REFERENCES users(user_id),
  responded_at       TIMESTAMPTZ,
  created_by         TEXT        REFERENCES users(user_id),
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cross_service_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cross_service_requests_all" ON cross_service_requests
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_csr_to_service   ON cross_service_requests(to_service_id);
CREATE INDEX idx_csr_from_service ON cross_service_requests(from_service_id);
CREATE INDEX idx_csr_from_plan    ON cross_service_requests(from_plan_id);
CREATE INDEX idx_csr_status       ON cross_service_requests(status);

-- ROLLBACK:
-- DROP TABLE cross_service_requests;
