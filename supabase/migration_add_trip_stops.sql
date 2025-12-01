-- Migration: Add stops column to trips table for multi-stop routes
-- Date: 2024
-- Description: Add JSONB column to store array of route stops

-- Add stops column as JSONB (nullable)
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS stops JSONB;

-- Create index for JSONB queries (optional, for performance)
CREATE INDEX IF NOT EXISTS trips_stops_idx ON trips USING GIN (stops);

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'trips' AND column_name = 'stops';





