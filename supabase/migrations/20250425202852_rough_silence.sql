/*
  # Add default value for replacement_cost_applies

  1. Changes
    - Add default value of true for replacement_cost_applies column
    - Update existing null values to true
  
  2. Security
    - Maintains existing RLS policies
    - No security impact
*/

-- Update existing null values to true
UPDATE items
SET replacement_cost_applies = true
WHERE replacement_cost_applies IS NULL;

-- Add default value constraint
ALTER TABLE items 
ALTER COLUMN replacement_cost_applies 
SET DEFAULT true;