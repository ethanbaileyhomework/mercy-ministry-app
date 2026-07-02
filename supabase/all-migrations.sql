-- ============================================================
-- MERCY MINISTRY — FULL DATABASE SETUP
-- Paste this entire file into Supabase SQL Editor and click Run
-- ============================================================

-- 00001: Volunteers
CREATE TABLE volunteers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  emergency_contact_name text,
  emergency_contact_phone text,
  preferred_roles text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  onboarded_date date,
  wwcc_number text,
  wwcc_expiry date,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;

-- 00002: Sessions
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date date NOT NULL,
  start_time time,
  end_time time,
  coordinator_id uuid REFERENCES volunteers(id),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  total_guests_served integer DEFAULT 0,
  total_meals_served integer DEFAULT 0,
  total_grocery_packs integer DEFAULT 0,
  session_notes text,
  weather_conditions text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- 00003: Volunteer Attendance
CREATE TABLE volunteer_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id),
  volunteer_id uuid NOT NULL REFERENCES volunteers(id),
  role_on_day text NOT NULL,
  sign_in_time timestamptz NOT NULL,
  sign_out_time timestamptz,
  hours_calculated numeric(4,2),
  notes text,
  UNIQUE(session_id, volunteer_id)
);
ALTER TABLE volunteer_attendance ENABLE ROW LEVEL SECURITY;

-- 00004: Guest Records
CREATE TABLE guest_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id),
  registration_number text,
  first_name text,
  family_size integer DEFAULT 1,
  adults integer DEFAULT 1,
  children integer DEFAULT 0,
  meals_received integer DEFAULT 1,
  grocery_pack_received boolean DEFAULT false,
  dietary_notes text,
  is_new_guest boolean DEFAULT false,
  referral_source text,
  registered_at timestamptz DEFAULT now()
);
ALTER TABLE guest_records ENABLE ROW LEVEL SECURITY;

-- 00005: Food Safety Logs
CREATE TABLE food_safety_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id),
  food_item text NOT NULL,
  food_category text CHECK (food_category IN ('hot_meal', 'cold_item', 'dairy', 'produce', 'packaged')),
  temp_celsius numeric(4,1),
  check_time timestamptz NOT NULL,
  logged_by_id uuid REFERENCES volunteers(id),
  pass_fail text CHECK (pass_fail IN ('PASS', 'FAIL', 'ADVISORY')),
  corrective_action text,
  probe_id text,
  notes text
);
ALTER TABLE food_safety_logs ENABLE ROW LEVEL SECURITY;

-- 00006: Inventory Items
CREATE TABLE inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name text NOT NULL,
  category text CHECK (category IN ('dry_goods', 'produce', 'dairy', 'frozen', 'hygiene', 'other')),
  unit text CHECK (unit IN ('kg', 'g', 'L', 'mL', 'each', 'bag', 'box', 'can')),
  current_quantity numeric(10,2) DEFAULT 0,
  minimum_threshold numeric(10,2),
  storage_location text,
  is_active boolean DEFAULT true,
  notes text,
  last_updated timestamptz DEFAULT now()
);
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- 00007: Inventory Transactions
CREATE TABLE inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES inventory_items(id),
  session_id uuid REFERENCES sessions(id),
  transaction_type text NOT NULL CHECK (transaction_type IN ('donation_in', 'distribution_out', 'waste', 'adjustment')),
  quantity numeric(10,2) NOT NULL,
  unit text,
  donor_name text,
  expiry_date date,
  recorded_by_id uuid REFERENCES volunteers(id),
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- 00008: Announcements
CREATE TABLE announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  display_on_kiosk boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_by_id uuid REFERENCES volunteers(id),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 00009: Row Level Security Policies
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_app_role()
RETURNS text AS $$
  SELECT coalesce(
    auth.jwt() -> 'app_metadata' ->> 'app_role',
    'anon'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- VOLUNTEERS
CREATE POLICY "kiosk_read_volunteers" ON volunteers
  FOR SELECT USING (
    is_active = true AND get_app_role() IN ('kiosk', 'coordinator', 'leader', 'read_only')
  );
CREATE POLICY "kiosk_insert_volunteers" ON volunteers
  FOR INSERT WITH CHECK (
    get_app_role() IN ('kiosk', 'coordinator', 'leader')
  );
CREATE POLICY "staff_update_volunteers" ON volunteers
  FOR UPDATE USING (
    get_app_role() IN ('coordinator', 'leader')
  );
CREATE POLICY "leader_read_all_volunteers" ON volunteers
  FOR SELECT USING (
    get_app_role() = 'leader'
  );

-- SESSIONS
CREATE POLICY "kiosk_read_sessions" ON sessions
  FOR SELECT USING (
    status IN ('active', 'draft') AND get_app_role() IN ('kiosk', 'coordinator', 'leader', 'read_only')
  );
CREATE POLICY "staff_read_all_sessions" ON sessions
  FOR SELECT USING (
    get_app_role() IN ('coordinator', 'leader', 'read_only')
  );
CREATE POLICY "staff_insert_sessions" ON sessions
  FOR INSERT WITH CHECK (
    get_app_role() IN ('coordinator', 'leader')
  );
CREATE POLICY "staff_update_sessions" ON sessions
  FOR UPDATE USING (
    get_app_role() IN ('coordinator', 'leader')
  );

-- VOLUNTEER_ATTENDANCE
CREATE POLICY "kiosk_insert_attendance" ON volunteer_attendance
  FOR INSERT WITH CHECK (
    get_app_role() IN ('kiosk', 'coordinator', 'leader')
  );
CREATE POLICY "kiosk_update_attendance" ON volunteer_attendance
  FOR UPDATE USING (
    get_app_role() IN ('kiosk', 'coordinator', 'leader')
  );
CREATE POLICY "kiosk_read_attendance" ON volunteer_attendance
  FOR SELECT USING (
    get_app_role() IN ('kiosk', 'coordinator', 'leader', 'read_only')
  );

-- GUEST_RECORDS
CREATE POLICY "staff_all_guest_records" ON guest_records
  FOR ALL USING (
    get_app_role() IN ('coordinator', 'leader')
  );
CREATE POLICY "readonly_read_guest_records" ON guest_records
  FOR SELECT USING (
    get_app_role() = 'read_only'
  );

-- FOOD_SAFETY_LOGS (immutable — no UPDATE/DELETE)
CREATE POLICY "staff_insert_food_safety" ON food_safety_logs
  FOR INSERT WITH CHECK (
    get_app_role() IN ('coordinator', 'leader')
  );
CREATE POLICY "staff_read_food_safety" ON food_safety_logs
  FOR SELECT USING (
    get_app_role() IN ('coordinator', 'leader', 'read_only')
  );

-- INVENTORY_ITEMS
CREATE POLICY "staff_all_inventory_items" ON inventory_items
  FOR ALL USING (
    get_app_role() IN ('coordinator', 'leader')
  );
CREATE POLICY "readonly_read_inventory" ON inventory_items
  FOR SELECT USING (
    get_app_role() = 'read_only'
  );

-- INVENTORY_TRANSACTIONS
CREATE POLICY "staff_all_inventory_transactions" ON inventory_transactions
  FOR ALL USING (
    get_app_role() IN ('coordinator', 'leader')
  );
CREATE POLICY "readonly_read_transactions" ON inventory_transactions
  FOR SELECT USING (
    get_app_role() = 'read_only'
  );

-- ANNOUNCEMENTS
CREATE POLICY "kiosk_read_announcements" ON announcements
  FOR SELECT USING (
    is_active = true
    AND display_on_kiosk = true
    AND (expires_at IS NULL OR expires_at > now())
    AND get_app_role() IN ('kiosk', 'coordinator', 'leader', 'read_only')
  );
CREATE POLICY "staff_read_all_announcements" ON announcements
  FOR SELECT USING (
    get_app_role() IN ('coordinator', 'leader')
  );
CREATE POLICY "staff_manage_announcements" ON announcements
  FOR ALL USING (
    get_app_role() IN ('coordinator', 'leader')
  );

-- ============================================================
-- 00010: Functions & Triggers
-- ============================================================

-- Auto-calculate hours on sign-out
CREATE OR REPLACE FUNCTION calculate_attendance_hours()
RETURNS trigger AS $$
BEGIN
  IF NEW.sign_out_time IS NOT NULL AND NEW.sign_in_time IS NOT NULL THEN
    NEW.hours_calculated := ROUND(
      EXTRACT(EPOCH FROM (NEW.sign_out_time - NEW.sign_in_time)) / 3600.0,
      2
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_hours
  BEFORE UPDATE ON volunteer_attendance
  FOR EACH ROW
  WHEN (NEW.sign_out_time IS DISTINCT FROM OLD.sign_out_time)
  EXECUTE FUNCTION calculate_attendance_hours();

-- Auto pass/fail on food safety log insert
CREATE OR REPLACE FUNCTION auto_food_safety_result()
RETURNS trigger AS $$
BEGIN
  IF NEW.temp_celsius IS NOT NULL AND NEW.food_category IS NOT NULL THEN
    IF NEW.food_category = 'packaged' THEN
      NEW.pass_fail := 'ADVISORY';
    ELSIF NEW.food_category = 'hot_meal' THEN
      NEW.pass_fail := CASE WHEN NEW.temp_celsius >= 60 THEN 'PASS' ELSE 'FAIL' END;
    ELSE
      NEW.pass_fail := CASE WHEN NEW.temp_celsius <= 5 THEN 'PASS' ELSE 'FAIL' END;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_pass_fail
  BEFORE INSERT ON food_safety_logs
  FOR EACH ROW
  EXECUTE FUNCTION auto_food_safety_result();

-- Update session totals when guest records change
CREATE OR REPLACE FUNCTION update_session_totals()
RETURNS trigger AS $$
DECLARE
  target_session_id uuid;
BEGIN
  target_session_id := COALESCE(NEW.session_id, OLD.session_id);
  UPDATE sessions SET
    total_guests_served = (
      SELECT COUNT(*) FROM guest_records WHERE session_id = target_session_id
    ),
    total_meals_served = (
      SELECT COALESCE(SUM(meals_received), 0) FROM guest_records WHERE session_id = target_session_id
    ),
    total_grocery_packs = (
      SELECT COUNT(*) FROM guest_records WHERE session_id = target_session_id AND grocery_pack_received = true
    )
  WHERE id = target_session_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_session_totals
  AFTER INSERT OR UPDATE OR DELETE ON guest_records
  FOR EACH ROW
  EXECUTE FUNCTION update_session_totals();

-- Update inventory quantity on transaction
CREATE OR REPLACE FUNCTION update_inventory_quantity()
RETURNS trigger AS $$
BEGIN
  IF NEW.transaction_type IN ('donation_in', 'adjustment') THEN
    UPDATE inventory_items
    SET current_quantity = current_quantity + NEW.quantity,
        last_updated = now()
    WHERE id = NEW.item_id;
  ELSIF NEW.transaction_type IN ('distribution_out', 'waste') THEN
    UPDATE inventory_items
    SET current_quantity = GREATEST(current_quantity - NEW.quantity, 0),
        last_updated = now()
    WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_inventory
  AFTER INSERT ON inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_quantity();

-- Generate next guest registration number
CREATE OR REPLACE FUNCTION next_guest_registration_number(p_session_id uuid)
RETURNS text AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(
    CASE WHEN registration_number ~ '^G\d+$'
    THEN CAST(SUBSTRING(registration_number FROM 2) AS integer)
    ELSE 0 END
  ), 0) + 1
  INTO next_num
  FROM guest_records
  WHERE session_id = p_session_id;
  RETURN 'G' || LPAD(next_num::text, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 00011: Indexes
-- ============================================================
CREATE INDEX idx_volunteers_active ON volunteers(is_active) WHERE is_active = true;
CREATE INDEX idx_volunteers_name ON volunteers(first_name, last_name) WHERE is_active = true;
CREATE INDEX idx_volunteers_wwcc_expiry ON volunteers(wwcc_expiry) WHERE wwcc_expiry IS NOT NULL;
CREATE INDEX idx_sessions_date ON sessions(session_date);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_date_status ON sessions(session_date, status);
CREATE INDEX idx_attendance_session ON volunteer_attendance(session_id);
CREATE INDEX idx_attendance_volunteer ON volunteer_attendance(volunteer_id);
CREATE INDEX idx_attendance_signout_null ON volunteer_attendance(session_id) WHERE sign_out_time IS NULL;
CREATE INDEX idx_guests_session ON guest_records(session_id);
CREATE INDEX idx_food_safety_session ON food_safety_logs(session_id);
CREATE INDEX idx_food_safety_result ON food_safety_logs(pass_fail);
CREATE INDEX idx_inventory_active ON inventory_items(is_active) WHERE is_active = true;
CREATE INDEX idx_inventory_tx_item ON inventory_transactions(item_id);
CREATE INDEX idx_inventory_tx_session ON inventory_transactions(session_id);
CREATE INDEX idx_announcements_active_kiosk ON announcements(is_active, display_on_kiosk)
  WHERE is_active = true AND display_on_kiosk = true;

-- ============================================================
-- SEED DATA
-- ============================================================
INSERT INTO volunteers (id, first_name, last_name, email, phone, emergency_contact_name, emergency_contact_phone, preferred_roles, is_active, onboarded_date, wwcc_number, wwcc_expiry) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Ethan', 'Mitchell', 'ethan@mercyministry.org', '0412 345 678', 'Sarah Mitchell', '0498 765 432', ARRAY['Kitchen', 'Hosting'], true, '2024-01-15', 'WWC1234567', '2026-12-31'),
  ('a1000000-0000-0000-0000-000000000002', 'Sarah', 'Chen', 'sarah.c@email.com', '0423 456 789', 'David Chen', '0487 654 321', ARRAY['Serving', 'Registration'], true, '2024-03-01', NULL, NULL),
  ('a1000000-0000-0000-0000-000000000003', 'James', 'Nguyen', NULL, '0434 567 890', 'Linh Nguyen', '0476 543 210', ARRAY['Kitchen', 'Cleanup'], true, '2024-06-10', 'WWC7654321', '2025-06-15'),
  ('a1000000-0000-0000-0000-000000000004', 'Maria', 'Garcia', 'maria.g@email.com', '0445 678 901', 'Carlos Garcia', '0465 432 109', ARRAY['Groceries', 'Serving'], true, '2024-09-20', NULL, NULL),
  ('a1000000-0000-0000-0000-000000000005', 'Tom', 'Wilson', NULL, '0456 789 012', 'Jenny Wilson', '0454 321 098', ARRAY['Cleanup', 'Hosting'], true, '2025-01-08', NULL, NULL);

INSERT INTO sessions (id, session_date, start_time, end_time, coordinator_id, status, total_guests_served, total_meals_served, total_grocery_packs, session_notes, weather_conditions) VALUES
  ('b1000000-0000-0000-0000-000000000001', '2026-03-17', '17:00', '20:30', 'a1000000-0000-0000-0000-000000000001', 'completed', 42, 58, 15, 'Great turnout tonight. Ran low on bread but managed well.', 'Clear, 18°C'),
  ('b1000000-0000-0000-0000-000000000002', '2026-03-24', '17:00', '20:15', 'a1000000-0000-0000-0000-000000000001', 'completed', 38, 52, 12, 'Slightly quieter week. New volunteers performed well.', 'Overcast, 15°C');

INSERT INTO volunteer_attendance (session_id, volunteer_id, role_on_day, sign_in_time, sign_out_time, hours_calculated) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Kitchen', '2026-03-17 06:50:00+00', '2026-03-17 09:30:00+00', 2.67),
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'Serving', '2026-03-17 07:00:00+00', '2026-03-17 09:15:00+00', 2.25),
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'Kitchen', '2026-03-17 06:45:00+00', '2026-03-17 09:30:00+00', 2.75),
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000004', 'Groceries', '2026-03-17 07:15:00+00', '2026-03-17 09:00:00+00', 1.75);

INSERT INTO volunteer_attendance (session_id, volunteer_id, role_on_day, sign_in_time, sign_out_time, hours_calculated) VALUES
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Hosting', '2026-03-24 06:55:00+00', '2026-03-24 09:15:00+00', 2.33),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'Registration', '2026-03-24 07:00:00+00', '2026-03-24 09:00:00+00', 2.00),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000005', 'Cleanup', '2026-03-24 07:30:00+00', '2026-03-24 09:15:00+00', 1.75);

INSERT INTO guest_records (session_id, registration_number, first_name, family_size, adults, children, meals_received, grocery_pack_received, dietary_notes, is_new_guest, referral_source) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'G001', NULL, 3, 2, 1, 3, true, NULL, false, NULL),
  ('b1000000-0000-0000-0000-000000000001', 'G002', 'Ahmed', 1, 1, 0, 1, false, 'Halal only', true, 'Community centre'),
  ('b1000000-0000-0000-0000-000000000001', 'G003', NULL, 4, 2, 2, 4, true, 'Nut allergy', false, NULL),
  ('b1000000-0000-0000-0000-000000000001', 'G004', 'Lisa', 2, 1, 1, 2, true, NULL, true, 'Word of mouth');

INSERT INTO food_safety_logs (session_id, food_item, food_category, temp_celsius, check_time, logged_by_id, pass_fail, probe_id) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Beef Stew', 'hot_meal', 72.5, '2026-03-17 07:00:00+00', 'a1000000-0000-0000-0000-000000000001', 'PASS', 'PROBE-01'),
  ('b1000000-0000-0000-0000-000000000001', 'Coleslaw', 'cold_item', 3.2, '2026-03-17 07:05:00+00', 'a1000000-0000-0000-0000-000000000001', 'PASS', 'PROBE-01'),
  ('b1000000-0000-0000-0000-000000000001', 'Beef Stew', 'hot_meal', 65.0, '2026-03-17 09:00:00+00', 'a1000000-0000-0000-0000-000000000003', 'PASS', 'PROBE-02'),
  ('b1000000-0000-0000-0000-000000000001', 'Milk', 'dairy', 4.1, '2026-03-17 07:10:00+00', 'a1000000-0000-0000-0000-000000000001', 'PASS', 'PROBE-01');

INSERT INTO inventory_items (id, item_name, category, unit, current_quantity, minimum_threshold, storage_location, is_active) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Canned Soup', 'dry_goods', 'can', 48, 20, 'Pantry shelf A', true),
  ('c1000000-0000-0000-0000-000000000002', 'Rice (5kg bags)', 'dry_goods', 'bag', 12, 5, 'Pantry shelf B', true),
  ('c1000000-0000-0000-0000-000000000003', 'Fresh Bread', 'produce', 'each', 8, 15, 'Kitchen counter', true),
  ('c1000000-0000-0000-0000-000000000004', 'Milk (2L)', 'dairy', 'each', 6, 4, 'Fridge', true),
  ('c1000000-0000-0000-0000-000000000005', 'Pasta', 'dry_goods', 'bag', 30, 10, 'Pantry shelf A', true),
  ('c1000000-0000-0000-0000-000000000006', 'Toilet Paper', 'hygiene', 'each', 24, 12, 'Storage room', true);

INSERT INTO inventory_transactions (item_id, session_id, transaction_type, quantity, unit, donor_name, recorded_by_id, notes) VALUES
  ('c1000000-0000-0000-0000-000000000001', NULL, 'donation_in', 24, 'can', 'Foodbank Victoria', 'a1000000-0000-0000-0000-000000000001', 'Monthly Foodbank delivery'),
  ('c1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001', 'distribution_out', 12, 'each', NULL, 'a1000000-0000-0000-0000-000000000004', 'Distributed with grocery packs');

INSERT INTO announcements (title, body, display_on_kiosk, is_active, created_by_id) VALUES
  ('Welcome to Mercy Ministry!', 'Thank you for volunteering your time tonight. Your service makes a real difference in our community.', true, true, 'a1000000-0000-0000-0000-000000000001'),
  ('Easter Service - Special Session', 'We will be running a special extended session on Easter Tuesday. Please let Ethan know if you can help with the extra preparations.', true, true, 'a1000000-0000-0000-0000-000000000001');
