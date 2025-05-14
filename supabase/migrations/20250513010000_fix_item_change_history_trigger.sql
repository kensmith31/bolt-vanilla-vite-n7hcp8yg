-- Fix the item change history trigger to prevent duplicate entries
CREATE OR REPLACE FUNCTION public.record_item_changes()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields text[] := '{}'; -- Array to track which fields have changed
BEGIN
  -- Only proceed if this is an UPDATE operation
  IF (TG_OP = 'UPDATE') THEN
    -- Check each field individually and only record changes for directly modified fields
    -- This prevents recording calculated fields that change as a result of other changes
    
    -- Description field
    IF OLD.description IS DISTINCT FROM NEW.description THEN
      INSERT INTO public.item_change_history (item_id, field_name, old_value, new_value, changed_at, user_id, user_name)
      VALUES (
        NEW.id,
        'description',
        OLD.description::text,
        NEW.description::text,
        NOW(),
        current_setting('request.jwt.claims', true)::json->>'sub',
        (SELECT CONCAT(first_name, ' ', last_name) FROM public.users WHERE id = current_setting('request.jwt.claims', true)::json->>'sub')
      );
    END IF;
    
    -- Category ID field
    IF OLD.category_id IS DISTINCT FROM NEW.category_id THEN
      INSERT INTO public.item_change_history (item_id, field_name, old_value, new_value, changed_at, user_id, user_name)
      VALUES (
        NEW.id,
        'category_id',
        OLD.category_id::text,
        NEW.category_id::text,
        NOW(),
        current_setting('request.jwt.claims', true)::json->>'sub',
        (SELECT CONCAT(first_name, ' ', last_name) FROM public.users WHERE id = current_setting('request.jwt.claims', true)::json->>'sub')
      );
    END IF;
    
    -- Room field
    IF OLD.room IS DISTINCT FROM NEW.room THEN
      INSERT INTO public.item_change_history (item_id, field_name, old_value, new_value, changed_at, user_id, user_name)
      VALUES (
        NEW.id,
        'room',
        OLD.room::text,
        NEW.room::text,
        NOW(),
        current_setting('request.jwt.claims', true)::json->>'sub',
        (SELECT CONCAT(first_name, ' ', last_name) FROM public.users WHERE id = current_setting('request.jwt.claims', true)::json->>'sub')
      );
    END IF;
    
    -- Quantity field
    IF OLD.quantity IS DISTINCT FROM NEW.quantity THEN
      INSERT INTO public.item_change_history (item_id, field_name, old_value, new_value, changed_at, user_id, user_name)
      VALUES (
        NEW.id,
        'quantity',
        OLD.quantity::text,
        NEW.quantity::text,
        NOW(),
        current_setting('request.jwt.claims', true)::json->>'sub',
        (SELECT CONCAT(first_name, ' ', last_name) FROM public.users WHERE id = current_setting('request.jwt.claims', true)::json->>'sub')
      );
    END IF;
    
    -- Claimed RCV field
    IF OLD.claimed_rcv IS DISTINCT FROM NEW.claimed_rcv THEN
      INSERT INTO public.item_change_history (item_id, field_name, old_value, new_value, changed_at, user_id, user_name)
      VALUES (
        NEW.id,
        'claimed_rcv',
        OLD.claimed_rcv::text,
        NEW.claimed_rcv::text,
        NOW(),
        current_setting('request.jwt.claims', true)::json->>'sub',
        (SELECT CONCAT(first_name, ' ', last_name) FROM public.users WHERE id = current_setting('request.jwt.claims', true)::json->>'sub')
      );
    END IF;
    
    -- Age field
    IF OLD.age IS DISTINCT FROM NEW.age THEN
      INSERT INTO public.item_change_history (item_id, field_name, old_value, new_value, changed_at, user_id, user_name)
      VALUES (
        NEW.id,
        'age',
        OLD.age::text,
        NEW.age::text,
        NOW(),
        current_setting('request.jwt.claims', true)::json->>'sub',
        (SELECT CONCAT(first_name, ' ', last_name) FROM public.users WHERE id = current_setting('request.jwt.claims', true)::json->>'sub')
      );
    END IF;
    
    -- Condition field
    IF OLD.condition IS DISTINCT FROM NEW.condition THEN
      INSERT INTO public.item_change_history (item_id, field_name, old_value, new_value, changed_at, user_id, user_name)
      VALUES (
        NEW.id,
        'condition',
        OLD.condition::text,
        NEW.condition::text,
        NOW(),
        current_setting('request.jwt.claims', true)::json->>'sub',
        (SELECT CONCAT(first_name, ' ', last_name) FROM public.users WHERE id = current_setting('request.jwt.claims', true)::json->>'sub')
      );
    END IF;
    
    -- Adjusted RCV field
    IF OLD.adjusted_rcv IS DISTINCT FROM NEW.adjusted_rcv THEN
      INSERT INTO public.item_change_history (item_id, field_name, old_value, new_value, changed_at, user_id, user_name)
      VALUES (
        NEW.id,
        'adjusted_rcv',
        OLD.adjusted_rcv::text,
        NEW.adjusted_rcv::text,
        NOW(),
        current_setting('request.jwt.claims', true)::json->>'sub',
        (SELECT CONCAT(first_name, ' ', last_name) FROM public.users WHERE id = current_setting('request.jwt.claims', true)::json->>'sub')
      );
    END IF;
    
    -- Tax Rate field
    IF OLD.tax_rate IS DISTINCT FROM NEW.tax_rate THEN
      INSERT INTO public.item_change_history (item_id, field_name, old_value, new_value, changed_at, user_id, user_name)
      VALUES (
        NEW.id,
        'tax_rate',
        OLD.tax_rate::text,
        NEW.tax_rate::text,
        NOW(),
        current_setting('request.jwt.claims', true)::json->>'sub',
        (SELECT CONCAT(first_name, ' ', last_name) FROM public.users WHERE id = current_setting('request.jwt.claims', true)::json->>'sub')
      );
    END IF;
    
    -- Depreciation Percent field
    IF OLD.depreciation_percent IS DISTINCT FROM NEW.depreciation_percent THEN
      INSERT INTO public.item_change_history (item_id, field_name, old_value, new_value, changed_at, user_id, user_name)
      VALUES (
        NEW.id,
        'depreciation_percent',
        OLD.depreciation_percent::text,
        NEW.depreciation_percent::text,
        NOW(),
        current_setting('request.jwt.claims', true)::json->>'sub',
        (SELECT CONCAT(first_name, ' ', last_name) FROM public.users WHERE id = current_setting('request.jwt.claims', true)::json->>'sub')
      );
    END IF;
    
    -- Replacement Cost Applies field
    IF OLD.replacement_cost_applies IS DISTINCT FROM NEW.replacement_cost_applies THEN
      INSERT INTO public.item_change_history (item_id, field_name, old_value, new_value, changed_at, user_id, user_name)
      VALUES (
        NEW.id,
        'replacement_cost_applies',
        OLD.replacement_cost_applies::text,
        NEW.replacement_cost_applies::text,
        NOW(),
        current_setting('request.jwt.claims', true)::json->>'sub',
        (SELECT CONCAT(first_name, ' ', last_name) FROM public.users WHERE id = current_setting('request.jwt.claims', true)::json->>'sub')
      );
    END IF;
    
    -- Replaced field
    IF OLD.replaced IS DISTINCT FROM NEW.replaced THEN
      INSERT INTO public.item_change_history (item_id, field_name, old_value, new_value, changed_at, user_id, user_name)
      VALUES (
        NEW.id,
        'replaced',
        OLD.replaced::text,
        NEW.replaced::text,
        NOW(),
        current_setting('request.jwt.claims', true)::json->>'sub',
        (SELECT CONCAT(first_name, ' ', last_name) FROM public.users WHERE id = current_setting('request.jwt.claims', true)::json->>'sub')
      );
    END IF;
    
    -- Replacement Spent field
    IF OLD.replacement_spent IS DISTINCT FROM NEW.replacement_spent THEN
      INSERT INTO public.item_change_history (item_id, field_name, old_value, new_value, changed_at, user_id, user_name)
      VALUES (
        NEW.id,
        'replacement_spent',
        OLD.replacement_spent::text,
        NEW.replacement_spent::text,
        NOW(),
        current_setting('request.jwt.claims', true)::json->>'sub',
        (SELECT CONCAT(first_name, ' ', last_name) FROM public.users WHERE id = current_setting('request.jwt.claims', true)::json->>'sub')
      );
    END IF;
    
    -- No Loss or Damage field
    IF OLD.no_loss_or_damage IS DISTINCT FROM NEW.no_loss_or_damage THEN
      INSERT INTO public.item_change_history (item_id, field_name, old_value, new_value, changed_at, user_id, user_name)
      VALUES (
        NEW.id,
        'no_loss_or_damage',
        OLD.no_loss_or_damage::text,
        NEW.no_loss_or_damage::text,
        NOW(),
        current_setting('request.jwt.claims', true)::json->>'sub',
        (SELECT CONCAT(first_name, ' ', last_name) FROM public.users WHERE id = current_setting('request.jwt.claims', true)::json->>'sub')
      );
    END IF;
    
    -- Not Involved in Claim field
    IF OLD.not_involved_in_claim IS DISTINCT FROM NEW.not_involved_in_claim THEN
      INSERT INTO public.item_change_history (item_id, field_name, old_value, new_value, changed_at, user_id, user_name)
      VALUES (
        NEW.id,
        'not_involved_in_claim',
        OLD.not_involved_in_claim::text,
        NEW.not_involved_in_claim::text,
        NOW(),
        current_setting('request.jwt.claims', true)::json->>'sub',
        (SELECT CONCAT(first_name, ' ', last_name) FROM public.users WHERE id = current_setting('request.jwt.claims', true)::json->>'sub')
      );
    END IF;
    
    -- Duplicate Item field
    IF OLD.duplicate_item IS DISTINCT FROM NEW.duplicate_item THEN
      INSERT INTO public.item_change_history (item_id, field_name, old_value, new_value, changed_at, user_id, user_name)
      VALUES (
        NEW.id,
        'duplicate_item',
        OLD.duplicate_item::text,
        NEW.duplicate_item::text,
        NOW(),
        current_setting('request.jwt.claims', true)::json->>'sub',
        (SELECT CONCAT(first_name, ' ', last_name) FROM public.users WHERE id = current_setting('request.jwt.claims', true)::json->>'sub')
      );
    END IF;
    
    -- Cleaning Allowance field
    IF OLD.cleaning_allowance IS DISTINCT FROM NEW.cleaning_allowance THEN
      INSERT INTO public.item_change_history (item_id, field_name, old_value, new_value, changed_at, user_id, user_name)
      VALUES (
        NEW.id,
        'cleaning_allowance',
        OLD.cleaning_allowance::text,
        NEW.cleaning_allowance::text,
        NOW(),
        current_setting('request.jwt.claims', true)::json->>'sub',
        (SELECT CONCAT(first_name, ' ', last_name) FROM public.users WHERE id = current_setting('request.jwt.claims', true)::json->>'sub')
      );
    END IF;
    
    -- Cleaning Allowance Amount field
    IF OLD.cleaning_allowance_amount IS DISTINCT FROM NEW.cleaning_allowance_amount THEN
      INSERT INTO public.item_change_history (item_id, field_name, old_value, new_value, changed_at, user_id, user_name)
      VALUES (
        NEW.id,
        'cleaning_allowance_amount',
        OLD.cleaning_allowance_amount::text,
        NEW.cleaning_allowance_amount::text,
        NOW(),
        current_setting('request.jwt.claims', true)::json->>'sub',
        (SELECT CONCAT(first_name, ' ', last_name) FROM public.users WHERE id = current_setting('request.jwt.claims', true)::json->>'sub')
      );
    END IF;
    
    -- Status field
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.item_change_history (item_id, field_name, old_value, new_value, changed_at, user_id, user_name)
      VALUES (
        NEW.id,
        'status',
        OLD.status::text,
        NEW.status::text,
        NOW(),
        current_setting('request.jwt.claims', true)::json->>'sub',
        (SELECT CONCAT(first_name, ' ', last_name) FROM public.users WHERE id = current_setting('request.jwt.claims', true)::json->>'sub')
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
