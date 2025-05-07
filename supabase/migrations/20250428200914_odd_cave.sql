/*
  # Enhance item change history tracking

  1. Changes
    - Update trigger function to handle system changes
    - Add user_name 'System' for automatic changes
    - Ensure all changes are tracked properly
    
  2. Security
    - Maintain SECURITY DEFINER
    - Set explicit search path
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS track_item_changes_trigger ON items;
DROP FUNCTION IF EXISTS track_item_changes();

-- Create improved trigger function
CREATE OR REPLACE FUNCTION track_item_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed_fields text[];
  field_name text;
  user_info record;
  old_value jsonb;
  new_value jsonb;
  is_system_change boolean;
BEGIN
  -- Determine if this is a system change
  is_system_change := (TG_OP = 'UPDATE' AND NEW.updated_at = OLD.updated_at);

  -- Get user info if not a system change
  IF NOT is_system_change THEN
    SELECT first_name || ' ' || last_name as full_name
    INTO user_info
    FROM users
    WHERE id = auth.uid();
  END IF;

  -- Get list of changed columns
  SELECT array_agg(key) INTO changed_fields
  FROM (
    SELECT key
    FROM jsonb_object_keys(to_jsonb(NEW)) key
    WHERE key != ANY(ARRAY['updated_at'])
    AND (
      NOT jsonb_typeof(to_jsonb(OLD)->>key) IS NOT DISTINCT FROM jsonb_typeof(to_jsonb(NEW)->>key)
      OR to_jsonb(OLD)->>key IS DISTINCT FROM to_jsonb(NEW)->>key
    )
  ) t;

  -- Record each changed field
  IF changed_fields IS NOT NULL THEN
    FOREACH field_name IN ARRAY changed_fields
    LOOP
      -- Skip certain fields
      CONTINUE WHEN field_name = ANY(ARRAY['updated_at']);
      
      -- Get old and new values using dynamic field access
      EXECUTE format('SELECT to_jsonb($1.%I)', field_name)
        INTO old_value
        USING OLD;
      
      EXECUTE format('SELECT to_jsonb($1.%I)', field_name)
        INTO new_value
        USING NEW;
      
      -- Only record if values are different
      IF old_value IS DISTINCT FROM new_value THEN
        -- Record the change
        INSERT INTO item_change_history (
          item_id,
          user_id,
          user_name,
          field_name,
          old_value,
          new_value
        ) VALUES (
          NEW.id,
          CASE WHEN is_system_change THEN NULL ELSE auth.uid() END,
          CASE 
            WHEN is_system_change THEN 'System'
            ELSE COALESCE(user_info.full_name, 'Unknown User')
          END,
          field_name,
          old_value,
          new_value
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but allow update to proceed
    RAISE WARNING 'Error in track_item_changes: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER track_item_changes_trigger
  AFTER UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION track_item_changes();

-- Add index for performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_item_change_history_item_id_changed_at 
ON item_change_history(item_id, changed_at);