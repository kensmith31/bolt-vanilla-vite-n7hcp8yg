/*
  # Enhanced User Management Policies

  1. Changes
    - Add comprehensive policies for user management
    - Enable full CRUD operations for admins
    - Maintain secure access control
  
  2. Security
    - Maintains row-level security
    - Ensures only admins can perform sensitive operations
    - Preserves user data privacy
*/

-- Drop existing policies
DROP POLICY IF EXISTS "admin_full_access" ON users;
DROP POLICY IF EXISTS "users_read_own" ON users;
DROP POLICY IF EXISTS "read_claim_participant_info" ON users;

-- Create comprehensive admin policy
CREATE POLICY "admin_full_access"
ON users
FOR ALL
TO authenticated
USING (auth.jwt() ->> 'role' = 'admin')
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Users can read their own record
CREATE POLICY "users_read_own"
ON users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Users can read basic info of claim participants
CREATE POLICY "read_claim_participant_info"
ON users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM claim_participants cp1
    WHERE 
      cp1.user_id = auth.uid() AND
      EXISTS (
        SELECT 1 FROM claim_participants cp2
        WHERE 
          cp2.claim_id = cp1.claim_id AND
          cp2.user_id = users.id
      )
  )
);

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;