-- Quick Migration: Add trip_number to trips table
-- Run this in Supabase SQL Editor

-- Step 1: Add the column (nullable first)
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS trip_number TEXT;

-- Step 2: Generate trip numbers for existing trips (ordered by creation date)
DO $$
DECLARE
    trip_record RECORD;
    counter INTEGER := 1;
BEGIN
    -- Update all existing trips with sequential trip numbers
    FOR trip_record IN 
        SELECT id FROM trips 
        WHERE trip_number IS NULL 
        ORDER BY created_at ASC NULLS LAST, id ASC
    LOOP
        UPDATE trips 
        SET trip_number = LPAD(counter::TEXT, 4, '0')
        WHERE id = trip_record.id;
        counter := counter + 1;
    END LOOP;
END $$;

-- Step 3: Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS trips_trip_number_unique 
ON trips(trip_number) 
WHERE trip_number IS NOT NULL;

-- Step 4: Make it NOT NULL (only if we have data)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM trips WHERE trip_number IS NOT NULL) THEN
        ALTER TABLE trips ALTER COLUMN trip_number SET NOT NULL;
    ELSE
        -- Set a default for future rows
        ALTER TABLE trips ALTER COLUMN trip_number SET DEFAULT '0001';
        ALTER TABLE trips ALTER COLUMN trip_number SET NOT NULL;
    END IF;
END $$;

-- Verify it worked
SELECT 
    'Migration completed!' as status,
    COUNT(*) as total_trips,
    COUNT(trip_number) as trips_with_numbers,
    MIN(trip_number) as first_number,
    MAX(trip_number) as last_number
FROM trips;

