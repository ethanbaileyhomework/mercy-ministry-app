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
