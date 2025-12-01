# Quick Fix: Add Missing Columns to Units Table

## The Error
```
Error: Could not find the 'country' column of 'units' in the schema cache
```

This means your Supabase database doesn't have the new columns yet.

## Quick Solution

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your **Supabase Dashboard** → Your Project
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste this SQL:

```sql
-- Add new columns to units table
ALTER TABLE units 
ADD COLUMN IF NOT EXISTS plate TEXT,
ADD COLUMN IF NOT EXISTS province TEXT,
ADD COLUMN IF NOT EXISTS country TEXT;

-- Set default values for existing rows (if any)
UPDATE units 
SET 
  plate = COALESCE(plate, 'TBD'),
  province = COALESCE(province, 'TBD'),
  country = COALESCE(country, 'USA')
WHERE plate IS NULL OR province IS NULL OR country IS NULL;

-- Add constraint to only allow USA or Canada
ALTER TABLE units 
DROP CONSTRAINT IF EXISTS units_country_check;
ALTER TABLE units 
ADD CONSTRAINT units_country_check 
CHECK (country IN ('USA', 'Canada'));

-- Make columns required
ALTER TABLE units 
ALTER COLUMN plate SET NOT NULL,
ALTER COLUMN province SET NOT NULL,
ALTER COLUMN country SET NOT NULL;
```

5. Click **Run** (or press Ctrl/Cmd + Enter)
6. Refresh your app and try creating a unit again!

### Option 2: Use the Migration File

The complete migration file is in: `supabase/migration_add_plate_province_country.sql`

Just copy its contents into the Supabase SQL Editor and run it.

## After Running the Migration

1. Go to **Table Editor** → **units** table
2. You should see the new columns: `plate`, `province`, `country`
3. Try creating a new unit in your app - it should work now!

## Troubleshooting

- **Error about constraint already exists**: The migration handles this with `DROP CONSTRAINT IF EXISTS`
- **Error about existing data**: The migration sets default values for any existing rows
- **Still getting errors**: Make sure you ran all the SQL statements, not just the first one





