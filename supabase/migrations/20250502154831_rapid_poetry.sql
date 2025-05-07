/*
  # Add tax_rate_is_custom column to items table

  1. Changes
    - Add `tax_rate_is_custom` boolean column to `items` table with default value of false
    - Add index on `tax_rate_is_custom` column for better query performance

  2. Notes
    - The column is nullable to maintain compatibility with existing records
    - Default value of false indicates tax rates that haven't been manually set
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'items' 
    AND column_name = 'tax_rate_is_custom'
  ) THEN
    ALTER TABLE items 
    ADD COLUMN tax_rate_is_custom boolean DEFAULT false;

    CREATE INDEX idx_items_tax_rate_custom 
    ON items (tax_rate_is_custom);
  END IF;
END $$;