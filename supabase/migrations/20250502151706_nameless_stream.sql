/*
  # Fix tax rate handling for bulk edits

  1. Changes
    - Remove trigger that overrides custom tax rates
    - Add new trigger that preserves custom tax rates
    - Update existing items to use claim default tax rate
    
  2. Security
    - Maintains existing RLS policies
    - Uses SECURITY DEFINER for trigger function
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS update_items_tax_rate_trigger ON claims;
DROP FUNCTION IF EXISTS update_items_tax_rate();

-- Create improved trigger function that only updates items without custom tax rates
CREATE OR REPLACE FUNCTION update_items_tax_rate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  -- Only update items that have NULL tax_rate
  UPDATE items
  SET 
    tax_rate = NEW.default_tax_rate,
    updated_at = NOW()
  WHERE claim_id = NEW.file_number
  AND tax_rate IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated tax rate for % items in claim %', updated_count, NEW.file_number;
  
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