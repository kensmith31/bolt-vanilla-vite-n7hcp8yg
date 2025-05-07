/*
  # Add combined index for Review & Verify columns

  1. Changes
    - Add combined index for all review/verify columns
    - Add individual indexes for each column
    - Improve query performance for Review & Verify tab
    
  2. Security
    - No security impact
    - Maintains existing RLS policies
*/

-- Create combined index for all review/verify columns
CREATE INDEX IF NOT EXISTS idx_items_review_verify 
ON items(no_loss_or_damage, not_involved_in_claim, cleaning_allowance, duplicate_item);

-- Create individual indexes for better query flexibility
CREATE INDEX IF NOT EXISTS idx_items_no_loss_or_damage ON items(no_loss_or_damage);
CREATE INDEX IF NOT EXISTS idx_items_not_involved_in_claim ON items(not_involved_in_claim);
CREATE INDEX IF NOT EXISTS idx_items_cleaning_allowance ON items(cleaning_allowance);
CREATE INDEX IF NOT EXISTS idx_items_duplicate_item ON items(duplicate_item);