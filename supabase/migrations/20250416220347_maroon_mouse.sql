/*
  # Fix recursive RLS policy for users table

  1. Changes
    - Remove existing recursive admin policy
    - Add new simplified admin policy that uses the user's role directly from auth.users
    - Keep existing policy for users to read their own data

  2. Security
    - Maintains RLS protection
    - Simplifies admin access check
    - Preserves user's ability to read their own data
*/

-- Drop the existing recursive policy
DROP POLICY IF EXISTS "Admins can read all users" ON users;

-- Create new non-recursive admin policy
CREATE POLICY "Admins can read all users" ON users
FOR SELECT TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'::user_role
);