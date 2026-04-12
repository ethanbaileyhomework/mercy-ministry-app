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
