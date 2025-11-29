# WhatsApp Messages Migration - Setup Instructions

## Overview
This migration adds WhatsApp receipt processing capability to your TruckTrack application.

## Files
- **Migration SQL**: `supabase/migration_whatsapp_messages.sql`

## What This Migration Does

### 1. Adds `whatsapp_phone` Column to Drivers Table
- Column: `whatsapp_phone VARCHAR(20) UNIQUE NULLABLE`
- Stores the WhatsApp phone number for each driver
- Used to match incoming WhatsApp messages to drivers

### 2. Creates `whatsapp_messages` Table
Stores incoming WhatsApp messages (receipts/images) with:
- **phone_number**: Sender's WhatsApp number
- **driver_id**: Linked driver (matched via whatsapp_phone)
- **message_type**: 'image' or 'text'
- **image_url**: URL to uploaded receipt image
- **raw_ocr_text**: OCR-extracted text
- **extracted_data**: Structured JSON with amount, vendor, date, category, location
- **processed**: Boolean flag for processing status
- **trip_id**: Associated trip (if linked)
- **expense_id**: Created expense transaction (if processed)
- **error_message**: Processing errors

### 3. Creates Performance Indexes
- Phone number lookups
- Driver filtering
- Unprocessed message queries
- Time-based sorting

### 4. Row Level Security (RLS)
- Service role: Full access (for backend operations)
- Authenticated users: Can only see/update their own messages

## How to Run the Migration

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Open `supabase/migration_whatsapp_messages.sql`
5. Copy the entire contents
6. Paste into SQL Editor
7. Click **Run** (or press Cmd/Ctrl + Enter)

### Option 2: Supabase CLI
```bash
# If you have Supabase CLI installed
supabase migration up migration_whatsapp_messages.sql
```

### Option 3: psql Command Line
```bash
psql -h [your-supabase-host] -U postgres -d postgres -f supabase/migration_whatsapp_messages.sql
```

## Verification

After running the migration, verify:

1. **Column Added to Drivers**:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'drivers' AND column_name = 'whatsapp_phone';
   ```

2. **Table Created**:
   ```sql
   SELECT * FROM whatsapp_messages LIMIT 1;
   ```

3. **Indexes Created**:
   ```sql
   SELECT indexname FROM pg_indexes 
   WHERE tablename = 'whatsapp_messages';
   ```

4. **RLS Enabled**:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename = 'whatsapp_messages';
   ```

## Next Steps

### 1. Update Driver Type Definition
Update `src/lib/types.ts` to include `whatsappPhone`:
```typescript
export type Driver = {
  // ... existing fields
  whatsappPhone?: string;
};
```

### 2. Update Database Helper Functions
Update `src/lib/supabase/database.ts`:
- Modify `rowToDriver()` to include `whatsapp_phone`
- Create functions for `whatsapp_messages` CRUD operations

### 3. Create WhatsApp Integration
- Set up WhatsApp API webhook endpoint
- Create image upload to Supabase Storage
- Implement OCR processing
- Create expense extraction logic

## RLS Policy Notes

**Current Setup:**
- Service role has full access (works with your current setup using service role key)
- Authenticated user policies assume Supabase Auth

**If using custom auth (like your current driver-auth.ts):**
- The service role policy will work for backend operations
- You may want to adjust authenticated user policies based on your auth system
- Or temporarily allow all operations like your other tables

**To allow all operations temporarily:**
```sql
DROP POLICY IF EXISTS "Allow all operations on whatsapp_messages" ON whatsapp_messages;
CREATE POLICY "Allow all operations on whatsapp_messages" ON whatsapp_messages
  FOR ALL USING (true) WITH CHECK (true);
```

## Troubleshooting

### Error: "column already exists"
- The migration uses `IF NOT EXISTS` clauses, so it's safe to run multiple times
- If column exists, it will skip creation

### Error: "relation already exists"
- Safe to ignore - the migration will skip if table already exists

### RLS Policy Errors
- If you get RLS errors, you can temporarily disable RLS:
  ```sql
  ALTER TABLE whatsapp_messages DISABLE ROW LEVEL SECURITY;
  ```

## Rollback (if needed)

To rollback this migration:

```sql
-- Drop table
DROP TABLE IF EXISTS whatsapp_messages CASCADE;

-- Remove column from drivers
ALTER TABLE drivers DROP COLUMN IF EXISTS whatsapp_phone;
```

---

**Created**: 2025-01-15
**Version**: 1.0



