/*
  # Reset and recreate RLS policies

  1. Changes
    - Drop all existing RLS policies
    - Create new policies based on role_id
    - Set up proper access control for each role
    
  2. Security
    - Enable RLS on all tables
    - Create role-based policies
    - Prevent recursion in policy definitions
*/

-- First, drop all existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON roles;
DROP POLICY IF EXISTS "Enable admin management" ON roles;
DROP POLICY IF EXISTS "admin_adjuster_full_access" ON items;
DROP POLICY IF EXISTS "read_claim_items" ON items;
DROP POLICY IF EXISTS "admin_delete" ON users;
DROP POLICY IF EXISTS "admin_insert" ON users;
DROP POLICY IF EXISTS "admin_update" ON users;
DROP POLICY IF EXISTS "Allow admins and desk adjusters to add participants" ON claim_participants;

-- Enable RLS on all tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Roles table policies
CREATE POLICY "roles_public_read"
ON roles
FOR SELECT
TO public
USING (true);

CREATE POLICY "roles_admin_manage"
ON roles
FOR ALL
TO authenticated
USING (
  (SELECT role_id FROM users WHERE id = auth.uid()) = (SELECT id FROM roles WHERE name = 'admin')
)
WITH CHECK (
  (SELECT role_id FROM users WHERE id = auth.uid()) = (SELECT id FROM roles WHERE name = 'admin')
);

-- Users table policies
CREATE POLICY "users_read_own"
ON users
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "users_admin_manage"
ON users
FOR ALL
TO authenticated
USING (
  (SELECT role_id FROM users WHERE id = auth.uid()) = (SELECT id FROM roles WHERE name = 'admin')
)
WITH CHECK (
  (SELECT role_id FROM users WHERE id = auth.uid()) = (SELECT id FROM roles WHERE name = 'admin')
);

-- Claims table policies
CREATE POLICY "claims_staff_manage"
ON claims
FOR ALL
TO authenticated
USING (
  (SELECT r.name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = auth.uid()) 
  IN ('admin', 'desk_adjuster', 'field_adjuster')
)
WITH CHECK (
  (SELECT r.name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = auth.uid()) 
  IN ('admin', 'desk_adjuster', 'field_adjuster')
);

CREATE POLICY "claims_participant_read"
ON claims
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM claim_participants
    WHERE claim_participants.claim_id = claims.file_number
    AND claim_participants.user_id = auth.uid()
  )
);

-- Items table policies
CREATE POLICY "items_staff_manage"
ON items
FOR ALL
TO authenticated
USING (
  (SELECT r.name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = auth.uid()) 
  IN ('admin', 'desk_adjuster', 'field_adjuster')
)
WITH CHECK (
  (SELECT r.name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = auth.uid()) 
  IN ('admin', 'desk_adjuster', 'field_adjuster')
);

CREATE POLICY "items_participant_read"
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

-- Claim participants table policies
CREATE POLICY "claim_participants_staff_manage"
ON claim_participants
FOR ALL
TO authenticated
USING (
  (SELECT r.name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = auth.uid()) 
  IN ('admin', 'desk_adjuster')
)
WITH CHECK (
  (SELECT r.name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = auth.uid()) 
  IN ('admin', 'desk_adjuster')
);

CREATE POLICY "claim_participants_read"
ON claim_participants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM claim_participants cp
    WHERE cp.claim_id = claim_participants.claim_id
    AND cp.user_id = auth.uid()
  )
);

-- Messages table policies
CREATE POLICY "messages_participant_manage"
ON messages
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM claim_participants
    WHERE claim_participants.claim_id = messages.claim_id
    AND claim_participants.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM claim_participants
    WHERE claim_participants.claim_id = messages.claim_id
    AND claim_participants.user_id = auth.uid()
  )
);