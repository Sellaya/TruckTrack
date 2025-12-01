# Complete Units Table Migration Guide

## The Problem

Your database still has the **old schema** for the `units` table, but your code expects the **new schema**.

### Old Schema (Current in Database):
- `name`
- `license_plate`
- `purchase_date`
- `covered_miles`

### New Schema (What Code Expects):
- `make`
- `year`
- `model`
- `vin`
- `plate`
- `province`
- `country`
- `static_cost`
- `odometer_reading`

## Complete Solution

### Option 1: Complete Migration (Keeps Existing Data)

Run this SQL in your Supabase SQL Editor:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Open the file: `supabase/migration_complete_units_schema.sql`
3. Copy the entire contents
4. Paste into SQL Editor
5. Click **Run**

This migration will:
- ✅ Add all new columns
- ✅ Try to migrate data from old columns to new columns
- ✅ Set defaults for any missing data
- ✅ Make all columns required (NOT NULL)
- ✅ Add constraints and indexes

### Option 2: Fresh Start (If You Have No Important Data)

If you don't have important data in the units table, you can drop and recreate it:

```sql
-- DROP existing table (WARNING: This deletes all data!)
DROP TABLE IF EXISTS units CASCADE;

-- Create new table with correct schema
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  make TEXT NOT NULL,
  year INTEGER NOT NULL,
  model TEXT NOT NULL,
  vin TEXT NOT NULL UNIQUE,
  plate TEXT NOT NULL,
  province TEXT NOT NULL,
  country TEXT NOT NULL CHECK (country IN ('USA', 'Canada')),
  static_cost DECIMAL(10, 2) NOT NULL,
  odometer_reading INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE UNIQUE INDEX units_vin_unique ON units(vin);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_units_updated_at ON units;
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Re-enable RLS if needed
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on units" ON units;
CREATE POLICY "Allow all operations on units" ON units
  FOR ALL USING (true) WITH CHECK (true);
```

## Verify After Migration

After running the migration, verify the columns exist:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'units' 
ORDER BY ordinal_position;
```

You should see:
- `make` (TEXT, NOT NULL)
- `year` (INTEGER, NOT NULL)
- `model` (TEXT, NOT NULL)
- `vin` (TEXT, NOT NULL)
- `plate` (TEXT, NOT NULL)
- `province` (TEXT, NOT NULL)
- `country` (TEXT, NOT NULL)
- `static_cost` (DECIMAL, NOT NULL)
- `odometer_reading` (INTEGER, NOT NULL)

## Next Steps

1. Run the migration SQL
2. Refresh your app (or restart dev server)
3. Try creating a unit again - it should work!

## Troubleshooting

**"Column already exists" errors:**
- The migration uses `ADD COLUMN IF NOT EXISTS`, so this shouldn't happen
- If it does, you can skip those lines

**"Constraint violation" errors:**
- Make sure the country values are exactly 'USA' or 'Canada' (case-sensitive)
- Check that all existing rows have valid data

**"NOT NULL violation" errors:**
- The migration should set defaults, but if you have rows that can't be migrated, you may need to manually update them

**Still getting errors after migration:**
- Clear your browser cache
- Restart your dev server
- Check Supabase dashboard to verify columns exist





