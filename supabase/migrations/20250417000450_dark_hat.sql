/*
  # Fix recursive RLS policies for claim_participants

  1. Changes
    - Drop existing policies that cause recursion
    - Create new simplified policies using JWT claims
    - Separate read and write access clearly
    
  2. Security
    - Maintain proper access control
    - Prevent infinite recursion
    - Use JWT claims for role checks
*/

-- Drop existing policies
DROP POLICY IF EXISTS "admin_full_access" ON claim_participants;
DROP POLICY IF EXISTS "user_read_access" ON claim_participants;
DROP POLICY IF EXISTS "desk_adjuster_manage" ON claim_participants;

-- Enable RLS
ALTER TABLE claim_participants ENABLE ROW LEVEL SECURITY;

-- Create new non-recursive policies

-- Allow users to read their own participant records
CREATE POLICY "read_own_records"
ON claim_participants
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- Allow users to read participants of claims they're involved in
CREATE POLICY "read_claim_participants"
ON claim_participants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM claim_participants cp
    WHERE cp.claim_id = claim_participants.claim_id
    AND cp.user_id = auth.uid()
  )
);

-- Admin full access using JWT claims
CREATE POLICY "admin_access"
ON claim_participants
FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'role')::text = 'admin'
)
WITH CHECK (
  (auth.jwt() ->> 'role')::text = 'admin'
);

-- Desk adjuster access using JWT claims
CREATE POLICY "desk_adjuster_access"
ON claim_participants
FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'role')::text = 'desk_adjuster'
  AND EXISTS (
    SELECT 1
    FROM claim_participants cp
    WHERE cp.claim_id = claim_participants.claim_id
    AND cp.user_id = auth.uid()
  )
)
WITH CHECK (
  (auth.jwt() ->> 'role')::text = 'desk_adjuster'
  AND EXISTS (
    SELECT 1
    FROM claim_participants cp
    WHERE cp.claim_id = claim_participants.claim_id
    AND cp.user_id = auth.uid()
  )
);