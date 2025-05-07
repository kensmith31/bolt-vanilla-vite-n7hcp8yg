/*
  # Update items table RLS policies

  1. Changes
    - Drop existing policies
    - Add new policies that allow:
      - Admin, desk adjuster, and field adjuster roles to have full access
      - Policyholders to view and update their own items
    
  2. Security
    - Maintain RLS protection
    - Ensure proper role-based access control
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Any authenticated user can add items" ON items;
DROP POLICY IF EXISTS "Participants can read items" ON items;

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

-- Create policy for policyholders to read items for their claims
CREATE POLICY "policyholder_read_items"
ON items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM claim_participants
    WHERE claim_participants.claim_id = items.claim_id
    AND claim_participants.user_id = auth.uid()
    AND claim_participants.role = 'policyholder'
  )
);

-- Create policy for policyholders to update their own items
CREATE POLICY "policyholder_update_items"
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