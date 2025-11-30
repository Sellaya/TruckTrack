-- Migration: Add plate, province, and country columns to units table
-- Date: 2024
-- Description: Add plate, province, and country fields to existing units table

-- Step 1: Add new columns as nullable first (to handle existing data)
ALTER TABLE units 
ADD COLUMN IF NOT EXISTS plate TEXT,
ADD COLUMN IF NOT EXISTS province TEXT,
ADD COLUMN IF NOT EXISTS country TEXT;

-- Step 2: Update existing rows with default values (if any exist)
-- Set default values for existing records
UPDATE units 
SET 
  plate = COALESCE(plate, 'TBD'),
  province = COALESCE(province, 'TBD'),
  country = COALESCE(country, 'USA')
WHERE plate IS NULL OR province IS NULL OR country IS NULL;

-- Step 3: Add constraint to only allow USA or Canada (drop first if exists)
ALTER TABLE units 
DROP CONSTRAINT IF EXISTS units_country_check;
ALTER TABLE units 
ADD CONSTRAINT units_country_check 
CHECK (country IN ('USA', 'Canada'));

-- Step 4: Make columns NOT NULL (after setting defaults)
ALTER TABLE units 
ALTER COLUMN plate SET NOT NULL,
ALTER COLUMN province SET NOT NULL,
ALTER COLUMN country SET NOT NULL;

-- Verify the changes
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'units' 
-- ORDER BY ordinal_position;

