/*
  # Fix users table RLS policies

  1. Changes
    - Remove existing policies that cause recursion
    - Add new, simplified policies for user access:
      - Allow users to read their own record
      - Allow admins full access
      - Allow users to read basic info of other users they share claims with
  
  2. Security
    - Maintains row-level security
    - Prevents infinite recursion
    - Preserves necessary access patterns
*/

-- Drop existing policies to replace them with fixed versions
DROP POLICY IF EXISTS "Admin full access" ON users;
DROP POLICY IF EXISTS "Users can read own record" ON users;
DROP POLICY IF EXISTS "Users can read role info of claim participants" ON users;

-- Create new, simplified policies
-- Admin full access policy
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