/*
  # Update item numbers to be sequential per claim

  1. Changes
    - Reset item numbers to be sequential starting from 1 for each claim
    - Maintain order based on creation date
    
  2. Security
    - Maintains existing RLS policies
    - Updates are done in a single transaction
*/

DO $$
DECLARE
  claim_record RECORD;
  item_record RECORD;
  current_number INTEGER;
BEGIN
  -- Loop through each claim
  FOR claim_record IN SELECT DISTINCT claim_id FROM items ORDER BY claim_id
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