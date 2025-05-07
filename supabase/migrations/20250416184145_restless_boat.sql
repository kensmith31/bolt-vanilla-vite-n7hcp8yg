-- Drop existing policies
DROP POLICY IF EXISTS "Admin full access" ON users;

-- Create simplified admin policy
CREATE POLICY "Admin full access"
  ON users
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Create user read-only policy
CREATE POLICY "Users can read own record"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);