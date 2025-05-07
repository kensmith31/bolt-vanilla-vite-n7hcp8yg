/*
  # Update Admin RLS Policy

  1. Changes
    - Drop existing admin policies
    - Create new admin policy using direct user role check
    - Maintain user self-access policy
  
  2. Security
    - Ensures admins can read all user records
    - Maintains user data privacy
*/

-- Drop existing policies
DROP POLICY IF EXISTS "admins_full_access" ON users;
DROP POLICY IF EXISTS "users_read_own_data" ON users;

-- Create new admin policy with specified check
CREATE POLICY "Admins can read all users"
ON public.users
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM public.users WHERE role = 'admin'
  )
);

-- Maintain policy for users to read their own data
CREATE POLICY "Users can read own data"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;