# Stoke Yange — Supabase setup and email verification

The app uses this Supabase project URL: `https://hdsoxtlruzuadsqkapls.supabase.co`.

## 1. Confirm the database schema

1. Open the Supabase dashboard for **stoke-Yange**.
2. Open **SQL Editor**.
3. Run the current `supabase/schema.sql` only if the tables and policies have not already been created. Do not rerun it blindly on production without reviewing it first.

## 2. Enable email/password accounts and verification

1. Open **Authentication → Sign In / Providers** (the label may vary slightly).
2. Make sure **Email** is enabled.
3. Keep **Confirm email enabled** so users must prove they control their email address.
4. Under **Authentication → URL Configuration**, set **Site URL** to the actual deployed Stoke Yange URL (for example `https://stoke-yange.vercel.app` if that is the current production domain).
5. Add the deployed URL and its root path to **Redirect URLs**. Add your local development URL only if you test locally.
6. In **Authentication → Email Templates**, check the **Confirm signup** and **Reset password** templates. Keep the Supabase confirmation URL/token placeholders intact so links can be verified by Supabase.
7. For reliable delivery to real users, configure a trusted SMTP provider under **Authentication → SMTP Settings**. Supabase's built-in sender is rate-limited and is not a reliable production email service. Check spam/junk folders during tests.

## 3. Ensure the app has the public key

The deployed frontend needs the project URL and publishable/legacy anon key only. Set `VITE_SUPABASE_ANON_KEY` in your deployment environment (for Vercel, Project → Settings → Environment Variables), then redeploy. Never put a `service_role` or secret key in frontend environment variables.

## 4. Test the email flow end to end

1. Use an email address you control that is not already registered in this project.
2. In Stoke Yange, choose **Sign up → Email**, complete the shop/name fields, and create the account.
3. You should see a prompt to check your inbox. Open the verification email and click its link.
4. Return to the deployed app and sign in with that email and password.
5. Choose **Forgot password**, enter the same email, and submit the recovery request.
6. Open the reset email and follow its link. The app should show the new-password screen; save a new password and sign in with it.
7. If no email arrives, inspect the Supabase Auth logs and SMTP delivery/error logs. Do not disable confirmation just to hide a delivery problem.

## 5. Safe reset and report behavior

- **Clear this phone** keeps the account and does not immediately delete cloud data. If you create fresh shop records and then sync, the app replaces the old cloud shop snapshot with those new local records.
- **Clear phone and cloud** is destructive and removes the shop records from both locations.
- PDF reports should be downloaded/shared as actual `.pdf` files; CSV exports remain `.csv`.
