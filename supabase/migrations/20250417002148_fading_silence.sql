/*
  # Add claim participants insert policy

  1. Security Changes
    - Add RLS policy to allow admins and desk adjusters to add new participants to claims
    - Policy ensures only authorized users can add participants

  2. Changes
    - Add new INSERT policy for claim_participants table
    - Policy checks if user has admin or desk_adjuster role
*/

CREATE POLICY "Allow admins and desk adjusters to add participants"
ON public.claim_participants
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if user is admin or desk adjuster
  (auth.jwt() ->> 'role')::text = ANY (ARRAY['admin'::text, 'desk_adjuster'::text])
  OR
  -- Or if user is already a participant in the claim with appropriate role
  EXISTS (
    SELECT 1 
    FROM claim_participants cp
    WHERE 
      cp.claim_id = claim_participants.claim_id 
      AND cp.user_id = auth.uid()
      AND cp.role IN ('admin', 'desk_adjuster')
  )
);