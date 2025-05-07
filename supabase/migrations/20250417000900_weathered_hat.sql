/*
  # Update claims and claim_participants policies

  1. Changes
    - Drop existing policies
    - Create new policies for claims and claim_participants
    - Add automatic participant creation trigger
    
  2. Security
    - Enable RLS on both tables
    - Ensure proper access control
    - Prevent recursion in policies
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read claims" ON claims;
DROP POLICY IF EXISTS "Staff can create claims" ON claims;
DROP POLICY IF EXISTS "Users can update their claims" ON claims;

DROP POLICY IF EXISTS "read_own_records" ON claim_participants;
DROP POLICY IF EXISTS "read_claim_participants" ON claim_participants;
DROP POLICY IF EXISTS "admin_access" ON claim_participants;
DROP POLICY IF EXISTS "desk_adjuster_access" ON claim_participants;

-- Enable RLS
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_participants ENABLE ROW LEVEL SECURITY;

-- Claims policies
CREATE POLICY "staff_create_claims"
ON claims
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'role' IN ('admin', 'desk_adjuster', 'field_adjuster')
);

CREATE POLICY "read_claims"
ON claims
FOR SELECT
TO authenticated
USING (
  -- Staff can read all claims
  auth.jwt() ->> 'role' IN ('admin', 'desk_adjuster', 'field_adjuster')
  OR
  -- Users can read claims they participate in
  EXISTS (
    SELECT 1
    FROM claim_participants
    WHERE claim_participants.claim_id = claims.file_number
    AND claim_participants.user_id = auth.uid()
  )
);

CREATE POLICY "update_claims"
ON claims
FOR UPDATE
TO authenticated
USING (
  -- Staff can update all claims
  auth.jwt() ->> 'role' IN ('admin', 'desk_adjuster', 'field_adjuster')
  OR
  -- Users can update claims they participate in
  EXISTS (
    SELECT 1
    FROM claim_participants
    WHERE claim_participants.claim_id = claims.file_number
    AND claim_participants.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.jwt() ->> 'role' IN ('admin', 'desk_adjuster', 'field_adjuster')
  OR
  EXISTS (
    SELECT 1
    FROM claim_participants
    WHERE claim_participants.claim_id = claims.file_number
    AND claim_participants.user_id = auth.uid()
  )
);

-- Claim participants policies
CREATE POLICY "read_participants"
ON claim_participants
FOR SELECT
TO authenticated
USING (
  -- Users can read their own participant records
  user_id = auth.uid()
  OR
  -- Users can read participants of claims they're involved in
  EXISTS (
    SELECT 1
    FROM claim_participants cp
    WHERE cp.claim_id = claim_participants.claim_id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "manage_participants"
ON claim_participants
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' IN ('admin', 'desk_adjuster', 'field_adjuster')
  AND
  EXISTS (
    SELECT 1
    FROM claim_participants cp
    WHERE cp.claim_id = claim_participants.claim_id
    AND cp.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.jwt() ->> 'role' IN ('admin', 'desk_adjuster', 'field_adjuster')
  AND
  EXISTS (
    SELECT 1
    FROM claim_participants cp
    WHERE cp.claim_id = claim_participants.claim_id
    AND cp.user_id = auth.uid()
  )
);

-- Create trigger function to automatically add creator as participant
CREATE OR REPLACE FUNCTION public.add_claim_creator_as_participant()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.claim_participants (
    claim_id,
    user_id,
    role,
    added_by
  ) VALUES (
    NEW.file_number,
    NEW.created_by,
    (SELECT role FROM public.users WHERE id = NEW.created_by),
    NEW.created_by
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS add_claim_creator_trigger ON public.claims;
CREATE TRIGGER add_claim_creator_trigger
  AFTER INSERT ON public.claims
  FOR EACH ROW
  EXECUTE FUNCTION public.add_claim_creator_as_participant();