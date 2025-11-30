# Environment Variables Setup

## Your Supabase Keys

I've added your Supabase keys to `.env.local`. However, you still need to add your **Supabase Project URL**.

## How to Find Your Supabase Project URL

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Look for **Project URL** (it looks like: `https://xxxxxxxxxxxxx.supabase.co`)
5. Copy that URL

## Update .env.local

Open `.env.local` and replace `your_supabase_project_url_here` with your actual project URL:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_SJYRejCo8pxWYDW574wgLw_M2AkOkMs
```

## After Setup

1. **Run the database schema:**
   - Go to Supabase SQL Editor
   - Copy contents of `supabase/schema.sql`
   - Run the SQL script

2. **Restart your dev server:**
   ```bash
   npm run dev
   ```

3. **The app will automatically:**
   - Use Supabase if configured correctly
   - Fall back to mock data if not configured

## Security Notes

- ✅ `.env.local` is already in `.gitignore` - your keys are safe
- ⚠️ Never commit your `.env.local` file
- ⚠️ The `sb_secret_` key is a service role key - only use server-side if needed
- ✅ The `sb_publishable_` key is safe for client-side use








