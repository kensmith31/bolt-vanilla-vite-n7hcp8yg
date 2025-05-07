/*
  # Update tax rate functionality

  1. Changes
    - Add trigger to update items' tax rate when claim tax rate changes
    - Allow individual item tax rate overrides
    - Add change tracking for tax rate updates
    
  2. Security
    - Maintain existing RLS policies
    - Use SECURITY DEFINER for trigger function
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
  -- Only update items that don't have a custom tax rate
  UPDATE items
  SET 
    tax_rate = NEW.default_tax_rate / 100,
    updated_at = NOW()
  WHERE claim_id = NEW.file_number
  AND tax_rate IS NULL;
  
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