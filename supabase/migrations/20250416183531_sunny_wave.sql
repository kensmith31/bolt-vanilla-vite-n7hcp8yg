/*
  # Enhanced admin authority for user management

  1. Changes
    - Update RLS policies to give admins full control
    - Simplify policy conditions for better performance
    - Ensure proper role-based access control

  2. Security
    - Maintains RLS protection
    - Strengthens admin privileges
    - Preserves user data isolation
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Users can read own record" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can update any user" ON users;
DROP POLICY IF EXISTS "Users can update own record" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;

-- Create enhanced admin policies
CREATE POLICY "Admin full access"
  ON users
  FOR ALL
  TO authenticated
  USING (
    CASE 
      WHEN auth.jwt() ->> 'role' = 'admin' THEN true
      WHEN auth.uid() = id THEN true
      ELSE false
    END
  )
  WITH CHECK (
    CASE 
      WHEN auth.jwt() ->> 'role' = 'admin' THEN true
      WHEN auth.uid() = id THEN true
      ELSE false
    END
  );