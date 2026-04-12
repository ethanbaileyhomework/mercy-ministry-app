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
