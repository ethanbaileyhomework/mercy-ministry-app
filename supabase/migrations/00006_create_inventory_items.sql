CREATE TABLE inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name text NOT NULL,
  category text CHECK (category IN ('dry_goods', 'produce', 'dairy', 'frozen', 'hygiene', 'other')),
  unit text CHECK (unit IN ('kg', 'g', 'L', 'mL', 'each', 'bag', 'box', 'can')),
  current_quantity numeric(10,2) DEFAULT 0,
  minimum_threshold numeric(10,2),
  storage_location text,
  is_active boolean DEFAULT true,
  notes text,
  last_updated timestamptz DEFAULT now()
);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
