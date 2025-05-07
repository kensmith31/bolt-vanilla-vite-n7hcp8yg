/*
  # Update items tax rate trigger

  1. Changes
    - Update trigger function to handle tax rate updates
    - Allow individual items to have custom tax rates
    - Update items without custom rates when default changes
    
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