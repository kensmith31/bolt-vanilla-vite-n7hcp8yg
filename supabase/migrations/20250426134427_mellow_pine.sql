/*
  # Remove user_role enum and update dependent tables

  1. Changes
    - Drop policies that depend on role columns first
    - Add role_id to dependent tables
    - Update data to use role_id
    - Drop old role columns
    - Create new policies using role_id
    
  2. Security
    - Maintain existing access control
    - Update policies to use new role structure
*/

-- First drop all dependent policies
DROP POLICY IF EXISTS "admin_delete" ON users;
DROP POLICY IF EXISTS "admin_insert" ON users;
DROP POLICY IF EXISTS "admin_update" ON users;
DROP POLICY IF EXISTS "Allow admins and desk adjusters to add participants" ON claim_participants;

-- Add role_id to claim_participants
ALTER TABLE claim_participants
ADD COLUMN role_id uuid REFERENCES roles(id);

-- Update claim_participants role_id based on role
UPDATE claim_participants
SET role_id = r.id
FROM roles r
WHERE r.name = claim_participants.role::text;

-- Make role_id required
ALTER TABLE claim_participants
ALTER COLUMN role_id SET NOT NULL;

-- Now we can safely drop the role column
ALTER TABLE claim_participants
DROP COLUMN role;

-- Add role_id to messages
ALTER TABLE messages
ADD COLUMN role_id uuid REFERENCES roles(id);

-- Update messages role_id based on sender_role
UPDATE messages
SET role_id = r.id
FROM roles r
WHERE r.name = messages.sender_role::text;

-- Make role_id required
ALTER TABLE messages
ALTER COLUMN role_id SET NOT NULL;

-- Drop sender_role column
ALTER TABLE messages
DROP COLUMN sender_role;

-- Drop the role column from users
ALTER TABLE users DROP COLUMN role;

-- Now we can safely drop the enum type
DROP TYPE user_role;

-- Create new policies using role_id
CREATE POLICY "admin_delete"
ON users
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.id = auth.uid()
    AND r.name = 'admin'
  )
);

CREATE POLICY "admin_insert"
ON users
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.id = auth.uid()
    AND r.name = 'admin'
  )
);

CREATE POLICY "admin_update"
ON users
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.id = auth.uid()
    AND r.name = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.id = auth.uid()
    AND r.name = 'admin'
  )
);

-- Recreate claim_participants policy
CREATE POLICY "Allow admins and desk adjusters to add participants"
ON claim_participants
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.id = auth.uid()
    AND r.name IN ('admin', 'desk_adjuster')
  )
  OR
  EXISTS (
    SELECT 1 FROM claim_participants cp
    JOIN roles r ON r.id = cp.role_id
    WHERE cp.claim_id = claim_participants.claim_id
    AND cp.user_id = auth.uid()
    AND r.name IN ('admin', 'desk_adjuster')
  )
);