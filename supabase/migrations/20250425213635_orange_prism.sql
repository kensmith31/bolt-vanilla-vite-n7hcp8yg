/*
  # Add item change history trigger

  1. Changes
    - Add trigger function to track item changes
    - Create trigger to automatically record changes
    - Add index for performance
  
  2. Security
    - Set search_path for security
    - Use SECURITY DEFINER for trigger function
*/

-- Create extension if not exists
CREATE EXTENSION IF NOT EXISTS hstore;

-- Create function to track item changes
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
BEGIN
  -- Get user info
  SELECT first_name || ' ' || last_name as full_name, role
  INTO user_info
  FROM users
  WHERE id = auth.uid();

  -- Get list of changed columns
  SELECT array_agg(col) INTO changed_fields
  FROM (
    SELECT unnest(akeys(hstore(NEW))) as col
    EXCEPT
    SELECT unnest(akeys(hstore(OLD)))
    UNION
    SELECT unnest(akeys(hstore(OLD))) as col
    WHERE hstore(OLD) -> col IS DISTINCT FROM hstore(NEW) -> col
  ) t;

  -- Record each changed field
  IF changed_fields IS NOT NULL THEN
    FOREACH field_name IN ARRAY changed_fields
    LOOP
      -- Skip certain fields
      CONTINUE WHEN field_name IN ('updated_at');
      
      -- Get the old and new values using dynamic SQL
      EXECUTE format('SELECT to_jsonb($1.%I)', field_name)
      INTO new_value
      USING NEW;
      
      EXECUTE format('SELECT to_jsonb($1.%I)', field_name)
      INTO old_value
      USING OLD;
      
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
        auth.uid(),
        user_info.full_name,
        field_name,
        old_value,
        new_value
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS track_item_changes_trigger ON items;
CREATE TRIGGER track_item_changes_trigger
  AFTER UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION track_item_changes();

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_item_change_history_item_id_changed_at 
ON item_change_history(item_id, changed_at);