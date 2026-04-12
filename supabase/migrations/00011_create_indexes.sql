-- Performance indexes for common query patterns

-- Volunteer lookups
CREATE INDEX idx_volunteers_active ON volunteers(is_active) WHERE is_active = true;
CREATE INDEX idx_volunteers_name ON volunteers(first_name, last_name) WHERE is_active = true;
CREATE INDEX idx_volunteers_wwcc_expiry ON volunteers(wwcc_expiry) WHERE wwcc_expiry IS NOT NULL;

-- Session lookups
CREATE INDEX idx_sessions_date ON sessions(session_date);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_date_status ON sessions(session_date, status);

-- Attendance lookups
CREATE INDEX idx_attendance_session ON volunteer_attendance(session_id);
CREATE INDEX idx_attendance_volunteer ON volunteer_attendance(volunteer_id);
CREATE INDEX idx_attendance_signout_null ON volunteer_attendance(session_id) WHERE sign_out_time IS NULL;

-- Guest record lookups
CREATE INDEX idx_guests_session ON guest_records(session_id);

-- Food safety lookups
CREATE INDEX idx_food_safety_session ON food_safety_logs(session_id);
CREATE INDEX idx_food_safety_result ON food_safety_logs(pass_fail);

-- Inventory lookups
CREATE INDEX idx_inventory_active ON inventory_items(is_active) WHERE is_active = true;
CREATE INDEX idx_inventory_tx_item ON inventory_transactions(item_id);
CREATE INDEX idx_inventory_tx_session ON inventory_transactions(session_id);

-- Announcement lookups
CREATE INDEX idx_announcements_active_kiosk ON announcements(is_active, display_on_kiosk)
  WHERE is_active = true AND display_on_kiosk = true;
