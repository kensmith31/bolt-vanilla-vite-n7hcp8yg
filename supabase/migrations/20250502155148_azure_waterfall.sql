/*
  # Fix tax rate trigger to respect custom rates

  1. Changes
    - Update trigger function to only update non-custom tax rates
    - Ensure bulk edits are preserved
    - Add index for performance
    
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
DECLARE
  updated_count integer;
BEGIN
  -- Only update items where tax_rate_is_custom is false
  UPDATE items
  SET 
    tax_rate = NEW.default_tax_rate,
    updated_at = NOW()
  WHERE claim_id = NEW.file_number
  AND (tax_rate_is_custom IS NULL OR tax_rate_is_custom = false);
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated tax rate for % non-custom items in claim %', updated_count, NEW.file_number;
  
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

-- Create index for performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_items_tax_rate_custom 
ON items (tax_rate_is_custom);