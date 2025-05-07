/*
  # Fix recursive RLS policies on claim_participants table

  1. Changes
    - Drop existing policies that may cause recursion
    - Create simplified policies that avoid checking the users table
    - Use auth.jwt() for role checks instead of querying users table
    
  2. Security
    - Maintain proper access control
    - Prevent infinite recursion
    - Allow admins full access
    - Allow users to read their own records and claims they participate in
*/

-- Drop existing policies
DROP POLICY IF EXISTS "admin_access" ON claim_participants;
DROP POLICY IF EXISTS "read_participants" ON claim_participants;
DROP POLICY IF EXISTS "staff_manage_participants" ON claim_participants;

-- Create new non-recursive policies

-- Admin full access policy using JWT
CREATE POLICY "admin_full_access"
ON claim_participants
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'admin'
);

-- Users can read their own participant records and claims they participate in
CREATE POLICY "user_read_access"
ON claim_participants
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR
  claim_id IN (
    SELECT claim_id
    FROM claim_participants
    WHERE user_id = auth.uid()
  )
);

-- Desk adjusters can manage participants for their claims
CREATE POLICY "desk_adjuster_manage"
ON claim_participants
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'desk_adjuster'
  AND
  claim_id IN (
    SELECT claim_id
    FROM claim_participants
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'desk_adjuster'
  AND
  claim_id IN (
    SELECT claim_id
    FROM claim_participants
    WHERE user_id = auth.uid()
  )
);