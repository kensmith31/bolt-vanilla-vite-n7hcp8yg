/*
  # Create admin user

  1. Changes
    - Update user role to 'admin' for admin@example.com
  
  2. Security
    - Maintains existing RLS policies
    - Only modifies single user record
*/

UPDATE public.users
SET role = 'admin'
WHERE email = 'admin@example.com';