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
