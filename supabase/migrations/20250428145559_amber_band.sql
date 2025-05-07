/*
  # Update items table to use category_id

  1. Changes
    - Add category_id column to items table
    - Migrate existing category names to IDs
    - Update foreign key constraint
    - Add index for performance
    
  2. Security
    - Maintains existing RLS policies
    - Ensures data integrity with foreign key constraint
*/

-- First add the new column
ALTER TABLE items
ADD COLUMN category_id bigint;

-- Update the new column with category IDs based on existing category names
UPDATE items i
SET category_id = c.id
FROM categories c
WHERE i.category = c.name;

-- Drop the old foreign key constraint
ALTER TABLE items
DROP CONSTRAINT IF EXISTS fk_items_category;

-- Drop the old category column
ALTER TABLE items
DROP COLUMN category;

-- Add foreign key constraint for the new column
ALTER TABLE items
ADD CONSTRAINT fk_items_category_id
FOREIGN KEY (category_id)
REFERENCES categories(id)
ON UPDATE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_items_category_id ON items(category_id);