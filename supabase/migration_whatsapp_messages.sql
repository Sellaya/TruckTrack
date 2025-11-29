-- Migration: Add WhatsApp receipt processing capability
-- Created: 2025-01-15
-- Description: Adds whatsapp_messages table and whatsapp_phone column to drivers table

-- ============================================================================
-- 1. ADD WHATSAPP_PHONE COLUMN TO DRIVERS TABLE
-- ============================================================================

-- Add whatsapp_phone column to drivers table (unique, nullable)
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS whatsapp_phone VARCHAR(20) UNIQUE;

-- Add index on whatsapp_phone for faster lookups
CREATE INDEX IF NOT EXISTS idx_drivers_whatsapp_phone ON drivers(whatsapp_phone);

-- ============================================================================
-- 2. CREATE WHATSAPP_MESSAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  message_type VARCHAR(10) NOT NULL CHECK (message_type IN ('image', 'text')),
  image_url TEXT,
  raw_ocr_text TEXT,
  extracted_data JSONB,
  processed BOOLEAN DEFAULT false,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  expense_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- ============================================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index on phone_number for fast message lookup by sender
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone_number ON whatsapp_messages(phone_number);

-- Index on driver_id for filtering messages by driver
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_driver_id ON whatsapp_messages(driver_id);

-- Index on processed for filtering unprocessed messages
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_processed ON whatsapp_messages(processed);

-- Index on created_at for time-based queries and sorting
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON whatsapp_messages(created_at DESC);

-- Composite index for common query pattern: unprocessed messages by driver
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_driver_processed ON whatsapp_messages(driver_id, processed) WHERE processed = false;

-- Index on trip_id for linking messages to trips
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_trip_id ON whatsapp_messages(trip_id);

-- Index on expense_id for linking messages to created expenses
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_expense_id ON whatsapp_messages(expense_id);

-- ============================================================================
-- 4. ADD TRIGGER FOR UPDATED_AT (if needed in future)
-- ============================================================================

-- Note: whatsapp_messages table doesn't have updated_at column as per requirements
-- If you need to track updates, uncomment the following:
-- ALTER TABLE whatsapp_messages ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
-- CREATE TRIGGER update_whatsapp_messages_updated_at BEFORE UPDATE ON whatsapp_messages
--   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. CREATE RLS POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role has full access to whatsapp_messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Allow all operations on whatsapp_messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Authenticated users can view own whatsapp_messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Authenticated users can insert own whatsapp_messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Authenticated users can update own whatsapp_messages" ON whatsapp_messages;

-- Policy: Service role has full access (for backend/server operations via API)
-- This allows your backend to perform all operations using the service role key
CREATE POLICY "Service role has full access to whatsapp_messages" ON whatsapp_messages
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Policy: Allow all operations (matches current app pattern - allows all via anon key)
-- Since your app currently uses "Allow all" policies on other tables,
-- this ensures consistency and allows operations through your frontend
-- You can remove this policy later and use only service role + driver-specific policies
CREATE POLICY "Allow all operations on whatsapp_messages" ON whatsapp_messages
  FOR ALL USING (true) WITH CHECK (true);

-- Note: The "Allow all operations" policy above provides full access matching your current setup.
-- If you want to implement driver-based access control, you can replace it with:
--
-- CREATE POLICY "Drivers can view own whatsapp_messages" ON whatsapp_messages
--   FOR SELECT USING (
--     driver_id IN (
--       SELECT id FROM drivers 
--       WHERE email = auth.email()  -- If using Supabase Auth
--       -- OR match via session variable if using custom auth
--     )
--   );

-- ============================================================================
-- 7. ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE whatsapp_messages IS 'Stores WhatsApp messages (receipts/images) for processing into expenses';
COMMENT ON COLUMN whatsapp_messages.phone_number IS 'The WhatsApp phone number that sent the message';
COMMENT ON COLUMN whatsapp_messages.driver_id IS 'Associated driver, matched by whatsapp_phone number';
COMMENT ON COLUMN whatsapp_messages.message_type IS 'Type of message: image (receipt) or text';
COMMENT ON COLUMN whatsapp_messages.image_url IS 'URL to the uploaded image in Supabase Storage';
COMMENT ON COLUMN whatsapp_messages.raw_ocr_text IS 'Raw text extracted from OCR processing';
COMMENT ON COLUMN whatsapp_messages.extracted_data IS 'Structured JSON data: {amount, vendor, date, category, location}';
COMMENT ON COLUMN whatsapp_messages.processed IS 'Whether the message has been processed into an expense';
COMMENT ON COLUMN whatsapp_messages.trip_id IS 'Associated trip if the expense was linked to a trip';
COMMENT ON COLUMN whatsapp_messages.expense_id IS 'Link to the created expense transaction if processed';
COMMENT ON COLUMN whatsapp_messages.error_message IS 'Error message if processing failed';

COMMENT ON COLUMN drivers.whatsapp_phone IS 'WhatsApp phone number for receiving receipt images (format: +1234567890)';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

