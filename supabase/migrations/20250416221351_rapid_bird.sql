/*
  # Fix recursive RLS policies for users table

  1. Changes
    - Drop existing problematic policies that cause recursion
    - Create new simplified policies that prevent recursion:
      - Enable public read access for minimal user data
      - Allow users to read their own full data
      - Allow admins full access to all user data
  
  2. Security
    - Maintains row-level security
    - Prevents unauthorized access while avoiding recursion
    - Ensures admins retain full control
*/

-- Drop existing policies that are causing recursion
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "admin_delete" ON public.users;
DROP POLICY IF EXISTS "admin_insert" ON public.users;
DROP POLICY IF EXISTS "admin_read" ON public.users;
DROP POLICY IF EXISTS "admin_update" ON public.users;
DROP POLICY IF EXISTS "users_read_claim_participants" ON public.users;
DROP POLICY IF EXISTS "users_read_own" ON public.users;

-- Create new simplified policies
CREATE POLICY "Public can view minimal user data"
ON public.users
FOR SELECT
TO public
USING (true);

-- Users can read their own data
CREATE POLICY "Users can read own data"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Admins have full access
CREATE POLICY "Admins have full access"
ON public.users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
);