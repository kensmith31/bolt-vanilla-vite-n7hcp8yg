/*
  # Update holdback due calculation

  1. Changes
    - Modify holdback_due calculation to:
      - Return 0 if replacement_spent - ACV is negative
      - Cap at depreciation_amount if greater
    - Update existing items with new calculation
  
  2. Security
    - Maintains existing RLS policies
*/

-- Update the holdback_due generated column definition
ALTER TABLE items
DROP COLUMN holdback_due;

ALTER TABLE items
ADD COLUMN holdback_due numeric(10,2) GENERATED ALWAYS AS (
  CASE
    WHEN replacement_spent - (quantity * adjusted_rcv * (1 + tax_rate) * (1 - depreciation_percent)) < 0 THEN 0
    WHEN replacement_spent - (quantity * adjusted_rcv * (1 + tax_rate) * (1 - depreciation_percent)) > (quantity * adjusted_rcv * (1 + tax_rate) * depreciation_percent) 
      THEN (quantity * adjusted_rcv * (1 + tax_rate) * depreciation_percent)
    ELSE replacement_spent - (quantity * adjusted_rcv * (1 + tax_rate) * (1 - depreciation_percent))
  END
) STORED;