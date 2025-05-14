-- Create a function to record changes to items
CREATE OR REPLACE FUNCTION record_item_change()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields text[];
  old_values jsonb := '{}'::jsonb;
  new_values jsonb := '{}'::jsonb;
  field_name text;
  user_id uuid;
  user_name text;
BEGIN
  -- Get the current user ID from the auth.uid() function if available
  user_id := auth.uid();
  
  -- Try to get the user's name from the users table
  BEGIN
    SELECT CONCAT(first_name, ' ', last_name) INTO user_name
    FROM public.users
    WHERE id = user_id;
  EXCEPTION WHEN OTHERS THEN
    user_name := 'System';
  END;
  
  -- For inserts, record all non-null fields as changes
  IF TG_OP = 'INSERT' THEN
    -- For each field in the new record
    FOR field_name IN SELECT key FROM jsonb_object_keys(to_jsonb(NEW)) LOOP
      -- Skip certain fields
      IF field_name NOT IN ('id', 'created_at', 'updated_at') AND NEW.id IS NOT NULL THEN
        -- Record the change
        INSERT INTO item_change_history (item_id, field_name, old_value, new_value, changed_at, user_id, user_name)
        VALUES (NEW.id, field_name, NULL, to_jsonb(NEW)->>field_name, NOW(), user_id, user_name);
      END IF;
    END LOOP;
  
  -- For updates, only record fields that have changed
  ELSIF TG_OP = 'UPDATE' THEN
    -- For each field in the record
    FOR field_name IN SELECT key FROM jsonb_object_keys(to_jsonb(NEW)) LOOP
      -- Skip certain fields
      IF field_name NOT IN ('id', 'created_at', 'updated_at') THEN
        -- Get old and new values
        old_values := old_values || jsonb_build_object(field_name, to_jsonb(OLD)->>field_name);
        new_values := new_values || jsonb_build_object(field_name, to_jsonb(NEW)->>field_name);
        
        -- If the field has changed
        IF (to_jsonb(OLD)->>field_name) IS DISTINCT FROM (to_jsonb(NEW)->>field_name) THEN
          -- Record the change
          INSERT INTO item_change_history (item_id, field_name, old_value, new_value, changed_at, user_id, user_name)
          VALUES (NEW.id, field_name, to_jsonb(OLD)->>field_name, to_jsonb(NEW)->>field_name, NOW(), user_id, user_name);
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for the items table
DROP TRIGGER IF EXISTS record_item_insert ON items;
CREATE TRIGGER record_item_insert
  AFTER INSERT ON items
  FOR EACH ROW
  EXECUTE FUNCTION record_item_change();

DROP TRIGGER IF EXISTS record_item_update ON items;
CREATE TRIGGER record_item_update
  AFTER UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION record_item_change();
