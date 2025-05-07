/*
  # Fix recursive RLS policies on users table

  1. Changes
    - Drop existing problematic policies that cause recursion
    - Create new non-recursive policies for the users table
    
  2. Security
    - Enable RLS on users table (maintaining existing security)
    - Add policy for users to read their own data
    - Add policy for admins to read all users
    - Policies are designed to avoid recursion while maintaining security
*/

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "admin_select" ON users;
DROP POLICY IF EXISTS "users_read_own" ON users;

-- Create new non-recursive policies
CREATE POLICY "Users can read own profile"
ON users
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);

CREATE POLICY "Admins can read all profiles"
ON users
FOR SELECT
TO authenticated
USING (
  auth.jwt()->>'role' = 'admin'
);