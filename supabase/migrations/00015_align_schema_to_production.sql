-- ============================================================
-- Align local migration schema to production Supabase database.
-- The production DB was modified via the Supabase dashboard;
-- this migration documents those changes so a fresh setup
-- produces the correct schema.
-- ============================================================

-- Sessions: rename columns to match app code
ALTER TABLE sessions DROP COLUMN IF EXISTS start_time;
ALTER TABLE sessions DROP COLUMN IF EXISTS end_time;
ALTER TABLE sessions DROP COLUMN IF EXISTS coordinator_id;
ALTER TABLE sessions DROP COLUMN IF EXISTS total_guests_served;
ALTER TABLE sessions DROP COLUMN IF EXISTS total_meals_served;
ALTER TABLE sessions DROP COLUMN IF EXISTS total_grocery_packs;
ALTER TABLE sessions DROP COLUMN IF EXISTS session_notes;
ALTER TABLE sessions DROP COLUMN IF EXISTS weather_conditions;

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS started_at timestamptz;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ended_at timestamptz;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS coordinator_notes text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS people_served integer DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS meals_served integer DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS what_was_served text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS grocery_packs_given integer DEFAULT 0;

-- Volunteer attendance: rename columns to match app code
ALTER TABLE volunteer_attendance DROP COLUMN IF EXISTS role_on_day;
ALTER TABLE volunteer_attendance DROP COLUMN IF EXISTS hours_calculated;
ALTER TABLE volunteer_attendance DROP COLUMN IF EXISTS notes;

ALTER TABLE volunteer_attendance ADD COLUMN IF NOT EXISTS area_on_day text NOT NULL DEFAULT 'hall';
ALTER TABLE volunteer_attendance ADD COLUMN IF NOT EXISTS is_leader_on_day boolean DEFAULT false;
ALTER TABLE volunteer_attendance ADD COLUMN IF NOT EXISTS hours_served numeric(4,2);
