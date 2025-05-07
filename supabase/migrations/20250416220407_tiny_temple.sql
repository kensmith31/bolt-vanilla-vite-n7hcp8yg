/*
  # Fix recursive policy on users table

  1. Changes
    - Drop existing policies that cause recursion
    - Create new, non-recursive policies for user access
    
  2. Security
    - Enable RLS on users table (in case it was disabled)
    - Add policy for users to read their own data
    - Add policy for admins to read all users
    - Add policy for users to read basic info of users in shared claims
*/

-- First, drop existing policies that might be causing recursion
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create new non-recursive policies

-- Allow users to read their own data
CREATE POLICY "Users can read own data"
ON users
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);

-- Allow admins to read all users (using auth.jwt() to avoid recursion)
CREATE POLICY "Admins can read all users"
ON users
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'role')::text = 'admin'
);

-- Allow users to read basic info of users they share claims with
CREATE POLICY "Users can read claim participants"
ON users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM claim_participants cp1
    JOIN claim_participants cp2 ON cp1.claim_id = cp2.claim_id
    WHERE cp1.user_id = auth.uid()
    AND cp2.user_id = users.id
  )
);