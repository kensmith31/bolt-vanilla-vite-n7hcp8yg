/*
  # Remove tax rate update notification

  1. Changes
    - Update trigger function to remove notification
    - Keep functionality but remove toast message
    - Maintain existing behavior
  
  2. Security
    - Maintain SECURITY DEFINER
    - Set explicit search path
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS update_items_tax_rate_trigger ON claims;
DROP FUNCTION IF EXISTS update_items_tax_rate();

-- Create improved trigger function
CREATE OR REPLACE FUNCTION update_items_tax_rate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only update items where tax_rate_is_custom is false
  UPDATE items
  SET 
    tax_rate = NEW.default_tax_rate,
    updated_at = NOW()
  WHERE claim_id = NEW.file_number
  AND (tax_rate_is_custom IS NULL OR tax_rate_is_custom = false);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error updating tax rates: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER update_items_tax_rate_trigger
  AFTER UPDATE OF default_tax_rate ON claims
  FOR EACH ROW
  WHEN (OLD.default_tax_rate IS DISTINCT FROM NEW.default_tax_rate)
  EXECUTE FUNCTION update_items_tax_rate();