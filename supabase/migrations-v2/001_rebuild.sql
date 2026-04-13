-- ============================================================
-- MERCY MINISTRY v2 — SIMPLIFIED SCHEMA
-- Drop everything and rebuild clean
-- ============================================================

DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

-- ============================================================
-- VOLUNTEERS
-- Each volunteer gets a 4-digit PIN for kiosk sign-in
-- ============================================================
CREATE TABLE volunteers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  pin char(4) NOT NULL UNIQUE,
  phone text,
  email text,
  emergency_contact_name text,
  emergency_contact_phone text,
  area text NOT NULL DEFAULT 'hall' CHECK (area IN ('kitchen', 'hall')),
  is_leader boolean DEFAULT false,
  wwcc_number text,
  wwcc_expiry date,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- SESSIONS
-- One per Tuesday evening, 2 hours
-- ============================================================
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date date NOT NULL UNIQUE,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  started_at timestamptz,
  ended_at timestamptz,
  coordinator_notes text,
  -- Tap counters
  people_served integer DEFAULT 0,
  meals_served integer DEFAULT 0,
  what_was_served text,
  grocery_packs_given integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- VOLUNTEER ATTENDANCE
-- Sign-in/out records per session
-- ============================================================
CREATE TABLE volunteer_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  volunteer_id uuid NOT NULL REFERENCES volunteers(id),
  area_on_day text NOT NULL CHECK (area_on_day IN ('kitchen', 'hall')),
  is_leader_on_day boolean DEFAULT false,
  sign_in_time timestamptz NOT NULL DEFAULT now(),
  sign_out_time timestamptz,
  hours_served numeric(4,2),
  UNIQUE(session_id, volunteer_id)
);

-- ============================================================
-- FOOD SAFETY LOGS
-- Victorian Food Act 1984 compliance
-- Hot food >= 60°C = PASS, Cold food <= 5°C = PASS
-- ============================================================
CREATE TABLE food_safety_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  food_item text NOT NULL,
  food_type text NOT NULL CHECK (food_type IN ('hot', 'cold', 'reheat', 'fridge')),
  temp_celsius numeric(4,1) NOT NULL,
  result text NOT NULL CHECK (result IN ('PASS', 'FAIL')),
  corrective_action text,
  logged_by_id uuid REFERENCES volunteers(id),
  logged_at timestamptz NOT NULL DEFAULT now(),
  probe_id text
);

-- ============================================================
-- INCIDENTS
-- Anything that happens worth recording
-- ============================================================
CREATE TABLE incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  severity text DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high')),
  reported_by_id uuid REFERENCES volunteers(id),
  reported_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_safety_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- Helper: get user role from JWT
CREATE OR REPLACE FUNCTION public.get_app_role()
RETURNS text AS $$
  SELECT coalesce(
    auth.jwt() -> 'app_metadata' ->> 'app_role',
    'anon'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Kiosk (anon) can read active volunteers for PIN lookup
CREATE POLICY "anon_read_volunteers" ON volunteers
  FOR SELECT USING (is_active = true);

-- Kiosk can insert attendance (sign in)
CREATE POLICY "anon_insert_attendance" ON volunteer_attendance
  FOR INSERT WITH CHECK (true);

-- Kiosk can update attendance (sign out)
CREATE POLICY "anon_update_attendance" ON volunteer_attendance
  FOR UPDATE USING (true);

-- Kiosk can read attendance (check who's signed in)
CREATE POLICY "anon_read_attendance" ON volunteer_attendance
  FOR SELECT USING (true);

-- Kiosk can read sessions (show session status)
CREATE POLICY "anon_read_sessions" ON sessions
  FOR SELECT USING (true);

-- Kiosk can create sessions (leader sign-in starts a session)
CREATE POLICY "anon_insert_sessions" ON sessions
  FOR INSERT WITH CHECK (true);

-- Kiosk can update sessions (tap counters, end session, notes)
CREATE POLICY "anon_update_sessions" ON sessions
  FOR UPDATE USING (true);

-- Kiosk can insert food safety logs (temp checks from service sheet)
CREATE POLICY "anon_insert_food_safety" ON food_safety_logs
  FOR INSERT WITH CHECK (true);

-- Kiosk can insert incidents (incident reports from service sheet)
CREATE POLICY "anon_insert_incidents" ON incidents
  FOR INSERT WITH CHECK (true);

-- Kiosk can read incidents (show tonight's incidents on service sheet)
CREATE POLICY "anon_read_incidents" ON incidents
  FOR SELECT USING (true);

-- Coordinator: full access to everything
CREATE POLICY "coordinator_all_volunteers" ON volunteers
  FOR ALL USING (get_app_role() IN ('coordinator', 'leader'));

CREATE POLICY "coordinator_all_sessions" ON sessions
  FOR ALL USING (get_app_role() IN ('coordinator', 'leader'));

CREATE POLICY "coordinator_all_attendance" ON volunteer_attendance
  FOR ALL USING (get_app_role() IN ('coordinator', 'leader'));

CREATE POLICY "coordinator_all_food_safety" ON food_safety_logs
  FOR ALL USING (get_app_role() IN ('coordinator', 'leader'));

CREATE POLICY "anon_read_food_safety" ON food_safety_logs
  FOR SELECT USING (true);

CREATE POLICY "coordinator_all_incidents" ON incidents
  FOR ALL USING (get_app_role() IN ('coordinator', 'leader'));

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-calculate hours on sign-out
CREATE OR REPLACE FUNCTION calculate_hours()
RETURNS trigger AS $$
BEGIN
  IF NEW.sign_out_time IS NOT NULL AND NEW.sign_in_time IS NOT NULL THEN
    NEW.hours_served := ROUND(
      EXTRACT(EPOCH FROM (NEW.sign_out_time - NEW.sign_in_time)) / 3600.0, 2
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calc_hours
  BEFORE UPDATE ON volunteer_attendance
  FOR EACH ROW
  WHEN (NEW.sign_out_time IS DISTINCT FROM OLD.sign_out_time)
  EXECUTE FUNCTION calculate_hours();

-- Auto pass/fail on food safety insert
CREATE OR REPLACE FUNCTION auto_food_result()
RETURNS trigger AS $$
BEGIN
  IF NEW.food_type = 'hot' THEN
    NEW.result := CASE WHEN NEW.temp_celsius >= 60 THEN 'PASS' ELSE 'FAIL' END;
  ELSIF NEW.food_type = 'reheat' THEN
    NEW.result := CASE WHEN NEW.temp_celsius >= 75 THEN 'PASS' ELSE 'FAIL' END;
  ELSE
    -- cold and fridge both need <= 5°C
    NEW.result := CASE WHEN NEW.temp_celsius <= 5 THEN 'PASS' ELSE 'FAIL' END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_result
  BEFORE INSERT ON food_safety_logs
  FOR EACH ROW
  EXECUTE FUNCTION auto_food_result();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_volunteers_pin ON volunteers(pin) WHERE is_active = true;
CREATE INDEX idx_volunteers_active ON volunteers(is_active) WHERE is_active = true;
CREATE INDEX idx_sessions_date ON sessions(session_date);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_attendance_session ON volunteer_attendance(session_id);
CREATE INDEX idx_attendance_volunteer ON volunteer_attendance(volunteer_id);
CREATE INDEX idx_attendance_signed_in ON volunteer_attendance(session_id) WHERE sign_out_time IS NULL;
CREATE INDEX idx_food_safety_session ON food_safety_logs(session_id);
CREATE INDEX idx_incidents_session ON incidents(session_id);

-- ============================================================
-- SEED DATA
-- ============================================================
INSERT INTO volunteers (id, first_name, last_name, pin, phone, email, emergency_contact_name, emergency_contact_phone, area, is_leader, wwcc_number, wwcc_expiry) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Ethan', 'Mitchell', '1234', '0412 345 678', 'ethan@mercyministry.org', 'Sarah Mitchell', '0498 765 432', 'kitchen', true, 'WWC1234567', '2026-12-31'),
  ('a1000000-0000-0000-0000-000000000002', 'Sarah', 'Chen', '5678', '0423 456 789', 'sarah.c@email.com', 'David Chen', '0487 654 321', 'hall', false, NULL, NULL),
  ('a1000000-0000-0000-0000-000000000003', 'James', 'Nguyen', '9012', '0434 567 890', NULL, 'Linh Nguyen', '0476 543 210', 'kitchen', false, 'WWC7654321', '2025-06-15'),
  ('a1000000-0000-0000-0000-000000000004', 'Maria', 'Garcia', '3456', '0445 678 901', 'maria.g@email.com', 'Carlos Garcia', '0465 432 109', 'hall', true, NULL, NULL),
  ('a1000000-0000-0000-0000-000000000005', 'Tom', 'Wilson', '7890', '0456 789 012', NULL, 'Jenny Wilson', '0454 321 098', 'hall', false, NULL, NULL);

INSERT INTO sessions (id, session_date, status, started_at, ended_at, people_served, meals_served, what_was_served, grocery_packs_given, coordinator_notes) VALUES
  ('b1000000-0000-0000-0000-000000000001', '2026-03-17', 'completed', '2026-03-17 07:00:00+11', '2026-03-17 09:00:00+11', 42, 58, 'Beef stew with rice, bread rolls, coleslaw', 15, 'Great turnout. Ran low on bread.'),
  ('b1000000-0000-0000-0000-000000000002', '2026-03-24', 'completed', '2026-03-24 07:00:00+11', '2026-03-24 09:00:00+11', 38, 52, 'Chicken curry with rice, salad', 12, 'Quieter week. New volunteers did well.');

INSERT INTO volunteer_attendance (session_id, volunteer_id, area_on_day, is_leader_on_day, sign_in_time, sign_out_time, hours_served) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'kitchen', true, '2026-03-17 06:50:00+11', '2026-03-17 09:00:00+11', 2.17),
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'hall', false, '2026-03-17 07:00:00+11', '2026-03-17 09:00:00+11', 2.00),
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'kitchen', false, '2026-03-17 06:45:00+11', '2026-03-17 09:00:00+11', 2.25),
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000004', 'hall', true, '2026-03-17 07:15:00+11', '2026-03-17 09:00:00+11', 1.75),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'kitchen', true, '2026-03-24 06:55:00+11', '2026-03-24 09:00:00+11', 2.08),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'hall', false, '2026-03-24 07:00:00+11', '2026-03-24 09:00:00+11', 2.00),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000005', 'hall', false, '2026-03-24 07:30:00+11', '2026-03-24 09:00:00+11', 1.50);

INSERT INTO food_safety_logs (session_id, food_item, food_type, temp_celsius, result, logged_by_id, logged_at, probe_id) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Beef Stew', 'hot', 72.5, 'PASS', 'a1000000-0000-0000-0000-000000000001', '2026-03-17 07:00:00+11', 'PROBE-01'),
  ('b1000000-0000-0000-0000-000000000001', 'Coleslaw', 'cold', 3.2, 'PASS', 'a1000000-0000-0000-0000-000000000001', '2026-03-17 07:05:00+11', 'PROBE-01'),
  ('b1000000-0000-0000-0000-000000000001', 'Beef Stew', 'hot', 65.0, 'PASS', 'a1000000-0000-0000-0000-000000000003', '2026-03-17 08:30:00+11', 'PROBE-02'),
  ('b1000000-0000-0000-0000-000000000001', 'Milk', 'cold', 4.1, 'PASS', 'a1000000-0000-0000-0000-000000000001', '2026-03-17 07:10:00+11', 'PROBE-01'),
  ('b1000000-0000-0000-0000-000000000001', 'Fridge Unit A', 'fridge', 3.8, 'PASS', 'a1000000-0000-0000-0000-000000000001', '2026-03-17 07:00:00+11', NULL),
  ('b1000000-0000-0000-0000-000000000001', 'Lasagna (reheat)', 'reheat', 78.0, 'PASS', 'a1000000-0000-0000-0000-000000000003', '2026-03-17 06:55:00+11', 'PROBE-02');

-- ============================================================
-- PERMISSIONS (required for Supabase anon/authenticated access)
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
