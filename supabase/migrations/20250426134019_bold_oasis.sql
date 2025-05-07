/*
  # Update existing users with roles

  1. Changes
    - Update admin@example.com to admin role
    - Set all other users to policyholder role by default
    - Ensure all users have a valid role_id
  
  2. Security
    - Maintains existing RLS policies
    - Preserves user access levels
*/

-- Update admin user
UPDATE users
SET role_id = (SELECT id FROM roles WHERE name = 'admin')
WHERE email = 'admin@example.com';

-- Set remaining users to policyholder role if they don't have a role
UPDATE users
SET role_id = (SELECT id FROM roles WHERE name = 'policyholder')
WHERE role_id IS NULL;