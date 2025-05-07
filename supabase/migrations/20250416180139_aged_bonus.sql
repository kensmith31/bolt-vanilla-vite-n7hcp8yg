/*
  # Sync Auth Users with Public Users

  1. Changes
    - Create a function to sync auth users with public users table
    - Add trigger to automatically sync new auth users
    - Perform initial sync for existing auth users
  
  2. Security
    - Maintain existing RLS policies
    - Ensure data consistency between auth and public tables
*/

-- Function to sync auth users to public users
CREATE OR REPLACE FUNCTION sync_auth_user_to_public()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    'policyholder',
    'active'
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email
  WHERE users.email != EXCLUDED.email;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new auth users
DROP TRIGGER IF EXISTS sync_auth_user_trigger ON auth.users;
CREATE TRIGGER sync_auth_user_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_auth_user_to_public();

-- Sync existing auth users
DO $$
BEGIN
  INSERT INTO public.users (id, email, role, status)
  SELECT 
    id,
    email,
    'policyholder'::user_role as role,
    'active'::user_status as status
  FROM auth.users
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email
  WHERE users.email != EXCLUDED.email;
END;
$$;