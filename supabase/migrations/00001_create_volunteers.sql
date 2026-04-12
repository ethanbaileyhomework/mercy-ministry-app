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
