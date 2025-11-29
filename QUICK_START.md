# Quick Start Guide - Supabase Setup

## ✅ Your Keys Are Configured

I've added your Supabase keys to `.env.local`:
- ✅ Publishable Key: `sb_publishable_SJYRejCo8pxWYDW574wgLw_M2AkOkMs`
- ✅ Secret Key: `sb_secret_LsNlaLbCZBFyQ4jGV8-Zgg_otww45C0` (stored as comment for reference)

## 🔧 What You Need to Do

### 1. Get Your Supabase Project URL

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Find **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
5. Copy it

### 2. Update .env.local

Open `.env.local` and replace `your_supabase_project_url_here` with your actual URL:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_SJYRejCo8pxWYDW574wgLw_M2AkOkMs
```

### 3. Run the Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Open the file `supabase/schema.sql` from this project
3. Copy all the SQL code
4. Paste into SQL Editor
5. Click **Run** to execute

This creates all tables:
- ✅ `units` - Your truck units
- ✅ `drivers` - Driver profiles  
- ✅ `trips` - Trip records
- ✅ `transactions` - Income and expenses

### 4. Restart Your Dev Server

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## 🎯 What Happens Next

- **If Supabase is configured correctly:**
  - All data will be stored in Supabase
  - Changes persist across page refreshes
  - Multiple users can access the same data

- **If Supabase is not configured:**
  - App falls back to mock data
  - Data resets on page refresh
  - Works for development/testing

## 🧪 Test It

1. Go to **Trips** page
2. Click **Log New Trip**
3. Fill in the form and submit
4. Check your Supabase dashboard → **Table Editor** → **trips** table
5. You should see your new trip!

## 📝 Notes

- The `sb_publishable_` key is safe for client-side use
- The `sb_secret_` key should only be used server-side (if needed)
- `.env.local` is already in `.gitignore` - your keys are safe

## 🆘 Troubleshooting

**"Missing Supabase environment variables"**
- Make sure `.env.local` has both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Restart dev server after updating `.env.local`

**Data not showing**
- Check browser console for errors
- Verify schema was run in Supabase
- Check Supabase dashboard → Table Editor to see if tables exist

**Can't connect to Supabase**
- Verify your project URL is correct
- Check that your Supabase project is active
- Make sure the anon key matches your project






