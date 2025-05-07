/*
  # Fix item numbering

  1. Changes
    - Create trigger to maintain sequential item numbers
    - Reset existing item numbers to be sequential
    - Add index for performance
    
  2. Security
    - Maintain SECURITY DEFINER
    - Set explicit search path
*/

-- Create function to update item numbers
CREATE OR REPLACE FUNCTION update_item_numbers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number integer;
BEGIN
  -- For inserts, get the next available number for this claim
  IF TG_OP = 'INSERT' THEN
    SELECT COALESCE(MAX(item_number), 0) + 1
    INTO next_number
    FROM items
    WHERE claim_id = NEW.claim_id;
    
    NEW.item_number := next_number;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS update_item_numbers_trigger ON items;
CREATE TRIGGER update_item_numbers_trigger
  BEFORE INSERT ON items
  FOR EACH ROW
  EXECUTE FUNCTION update_item_numbers();

-- Reset existing item numbers to be sequential
DO $$
DECLARE
  claim_record RECORD;
  item_record RECORD;
  current_number INTEGER;
BEGIN
  -- Loop through each claim
  FOR claim_record IN 
    SELECT DISTINCT claim_id 
    FROM items 
    ORDER BY claim_id
  LOOP
    current_number := 1;
    
    -- Update item numbers for each claim
    FOR item_record IN 
      SELECT id 
      FROM items 
      WHERE claim_id = claim_record.claim_id 
      ORDER BY created_at ASC
    LOOP
      UPDATE items 
      SET item_number = current_number 
      WHERE id = item_record.id;
      
      current_number := current_number + 1;
    END LOOP;
  END LOOP;
END;
$$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_items_claim_id_item_number 
ON items(claim_id, item_number);