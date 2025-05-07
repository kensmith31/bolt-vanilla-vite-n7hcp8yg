/*
  # Add function to handle null/empty value filtering

  1. Changes
    - Add function to handle null and empty value checks
    - Support room, category_id, condition, and age fields
    - Handle both NULL and empty string cases
*/

-- Create function to handle null/empty value filtering
CREATE OR REPLACE FUNCTION is_empty_or_null(
  field_value anyelement,
  field_name text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    field_value IS NULL 
    OR 
    CASE 
      WHEN field_name = 'room' THEN TRIM(field_value::text) = ''
      WHEN field_name IN ('category_id', 'condition', 'age') THEN field_value IS NULL
      ELSE FALSE
    END
  );
END;
$$;