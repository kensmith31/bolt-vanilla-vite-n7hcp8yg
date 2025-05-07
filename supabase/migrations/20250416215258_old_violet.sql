/*
  # Fix recursive RLS policies on users table

  1. Changes
    - Remove existing problematic policies that cause recursion
    - Add new, simplified policies for user access:
      - Admins can access all user records
      - Users can read their own records
      - No recursive policy checks
  
  2. Security
    - Maintains RLS protection
    - Prevents infinite recursion
    - Preserves necessary access controls
*/

-- Drop existing policies that are causing recursion
DROP POLICY IF EXISTS "admin_full_access" ON users;
DROP POLICY IF EXISTS "users_read_own" ON users;

-- Create new, non-recursive policies
CREATE POLICY "admins_full_access"
ON users
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
);

CREATE POLICY "users_read_own_data"
ON users
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);