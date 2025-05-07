/*
  # Fix recursive RLS policies on users table

  1. Changes
    - Drop existing problematic policies
    - Create new non-recursive policies for the users table
    
  2. Security
    - Enable RLS on users table (already enabled)
    - Add policy for public to view minimal user data
    - Add policy for users to read their own data
    - Add policy for admins to have full access
    
  Note: The previous policies were causing infinite recursion because they were 
  checking the users table within their own policies. The new policies use direct
  role checks against the authenticated user's JWT claims instead.
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins have full access" ON public.users;
DROP POLICY IF EXISTS "Public can view minimal user data" ON public.users;
DROP POLICY IF EXISTS "Users can read own data" ON public.users;

-- Recreate policies without recursion
CREATE POLICY "Public can view minimal user data"
ON public.users
FOR SELECT
TO public
USING (true);

CREATE POLICY "Users can read own data"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins have full access"
ON public.users
FOR ALL
TO authenticated
USING (auth.jwt() ->> 'role' = 'admin')
WITH CHECK (auth.jwt() ->> 'role' = 'admin');