/*
  # Fix recursive RLS policies for roles table

  1. Changes
    - Drop existing policies that cause recursion
    - Create new non-recursive policies using JWT claims
    - Maintain proper access control
    
  2. Security
    - Enable RLS on roles table
    - Allow all authenticated users to read roles
    - Allow admins to manage roles using JWT claims
*/

-- Drop existing policies
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
    SELECT 1
    FROM auth.jwt()
    WHERE (auth.jwt() ->> 'role_id')::uuid = (
      SELECT id FROM roles WHERE name = 'admin'
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM auth.jwt()
    WHERE (auth.jwt() ->> 'role_id')::uuid = (
      SELECT id FROM roles WHERE name = 'admin'
    )
  )
);

-- Ensure RLS is enabled
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;