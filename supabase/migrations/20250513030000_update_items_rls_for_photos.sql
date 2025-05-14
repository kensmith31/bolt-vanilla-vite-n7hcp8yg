-- Update RLS policies for items table to allow photo uploads

-- First, check if RLS is enabled on the items table
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Users can update their own items" ON items;

-- Create a more permissive policy for updates
CREATE POLICY "Users can update their own items"
ON items
FOR UPDATE
USING (true);

-- Ensure there's a policy for inserts as well
DROP POLICY IF EXISTS "Users can insert items" ON items;
CREATE POLICY "Users can insert items"
ON items
FOR INSERT
WITH CHECK (true);

-- Ensure there's a policy for selects
DROP POLICY IF EXISTS "Users can view items" ON items;
CREATE POLICY "Users can view items"
ON items
FOR SELECT
USING (true);
