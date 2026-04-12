CREATE TABLE inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES inventory_items(id),
  session_id uuid REFERENCES sessions(id),
  transaction_type text NOT NULL CHECK (transaction_type IN ('donation_in', 'distribution_out', 'waste', 'adjustment')),
  quantity numeric(10,2) NOT NULL,
  unit text,
  donor_name text,
  expiry_date date,
  recorded_by_id uuid REFERENCES volunteers(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
