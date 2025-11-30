-- Migration: Add trip_number column to trips table
-- Date: 2024
-- Description: Add unique 4-digit trip number field that auto-generates for new trips

-- Step 1: Add trip_number column (nullable initially)
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS trip_number TEXT;

-- Step 2: Generate trip numbers for existing trips (if any)
-- Start from 0001 and increment
DO $$
DECLARE
    trip_record RECORD;
    counter INTEGER := 1;
BEGIN
    FOR trip_record IN 
        SELECT id FROM trips 
        WHERE trip_number IS NULL 
        ORDER BY created_at ASC
    LOOP
        UPDATE trips 
        SET trip_number = LPAD(counter::TEXT, 4, '0')
        WHERE id = trip_record.id;
        counter := counter + 1;
    END LOOP;
END $$;

-- Step 3: Create unique index on trip_number
CREATE UNIQUE INDEX IF NOT EXISTS trips_trip_number_unique 
ON trips(trip_number) 
WHERE trip_number IS NOT NULL;

-- Step 4: Make trip_number NOT NULL after populating existing data
ALTER TABLE trips 
ALTER COLUMN trip_number SET NOT NULL;

-- Verify the structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'trips' AND column_name = 'trip_number';

