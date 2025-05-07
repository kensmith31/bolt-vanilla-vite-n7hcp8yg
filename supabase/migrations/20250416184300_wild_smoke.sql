/*
  # Update user management policies

  This migration updates the RLS policies for the users table to ensure proper access control:
  
  1. Changes
     - Simplifies admin access policy
     - Ensures admins can view all users
     - Maintains user self-view capability
  
  2. Security
     - Maintains strict access control
     - Prevents non-admin users from viewing other users' data
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admin full access" ON users;
DROP POLICY IF EXISTS "Users can read own record" ON users;

-- Create new admin policy with full access
CREATE POLICY "Admin full access"
  ON users
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Create policy for users to view their own record
CREATE POLICY "Users can read own record"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;