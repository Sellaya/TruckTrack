-- Complete Migration: Update units table to new schema
-- Date: 2024
-- Description: Migrate from old schema (name, license_plate, purchase_date, covered_miles) 
--              to new schema (make, year, model, vin, plate, province, country, static_cost, odometer_reading)
--
-- IMPORTANT: This migration assumes you want to keep existing data if possible
-- If you have existing units, you may need to manually update them after running this

-- Step 1: Check if old columns exist and create backup (optional)
-- You can skip this if you're okay with data loss or don't have important data

-- Step 2: Add all new columns (nullable first to allow data migration)
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

-- Step 3: Try to migrate data from old columns to new columns (if old columns exist)
-- This will only work if you have the old schema columns
DO $$
BEGIN
  -- Check if old 'name' column exists and try to extract make/model
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'units' AND column_name = 'name'
  ) THEN
    -- Try to extract make and model from name (if format is "Make Model")
    UPDATE units 
    SET 
      make = CASE 
        WHEN name IS NOT NULL AND name != '' THEN 
          SPLIT_PART(name, ' ', 1)
        ELSE 'TBD'
      END,
      model = CASE 
        WHEN name IS NOT NULL AND name != '' AND position(' ' in name) > 0 THEN 
          SUBSTRING(name FROM position(' ' in name) + 1)
        WHEN name IS NOT NULL AND name != '' THEN name
        ELSE 'TBD'
      END
    WHERE make IS NULL OR model IS NULL;
  END IF;

  -- Migrate license_plate to plate if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'units' AND column_name = 'license_plate'
  ) THEN
    UPDATE units 
    SET plate = license_plate
    WHERE (plate IS NULL OR plate = '') AND license_plate IS NOT NULL;
  END IF;

  -- Migrate covered_miles to odometer_reading if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'units' AND column_name = 'covered_miles'
  ) THEN
    UPDATE units 
    SET odometer_reading = covered_miles
    WHERE (odometer_reading IS NULL OR odometer_reading = 0) AND covered_miles IS NOT NULL;
  END IF;
END $$;

-- Step 4: Set defaults for any remaining NULL values
UPDATE units 
SET 
  make = COALESCE(make, 'TBD'),
  year = COALESCE(year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER),
  model = COALESCE(model, 'TBD'),
  vin = COALESCE(vin, 'TBD-' || id::text),
  plate = COALESCE(plate, 'TBD'),
  province = COALESCE(province, 'TBD'),
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

-- Step 5: Remove UNIQUE constraint/index on VIN to allow duplicates
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

-- Step 6: Add constraint for country
ALTER TABLE units 
DROP CONSTRAINT IF EXISTS units_country_check;
ALTER TABLE units 
ADD CONSTRAINT units_country_check 
CHECK (country IN ('USA', 'Canada'));

-- Step 7: Make all columns NOT NULL
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

-- Step 8: (OPTIONAL) Drop old columns if they exist and you've migrated all data
-- UNCOMMENT ONLY AFTER VERIFYING ALL DATA HAS BEEN MIGRATED CORRECTLY
-- 
-- ALTER TABLE units DROP COLUMN IF EXISTS name;
-- ALTER TABLE units DROP COLUMN IF EXISTS license_plate;
-- ALTER TABLE units DROP COLUMN IF EXISTS purchase_date;
-- ALTER TABLE units DROP COLUMN IF EXISTS covered_miles;

-- Step 9: Verify the new structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'units' 
ORDER BY ordinal_position;

