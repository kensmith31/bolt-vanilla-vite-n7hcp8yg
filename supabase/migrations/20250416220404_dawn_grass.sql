/*
  # Fix recursive RLS policies on users table

  1. Changes
    - Drop existing RLS policies that cause recursion
    - Create new, non-recursive policies for user access
    
  2. Security
    - Maintain security while preventing infinite recursion
    - Allow users to read their own data
    - Allow admins to read all user data
    - Prevent unauthorized access
*/

-- Drop existing policies to replace them
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;

-- Create new non-recursive policies
CREATE POLICY "Users can read own data"
ON users
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
);

CREATE POLICY "Admins can read all users"
ON users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_app_meta_data->>'role' = 'admin'
  )
);