-- Update the item change history trigger to ignore updated_at changes
CREATE OR REPLACE FUNCTION public.record_item_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    TG_OP = 'UPDATE' AND (
      OLD.description IS DISTINCT FROM NEW.description OR
      OLD.category_id IS DISTINCT FROM NEW.category_id OR
      OLD.room IS DISTINCT FROM NEW.room OR
      OLD.quantity IS DISTINCT FROM NEW.quantity OR
      OLD.claimed_rcv IS DISTINCT FROM NEW.claimed_rcv OR
      OLD.age IS DISTINCT FROM NEW.age OR
      OLD.condition IS DISTINCT FROM NEW.condition OR
      OLD.adjusted_rcv IS DISTINCT FROM NEW.adjusted_rcv OR
      OLD.tax_rate IS DISTINCT FROM NEW.tax_rate OR
      OLD.depreciation_percent IS DISTINCT FROM NEW.depreciation_percent OR
      OLD.replacement_cost_applies IS DISTINCT FROM NEW.replacement_cost_applies OR
      OLD.replaced IS DISTINCT FROM NEW.replaced OR
      OLD.replacement_spent IS DISTINCT FROM NEW.replacement_spent OR
      OLD.no_loss_or_damage IS DISTINCT FROM NEW.no_loss_or_damage OR
      OLD.not_involved_in_claim IS DISTINCT FROM NEW.not_involved_in_claim OR
      OLD.duplicate_item IS DISTINCT FROM NEW.duplicate_item OR
      OLD.cleaning_allowance IS DISTINCT FROM NEW.cleaning_allowance OR
      OLD.cleaning_allowance_amount IS DISTINCT FROM NEW.cleaning_allowance_amount OR
      OLD.status IS DISTINCT FROM NEW.status
    )
  ) THEN
    INSERT INTO public.item_change_history (item_id, field_name, old_value, new_value, changed_at, user_id, user_name)
    SELECT
      NEW.id,
      key,
      old_value,
      new_value,
      NOW(),
      current_setting('request.jwt.claims', true)::json->>'sub',
      (SELECT CONCAT(first_name, ' ', last_name) FROM public.users WHERE id = current_setting('request.jwt.claims', true)::json->>'sub')
    FROM (
      SELECT key, OLD->>key AS old_value, NEW->>key AS new_value
      FROM (SELECT jsonb_object_keys(to_jsonb(OLD)) AS key) keys
    ) changes
    WHERE old_value IS DISTINCT FROM new_value
    AND key != 'updated_at';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
