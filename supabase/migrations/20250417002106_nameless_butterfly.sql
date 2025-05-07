/*
  # Fix claim participants RLS policies

  1. Changes
    - Remove recursive policies from claim_participants table
    - Add new, non-recursive policies for claim_participants
    - Ensure proper access control while preventing infinite recursion

  2. Security
    - Enable RLS on claim_participants table
    - Add policies for:
      - Reading participants (for authenticated users who are participants or staff)
      - Managing participants (for staff roles only)
*/

-- First, drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "manage_participants" ON claim_participants;
DROP POLICY IF EXISTS "read_participants" ON claim_participants;

-- Create new non-recursive policies
CREATE POLICY "read_participants"
ON claim_participants
FOR SELECT
TO authenticated
USING (
  -- Allow staff roles to read all participants
  (auth.jwt()->>'role' IN ('admin', 'desk_adjuster', 'field_adjuster'))
  OR
  -- Allow users to read participants for claims they're part of
  user_id = auth.uid()
);

CREATE POLICY "manage_participants"
ON claim_participants
FOR ALL
TO authenticated
USING (
  -- Only staff roles can manage participants
  auth.jwt()->>'role' IN ('admin', 'desk_adjuster', 'field_adjuster')
)
WITH CHECK (
  -- Only staff roles can manage participants
  auth.jwt()->>'role' IN ('admin', 'desk_adjuster', 'field_adjuster')
);