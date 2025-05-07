/*
  # Fix tax rate update trigger

  1. Changes
    - Update trigger function to update all items' tax rates
    - Remove condition that only updates NULL tax rates
    - Add logging for debugging
    
  2. Security
    - Maintain SECURITY DEFINER
    - Set explicit search path
*/

-- Create function to update items tax rate
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
    tax_rate = NEW.default_tax_rate / 100,
    updated_at = NOW()
  WHERE claim_id = NEW.file_number;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated tax rate for % items', updated_count;
  
  RETURN NEW;
END;
$$;

-- Create trigger to update items when claim tax rate changes
DROP TRIGGER IF EXISTS update_items_tax_rate_trigger ON claims;
CREATE TRIGGER update_items_tax_rate_trigger
  AFTER UPDATE OF default_tax_rate ON claims
  FOR EACH ROW
  WHEN (OLD.default_tax_rate IS DISTINCT FROM NEW.default_tax_rate)
  EXECUTE FUNCTION update_items_tax_rate();