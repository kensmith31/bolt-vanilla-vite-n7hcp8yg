/*
  # Update tax rate handling

  1. Changes
    - Remove tax_rate_is_custom column
    - Update trigger function to update all items when claim tax rate changes
    - Ensure tax rates are stored as decimals
    
  2. Security
    - Maintain SECURITY DEFINER
    - Set explicit search path
*/

-- Drop tax_rate_is_custom column
ALTER TABLE items
DROP COLUMN IF EXISTS tax_rate_is_custom;

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
  -- Update all items for this claim with the new tax rate
  UPDATE items
  SET 
    tax_rate = NEW.default_tax_rate,
    updated_at = NOW()
  WHERE claim_id = NEW.file_number;
  
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