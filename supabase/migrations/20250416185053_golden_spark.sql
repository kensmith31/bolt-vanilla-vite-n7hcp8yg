/*
  # Fix Users Table RLS Policies

  1. Changes
    - Drop existing problematic policies on users table
    - Create new, optimized policies that avoid recursion:
      - Allow admins full access without recursive checks
      - Allow users to read their own record directly
      - Allow users to read role information of other users they interact with in claims
  
  2. Security
    - Maintains row-level security
    - Ensures users can only access appropriate data
    - Prevents infinite recursion in policy evaluation
*/

-- Drop existing policies to replace them
DROP POLICY IF EXISTS "Admin full access" ON users;
DROP POLICY IF EXISTS "Users can read own record" ON users;

-- Create new, optimized policies
CREATE POLICY "Admin full access" ON users
FOR ALL TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
);

CREATE POLICY "Users can read own record" ON users
FOR SELECT TO authenticated
USING (
  auth.uid() = id
);

-- Allow users to read role information of users they interact with in claims
CREATE POLICY "Users can read role info of claim participants" ON users
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM claim_participants cp
    WHERE 
      cp.user_id = auth.uid() AND
      EXISTS (
        SELECT 1 FROM claim_participants cp2
        WHERE cp2.claim_id = cp.claim_id AND cp2.user_id = users.id
      )
  )
);