/*
  # Enable full access to all tables
  
  1. Changes
    - Drop all existing RLS policies
    - Create new policies allowing full access for authenticated users
    - Keep RLS enabled but allow all operations
    
  2. Security
    - Maintains RLS framework
    - Allows all authenticated users full access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "roles_read_access_policy" ON roles;
DROP POLICY IF EXISTS "roles_admin_management_policy" ON roles;
DROP POLICY IF EXISTS "enable_read_for_authenticated_users" ON users;
DROP POLICY IF EXISTS "users_manage_own_profile" ON users;
DROP POLICY IF EXISTS "admin_manage_all_users" ON users;
DROP POLICY IF EXISTS "claims_staff_manage" ON claims;
DROP POLICY IF EXISTS "claims_participant_read" ON claims;
DROP POLICY IF EXISTS "items_staff_manage" ON items;
DROP POLICY IF EXISTS "items_participant_read" ON items;
DROP POLICY IF EXISTS "claim_participants_staff_manage" ON claim_participants;
DROP POLICY IF EXISTS "claim_participants_read" ON claim_participants;
DROP POLICY IF EXISTS "messages_participant_manage" ON messages;

-- Create full access policies for all tables
CREATE POLICY "full_access" ON roles
FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "full_access" ON users
FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "full_access" ON claims
FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "full_access" ON items
FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "full_access" ON claim_participants
FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "full_access" ON messages
FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- Ensure RLS remains enabled on all tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;