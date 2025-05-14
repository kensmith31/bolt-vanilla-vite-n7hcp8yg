-- Add new boolean fields for review and verify tab
ALTER TABLE items
ADD COLUMN IF NOT EXISTS no_loss_or_damage BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS not_involved_in_claim BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS duplicate_item BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cleaning_allowance BOOLEAN DEFAULT FALSE;

-- Update realtime publication
alter publication supabase_realtime add table items;