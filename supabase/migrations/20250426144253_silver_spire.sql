/*
  # Add function to get user role name

  1. Changes
    - Add function to safely get user role name
    - Function uses role_id to look up role name
    - Set security context properly
  
  2. Security
    - Uses SECURITY DEFINER
    - Sets explicit search path
*/

-- Create function to get user role name
CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_name text;
BEGIN
  SELECT r.name INTO role_name
  FROM users u
  JOIN roles r ON r.id = u.role_id
  WHERE u.id = user_id;
  
  RETURN role_name;
END;
$$;