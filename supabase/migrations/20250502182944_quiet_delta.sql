/*
  # Add helper function for handling null filters

  1. Changes
    - Add function to handle null/empty value filtering
    - Support filtering for both null and non-null values
    - Handle different data types appropriately
    
  2. Security
    - Set search_path for security
    - Use SECURITY DEFINER
*/

-- Create function to handle null filters
CREATE OR REPLACE FUNCTION filter_null_check(
  field_value anyelement,
  filter_value text,
  field_name text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If filter value is 'null', check for null/empty
  IF filter_value = 'null' THEN
    RETURN (
      field_value IS NULL 
      OR CASE 
        WHEN field_name = 'room' THEN TRIM(field_value::text) = ''
        WHEN field_name = 'category_id' THEN field_value IS NULL
        WHEN field_name = 'condition' THEN field_value IS NULL
        WHEN field_name = 'age' THEN field_value IS NULL
        ELSE FALSE
      END
    );
  END IF;

  -- Otherwise, check for exact match
  RETURN field_value::text = filter_value;
END;
$$;