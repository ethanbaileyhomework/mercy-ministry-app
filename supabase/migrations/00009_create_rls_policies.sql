-- ============================================================
-- Row Level Security Policies
-- ============================================================
-- Role is stored in auth.users.raw_app_meta_data.app_role
-- Kiosk uses the anon key with a service account that has app_role='kiosk'
-- Admin users have app_role = 'coordinator', 'leader', or 'read_only'

-- Helper function to get the current user's app_role
CREATE OR REPLACE FUNCTION public.get_app_role()
RETURNS text AS $$
  SELECT coalesce(
    auth.jwt() -> 'app_metadata' ->> 'app_role',
    'anon'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- VOLUNTEERS
-- ============================================================
-- Kiosk: can read active volunteers (for name search)
CREATE POLICY "kiosk_read_volunteers" ON volunteers
  FOR SELECT USING (
    is_active = true AND get_app_role() IN ('kiosk', 'coordinator', 'leader', 'read_only')
  );

-- Kiosk: can insert new volunteers (registration)
CREATE POLICY "kiosk_insert_volunteers" ON volunteers
  FOR INSERT WITH CHECK (
    get_app_role() IN ('kiosk', 'coordinator', 'leader')
  );

-- Coordinator/Leader: can update volunteers
CREATE POLICY "staff_update_volunteers" ON volunteers
  FOR UPDATE USING (
    get_app_role() IN ('coordinator', 'leader')
  );

-- Leader: can read inactive volunteers too
CREATE POLICY "leader_read_all_volunteers" ON volunteers
  FOR SELECT USING (
    get_app_role() = 'leader'
  );

-- ============================================================
-- SESSIONS
-- ============================================================
-- Kiosk: can read active/draft sessions (to show session status)
CREATE POLICY "kiosk_read_sessions" ON sessions
  FOR SELECT USING (
    status IN ('active', 'draft') AND get_app_role() IN ('kiosk', 'coordinator', 'leader', 'read_only')
  );

-- Staff: can read all sessions
CREATE POLICY "staff_read_all_sessions" ON sessions
  FOR SELECT USING (
    get_app_role() IN ('coordinator', 'leader', 'read_only')
  );

-- Coordinator/Leader: can create and update sessions
CREATE POLICY "staff_insert_sessions" ON sessions
  FOR INSERT WITH CHECK (
    get_app_role() IN ('coordinator', 'leader')
  );

CREATE POLICY "staff_update_sessions" ON sessions
  FOR UPDATE USING (
    get_app_role() IN ('coordinator', 'leader')
  );

-- ============================================================
-- VOLUNTEER_ATTENDANCE
-- ============================================================
-- Kiosk: can insert attendance (sign-in)
CREATE POLICY "kiosk_insert_attendance" ON volunteer_attendance
  FOR INSERT WITH CHECK (
    get_app_role() IN ('kiosk', 'coordinator', 'leader')
  );

-- Kiosk: can update own sign-out time
CREATE POLICY "kiosk_update_attendance" ON volunteer_attendance
  FOR UPDATE USING (
    get_app_role() IN ('kiosk', 'coordinator', 'leader')
  );

-- Kiosk: can read attendance for current session (to check who is signed in)
CREATE POLICY "kiosk_read_attendance" ON volunteer_attendance
  FOR SELECT USING (
    get_app_role() IN ('kiosk', 'coordinator', 'leader', 'read_only')
  );

-- ============================================================
-- GUEST_RECORDS
-- ============================================================
-- No kiosk access to guest records (admin-only registration)
CREATE POLICY "staff_all_guest_records" ON guest_records
  FOR ALL USING (
    get_app_role() IN ('coordinator', 'leader')
  );

CREATE POLICY "readonly_read_guest_records" ON guest_records
  FOR SELECT USING (
    get_app_role() = 'read_only'
  );

-- ============================================================
-- FOOD_SAFETY_LOGS
-- ============================================================
-- Insert only (immutable logs) for coordinator/leader
CREATE POLICY "staff_insert_food_safety" ON food_safety_logs
  FOR INSERT WITH CHECK (
    get_app_role() IN ('coordinator', 'leader')
  );

-- Read for all staff
CREATE POLICY "staff_read_food_safety" ON food_safety_logs
  FOR SELECT USING (
    get_app_role() IN ('coordinator', 'leader', 'read_only')
  );

-- No UPDATE or DELETE policies = immutable logs

-- ============================================================
-- INVENTORY_ITEMS
-- ============================================================
CREATE POLICY "staff_all_inventory_items" ON inventory_items
  FOR ALL USING (
    get_app_role() IN ('coordinator', 'leader')
  );

CREATE POLICY "readonly_read_inventory" ON inventory_items
  FOR SELECT USING (
    get_app_role() = 'read_only'
  );

-- ============================================================
-- INVENTORY_TRANSACTIONS
-- ============================================================
CREATE POLICY "staff_all_inventory_transactions" ON inventory_transactions
  FOR ALL USING (
    get_app_role() IN ('coordinator', 'leader')
  );

CREATE POLICY "readonly_read_transactions" ON inventory_transactions
  FOR SELECT USING (
    get_app_role() = 'read_only'
  );

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
-- Kiosk: can read active, non-expired, kiosk-enabled announcements
CREATE POLICY "kiosk_read_announcements" ON announcements
  FOR SELECT USING (
    is_active = true
    AND display_on_kiosk = true
    AND (expires_at IS NULL OR expires_at > now())
    AND get_app_role() IN ('kiosk', 'coordinator', 'leader', 'read_only')
  );

-- Staff: can read all announcements
CREATE POLICY "staff_read_all_announcements" ON announcements
  FOR SELECT USING (
    get_app_role() IN ('coordinator', 'leader')
  );

-- Staff: can create/update announcements
CREATE POLICY "staff_manage_announcements" ON announcements
  FOR ALL USING (
    get_app_role() IN ('coordinator', 'leader')
  );
