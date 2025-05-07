/*
  # Enhance item change history tracking

  1. Changes
    - Improve change detection logic
    - Add better handling of system changes
    - Add more detailed tracking of calculated fields
    - Improve error handling and logging
    
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
  change_source text;
BEGIN
  -- Determine if this is a system change by checking various conditions
  is_system_change := (
    -- Status changes from automatic updates
    (NEW.status != OLD.status AND NEW.updated_at = OLD.updated_at) OR
    -- Changes in calculated fields
    (NEW.rcv_total != OLD.rcv_total AND NEW.updated_at = OLD.updated_at) OR
    (NEW.rcv_plus_tax != OLD.rcv_plus_tax AND NEW.updated_at = OLD.updated_at) OR
    (NEW.depreciation_amount != OLD.depreciation_amount AND NEW.updated_at = OLD.updated_at) OR
    (NEW.acv != OLD.acv AND NEW.updated_at = OLD.updated_at) OR
    (NEW.holdback_due != OLD.holdback_due AND NEW.updated_at = OLD.updated_at)
  );

  -- Get user info if not a system change
  IF NOT is_system_change THEN
    SELECT 
      first_name || ' ' || last_name as full_name,
      roles.name as role_name
    INTO user_info
    FROM users
    JOIN roles ON roles.id = users.role_id
    WHERE users.id = auth.uid();
  END IF;

  -- Determine change source
  change_source := CASE
    WHEN is_system_change THEN 'System'
    WHEN user_info.role_name = 'admin' THEN 'Admin'
    WHEN user_info.role_name = 'desk_adjuster' THEN 'Desk Adjuster'
    WHEN user_info.role_name = 'field_adjuster' THEN 'Field Adjuster'
    WHEN user_info.role_name = 'policyholder' THEN 'Policyholder'
    ELSE COALESCE(user_info.full_name, 'Unknown User')
  END;

  -- Get list of changed columns with improved detection
  SELECT array_agg(key) INTO changed_fields
  FROM (
    SELECT key
    FROM jsonb_object_keys(to_jsonb(NEW)) key
    WHERE key != ANY(ARRAY['updated_at', 'id', 'created_at'])
    AND (
      -- Handle NULL values properly
      (to_jsonb(OLD)->>key IS NULL AND to_jsonb(NEW)->>key IS NOT NULL) OR
      (to_jsonb(OLD)->>key IS NOT NULL AND to_jsonb(NEW)->>key IS NULL) OR
      -- Compare non-NULL values
      (to_jsonb(OLD)->>key IS NOT NULL AND to_jsonb(NEW)->>key IS NOT NULL AND
       to_jsonb(OLD)->>key != to_jsonb(NEW)->>key)
    )
  ) t;

  -- Record each changed field
  IF changed_fields IS NOT NULL THEN
    FOREACH field_name IN ARRAY changed_fields
    LOOP
      -- Get old and new values with proper NULL handling
      EXECUTE format('SELECT to_jsonb($1.%I)', field_name)
        INTO old_value
        USING OLD;
      
      EXECUTE format('SELECT to_jsonb($1.%I)', field_name)
        INTO new_value
        USING NEW;
      
      -- Only record if values are actually different
      IF old_value IS DISTINCT FROM new_value THEN
        -- Record the change with improved metadata
        INSERT INTO item_change_history (
          item_id,
          user_id,
          user_name,
          field_name,
          old_value,
          new_value,
          changed_at
        ) VALUES (
          NEW.id,
          CASE WHEN is_system_change THEN NULL ELSE auth.uid() END,
          change_source,
          field_name,
          old_value,
          new_value,
          CLOCK_TIMESTAMP()
        );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error details but allow update to proceed
    RAISE WARNING 'Error in track_item_changes for item %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER track_item_changes_trigger
  AFTER UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION track_item_changes();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_item_change_history_item_id ON item_change_history(item_id);
CREATE INDEX IF NOT EXISTS idx_item_change_history_changed_at ON item_change_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_item_change_history_field_name ON item_change_history(field_name);