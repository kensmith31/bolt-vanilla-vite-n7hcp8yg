-- Add photos field to items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}' NOT NULL;
