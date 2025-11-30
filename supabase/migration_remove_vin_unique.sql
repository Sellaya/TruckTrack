-- Migration: Remove UNIQUE constraint on VIN to allow duplicate values
-- Date: 2024
-- Description: Allow admins to add multiple units with the same VIN

-- Step 1: Drop the unique index on VIN if it exists
DROP INDEX IF EXISTS units_vin_unique;

-- Step 2: Drop the unique constraint on VIN column if it exists
-- PostgreSQL doesn't have a direct way to drop a unique constraint by column,
-- so we need to find and drop the constraint by name
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the unique constraint name for the vin column
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'units'::regclass
      AND contype = 'u'
      AND conkey::text LIKE '%vin%';
    
    -- Drop the constraint if it exists
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE units DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END IF;
END $$;

-- Step 3: If the unique constraint was part of the column definition,
-- we need to recreate the column without the unique constraint
-- However, since we're using ALTER TABLE, the constraint should be dropped above

-- Verify the change
-- Run this query to check: SELECT column_name, is_nullable, column_default 
-- FROM information_schema.columns WHERE table_name = 'units' AND column_name = 'vin';

