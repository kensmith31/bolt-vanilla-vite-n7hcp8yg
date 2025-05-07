/*
  # Update users table RLS policies

  1. Changes
    - Remove existing RLS policies on users table
    - Add new policies:
      - Allow admins to read all user records
      - Allow users to read their own records
      - Allow admins to insert new users
      - Allow admins to update any user
      - Allow users to update their own records
      - Allow admins to delete users

  2. Security
    - Maintains RLS on users table
    - Restricts access based on user role and ownership
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for admin users" ON users;
DROP POLICY IF EXISTS "Enable read access for users to their own data" ON users;

-- Create new policies
CREATE POLICY "Admins can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can read own record"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can insert users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can update any user"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can update own record"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can delete users"
  ON users
  FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');