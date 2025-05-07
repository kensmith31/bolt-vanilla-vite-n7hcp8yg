/*
  # Fix users table RLS policies

  1. Changes
    - Remove existing RLS policies that cause recursion
    - Add new simplified policies for user data access
    - Maintain security while preventing infinite loops
  
  2. Security
    - Enable RLS on users table
    - Add policy for users to read their own data
    - Add policy for admins to read all data without recursion
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can read all user data" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;

-- Create new policies
CREATE POLICY "Enable read access for users to their own data"
ON users FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);

CREATE POLICY "Enable read access for admin users"
ON users FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
);