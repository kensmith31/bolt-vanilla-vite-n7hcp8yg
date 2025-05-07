/*
  # Set all item categories to Unassigned with change tracking

  1. Changes
    - Update all items to use 'Unassigned' category
    - Track changes in item_change_history
    
  2. Security
    - Maintains existing RLS policies
*/

-- Disable trigger temporarily to handle the update manually
ALTER TABLE items DISABLE TRIGGER track_item_changes_trigger;

-- Update all items and track changes
WITH updated_items AS (
  SELECT 
    id,
    category as old_category,
    'Unassigned' as new_category
  FROM items
  WHERE category IS DISTINCT FROM 'Unassigned'
)
INSERT INTO item_change_history (
  item_id,
  field_name,
  old_value,
  new_value,
  user_name
)
SELECT 
  id,
  'category',
  to_jsonb(old_category),
  to_jsonb(new_category),
  'system'
FROM updated_items;

-- Now perform the actual update
UPDATE items
SET 
  category = 'Unassigned',
  updated_at = NOW();

-- Re-enable the trigger
ALTER TABLE items ENABLE TRIGGER track_item_changes_trigger;