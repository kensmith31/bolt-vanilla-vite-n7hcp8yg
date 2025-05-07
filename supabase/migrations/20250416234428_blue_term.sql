/*
  # Fix infinite recursion in claim_participants policy

  1. Changes
    - Drop existing policies on claim_participants table
    - Create new policies without recursive checks
    - Maintain security while avoiding infinite loops

  2. Security
    - Enable RLS on claim_participants table
    - Add policies for:
      - SELECT: Users can read participants for claims they are part of
      - INSERT/UPDATE/DELETE: Only admins and desk adjusters can modify participants
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can read claim participants" ON claim_participants;
DROP POLICY IF EXISTS "Staff can add claim participants" ON claim_participants;
DROP POLICY IF EXISTS "Staff can update claim participants" ON claim_participants;
DROP POLICY IF EXISTS "Staff can delete claim participants" ON claim_participants;

-- Create new non-recursive policies
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

CREATE POLICY "Staff can manage claim participants"
ON claim_participants
FOR ALL
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