-- Migration: Add missing columns to transactions table if they don't exist
-- Run this in your Supabase SQL editor if you're getting "Could not find the 'notes' column" error

-- Add new columns to transactions table (only if they don't exist)
ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vendor_name TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index for better query performance (only if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_transactions_unit_id ON transactions(unit_id);

-- Add comments for documentation
COMMENT ON COLUMN transactions.unit_id IS 'Truck/Unit associated with this expense';
COMMENT ON COLUMN transactions.vendor_name IS 'Vendor name (e.g., Petro-Canada, TA, Loves)';
COMMENT ON COLUMN transactions.notes IS 'Optional notes for the expense';







