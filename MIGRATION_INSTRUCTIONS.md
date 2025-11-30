# Database Migration Instructions

## Adding Plate, Province, and Country Columns to Units Table

The error you're seeing is because the database schema hasn't been updated yet to include the new fields (`plate`, `province`, `country`).

### Steps to Fix:

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to the **SQL Editor** section

2. **Run the Migration SQL**
   - Copy the contents of `supabase/migration_add_plate_province_country.sql`
   - Paste it into the SQL Editor
   - Click **Run** to execute

3. **Verify the Migration**
   - Go to **Table Editor** → **units** table
   - Verify that the new columns (`plate`, `province`, `country`) appear in the table

### Alternative: Run via Supabase CLI

If you have Supabase CLI installed:

```bash
supabase db push
```

Or run the migration file directly:

```bash
psql -h [your-supabase-host] -U postgres -d postgres -f supabase/migration_add_plate_province_country.sql
```

### What the Migration Does:

1. Adds `plate`, `province`, and `country` columns as nullable first
2. Sets default values for any existing rows (if any)
3. Adds a constraint to ensure `country` can only be 'USA' or 'Canada'
4. Makes all three columns NOT NULL (required)

### Important Notes:

- **Existing Data**: If you have existing units in the database, they will be updated with default values ('TBD' for plate/province, 'USA' for country)
- **Backup**: It's always a good idea to backup your database before running migrations
- **After Migration**: Once the migration is complete, you should be able to create units with the new fields

### If You Get Errors:

- Make sure you're running the SQL in the Supabase SQL Editor
- Check that you have the correct permissions
- Verify the units table exists and has data (if any)
- If you see constraint errors, check if any existing rows violate the country constraint

