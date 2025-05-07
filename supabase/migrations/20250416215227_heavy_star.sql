/*
  # Fix User Management Policies

  1. Changes
    - Drop existing policies that might be conflicting
    - Create new simplified policies for admin access
    - Ensure proper access control for user listing
  
  2. Security
    - Maintains row-level security
    - Allows admins to view all users
    - Preserves user data privacy
*/

-- Drop existing policies
DROP POLICY IF EXISTS "admin_full_access" ON users;
DROP POLICY IF EXISTS "users_read_own" ON users;
DROP POLICY IF EXISTS "read_claim_participant_info" ON users;

-- Create new admin policy with simplified access check
CREATE POLICY "admin_full_access"
ON users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'admin'
  )
);

-- Users can read their own record
CREATE POLICY "users_read_own"
ON users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;