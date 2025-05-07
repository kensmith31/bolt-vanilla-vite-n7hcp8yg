/*
  # Fix roles table RLS policies

  1. Changes
    - Drop existing policies on roles table that may be causing recursion
    - Add new, simplified policies for roles table:
      - Everyone can read roles
      - Only admins can modify roles (using direct role check)

  2. Security
    - Maintains RLS on roles table
    - Provides read access to all authenticated users
    - Restricts write access to admins only
*/

-- First, drop any existing policies on the roles table
DROP POLICY IF EXISTS "enable_all_access_for_admins" ON roles;
DROP POLICY IF EXISTS "enable_read_access_for_authenticated_users" ON roles;

-- Create new, simplified policies
CREATE POLICY "Allow read access to all authenticated users"
  ON roles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admin full access"
  ON roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role_id = (SELECT id FROM roles WHERE name = 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role_id = (SELECT id FROM roles WHERE name = 'admin')
    )
  );