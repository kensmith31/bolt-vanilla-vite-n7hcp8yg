/*
  # Fix user management policies

  1. Changes
    - Drop existing policies
    - Create new policies for:
      - Authenticated users can read all users
      - Users can update their own profile
      - Admins can manage all users
    
  2. Security
    - Maintain RLS protection
    - Use role_id for admin checks
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "users_admin_manage" ON users;
DROP POLICY IF EXISTS "users_read_own" ON users;
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;

-- Create new non-recursive policies
CREATE POLICY "enable_read_for_authenticated_users"
ON users FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "users_manage_own_profile"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "admin_manage_all_users"
ON users FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM roles
    WHERE id = (SELECT role_id FROM users WHERE id = auth.uid())
    AND name = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM roles
    WHERE id = (SELECT role_id FROM users WHERE id = auth.uid())
    AND name = 'admin'
  )
);