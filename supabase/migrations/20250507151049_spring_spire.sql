/*
  # Add columns for Review & Verify tab

  1. Changes
    - Add no_loss_or_damage boolean column
    - Add not_involved_in_claim boolean column
    - Add duplicate_item boolean column
    - Add cleaning_allowance boolean column
    - Add indexes for performance
    
  2. Security
    - Maintains existing RLS policies
*/

-- Add new columns to items table
ALTER TABLE items
ADD COLUMN IF NOT EXISTS no_loss_or_damage boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS not_involved_in_claim boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS duplicate_item boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cleaning_allowance boolean DEFAULT false;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_items_no_loss_or_damage ON items(no_loss_or_damage);
CREATE INDEX IF NOT EXISTS idx_items_not_involved_in_claim ON items(not_involved_in_claim);
CREATE INDEX IF NOT EXISTS idx_items_duplicate_item ON items(duplicate_item);
CREATE INDEX IF NOT EXISTS idx_items_cleaning_allowance ON items(cleaning_allowance);