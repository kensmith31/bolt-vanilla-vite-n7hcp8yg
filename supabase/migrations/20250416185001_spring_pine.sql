/*
  # Clean User Management Setup

  1. Security
    - Drop existing policies
    - Create new simplified policies for admin access and user self-access
    - Enable RLS
    - Add performance index
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admin full access" ON users;
DROP POLICY IF EXISTS "Users can read own record" ON users;

-- Create admin policy with full access
CREATE POLICY "Admin full access"
ON users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Create policy for users to view their own record
CREATE POLICY "Users can read own record"
ON users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);