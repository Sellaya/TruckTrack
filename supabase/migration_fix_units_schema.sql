-- Migration: Fix units table to support new schema
-- Date: 2024
-- Description: Handle transition from old schema (name, license_plate, etc.) to new schema (make, year, model, etc.)

-- Step 1: Check if old columns exist and make them nullable first
DO $$
BEGIN
  -- Make old columns nullable if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'units' AND column_name = 'name'
  ) THEN
    ALTER TABLE units ALTER COLUMN name DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'units' AND column_name = 'license_plate'
  ) THEN
    ALTER TABLE units ALTER COLUMN license_plate DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'units' AND column_name = 'purchase_date'
  ) THEN
    ALTER TABLE units ALTER COLUMN purchase_date DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'units' AND column_name = 'covered_miles'
  ) THEN
    ALTER TABLE units ALTER COLUMN covered_miles DROP NOT NULL;
  END IF;
END $$;

-- Step 2: Add all new columns if they don't exist (nullable first)
ALTER TABLE units 
ADD COLUMN IF NOT EXISTS make TEXT,
ADD COLUMN IF NOT EXISTS year INTEGER,
ADD COLUMN IF NOT EXISTS model TEXT,
ADD COLUMN IF NOT EXISTS vin TEXT,
ADD COLUMN IF NOT EXISTS plate TEXT,
ADD COLUMN IF NOT EXISTS province TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS static_cost DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS odometer_reading INTEGER DEFAULT 0;

-- Step 3: Set defaults for new columns on existing rows
UPDATE units 
SET 
  make = COALESCE(make, 'TBD'),
  year = COALESCE(year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER),
  model = COALESCE(model, 'TBD'),
  vin = COALESCE(vin, 'TBD-' || id::text),
  plate = COALESCE(plate, 'TBD'),
  province = COALESCE(province, 'CA'),
  country = COALESCE(country, 'USA'),
  static_cost = COALESCE(static_cost, 0),
  odometer_reading = COALESCE(odometer_reading, 0)
WHERE make IS NULL 
   OR year IS NULL 
   OR model IS NULL 
   OR vin IS NULL 
   OR plate IS NULL 
   OR province IS NULL 
   OR country IS NULL;

-- Step 4: Remove UNIQUE constraint on VIN if it exists
DROP INDEX IF EXISTS units_vin_unique;

DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'units'::regclass
      AND contype = 'u'
      AND (conname LIKE '%vin%' OR conname LIKE '%units_vin%');
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE units DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END IF;
END $$;

-- Step 5: Create unique index on VIN (without unique constraint to allow duplicates)
-- Actually, we want to allow duplicates, so we won't create a unique index

-- Step 6: Add constraint for country
ALTER TABLE units 
DROP CONSTRAINT IF EXISTS units_country_check;
ALTER TABLE units 
ADD CONSTRAINT units_country_check 
CHECK (country IS NULL OR country IN ('USA', 'Canada'));

-- Step 7: Make new columns NOT NULL (after setting defaults)
ALTER TABLE units 
ALTER COLUMN make SET NOT NULL,
ALTER COLUMN year SET NOT NULL,
ALTER COLUMN model SET NOT NULL,
ALTER COLUMN vin SET NOT NULL,
ALTER COLUMN plate SET NOT NULL,
ALTER COLUMN province SET NOT NULL,
ALTER COLUMN country SET NOT NULL,
ALTER COLUMN static_cost SET NOT NULL,
ALTER COLUMN odometer_reading SET NOT NULL;

-- Step 8: (OPTIONAL) Drop old columns - UNCOMMENT ONLY AFTER VERIFYING EVERYTHING WORKS
-- ALTER TABLE units DROP COLUMN IF EXISTS name;
-- ALTER TABLE units DROP COLUMN IF EXISTS license_plate;
-- ALTER TABLE units DROP COLUMN IF EXISTS purchase_date;
-- ALTER TABLE units DROP COLUMN IF EXISTS covered_miles;

-- Verify the structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'units' 
ORDER BY ordinal_position;

