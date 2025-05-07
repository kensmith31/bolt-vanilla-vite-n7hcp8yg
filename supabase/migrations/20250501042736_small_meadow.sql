/*
  # Update holdback_due calculation

  1. Changes
    - Update holdback_due calculation to match new formula
    - Maintain existing data types and precision
    
  2. Security
    - Maintains existing RLS policies
*/

-- First drop the existing column
ALTER TABLE items
DROP COLUMN holdback_due;

-- Add the column back with the new calculation
ALTER TABLE items
ADD COLUMN holdback_due numeric(10,5) GENERATED ALWAYS AS (
  CASE
    WHEN (replacement_spent - ((quantity * adjusted_rcv) * ((1)::numeric + tax_rate)) * ((1)::numeric - depreciation_percent)) < (0)::numeric 
    THEN (0)::numeric
    WHEN (replacement_spent - ((quantity * adjusted_rcv) * ((1)::numeric + tax_rate)) * ((1)::numeric - depreciation_percent)) > ((quantity * adjusted_rcv) * ((1)::numeric + tax_rate)) * depreciation_percent
    THEN ((quantity * adjusted_rcv) * ((1)::numeric + tax_rate)) * depreciation_percent
    ELSE (replacement_spent - ((quantity * adjusted_rcv) * ((1)::numeric + tax_rate)) * ((1)::numeric - depreciation_percent))
  END
) STORED;