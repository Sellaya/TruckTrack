# URGENT: Fix Database Schema Error

## The Error
```
null value in column "name" of relation "units" violates not-null constraint
```

## The Problem
Your database still has the **old schema** with a `name` column that is required (NOT NULL), but your code is using the **new schema** without that column.

## Quick Fix

### Step 1: Make Old Columns Nullable

Run this SQL in Supabase SQL Editor:

```sql
-- Make old columns nullable
ALTER TABLE units ALTER COLUMN name DROP NOT NULL;
ALTER TABLE units ALTER COLUMN license_plate DROP NOT NULL;
ALTER TABLE units ALTER COLUMN purchase_date DROP NOT NULL;
ALTER TABLE units ALTER COLUMN covered_miles DROP NOT NULL;
```

### Step 2: Add New Columns

Run this SQL:

```sql
-- Add new columns
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
```

### Step 3: Remove UNIQUE Constraint on VIN

```sql
-- Remove unique constraint on VIN
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
```

### Step 4: Set Defaults and Make New Columns Required

```sql
-- Set defaults for existing rows
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
WHERE make IS NULL OR year IS NULL OR model IS NULL OR vin IS NULL 
   OR plate IS NULL OR province IS NULL OR country IS NULL OR static_cost IS NULL;

-- Add country constraint
ALTER TABLE units 
DROP CONSTRAINT IF EXISTS units_country_check;
ALTER TABLE units 
ADD CONSTRAINT units_country_check 
CHECK (country IN ('USA', 'Canada'));

-- Make new columns required
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
```

## OR: Use the Complete Migration File

Simply copy and paste the entire contents of `supabase/migration_fix_units_complete.sql` into Supabase SQL Editor and run it. This will handle everything automatically.

## After Running Migration

1. Refresh your app
2. Try creating a unit again - it should work!
3. You can now add duplicate VINs
4. You can delete units using the trash icon





