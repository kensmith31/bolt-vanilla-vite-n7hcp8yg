-- Fix duplicate entries in item change history by improving the trigger function
CREATE OR REPLACE FUNCTION public.record_item_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only record changes for direct user edits, not calculated fields
  -- This prevents duplicate entries when one change (like quantity) affects multiple calculated fields
  IF (
    TG_OP = 'UPDATE' AND (
      -- Only record changes for these primary editable fields
      (OLD.description IS DISTINCT FROM NEW.description) OR
      (OLD.category_id IS DISTINCT FROM NEW.category_id) OR
      (OLD.room IS DISTINCT FROM NEW.room) OR
      (OLD.quantity IS DISTINCT FROM NEW.quantity) OR
      (OLD.claimed_rcv IS DISTINCT FROM NEW.claimed_rcv) OR
      (OLD.age IS DISTINCT FROM NEW.age) OR
      (OLD.condition IS DISTINCT FROM NEW.condition) OR
      (OLD.adjusted_rcv IS DISTINCT FROM NEW.adjusted_rcv) OR
      (OLD.tax_rate IS DISTINCT FROM NEW.tax_rate) OR
      (OLD.depreciation_percent IS DISTINCT FROM NEW.depreciation_percent) OR
      (OLD.replacement_cost_applies IS DISTINCT FROM NEW.replacement_cost_applies) OR
      (OLD.replaced IS DISTINCT FROM NEW.replaced) OR
      (OLD.replacement_spent IS DISTINCT FROM NEW.replacement_spent) OR
      (OLD.no_loss_or_damage IS DISTINCT FROM NEW.no_loss_or_damage) OR
      (OLD.not_involved_in_claim IS DISTINCT FROM NEW.not_involved_in_claim) OR
      (OLD.duplicate_item IS DISTINCT FROM NEW.duplicate_item) OR
      (OLD.cleaning_allowance IS DISTINCT FROM NEW.cleaning_allowance) OR
      (OLD.cleaning_allowance_amount IS DISTINCT FROM NEW.cleaning_allowance_amount) OR
      (OLD.status IS DISTINCT FROM NEW.status)
    )
  ) THEN
    -- Only insert history records for the fields that were directly changed
    -- Not for calculated fields that changed as a result
    INSERT INTO public.item_change_history (item_id, field_name, old_value, new_value, changed_at, user_id, user_name)
    SELECT
      NEW.id,
      column_name,
      old_value,
      new_value,
      NOW(),
      current_setting('request.jwt.claims', true)::json->>'sub',
      (SELECT CONCAT(first_name, ' ', last_name) FROM public.users WHERE id = current_setting('request.jwt.claims', true)::json->>'sub')
    FROM (
      SELECT 
        'description' as column_name, 
        OLD.description::text as old_value, 
        NEW.description::text as new_value
      WHERE OLD.description IS DISTINCT FROM NEW.description
      UNION ALL
      SELECT 
        'category_id', 
        OLD.category_id::text, 
        NEW.category_id::text
      WHERE OLD.category_id IS DISTINCT FROM NEW.category_id
      UNION ALL
      SELECT 
        'room', 
        OLD.room::text, 
        NEW.room::text
      WHERE OLD.room IS DISTINCT FROM NEW.room
      UNION ALL
      SELECT 
        'quantity', 
        OLD.quantity::text, 
        NEW.quantity::text
      WHERE OLD.quantity IS DISTINCT FROM NEW.quantity
      UNION ALL
      SELECT 
        'claimed_rcv', 
        OLD.claimed_rcv::text, 
        NEW.claimed_rcv::text
      WHERE OLD.claimed_rcv IS DISTINCT FROM NEW.claimed_rcv
      UNION ALL
      SELECT 
        'age', 
        OLD.age::text, 
        NEW.age::text
      WHERE OLD.age IS DISTINCT FROM NEW.age
      UNION ALL
      SELECT 
        'condition', 
        OLD.condition::text, 
        NEW.condition::text
      WHERE OLD.condition IS DISTINCT FROM NEW.condition
      UNION ALL
      SELECT 
        'adjusted_rcv', 
        OLD.adjusted_rcv::text, 
        NEW.adjusted_rcv::text
      WHERE OLD.adjusted_rcv IS DISTINCT FROM NEW.adjusted_rcv
      UNION ALL
      SELECT 
        'tax_rate', 
        OLD.tax_rate::text, 
        NEW.tax_rate::text
      WHERE OLD.tax_rate IS DISTINCT FROM NEW.tax_rate
      UNION ALL
      SELECT 
        'depreciation_percent', 
        OLD.depreciation_percent::text, 
        NEW.depreciation_percent::text
      WHERE OLD.depreciation_percent IS DISTINCT FROM NEW.depreciation_percent
      UNION ALL
      SELECT 
        'replacement_cost_applies', 
        OLD.replacement_cost_applies::text, 
        NEW.replacement_cost_applies::text
      WHERE OLD.replacement_cost_applies IS DISTINCT FROM NEW.replacement_cost_applies
      UNION ALL
      SELECT 
        'replaced', 
        OLD.replaced::text, 
        NEW.replaced::text
      WHERE OLD.replaced IS DISTINCT FROM NEW.replaced
      UNION ALL
      SELECT 
        'replacement_spent', 
        OLD.replacement_spent::text, 
        NEW.replacement_spent::text
      WHERE OLD.replacement_spent IS DISTINCT FROM NEW.replacement_spent
      UNION ALL
      SELECT 
        'no_loss_or_damage', 
        OLD.no_loss_or_damage::text, 
        NEW.no_loss_or_damage::text
      WHERE OLD.no_loss_or_damage IS DISTINCT FROM NEW.no_loss_or_damage
      UNION ALL
      SELECT 
        'not_involved_in_claim', 
        OLD.not_involved_in_claim::text, 
        NEW.not_involved_in_claim::text
      WHERE OLD.not_involved_in_claim IS DISTINCT FROM NEW.not_involved_in_claim
      UNION ALL
      SELECT 
        'duplicate_item', 
        OLD.duplicate_item::text, 
        NEW.duplicate_item::text
      WHERE OLD.duplicate_item IS DISTINCT FROM NEW.duplicate_item
      UNION ALL
      SELECT 
        'cleaning_allowance', 
        OLD.cleaning_allowance::text, 
        NEW.cleaning_allowance::text
      WHERE OLD.cleaning_allowance IS DISTINCT FROM NEW.cleaning_allowance
      UNION ALL
      SELECT 
        'cleaning_allowance_amount', 
        OLD.cleaning_allowance_amount::text, 
        NEW.cleaning_allowance_amount::text
      WHERE OLD.cleaning_allowance_amount IS DISTINCT FROM NEW.cleaning_allowance_amount
      UNION ALL
      SELECT 
        'status', 
        OLD.status::text, 
        NEW.status::text
      WHERE OLD.status IS DISTINCT FROM NEW.status
    ) changes
    WHERE old_value IS DISTINCT FROM new_value;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
