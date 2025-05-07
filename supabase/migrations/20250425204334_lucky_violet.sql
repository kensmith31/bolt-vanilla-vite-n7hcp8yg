/*
  # Update items table RLS policies

  1. Changes
    - Drop existing policies on items table
    - Add new policy to allow any authenticated user to insert items
    - Add policy for reading items based on claim participation
    
  2. Security
    - Enable RLS on items table
    - Ensure proper access control for reading items
    - Allow all authenticated users to add items
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Participants can read items" ON items;

-- Enable RLS
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user to insert items
CREATE POLICY "Any authenticated user can add items"
ON items
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow participants to read items
CREATE POLICY "Participants can read items"
ON items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM claim_participants
    WHERE claim_participants.claim_id = items.claim_id
    AND claim_participants.user_id = auth.uid()
  )
);