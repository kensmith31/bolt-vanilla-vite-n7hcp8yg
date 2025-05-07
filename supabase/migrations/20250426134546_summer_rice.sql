/*
  # Fix roles table policies

  1. Changes
    - Drop existing policies on roles table that cause recursion
    - Create new, simplified policies for roles table access
      - Allow authenticated users to read roles
      - Allow admins to manage roles
  
  2. Security
    - Maintains RLS on roles table
    - Ensures proper access control without recursion
    - Admins can still manage roles
    - All authenticated users can read roles
*/

-- Drop existing policies to clean up
DROP POLICY IF EXISTS "Admins can manage roles" ON roles;
DROP POLICY IF EXISTS "All users can read roles" ON roles;

-- Create new, non-recursive policies
CREATE POLICY "enable_read_access_for_authenticated_users"
ON roles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "enable_all_access_for_admins"
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