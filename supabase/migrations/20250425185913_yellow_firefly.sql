/*
  # Update tax rate trigger function

  1. Changes
    - Update trigger function to properly handle tax rate calculations
    - Ensure tax_rate is stored as decimal (not percentage)
    - RCV + Tax is automatically recalculated via generated column
    
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
  -- Update all items for this claim with the new tax rate
  -- tax_rate is stored as decimal (e.g., 0.0825 for 8.25%)
  UPDATE items
  SET 
    tax_rate = NEW.default_tax_rate / 100,
    updated_at = NOW()
  WHERE claim_id = NEW.file_number;
  
  RETURN NEW;
END;
$$;

-- Create trigger to update items when claim tax rate changes
CREATE TRIGGER update_items_tax_rate_trigger
  AFTER UPDATE OF default_tax_rate ON claims
  FOR EACH ROW
  WHEN (OLD.default_tax_rate IS DISTINCT FROM NEW.default_tax_rate)
  EXECUTE FUNCTION update_items_tax_rate();

-- Update existing items with their claim's tax rate
DO $$
BEGIN
  UPDATE items i
  SET 
    tax_rate = c.default_tax_rate / 100,
    updated_at = NOW()
  FROM claims c
  WHERE i.claim_id = c.file_number
  AND c.default_tax_rate IS NOT NULL;
END;
$$;