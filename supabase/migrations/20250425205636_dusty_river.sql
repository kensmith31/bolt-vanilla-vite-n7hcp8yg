/*
  # Add item status system

  1. Changes
    - Create item_status enum type
    - Add status column to items table
    - Add trigger for automatic status updates
    - Update existing items to use new status
    
  2. Security
    - Maintains existing RLS policies
    - Adds trigger function with SECURITY DEFINER
*/

-- Create new enum type for item status
DROP TYPE IF EXISTS item_status CASCADE;
CREATE TYPE item_status AS ENUM (
  'submitted',
  'in_review',
  'priced',
  'adjusted',
  'holdback_paid'
);

-- Add status column to items table
ALTER TABLE items
DROP COLUMN IF EXISTS status;

ALTER TABLE items
ADD COLUMN status item_status NOT NULL DEFAULT 'submitted';

-- Create function to update status based on conditions
CREATE OR REPLACE FUNCTION update_item_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set initial status for new items
  IF TG_OP = 'INSERT' THEN
    NEW.status = 'submitted'::item_status;
    RETURN NEW;
  END IF;

  -- Update status based on field changes
  IF TG_OP = 'UPDATE' THEN
    -- Check if 24 hours have passed since creation for submitted items
    IF NEW.status = 'submitted'::item_status AND 
       NEW.created_at < NOW() - INTERVAL '24 hours' THEN
      NEW.status = 'in_review'::item_status;
    END IF;

    -- Check if adjusted_rcv is set
    IF NEW.adjusted_rcv IS NOT NULL AND 
       NEW.status IN ('submitted'::item_status, 'in_review'::item_status) THEN
      NEW.status = 'priced'::item_status;
    END IF;

    -- Check if depreciation_amount is set
    IF NEW.depreciation_amount IS NOT NULL AND 
       NEW.depreciation_amount > 0 AND 
       NEW.status = 'priced'::item_status THEN
      NEW.status = 'adjusted'::item_status;
    END IF;

    -- Check if holdback_due is set
    IF NEW.holdback_due IS NOT NULL AND 
       NEW.holdback_due > 0 AND 
       NEW.status = 'adjusted'::item_status THEN
      NEW.status = 'holdback_paid'::item_status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS update_item_status_trigger ON items;
CREATE TRIGGER update_item_status_trigger
  BEFORE INSERT OR UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION update_item_status();

-- Update existing items with proper type casting
UPDATE items SET status = 
  CASE
    WHEN holdback_due IS NOT NULL AND holdback_due > 0 THEN 'holdback_paid'::item_status
    WHEN depreciation_amount IS NOT NULL AND depreciation_amount > 0 THEN 'adjusted'::item_status
    WHEN adjusted_rcv IS NOT NULL THEN 'priced'::item_status
    WHEN created_at < NOW() - INTERVAL '24 hours' THEN 'in_review'::item_status
    ELSE 'submitted'::item_status
  END;