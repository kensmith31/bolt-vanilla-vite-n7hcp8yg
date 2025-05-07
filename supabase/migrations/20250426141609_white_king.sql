/*
  # Fix role policies to avoid naming conflicts

  1. Changes
    - Drop existing policies
    - Create new policies with unique names
    - Add performance indexes
    
  2. Security
    - Enable RLS
    - Allow public read access
    - Restrict management to admin role
*/

-- Drop existing policies
DROP POLICY IF EXISTS "roles_admin_policy" ON roles;
DROP POLICY IF EXISTS "roles_read_policy" ON roles;
DROP POLICY IF EXISTS "Enable read access for all users" ON roles;
DROP POLICY IF EXISTS "Enable admin management" ON roles;
DROP POLICY IF EXISTS "roles_public_read" ON roles;
DROP POLICY IF EXISTS "roles_admin_manage" ON roles;

-- Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Create new non-recursive policies with unique names
CREATE POLICY "roles_read_access_policy"
ON roles
FOR SELECT
TO public
USING (true);

CREATE POLICY "roles_admin_management_policy"
ON roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = auth.uid()
    AND users.role_id = (
      SELECT id FROM roles WHERE name = 'admin'
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM users
    WHERE users.id = auth.uid()
    AND users.role_id = (
      SELECT id FROM roles WHERE name = 'admin'
    )
  )
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);