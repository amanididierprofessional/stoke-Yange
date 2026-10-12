# Stoke Yange — Supabase setup (2 minutes)

Your project URL is already wired in the app:
`https://hdsoxtlruzuadsqkapls.supabase.co`

## 1. Create tables (one time)

1. Open Supabase → **SQL Editor** → New query
2. Paste the full contents of `supabase/schema.sql`
3. Click **Run**

## 2. Enable login providers

1. Supabase → **Authentication** → **Providers**
2. Enable **Email**
3. Enable **Google** (optional)
4. Add your app redirect URLs

## 3. Paste only your anon key

```env
VITE_SUPABASE_ANON_KEY=your_key_here
```

Lovable: Project Settings → Environment variables → same name.

## 4. npm install @supabase/supabase-js

Then: Settings → sign in → Sync now.
