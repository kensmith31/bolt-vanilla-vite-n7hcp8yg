/*
  # Fix tax rate decimal places

  1. Changes
    - Update tax rate display to show 3 decimal places
    - Ensure tax rates are stored with full precision
    - Update trigger function to handle precise tax rates
    
  2. Security
    - Maintains existing RLS policies
    - Uses SECURITY DEFINER for trigger function
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
  -- Update all items for this claim with the new tax rate
  -- Ensure we store the exact value without rounding
  UPDATE items
  SET 
    tax_rate = NEW.default_tax_rate / 100,
    updated_at = NOW()
  WHERE claim_id = NEW.file_number;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated tax rate for % items in claim % to %', 
    updated_count, 
    NEW.file_number, 
    round((NEW.default_tax_rate / 100)::numeric, 3);
  
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