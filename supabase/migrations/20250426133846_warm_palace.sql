/*
  # Add roles table and update user roles

  1. Changes
    - Create roles table
    - Add role_id to users table
    - Migrate existing role data
    - Update RLS policies
    
  2. Security
    - Enable RLS on roles table
    - Update policies to use role_id
    - Maintain existing security model
*/

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on roles table
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Insert predefined roles
INSERT INTO roles (name) VALUES
  ('admin'),
  ('field_adjuster'),
  ('desk_adjuster'),
  ('policyholder');

-- Add role_id column to users table
ALTER TABLE users 
ADD COLUMN role_id uuid REFERENCES roles(id);

-- Migrate existing roles
UPDATE users
SET role_id = roles.id
FROM roles
WHERE roles.name = users.role::text;

-- Make role_id required
ALTER TABLE users
ALTER COLUMN role_id SET NOT NULL;

-- Update RLS policies for roles table
CREATE POLICY "Admins can manage roles"
ON roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role_id = (SELECT id FROM roles WHERE name = 'admin')
  )
);

CREATE POLICY "All users can read roles"
ON roles
FOR SELECT
TO authenticated
USING (true);

-- Update policies on items table
DROP POLICY IF EXISTS "admin_adjuster_full_access" ON items;

CREATE POLICY "admin_adjuster_full_access"
ON items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.id = auth.uid()
    AND r.name IN ('admin', 'desk_adjuster', 'field_adjuster')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.id = auth.uid()
    AND r.name IN ('admin', 'desk_adjuster', 'field_adjuster')
  )
);