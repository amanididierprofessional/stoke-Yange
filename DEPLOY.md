# Deploy Stoke Yange without Lovable (free)

You do **not** need Lovable credits to ship updates. The app is a normal GitHub project — deploy from GitHub for free.

## Why there is no `.env` in the repo

Secrets must never be committed. Only `.env.example` is in git.
You set the real key in the **host** (Vercel / Netlify), not in the repo.

```
VITE_SUPABASE_ANON_KEY=your_anon_public_key
```

URL is already in `src/lib/supabase.ts`.

---

## Option A — Vercel (recommended, free)

1. Go to https://vercel.com → sign in with **GitHub**
2. **Add New Project** → import `amanididierprofessional/stoke-Yange`
3. Framework: leave auto (Vite)
4. **Environment Variables** → add:
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
5. Click **Deploy**
6. You get a URL like `https://stoke-yange.vercel.app`

Every time you push to `main` on GitHub, Vercel rebuilds automatically.
Your phone PWA can open that URL (Add to Home Screen). Updates appear after refresh — **no reinstall**.

### Point your existing PWA at the new URL

- Open the Vercel URL once in Chrome/Safari
- Menu → **Add to Home screen**
- Use that icon going forward (old Lovable icon is optional)

---

## Option B — Netlify (free)

1. https://app.netlify.com → sign in with GitHub
2. Import the same repo
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add env `VITE_SUPABASE_ANON_KEY`
6. Deploy

---

## Auth (already in the app)

1. Supabase → Authentication → enable **Email** and **Google**
2. Add your deploy URL to Redirect URLs (e.g. `https://your-app.vercel.app/**`)
3. In the app: **Settings** → Sign up / Google → **Sync now**

Offline: data stays on the phone (IndexedDB).
Online + signed in: auto-sync runs on boot and when the network returns.

---

## First open behaviour

- **Empty shop** — no demo products
- Tap **+** on Stock to add real products
- Choose an **emoji** for each product card
- Trash icon deletes a product type (sales history is kept)
