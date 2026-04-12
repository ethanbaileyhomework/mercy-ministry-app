-- ============================================================
-- Trigger: Auto-calculate hours on sign-out
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_attendance_hours()
RETURNS trigger AS $$
BEGIN
  IF NEW.sign_out_time IS NOT NULL AND NEW.sign_in_time IS NOT NULL THEN
    NEW.hours_calculated := ROUND(
      EXTRACT(EPOCH FROM (NEW.sign_out_time - NEW.sign_in_time)) / 3600.0,
      2
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_hours
  BEFORE UPDATE ON volunteer_attendance
  FOR EACH ROW
  WHEN (NEW.sign_out_time IS DISTINCT FROM OLD.sign_out_time)
  EXECUTE FUNCTION calculate_attendance_hours();

-- ============================================================
-- Trigger: Auto pass/fail on food safety log insert
-- ============================================================
CREATE OR REPLACE FUNCTION auto_food_safety_result()
RETURNS trigger AS $$
BEGIN
  IF NEW.temp_celsius IS NOT NULL AND NEW.food_category IS NOT NULL THEN
    IF NEW.food_category = 'packaged' THEN
      NEW.pass_fail := 'ADVISORY';
    ELSIF NEW.food_category = 'hot_meal' THEN
      NEW.pass_fail := CASE WHEN NEW.temp_celsius >= 60 THEN 'PASS' ELSE 'FAIL' END;
    ELSE
      -- cold_item, dairy, produce
      NEW.pass_fail := CASE WHEN NEW.temp_celsius <= 5 THEN 'PASS' ELSE 'FAIL' END;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_pass_fail
  BEFORE INSERT ON food_safety_logs
  FOR EACH ROW
  EXECUTE FUNCTION auto_food_safety_result();

-- ============================================================
-- Trigger: Update session totals when guest records change
-- ============================================================
CREATE OR REPLACE FUNCTION update_session_totals()
RETURNS trigger AS $$
DECLARE
  target_session_id uuid;
BEGIN
  target_session_id := COALESCE(NEW.session_id, OLD.session_id);

  UPDATE sessions SET
    total_guests_served = (
      SELECT COUNT(*) FROM guest_records WHERE session_id = target_session_id
    ),
    total_meals_served = (
      SELECT COALESCE(SUM(meals_received), 0) FROM guest_records WHERE session_id = target_session_id
    ),
    total_grocery_packs = (
      SELECT COUNT(*) FROM guest_records WHERE session_id = target_session_id AND grocery_pack_received = true
    )
  WHERE id = target_session_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_session_totals
  AFTER INSERT OR UPDATE OR DELETE ON guest_records
  FOR EACH ROW
  EXECUTE FUNCTION update_session_totals();

-- ============================================================
-- Trigger: Update inventory quantity on transaction
-- ============================================================
CREATE OR REPLACE FUNCTION update_inventory_quantity()
RETURNS trigger AS $$
BEGIN
  IF NEW.transaction_type IN ('donation_in', 'adjustment') THEN
    UPDATE inventory_items
    SET current_quantity = current_quantity + NEW.quantity,
        last_updated = now()
    WHERE id = NEW.item_id;
  ELSIF NEW.transaction_type IN ('distribution_out', 'waste') THEN
    UPDATE inventory_items
    SET current_quantity = GREATEST(current_quantity - NEW.quantity, 0),
        last_updated = now()
    WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_inventory
  AFTER INSERT ON inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_quantity();

-- ============================================================
-- Function: Generate next guest registration number for a session
-- ============================================================
CREATE OR REPLACE FUNCTION next_guest_registration_number(p_session_id uuid)
RETURNS text AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(
    CASE WHEN registration_number ~ '^G\d+$'
    THEN CAST(SUBSTRING(registration_number FROM 2) AS integer)
    ELSE 0 END
  ), 0) + 1
  INTO next_num
  FROM guest_records
  WHERE session_id = p_session_id;

  RETURN 'G' || LPAD(next_num::text, 3, '0');
END;
$$ LANGUAGE plpgsql;
