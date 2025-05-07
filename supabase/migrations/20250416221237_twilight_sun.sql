/*
  # Fix User Management Policies

  1. Changes
    - Drop existing policies
    - Create comprehensive policies for admin CRUD operations
    - Maintain user read access policies
  
  2. Security
    - Enable RLS
    - Ensure proper admin access for all operations
    - Maintain data isolation
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can read claim participants" ON users;

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create comprehensive admin policies
CREATE POLICY "admin_read"
ON users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'::user_role
  )
);

CREATE POLICY "admin_insert"
ON users
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'::user_role
  )
);

CREATE POLICY "admin_update"
ON users
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'::user_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'::user_role
  )
);

CREATE POLICY "admin_delete"
ON users
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'::user_role
  )
);

-- Create user read policies
CREATE POLICY "users_read_own"
ON users
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);

CREATE POLICY "users_read_claim_participants"
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