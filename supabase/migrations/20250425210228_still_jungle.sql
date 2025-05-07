/*
  # Split insured name into first and last name fields

  1. Changes
    - Add new columns for insured_first_name and insured_last_name
    - Split existing insured_name values into the new columns
    - Drop old insured_name column
    
  2. Security
    - Maintains existing RLS policies
    - Preserves data during migration
*/

-- Add new columns
ALTER TABLE claims
ADD COLUMN insured_first_name text,
ADD COLUMN insured_last_name text;

-- Split existing names into first and last name
DO $$
DECLARE
  claim_record RECORD;
  name_parts text[];
BEGIN
  FOR claim_record IN SELECT file_number, insured_name FROM claims
  LOOP
    -- Split the name on the first space
    name_parts := string_to_array(claim_record.insured_name, ' ');
    
    -- Update the record with split names
    UPDATE claims
    SET 
      insured_first_name = name_parts[1],
      -- Combine all remaining parts as last name
      insured_last_name = array_to_string(name_parts[2:array_length(name_parts, 1)], ' ')
    WHERE file_number = claim_record.file_number;
  END LOOP;
END;
$$;

-- Make the new columns required
ALTER TABLE claims
ALTER COLUMN insured_first_name SET NOT NULL,
ALTER COLUMN insured_last_name SET NOT NULL;

-- Drop the old column
ALTER TABLE claims
DROP COLUMN insured_name;