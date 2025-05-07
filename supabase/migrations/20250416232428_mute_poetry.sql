/*
  # Update claims table select policy

  1. Security Changes
    - Drop existing select policy
    - Create new select policy that allows:
      - Admins to view all claims
      - Desk/Field adjusters to view all claims
      - Policyholders to view only their own claims
*/

-- Drop existing select policy
DROP POLICY IF EXISTS "Participants can read claims" ON claims;

-- Create new select policy
CREATE POLICY "Users can read claims"
ON claims
FOR SELECT
TO authenticated
USING (
  -- Admins can view all claims
  (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  ))
  OR
  -- Desk adjusters can view all claims
  (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'desk_adjuster'
  ))
  OR
  -- Field adjusters can view all claims
  (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'field_adjuster'
  ))
  OR
  -- Policyholders can only view their own claims
  (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'policyholder'
    )
  )
);