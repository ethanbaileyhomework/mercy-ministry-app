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
