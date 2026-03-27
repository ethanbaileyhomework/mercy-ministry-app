-- Seed data for development and testing
-- Run after migrations to populate with sample data

-- ============================================================
-- Volunteers
-- ============================================================
INSERT INTO volunteers (id, first_name, last_name, email, phone, emergency_contact_name, emergency_contact_phone, preferred_roles, is_active, onboarded_date, wwcc_number, wwcc_expiry) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Ethan', 'Mitchell', 'ethan@mercyministry.org', '0412 345 678', 'Sarah Mitchell', '0498 765 432', ARRAY['Kitchen', 'Hosting'], true, '2024-01-15', 'WWC1234567', '2026-12-31'),
  ('a1000000-0000-0000-0000-000000000002', 'Sarah', 'Chen', 'sarah.c@email.com', '0423 456 789', 'David Chen', '0487 654 321', ARRAY['Serving', 'Registration'], true, '2024-03-01', NULL, NULL),
  ('a1000000-0000-0000-0000-000000000003', 'James', 'Nguyen', NULL, '0434 567 890', 'Linh Nguyen', '0476 543 210', ARRAY['Kitchen', 'Cleanup'], true, '2024-06-10', 'WWC7654321', '2025-06-15'),
  ('a1000000-0000-0000-0000-000000000004', 'Maria', 'Garcia', 'maria.g@email.com', '0445 678 901', 'Carlos Garcia', '0465 432 109', ARRAY['Groceries', 'Serving'], true, '2024-09-20', NULL, NULL),
  ('a1000000-0000-0000-0000-000000000005', 'Tom', 'Wilson', NULL, '0456 789 012', 'Jenny Wilson', '0454 321 098', ARRAY['Cleanup', 'Hosting'], true, '2025-01-08', NULL, NULL);

-- ============================================================
-- Sessions (2 past sessions)
-- ============================================================
INSERT INTO sessions (id, session_date, start_time, end_time, coordinator_id, status, total_guests_served, total_meals_served, total_grocery_packs, session_notes, weather_conditions) VALUES
  ('b1000000-0000-0000-0000-000000000001', '2026-03-17', '17:00', '20:30', 'a1000000-0000-0000-0000-000000000001', 'completed', 42, 58, 15, 'Great turnout tonight. Ran low on bread but managed well.', 'Clear, 18°C'),
  ('b1000000-0000-0000-0000-000000000002', '2026-03-24', '17:00', '20:15', 'a1000000-0000-0000-0000-000000000001', 'completed', 38, 52, 12, 'Slightly quieter week. New volunteers performed well.', 'Overcast, 15°C');

-- ============================================================
-- Volunteer Attendance
-- ============================================================
-- Session 1
INSERT INTO volunteer_attendance (session_id, volunteer_id, role_on_day, sign_in_time, sign_out_time, hours_calculated) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Kitchen', '2026-03-17 06:50:00+00', '2026-03-17 09:30:00+00', 2.67),
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'Serving', '2026-03-17 07:00:00+00', '2026-03-17 09:15:00+00', 2.25),
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'Kitchen', '2026-03-17 06:45:00+00', '2026-03-17 09:30:00+00', 2.75),
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000004', 'Groceries', '2026-03-17 07:15:00+00', '2026-03-17 09:00:00+00', 1.75);

-- Session 2
INSERT INTO volunteer_attendance (session_id, volunteer_id, role_on_day, sign_in_time, sign_out_time, hours_calculated) VALUES
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Hosting', '2026-03-24 06:55:00+00', '2026-03-24 09:15:00+00', 2.33),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'Registration', '2026-03-24 07:00:00+00', '2026-03-24 09:00:00+00', 2.00),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000005', 'Cleanup', '2026-03-24 07:30:00+00', '2026-03-24 09:15:00+00', 1.75);

-- ============================================================
-- Guest Records (sample from Session 1)
-- ============================================================
INSERT INTO guest_records (session_id, registration_number, first_name, family_size, adults, children, meals_received, grocery_pack_received, dietary_notes, is_new_guest, referral_source) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'G001', NULL, 3, 2, 1, 3, true, NULL, false, NULL),
  ('b1000000-0000-0000-0000-000000000001', 'G002', 'Ahmed', 1, 1, 0, 1, false, 'Halal only', true, 'Community centre'),
  ('b1000000-0000-0000-0000-000000000001', 'G003', NULL, 4, 2, 2, 4, true, 'Nut allergy', false, NULL),
  ('b1000000-0000-0000-0000-000000000001', 'G004', 'Lisa', 2, 1, 1, 2, true, NULL, true, 'Word of mouth');

-- ============================================================
-- Food Safety Logs (Session 1)
-- ============================================================
INSERT INTO food_safety_logs (session_id, food_item, food_category, temp_celsius, check_time, logged_by_id, pass_fail, probe_id) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Beef Stew', 'hot_meal', 72.5, '2026-03-17 07:00:00+00', 'a1000000-0000-0000-0000-000000000001', 'PASS', 'PROBE-01'),
  ('b1000000-0000-0000-0000-000000000001', 'Coleslaw', 'cold_item', 3.2, '2026-03-17 07:05:00+00', 'a1000000-0000-0000-0000-000000000001', 'PASS', 'PROBE-01'),
  ('b1000000-0000-0000-0000-000000000001', 'Beef Stew', 'hot_meal', 65.0, '2026-03-17 09:00:00+00', 'a1000000-0000-0000-0000-000000000003', 'PASS', 'PROBE-02'),
  ('b1000000-0000-0000-0000-000000000001', 'Milk', 'dairy', 4.1, '2026-03-17 07:10:00+00', 'a1000000-0000-0000-0000-000000000001', 'PASS', 'PROBE-01');

-- ============================================================
-- Inventory Items
-- ============================================================
INSERT INTO inventory_items (id, item_name, category, unit, current_quantity, minimum_threshold, storage_location, is_active) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Canned Soup', 'dry_goods', 'can', 48, 20, 'Pantry shelf A', true),
  ('c1000000-0000-0000-0000-000000000002', 'Rice (5kg bags)', 'dry_goods', 'bag', 12, 5, 'Pantry shelf B', true),
  ('c1000000-0000-0000-0000-000000000003', 'Fresh Bread', 'produce', 'each', 8, 15, 'Kitchen counter', true),
  ('c1000000-0000-0000-0000-000000000004', 'Milk (2L)', 'dairy', 'each', 6, 4, 'Fridge', true),
  ('c1000000-0000-0000-0000-000000000005', 'Pasta', 'dry_goods', 'bag', 30, 10, 'Pantry shelf A', true),
  ('c1000000-0000-0000-0000-000000000006', 'Toilet Paper', 'hygiene', 'each', 24, 12, 'Storage room', true);

-- ============================================================
-- Inventory Transactions (sample)
-- ============================================================
INSERT INTO inventory_transactions (item_id, session_id, transaction_type, quantity, unit, donor_name, recorded_by_id, notes) VALUES
  ('c1000000-0000-0000-0000-000000000001', NULL, 'donation_in', 24, 'can', 'Foodbank Victoria', 'a1000000-0000-0000-0000-000000000001', 'Monthly Foodbank delivery'),
  ('c1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001', 'distribution_out', 12, 'each', NULL, 'a1000000-0000-0000-0000-000000000004', 'Distributed with grocery packs');

-- ============================================================
-- Announcements
-- ============================================================
INSERT INTO announcements (title, body, display_on_kiosk, is_active, created_by_id) VALUES
  ('Welcome to Mercy Ministry!', 'Thank you for volunteering your time tonight. Your service makes a real difference in our community.', true, true, 'a1000000-0000-0000-0000-000000000001'),
  ('Easter Service - Special Session', 'We will be running a special extended session on Easter Tuesday. Please let Ethan know if you can help with the extra preparations.', true, true, 'a1000000-0000-0000-0000-000000000001');
