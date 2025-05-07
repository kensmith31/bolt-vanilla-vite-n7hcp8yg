/*
  # Fix duplicate categories and add constraints

  1. Changes
    - Remove duplicate categories
    - Add unique constraint on categories.name
    - Update items to use valid categories
    - Add foreign key constraint
  
  2. Security
    - Maintains existing RLS policies
    - Ensures data integrity
*/

-- First remove any duplicate categories, keeping the one with lowest id
DELETE FROM categories a USING categories b
WHERE a.name = b.name 
AND a.id > b.id;

-- Now we can safely add the unique constraint
ALTER TABLE categories
DROP CONSTRAINT IF EXISTS categories_name_unique;

ALTER TABLE categories
ADD CONSTRAINT categories_name_unique UNIQUE (name);

-- Update any NULL or empty categories to 'Unassigned'
UPDATE items
SET 
  category = 'Unassigned',
  updated_at = NOW()
WHERE category IS NULL OR category = '';

-- Update any non-matching categories to 'Unassigned'
UPDATE items
SET 
  category = 'Unassigned',
  updated_at = NOW()
WHERE category NOT IN (
  SELECT name 
  FROM categories
);

-- Add foreign key constraint
ALTER TABLE items
DROP CONSTRAINT IF EXISTS fk_items_category;

ALTER TABLE items
ADD CONSTRAINT fk_items_category
FOREIGN KEY (category) 
REFERENCES categories(name)
ON UPDATE CASCADE;