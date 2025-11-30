# Trip Number Migration Guide

## Overview
Each trip now has a unique 4-digit trip number that auto-generates when an admin creates a trip. Admins can search for trips by their trip number.

## Changes Made

### 1. Database Schema
- Added `trip_number` column to the `trips` table
- Trip numbers are unique 4-digit strings (e.g., "0001", "0234")
- Migration file created: `supabase/migration_add_trip_number.sql`

### 2. Type Updates
- Updated `Trip` type in `src/lib/types.ts` to include `tripNumber: string`

### 3. Auto-Generation
- `createTrip()` function now auto-generates unique trip numbers
- Numbers are sequential starting from "0001"
- Automatically finds gaps if any exist
- Wraps around after 9999 if needed

### 4. Search Functionality
- Added trip number search input on trips page
- Search filters trips by matching trip number (partial matches work)
- Clear filters button includes trip number search

### 5. UI Updates
- Trip numbers displayed in:
  - Mobile card view: `#0001 Trip Name`
  - Desktop table view: Separate "Trip #" column
- Trip number shown with monospace font for better readability

## Migration Steps

### Step 1: Run Database Migration

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the entire contents of `supabase/migration_add_trip_number.sql`
4. Click "Run" to execute the migration

The migration will:
- Add the `trip_number` column (nullable initially)
- Generate trip numbers for existing trips (starting from 0001)
- Create a unique index on `trip_number`
- Make the column NOT NULL

### Step 2: Verify Migration

After running the migration, verify it worked:

```sql
SELECT id, trip_number, name, created_at 
FROM trips 
ORDER BY created_at ASC 
LIMIT 10;
```

You should see trip numbers assigned to all trips.

### Step 3: Test the Feature

1. **Create a New Trip**: 
   - Go to Trips page
   - Click "Add Trip"
   - Fill in the form and save
   - The new trip should automatically get a trip number

2. **Search by Trip Number**:
   - On the Trips page, use the "Search by Trip Number" input
   - Type a trip number (e.g., "0001" or "01")
   - Matching trips should appear

3. **Verify Display**:
   - Check both mobile and desktop views
   - Trip numbers should be visible in the list

## Notes

- **Existing Trips**: All existing trips will get trip numbers starting from "0001" in order of creation date
- **New Trips**: Trip numbers auto-generate sequentially
- **Uniqueness**: Trip numbers are unique and enforced by database constraint
- **Search**: Partial matching is supported (e.g., "01" matches "0001", "0100", etc.)

## Troubleshooting

If you encounter issues:

1. **No trip numbers showing**: Check if migration ran successfully
2. **Duplicate trip numbers**: This shouldn't happen due to unique constraint, but if it does, re-run the migration
3. **Search not working**: Clear browser cache and reload the page

## Code Files Modified

- `src/lib/types.ts` - Added `tripNumber` to Trip type
- `src/lib/supabase/database.ts` - Added trip number generation logic
- `src/app/trips/page.tsx` - Added search UI and display
- `src/lib/data.ts` - Updated mock data with trip numbers
- `supabase/migration_add_trip_number.sql` - Database migration

