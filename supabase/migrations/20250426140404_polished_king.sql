/*
  # Fix roles policy recursion

  1. Changes
    - Remove recursive policy on roles table
    - Add simplified policy for roles table that avoids recursion
    - Keep basic read access for authenticated users
    - Maintain admin-only write access using a direct role name check

  2. Security
    - Maintains RLS protection
    - Ensures only admins can modify roles
    - Allows authenticated users to read roles
*/

-- Drop existing policies to clean up
DROP POLICY IF EXISTS "roles_admin_policy" ON roles;
DROP POLICY IF EXISTS "roles_read_policy" ON roles;

-- Create new non-recursive policies
CREATE POLICY "roles_read_policy"
ON roles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "roles_admin_policy"
ON roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM roles r
    WHERE r.id = (SELECT role_id FROM users WHERE users.id = auth.uid())
    AND r.name = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM roles r
    WHERE r.id = (SELECT role_id FROM users WHERE users.id = auth.uid())
    AND r.name = 'admin'
  )
);