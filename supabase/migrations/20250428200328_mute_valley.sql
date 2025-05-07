/*
  # Fix item status transitions

  1. Changes
    - Update trigger function to properly handle status transitions
    - Remove status checks for depreciation and holdback transitions
    - Ensure proper order of status changes
    
  2. Security
    - Maintain SECURITY DEFINER
    - Set explicit search path
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS update_item_status_trigger ON items;
DROP FUNCTION IF EXISTS update_item_status();

-- Create improved trigger function
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

    -- Check if depreciation_amount is not null, regardless of current status
    IF NEW.depreciation_amount IS NOT NULL AND 
       NEW.status IN ('submitted'::item_status, 'in_review'::item_status, 'priced'::item_status) THEN
      NEW.status = 'adjusted'::item_status;
    END IF;

    -- Check if holdback_due is greater than 0, regardless of current status
    IF NEW.holdback_due > 0 AND 
       NEW.status IN ('submitted'::item_status, 'in_review'::item_status, 'priced'::item_status, 'adjusted'::item_status) THEN
      NEW.status = 'holdback_paid'::item_status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER update_item_status_trigger
  BEFORE INSERT OR UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION update_item_status();

-- Update existing items to trigger a status recalculation
UPDATE items
SET updated_at = NOW()
WHERE true;