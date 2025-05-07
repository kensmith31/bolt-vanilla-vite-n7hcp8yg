/*
  # Add RLS policies for claims table

  1. Security Changes
    - Add policy to allow authenticated users to create claims
    - Add policy to allow authenticated users to update their own claims
    - Add policy to allow admins to update any claim
    - Add policy to allow desk adjusters to update assigned claims

  Note: The existing SELECT policy already allows participants to read claims
*/

-- Policy for creating claims
CREATE POLICY "Users can create claims"
ON claims
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow admins to create claims for anyone
  (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  ))
  OR
  -- Allow desk adjusters to create claims
  (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'desk_adjuster'
  ))
  OR
  -- Allow field adjusters to create claims
  (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'field_adjuster'
  ))
  OR
  -- Allow policyholders to create claims where they are the created_by
  (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'policyholder'
    )
  )
);

-- Policy for updating claims
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
  -- Allow desk adjusters to update their assigned claims
  (
    assigned_adjuster = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'desk_adjuster'
    )
  )
  OR
  -- Allow field adjusters to update their assigned claims
  (
    assigned_adjuster = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'field_adjuster'
    )
  )
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
  (
    assigned_adjuster = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'desk_adjuster'
    )
  )
  OR
  (
    assigned_adjuster = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'field_adjuster'
    )
  )
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