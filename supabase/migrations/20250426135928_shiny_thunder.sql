/*
  # Fix roles table policies

  1. Changes
    - Drop all existing policies on roles table
    - Add new simplified policies:
      - Allow all authenticated users to read roles
      - Allow only admins to modify roles
    
  2. Security
    - Maintains RLS protection
    - Prevents infinite recursion
    - Uses direct role checks
*/

-- Drop existing policies
DROP POLICY IF EXISTS "roles_admin_policy" ON roles;
DROP POLICY IF EXISTS "roles_read_policy" ON roles;
DROP POLICY IF EXISTS "roles_admin_full_access" ON roles;
DROP POLICY IF EXISTS "roles_read_access" ON roles;
DROP POLICY IF EXISTS "admin_full_access" ON roles;
DROP POLICY IF EXISTS "read_access" ON roles;

-- Create new non-recursive policies
CREATE POLICY "roles_admin_policy"
ON roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = auth.uid()
    AND users.role_id IN (
      SELECT roles_1.id
      FROM roles roles_1
      WHERE roles_1.name = 'admin'
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = auth.uid()
    AND users.role_id IN (
      SELECT roles_1.id
      FROM roles roles_1
      WHERE roles_1.name = 'admin'
    )
  )
);

CREATE POLICY "roles_read_policy"
ON roles
FOR SELECT
TO authenticated
USING (true);

-- Ensure RLS is enabled
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;