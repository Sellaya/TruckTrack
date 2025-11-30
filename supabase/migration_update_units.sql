-- Migration: Update units table structure
-- Date: 2024
-- Description: Replace name, license_plate, purchase_date, covered_miles with make, year, model, vin, odometer_reading

-- Step 1: Add new columns
ALTER TABLE units 
ADD COLUMN IF NOT EXISTS make TEXT,
ADD COLUMN IF NOT EXISTS year INTEGER,
ADD COLUMN IF NOT EXISTS model TEXT,
ADD COLUMN IF NOT EXISTS vin TEXT,
ADD COLUMN IF NOT EXISTS odometer_reading INTEGER DEFAULT 0;

-- Step 2: Create unique index on VIN (if not exists)
CREATE UNIQUE INDEX IF NOT EXISTS units_vin_unique ON units(vin) WHERE vin IS NOT NULL;

-- Step 3: Make new columns NOT NULL (after data migration if needed)
-- Note: You may need to migrate existing data first before making these NOT NULL
-- ALTER TABLE units ALTER COLUMN make SET NOT NULL;
-- ALTER TABLE units ALTER COLUMN year SET NOT NULL;
-- ALTER TABLE units ALTER COLUMN model SET NOT NULL;
-- ALTER TABLE units ALTER COLUMN vin SET NOT NULL;

-- Step 4: Drop old columns (ONLY AFTER DATA MIGRATION)
-- ALTER TABLE units DROP COLUMN IF EXISTS name;
-- ALTER TABLE units DROP COLUMN IF EXISTS license_plate;
-- ALTER TABLE units DROP COLUMN IF EXISTS purchase_date;
-- ALTER TABLE units DROP COLUMN IF EXISTS covered_miles;

-- Note: Uncomment the DROP statements above only after you've migrated all existing data
-- and verified the new structure is working correctly.

