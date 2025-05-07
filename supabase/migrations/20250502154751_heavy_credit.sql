/*
  # Remove tax rate trigger and custom flag

  1. Changes
    - Drop tax rate trigger and function
    - Remove tax_rate_is_custom column
    - Allow tax rates to be set independently
    
  2. Security
    - Maintains existing RLS policies
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS update_items_tax_rate_trigger ON claims;
DROP FUNCTION IF EXISTS update_items_tax_rate();

-- Drop the custom flag column
ALTER TABLE items
DROP COLUMN IF EXISTS tax_rate_is_custom;