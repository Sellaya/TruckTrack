# Supabase Storage Setup for Receipts

To enable receipt image uploads, you need to create a storage bucket in Supabase.

## Quick Setup Steps

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. **Create Storage Bucket**
   - Go to **Storage** in the left sidebar
   - Click **New bucket** or **Create bucket**
   - Bucket name: `receipts` (must be exactly this name)
   - **Make it Public** (toggle "Public bucket" to ON) - this allows images to be accessed via URL
   - Click **Create bucket**

3. **Set Up Bucket Policies** (Optional - for more security)
   
   If you want to restrict access, you can set up policies. Otherwise, if the bucket is public, it will work with default policies.
   
   Go to **Storage** > **Policies** for the `receipts` bucket and add:
   
   ```sql
   -- Allow anyone to upload (for driver receipts)
   CREATE POLICY "Allow public uploads"
   ON storage.objects FOR INSERT
   TO public
   WITH CHECK (bucket_id = 'receipts');

   -- Allow public read access
   CREATE POLICY "Allow public read"
   ON storage.objects FOR SELECT
   TO public
   USING (bucket_id = 'receipts');
   ```

## Fallback Behavior

**Good News:** If the bucket doesn't exist or upload fails, the app will automatically:
- Convert the image to base64 format
- Store it as a data URL in the database

This means receipt uploads will work even without storage setup, though base64 images are larger and less efficient than using Supabase Storage.

## Testing

After setup, drivers can:
1. Click "Take Photo or Select from Gallery" in the expense dialog
2. Take a photo with their camera or select from gallery
3. See a preview of the image
4. Upload the image when saving the expense

## Troubleshooting

- **"Bucket not found" error**: Make sure the bucket is named exactly `receipts` (lowercase)
- **Upload fails**: Check that the bucket is set to Public
- **Images not displaying**: Verify the bucket policies allow public read access
