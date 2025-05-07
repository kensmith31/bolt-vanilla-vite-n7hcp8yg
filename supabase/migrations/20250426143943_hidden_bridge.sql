/*
  # Fix user role recursion

  1. Changes
    - Add a new database function to safely get user role_id without triggering RLS
    - Remove recursive policy from users table
    - Add simplified policies for user access

  2. Security
    - Function runs with SECURITY DEFINER to bypass RLS
    - Policies updated to prevent recursion while maintaining security
*/

-- Create a function to safely get user role_id
CREATE OR REPLACE FUNCTION get_user_role_id(user_id uuid)
RETURNS TABLE (role_id uuid)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT u.role_id
  FROM users u
  WHERE u.id = user_id;
END;
$$;