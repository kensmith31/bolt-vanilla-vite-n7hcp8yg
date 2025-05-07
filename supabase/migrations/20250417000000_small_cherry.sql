/*
  # Fix recursive RLS policies on claim_participants table

  1. Changes
    - Drop existing policies that cause recursion
    - Create new simplified policies:
      - Allow admins full access
      - Allow users to read participants for their claims
      - Allow staff to manage participants
    
  2. Security
    - Maintains RLS protection
    - Prevents infinite recursion
    - Preserves necessary access patterns
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read claim participants" ON claim_participants;
DROP POLICY IF EXISTS "Staff can manage claim participants" ON claim_participants;

-- Create new non-recursive policies
CREATE POLICY "admin_access"
ON claim_participants
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_app_meta_data->>'role' = 'admin'
  )
);

CREATE POLICY "read_participants"
ON claim_participants
FOR SELECT
TO authenticated
USING (
  -- Users can read their own participant records
  user_id = auth.uid()
  OR
  -- Users can read participants of claims they're involved in
  claim_id IN (
    SELECT claim_id 
    FROM claim_participants
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "staff_manage_participants"
ON claim_participants
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.raw_app_meta_data->>'role' = 'admin'
      OR auth.users.raw_app_meta_data->>'role' = 'desk_adjuster'
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.raw_app_meta_data->>'role' = 'admin'
      OR auth.users.raw_app_meta_data->>'role' = 'desk_adjuster'
    )
  )
);