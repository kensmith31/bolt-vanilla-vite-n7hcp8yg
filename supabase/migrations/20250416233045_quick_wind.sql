/*
  # Update claims to use claim participants

  1. Changes
    - Drop policy that depends on assigned_adjuster
    - Remove assigned_adjuster from claims table
    - Add policies for claim_participants table

  2. Security
    - Enable RLS on claim_participants table
    - Add policies for CRUD operations on claim_participants
*/

-- First, drop the policy that depends on assigned_adjuster
DROP POLICY IF EXISTS "Users can update their claims" ON claims;

-- Now we can safely drop the column
ALTER TABLE claims DROP COLUMN IF EXISTS assigned_adjuster;

-- Create new update policy for claims that uses claim_participants instead
CREATE POLICY "Users can update their claims"
ON claims
FOR UPDATE
TO authenticated
USING (
  -- Allow admins to update any claim
  (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  ))
  OR
  -- Allow adjusters to update claims they participate in
  (EXISTS (
    SELECT 1 FROM claim_participants
    WHERE claim_participants.claim_id = claims.file_number
    AND claim_participants.user_id = auth.uid()
    AND claim_participants.role IN ('desk_adjuster', 'field_adjuster')
  ))
  OR
  -- Allow policyholders to update their own claims
  (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'policyholder'
    )
  )
)
WITH CHECK (
  -- Same conditions as USING clause
  (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  ))
  OR
  (EXISTS (
    SELECT 1 FROM claim_participants
    WHERE claim_participants.claim_id = claims.file_number
    AND claim_participants.user_id = auth.uid()
    AND claim_participants.role IN ('desk_adjuster', 'field_adjuster')
  ))
  OR
  (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'policyholder'
    )
  )
);

-- Enable RLS on claim_participants
ALTER TABLE claim_participants ENABLE ROW LEVEL SECURITY;

-- Policy for creating claim participants
CREATE POLICY "Staff can add claim participants"
ON claim_participants
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow admins to add participants
  (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  ))
  OR
  -- Allow desk adjusters to add participants to their claims
  (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'desk_adjuster'
    AND EXISTS (
      SELECT 1 FROM claim_participants cp
      WHERE cp.claim_id = claim_participants.claim_id
      AND cp.user_id = auth.uid()
    )
  ))
  OR
  -- Allow field adjusters to add participants to their claims
  (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'field_adjuster'
    AND EXISTS (
      SELECT 1 FROM claim_participants cp
      WHERE cp.claim_id = claim_participants.claim_id
      AND cp.user_id = auth.uid()
    )
  ))
);

-- Policy for reading claim participants
CREATE POLICY "Users can read claim participants"
ON claim_participants
FOR SELECT
TO authenticated
USING (
  -- Users can read participants for claims they're involved in
  EXISTS (
    SELECT 1 FROM claim_participants cp
    WHERE cp.claim_id = claim_participants.claim_id
    AND cp.user_id = auth.uid()
  )
  OR
  -- Admins can read all claim participants
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Policy for updating claim participants
CREATE POLICY "Staff can update claim participants"
ON claim_participants
FOR UPDATE
TO authenticated
USING (
  -- Allow admins to update participants
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
  OR
  -- Allow desk adjusters to update participants of their claims
  (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'desk_adjuster'
    AND EXISTS (
      SELECT 1 FROM claim_participants cp
      WHERE cp.claim_id = claim_participants.claim_id
      AND cp.user_id = auth.uid()
    )
  ))
  OR
  -- Allow field adjusters to update participants of their claims
  (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'field_adjuster'
    AND EXISTS (
      SELECT 1 FROM claim_participants cp
      WHERE cp.claim_id = claim_participants.claim_id
      AND cp.user_id = auth.uid()
    )
  ))
)
WITH CHECK (
  -- Same conditions as USING clause
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
  OR
  (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'desk_adjuster'
    AND EXISTS (
      SELECT 1 FROM claim_participants cp
      WHERE cp.claim_id = claim_participants.claim_id
      AND cp.user_id = auth.uid()
    )
  ))
  OR
  (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'field_adjuster'
    AND EXISTS (
      SELECT 1 FROM claim_participants cp
      WHERE cp.claim_id = claim_participants.claim_id
      AND cp.user_id = auth.uid()
    )
  ))
);

-- Policy for deleting claim participants
CREATE POLICY "Staff can delete claim participants"
ON claim_participants
FOR DELETE
TO authenticated
USING (
  -- Allow admins to delete participants
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
  OR
  -- Allow desk adjusters to delete participants from their claims
  (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'desk_adjuster'
    AND EXISTS (
      SELECT 1 FROM claim_participants cp
      WHERE cp.claim_id = claim_participants.claim_id
      AND cp.user_id = auth.uid()
    )
  ))
  OR
  -- Allow field adjusters to delete participants from their claims
  (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'field_adjuster'
    AND EXISTS (
      SELECT 1 FROM claim_participants cp
      WHERE cp.claim_id = claim_participants.claim_id
      AND cp.user_id = auth.uid()
    )
  ))
);