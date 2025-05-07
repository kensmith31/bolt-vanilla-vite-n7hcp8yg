/*
  # Fix tax rate update behavior

  1. Changes
    - Update trigger function to only apply default tax rate to new items
    - Remove automatic tax rate updates for existing items
    - Add column to track if tax rate is custom or default
    
  2. Security
    - Maintains existing RLS policies
    - Uses SECURITY DEFINER for trigger function
*/

-- Add column to track if tax rate is custom
ALTER TABLE items
ADD COLUMN tax_rate_is_custom boolean DEFAULT false;

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
  -- Only update items that don't have a custom tax rate
  UPDATE items
  SET 
    tax_rate = NEW.default_tax_rate,
    updated_at = NOW()
  WHERE claim_id = NEW.file_number
  AND tax_rate_is_custom = false;
  
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

-- Update existing items to mark custom tax rates
UPDATE items i
SET tax_rate_is_custom = true
FROM claims c
WHERE i.claim_id = c.file_number
AND i.tax_rate IS NOT NULL
AND i.tax_rate != c.default_tax_rate;