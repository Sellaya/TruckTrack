# Supabase Setup Guide

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in your project details:
   - Name: TruckTrack (or your preferred name)
   - Database Password: (choose a strong password)
   - Region: (choose closest to you)
5. Wait for the project to be created (takes a few minutes)

## 2. Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys")

## 3. Set Up Environment Variables

1. Create a `.env.local` file in the root of your project (if it doesn't exist)
2. Add the following:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Replace `your_project_url_here` and `your_anon_key_here` with the values from step 2.

## 4. Run the Database Schema

1. In your Supabase project, go to **SQL Editor**
2. Open the file `supabase/schema.sql` from this project
3. Copy the entire SQL content
4. Paste it into the SQL Editor in Supabase
5. Click "Run" to execute the schema

This will create all the necessary tables:
- `units` - Truck units/vehicles
- `drivers` - Driver profiles
- `trips` - Trip records
- `transactions` - Income and expense transactions

## 5. Verify Setup

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. The application will automatically use Supabase if the environment variables are set correctly
3. If Supabase is not configured, the app will fall back to mock data

## 6. Test the Connection

1. Go to any page that displays data (e.g., Trips, Units, Drivers)
2. The data should now be loaded from Supabase
3. Try creating a new trip, unit, or driver to verify write operations

## Troubleshooting

### "Missing Supabase environment variables" error
- Make sure `.env.local` exists and has the correct variable names
- Restart your dev server after adding environment variables
- Check that the values don't have extra spaces or quotes

### Data not showing
- Check the browser console for errors
- Verify the schema was run successfully in Supabase
- Check the Supabase dashboard → Table Editor to see if tables exist

### Row Level Security (RLS) issues
- The schema includes RLS policies that allow all operations
- If you need to restrict access, update the policies in Supabase

## Next Steps

- Set up authentication (if needed)
- Configure more restrictive RLS policies
- Add database indexes for better performance
- Set up database backups







