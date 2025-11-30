-- Migration: Complete fix for units table - handle old and new schema
-- Date: 2024
-- Description: Make old columns nullable, add new columns, remove unique constraint

-- Step 1: Make old columns nullable (if they exist)
DO $$
BEGIN
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

-- Step 2: Add all new columns (nullable first)
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

-- Step 3: Remove UNIQUE constraint/index on VIN to allow duplicates
DROP INDEX IF EXISTS units_vin_unique;

DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'units'::regclass
      AND contype = 'u'
      AND (conname LIKE '%vin%' OR conname LIKE '%units_vin%' OR conname LIKE '%license_plate%');
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE units DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END IF;
END $$;

-- Step 4: Set defaults for existing rows (if any)
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
   OR country IS NULL
   OR static_cost IS NULL;

-- Step 5: Add country constraint
ALTER TABLE units 
DROP CONSTRAINT IF EXISTS units_country_check;
ALTER TABLE units 
ADD CONSTRAINT units_country_check 
CHECK (country IS NULL OR country IN ('USA', 'Canada'));

-- Step 6: Make new columns NOT NULL (after setting defaults)
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

-- Step 7: (OPTIONAL) Drop old columns after verifying everything works
-- Uncomment these lines ONLY after you've verified the new structure works correctly
-- ALTER TABLE units DROP COLUMN IF EXISTS name;
-- ALTER TABLE units DROP COLUMN IF EXISTS license_plate;
-- ALTER TABLE units DROP COLUMN IF EXISTS purchase_date;
-- ALTER TABLE units DROP COLUMN IF EXISTS covered_miles;

-- Verify the structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'units' 
ORDER BY ordinal_position;

