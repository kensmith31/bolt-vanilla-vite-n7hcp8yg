/*
  # Update items when claim tax rate changes

  1. Changes
    - Add trigger to update items' tax rate when claim tax rate changes
    - Update existing items with current claim tax rate
    - Ensure tax rate is properly formatted (as decimal)
  
  2. Security
    - Maintain existing RLS policies
    - Add trigger with SECURITY DEFINER
*/

-- Create function to update items tax rate
CREATE OR REPLACE FUNCTION update_items_tax_rate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update all items for this claim with the new tax rate
  UPDATE items
  SET 
    tax_rate = NEW.default_tax_rate / 100,
    updated_at = NOW()
  WHERE claim_id = NEW.file_number;
  
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