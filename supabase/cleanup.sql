-- Cleanup script - Run this first if you get "already exists" errors

-- Drop existing triggers
DROP TRIGGER IF EXISTS update_units_updated_at ON units;
DROP TRIGGER IF EXISTS update_drivers_updated_at ON drivers;
DROP TRIGGER IF EXISTS update_trips_updated_at ON trips;
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all operations on units" ON units;
DROP POLICY IF EXISTS "Allow all operations on drivers" ON drivers;
DROP POLICY IF EXISTS "Allow all operations on trips" ON trips;
DROP POLICY IF EXISTS "Allow all operations on transactions" ON transactions;






