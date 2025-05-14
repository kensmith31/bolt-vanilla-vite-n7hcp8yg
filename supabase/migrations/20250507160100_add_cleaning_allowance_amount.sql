-- Add cleaning_allowance_amount column to items table
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS cleaning_allowance_amount NUMERIC DEFAULT NULL;

-- Add comment to the column
COMMENT ON COLUMN public.items.cleaning_allowance_amount IS 'Amount for cleaning allowance when cleaning_allowance is true';
