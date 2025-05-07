/*
  # Fix items table access policies

  1. Changes
    - Drop existing policies that may be too restrictive
    - Add new policies for:
      - Staff to have full access
      - Claim participants to read items
      - Policyholders to update their items
    
  2. Security
    - Maintain RLS protection
    - Allow proper access based on user role and claim participation
*/

-- Drop existing policies
DROP POLICY IF EXISTS "staff_full_access" ON items;
DROP POLICY IF EXISTS "policyholder_read_items" ON items;
DROP POLICY IF EXISTS "policyholder_update_items" ON items;

-- Enable RLS
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Create policy for staff roles to have full access
CREATE POLICY "staff_full_access"
ON items
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' IN ('admin', 'desk_adjuster', 'field_adjuster')
)
WITH CHECK (
  auth.jwt() ->> 'role' IN ('admin', 'desk_adjuster', 'field_adjuster')
);

-- Create policy for claim participants to read items
CREATE POLICY "read_claim_items"
ON items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM claim_participants
    WHERE claim_participants.claim_id = items.claim_id
    AND claim_participants.user_id = auth.uid()
  )
);

-- Create policy for policyholders to update their items
CREATE POLICY "update_own_items"
ON items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM claim_participants
    WHERE claim_participants.claim_id = items.claim_id
    AND claim_participants.user_id = auth.uid()
    AND claim_participants.role = 'policyholder'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM claim_participants
    WHERE claim_participants.claim_id = items.claim_id
    AND claim_participants.user_id = auth.uid()
    AND claim_participants.role = 'policyholder'
  )
);