-- Add status_display column to items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS status_display TEXT;

-- Update existing items based on their flags
UPDATE items SET status_display = 
  CASE 
    WHEN no_loss_or_damage = true THEN 'No Loss/Damage'
    WHEN not_involved_in_claim = true THEN 'Not Involved in Claim'
    WHEN duplicate_item = true THEN 'Duplicate'
    WHEN cleaning_allowance = true THEN 'Clean Only'
    ELSE NULL
  END;