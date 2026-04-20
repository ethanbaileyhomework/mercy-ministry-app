-- Add 'frozen' to the food_type check constraint on food_safety_logs
-- Required for the chest freezer temperature checks added in the TempsTab redesign

ALTER TABLE food_safety_logs DROP CONSTRAINT food_safety_logs_food_type_check;
ALTER TABLE food_safety_logs ADD CONSTRAINT food_safety_logs_food_type_check
  CHECK (food_type = ANY (ARRAY['hot'::text, 'cold'::text, 'reheat'::text, 'fridge'::text, 'frozen'::text]));
