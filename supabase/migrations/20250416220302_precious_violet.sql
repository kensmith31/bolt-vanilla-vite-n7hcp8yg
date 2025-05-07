/*
  # Fix recursive RLS policies on users table

  1. Changes
    - Drop existing recursive policies on users table
    - Add new non-recursive policies for user access control
    
  2. Security
    - Enable RLS on users table (in case it was disabled)
    - Add policy for users to read their own data
    - Add policy for admins to read all users using a direct role check
*/

-- First enable RLS (in case it was disabled)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;

-- Create new non-recursive policies
CREATE POLICY "Users can read own data"
ON users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Create admin policy using direct role comparison without subquery
CREATE POLICY "Admins can read all users"
ON users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND id IN (
      SELECT id 
      FROM users 
      WHERE role = 'admin'::user_role
    )
  )
);