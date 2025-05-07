/*
  # Update items table RLS policies

  1. Changes
    - Drop existing policies
    - Add new policies for admin and adjuster roles
    - Maintain read access for claim participants
    
  2. Security
    - Enable RLS
    - Allow full access for admin and adjuster roles
    - Preserve read access for claim participants
*/

-- Drop existing policies
DROP POLICY IF EXISTS "staff_full_access" ON items;
DROP POLICY IF EXISTS "read_claim_items" ON items;
DROP POLICY IF EXISTS "update_own_items" ON items;

-- Enable RLS
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Create policy for admin and adjuster full access
CREATE POLICY "admin_adjuster_full_access"
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