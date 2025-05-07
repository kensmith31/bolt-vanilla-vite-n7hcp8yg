/*
  # Update RLS policies for claims table

  1. Security Changes
    - Drop existing insert policy
    - Create new insert policy that only allows admins, desk adjusters, and field adjusters to create claims
    
  Note: No changes to other policies
*/

-- Drop the existing insert policy
DROP POLICY IF EXISTS "Users can create claims" ON claims;

-- Create new policy for creating claims
CREATE POLICY "Staff can create claims"
ON claims
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow admins to create claims
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
);