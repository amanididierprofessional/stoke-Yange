/**
 * Supabase client.
 * Use the public Supabase publishable key in browser/native clients.
 * This key is intentionally public; never place a service-role/secret key here.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_URL = "https://hdsoxtlruzuadsqkapls.supabase.co";
const DEFAULT_PUBLISHABLE_KEY = "sb_publishable_Te3LfkYrNP1v2gUSqkcpDg_SupfSYqJ";

function pickEnv(...names: string[]): string | undefined {
  const env = import.meta.env as Record<string, string | undefined>;
  for (const n of names) {
    const v = env[n]?.trim();
    if (v) return v;
  }
  return undefined;
}

export const supabaseUrl =
  pickEnv("VITE_SUPABASE_URL", "SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL") || DEFAULT_URL;

export const supabaseAnonKey = pickEnv(
  "VITE_SUPABASE_ANON_KEY",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
) || DEFAULT_PUBLISHABLE_KEY;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

if (typeof window !== "undefined") {
  if (!supabaseConfigured) {
    console.warn(
      "[Stoke Yange] Supabase OFF — set VITE_SUPABASE_ANON_KEY on Vercel and Redeploy. URL:",
      supabaseUrl,
    );
  } else {
    console.info("[Stoke Yange] Supabase client ready:", supabaseUrl);
  }
}

export async function ensureSupabase(): Promise<SupabaseClient | null> {
  return supabase;
}

export type CloudHealth = {
  configured: boolean;
  online: boolean;
  url: string;
  hasKey: boolean;
  session: boolean;
  userId?: string;
  profileOk: boolean;
  productsTableOk: boolean;
  message: string;
};

/** Call from Settings to see exactly why cloud is not working. */
export async function checkCloudHealth(): Promise<CloudHealth> {
  const base: CloudHealth = {
    configured: supabaseConfigured,
    online: typeof navigator !== "undefined" ? navigator.onLine : false,
    url: supabaseUrl,
    hasKey: Boolean(supabaseAnonKey),
    session: false,
    profileOk: false,
    productsTableOk: false,
    message: "",
  };

  if (!supabaseConfigured || !supabase) {
    base.message =
      "Supabase public key is missing from this build. Rebuild with NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.";
    return base;
  }
  if (!base.online) {
    base.message = "Device is offline — cloud needs internet.";
    return base;
  }

  try {
    const { data: sess, error: se } = await supabase.auth.getSession();
    if (se) {
      base.message = `Auth error: ${se.message}`;
      return base;
    }
    base.session = !!sess.session;
    base.userId = sess.session?.user?.id;

    // Probe profiles table
    const { error: pe } = await supabase.from("profiles").select("id").limit(1);
    if (pe) {
      base.message = `profiles table: ${pe.message}. Run supabase/schema.sql in SQL Editor.`;
      return base;
    }
    base.profileOk = true;

    // Probe products table (must exist for shop sync)
    const { error: prodE } = await supabase.from("products").select("id").limit(1);
    if (prodE) {
      base.message = `products table missing: ${prodE.message}. Run full supabase/schema.sql.`;
      return base;
    }
    base.productsTableOk = true;

    if (!base.session) {
      base.message =
        "Key + tables OK, but not signed into cloud. Sign up / Sign in while online (password ≥ 6 chars). Confirm email must be OFF in Supabase Auth.";
      return base;
    }

    base.message = "Cloud OK — session active, tables reachable.";
    return base;
  } catch (e) {
    base.message = `Connection failed: ${String(e)}`;
    return base;
  }
}
