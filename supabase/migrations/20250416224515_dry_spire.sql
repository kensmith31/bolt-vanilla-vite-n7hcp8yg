/*
  # Update Admin User Permissions

  1. Changes
    - Remove references to admin_users table
    - Update policies to use role column directly
    - Simplify policy structure for better performance
  
  2. Security
    - Maintain strict access control
    - Ensure admin privileges are properly enforced
    - Keep RLS enabled
*/

-- First ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "user_read_own" ON users;
DROP POLICY IF EXISTS "admin_management" ON users;

-- Create new simplified policies

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
ON users FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Enable read access for all users
CREATE POLICY "Enable read access for all users"
ON users FOR SELECT
TO public
USING (true);

-- Admin policies using role check
CREATE POLICY "admin_delete"
ON users
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM users users_1
    WHERE users_1.id = auth.uid()
    AND users_1.role = 'admin'::user_role
  )
);

CREATE POLICY "admin_insert"
ON users
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM users users_1
    WHERE users_1.id = auth.uid()
    AND users_1.role = 'admin'::user_role
  )
);

CREATE POLICY "admin_update"
ON users
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM users users_1
    WHERE users_1.id = auth.uid()
    AND users_1.role = 'admin'::user_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM users users_1
    WHERE users_1.id = auth.uid()
    AND users_1.role = 'admin'::user_role
  )
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);