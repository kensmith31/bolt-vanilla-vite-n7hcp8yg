/*
  # Sync Auth Users to Public Users Table

  1. Changes
    - Create function to sync auth users to public users
    - Add trigger for automatic syncing of new auth users
    - Sync all existing auth users to public users table
    - Ensure email addresses are kept in sync
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