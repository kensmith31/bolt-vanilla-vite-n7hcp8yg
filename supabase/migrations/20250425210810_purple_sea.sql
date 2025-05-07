/*
  # Add city and state fields to claims table

  1. Changes
    - Add nullable city and state columns to claims table
    - Extract city and state from existing property_address where possible
  
  2. Security
    - Maintains existing RLS policies
*/

-- Add new columns as nullable
ALTER TABLE claims
ADD COLUMN property_city text,
ADD COLUMN property_state text;

-- Extract city and state from property_address where possible
DO $$
DECLARE
  claim_record RECORD;
  address_parts text[];
BEGIN
  FOR claim_record IN SELECT file_number, property_address FROM claims
  WHERE property_address IS NOT NULL
  LOOP
    -- Split address on commas and clean up whitespace
    address_parts := string_to_array(claim_record.property_address, ',');
    
    -- If we have at least city, state
    IF array_length(address_parts, 1) >= 2 THEN
      UPDATE claims
      SET 
        property_city = COALESCE(trim(address_parts[array_length(address_parts, 1) - 1]), ''),
        property_state = COALESCE(trim(split_part(address_parts[array_length(address_parts, 1)], ' ', 1)), '')
      WHERE file_number = claim_record.file_number;
    END IF;
  END LOOP;
END;
$$;