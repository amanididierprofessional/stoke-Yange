/**
 * Supabase client — offline-first POS with optional cloud sync + auth.
 * Project URL is fixed for this shop app. You only need to set:
 *   VITE_SUPABASE_ANON_KEY=your_publishable_anon_key
 * in .env (local) or Lovable environment variables.
 * Without the key the app still works fully offline via IndexedDB.
 */

const DEFAULT_URL = "https://hdsoxtlruzuadsqkapls.supabase.co";

const url =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || DEFAULT_URL;
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

export const supabaseConfigured = Boolean(url && key);

// Lazy client so the app builds even if @supabase/supabase-js is not installed yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export let supabase: any = null;

if (supabaseConfigured && typeof window !== "undefined") {
  import("@supabase/supabase-js")
    .then(({ createClient }) => {
      supabase = createClient(url, key!, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    })
    .catch((e) => {
      console.warn("[supabase] package not available", e);
    });
}
