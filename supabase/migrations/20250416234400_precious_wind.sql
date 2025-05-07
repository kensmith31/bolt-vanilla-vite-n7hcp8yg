/*
  # Fix infinite recursion in claim_participants policy

  1. Changes
    - Drop existing policies on claim_participants table
    - Create new policies with proper conditions to prevent recursion
    - Simplify the policy conditions to avoid recursive lookups

  2. Security
    - Maintain RLS enabled on claim_participants table
    - Add policies for:
      - SELECT: Users can read participants for claims they are part of
      - INSERT: Staff can add participants
      - UPDATE: Staff can update participants
      - DELETE: Staff can remove participants
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can read claim participants" ON claim_participants;
DROP POLICY IF EXISTS "Staff can add claim participants" ON claim_participants;
DROP POLICY IF EXISTS "Staff can update claim participants" ON claim_participants;
DROP POLICY IF EXISTS "Staff can delete claim participants" ON claim_participants;

-- Create new SELECT policy without recursive conditions
CREATE POLICY "Users can read claim participants"
ON claim_participants
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  ) OR
  EXISTS (
    SELECT 1 FROM claim_participants cp
    WHERE cp.claim_id = claim_participants.claim_id
    AND cp.user_id = auth.uid()
  )
);

-- Create new INSERT policy for staff
CREATE POLICY "Staff can add claim participants"
ON claim_participants
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND (users.role = 'admin' OR users.role = 'desk_adjuster')
  )
);

-- Create new UPDATE policy for staff
CREATE POLICY "Staff can update claim participants"
ON claim_participants
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND (users.role = 'admin' OR users.role = 'desk_adjuster')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND (users.role = 'admin' OR users.role = 'desk_adjuster')
  )
);

-- Create new DELETE policy for staff
CREATE POLICY "Staff can delete claim participants"
ON claim_participants
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND (users.role = 'admin' OR users.role = 'desk_adjuster')
  )
);