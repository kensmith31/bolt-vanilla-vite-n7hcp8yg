/*
  # Fix User Management Policies

  1. Changes
    - Drop existing policies
    - Create new simplified policies for user access
    - Add performance index
  
  2. Security
    - Enable RLS
    - Create policies for user self-access
    - Create policies for admin management
*/

-- First ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Enable read access for users" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "admin_delete" ON users;
DROP POLICY IF EXISTS "admin_insert" ON users;
DROP POLICY IF EXISTS "admin_update" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Admins can read all profiles" ON users;

-- Create new simplified policies

-- Users can read their own profile
CREATE POLICY "user_read_own"
ON users FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Admin policies using JWT claims
CREATE POLICY "admin_management"
ON users
FOR ALL
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

-- Add index for performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);