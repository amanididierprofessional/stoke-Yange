/**
 * Supabase client — offline-first POS with optional cloud sync + auth.
 * Prefers VITE_SUPABASE_ANON_KEY (Vite client env).
 * Also accepts SUPABASE_ANON_KEY / NEXT_PUBLIC_* if vite envPrefix includes them.
 * Without a key the app still works fully offline via IndexedDB.
 */

const DEFAULT_URL = "https://hdsoxtlruzuadsqkapls.supabase.co";

function pickEnv(...names: string[]): string | undefined {
  const env = import.meta.env as Record<string, string | undefined>;
  for (const n of names) {
    const v = env[n]?.trim();
    if (v) return v;
  }
  return undefined;
}

const url =
  pickEnv(
    "VITE_SUPABASE_URL",
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
  ) || DEFAULT_URL;

const key = pickEnv(
  "VITE_SUPABASE_ANON_KEY",
  "SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
);

export const supabaseConfigured = Boolean(url && key);

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
