/**
 * Supabase client — MUST be ready before auth/sync.
 * Uses static import so client exists immediately (not a delayed dynamic import).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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
  pickEnv("VITE_SUPABASE_URL", "SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL") || DEFAULT_URL;

const key = pickEnv(
  "VITE_SUPABASE_ANON_KEY",
  "SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
);

export const supabaseConfigured = Boolean(url && key);

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url, key!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/** Always resolves; use before auth/sync so we never hit a null client race. */
export async function ensureSupabase(): Promise<SupabaseClient | null> {
  return supabase;
}
