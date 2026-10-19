/**
 * Auth: local (IndexedDB) offline + Supabase Auth when online.
 * Sign-up ALWAYS saves locally; cloud errors never block creating the shop account
 * except "user already registered" → tell them to sign in.
 * Passwords: auth.users only (never profiles).
 *
 * Sign-in (online): verifies password against Supabase Auth, then loads THAT user's
 * shop from the database (not whatever was left on the phone).
 */
import { db, factoryReset } from "./db";
import { ensureSupabase, supabase, supabaseConfigured } from "./supabase";
import { clearShopTables, fullSync, pullFromCloud, trySync } from "./sync";

export type Account = {
  loginType: "phone" | "email";
  identifier: string;
  passwordHash: string;
  fullName: string;
  businessName: string;
  age: string;
  createdAt: number;
  supabaseUserId?: string;
};

const KEY = "account";
const SESSION = "sy-session";
/** Supabase default minimum */
export const MIN_PASSWORD = 6;

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(`sy:${text}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizePhone(p: string) {
  return p.replace(/\D/g, "");
}
function normalizeId(type: "phone" | "email", id: string) {
  return type === "phone" ? normalizePhone(id) : id.trim().toLowerCase();
}

/** Valid-looking email for phone logins (Supabase rejects some .local domains). */
export function syntheticEmail(phone: string) {
  const digits = normalizePhone(phone);
  return `p${digits}@stokeyange.user`;
}

export async function getAccount(): Promise<Account | null> {
  const row = await db.settings.get(KEY);
  if (!row?.value) return null;
  try {
    return JSON.parse(row.value) as Account;
  } catch {
    return null;
  }
}

export async function isLoggedIn(): Promise<boolean> {
  return localStorage.getItem(SESSION) === "1" && !!(await getAccount());
}

export function setLoggedIn(v: boolean) {
  if (v) localStorage.setItem(SESSION, "1");
  else localStorage.removeItem(SESSION);
}

export async function hasAccount(): Promise<boolean> {
  return !!(await getAccount());
}

async function saveAccount(a: Account) {
  await db.settings.put({ key: KEY, value: JSON.stringify(a) });
  await db.settings.put({ key: "shopName", value: a.businessName || "Iduka Ryanjye" });
  await db.outbox.add({ op: "profile", createdAt: Date.now() });
}

async function applyProfileFromCloud(account: Account, userId: string, email?: string | null) {
  const client = await ensureSupabase();
  if (!client) return account;
  try {
    const { data } = await client.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (data) {
      if (data.full_name) account.fullName = data.full_name;
      if (data.shop_name) account.businessName = data.shop_name;
      if (data.age) account.age = String(data.age);
      if (data.phone && account.loginType === "phone") account.identifier = normalizePhone(data.phone);
    }
  } catch (e) {
    console.warn("[auth] load profile", e);
  }
  account.supabaseUserId = userId;
  if (email && account.loginType === "email") account.identifier = email.toLowerCase();
  await saveAccount(account);
  return account;
}

export async function signUp(opts: {
  loginType: "phone" | "email";
  identifier: string;
  password: string;
  fullName: string;
  businessName: string;
  age: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = normalizeId(opts.loginType, opts.identifier);
  if (!id) return { ok: false, error: "identifier" };
  if (opts.password.length < MIN_PASSWORD) return { ok: false, error: "password_short" };
  if (!opts.fullName.trim() || !opts.businessName.trim()) return { ok: false, error: "profile" };

  const passwordHash = await sha256(opts.password);
  const account: Account = {
    loginType: opts.loginType,
    identifier: id,
    passwordHash,
    fullName: opts.fullName.trim(),
    businessName: opts.businessName.trim(),
    age: String(opts.age).trim(),
    createdAt: Date.now(),
  };

  const client = await ensureSupabase();
  if (!navigator.onLine) return { ok: false, error: "internet_required" };
  if (!supabaseConfigured || !client) return { ok: false, error: "cloud_unavailable" };
  let cloudBlocked = false;

  if (supabaseConfigured && client && navigator.onLine) {
    try {
      const email = opts.loginType === "email" ? id : syntheticEmail(id);
      const { data, error } = await client.auth.signUp({
        email,
        password: opts.password,
        options: {
          data: {
            full_name: account.fullName,
            business_name: account.businessName,
            age: account.age,
            phone: opts.loginType === "phone" ? id : "",
          },
        },
      });

      if (error) {
        const msg = error.message || "";
        console.warn("[auth] signup cloud", msg);
        if (/already|registered|exists/i.test(msg)) {
          return { ok: false, error: "exists" };
        }
        if (/password/i.test(msg) && /6|least|characters/i.test(msg)) {
          return { ok: false, error: "password_short" };
        }
        cloudBlocked = true;
      } else {
        if (!data.session) {
          const sign = await client.auth.signInWithPassword({ email, password: opts.password });
          if (sign.error) {
            console.warn("[auth] post-signup signin", sign.error.message);
            if (/email not confirmed|confirm your email/i.test(sign.error.message)) {
              return { ok: false, error: "confirmation_required" };
            }
            cloudBlocked = true;
          }
        }
        const { data: sess } = await client.auth.getSession();
        const uid = sess.session?.user?.id;
        if (!uid) cloudBlocked = true;
        if (uid) {
          account.supabaseUserId = uid;
          const { error: pe } = await client.from("profiles").upsert({
            id: uid,
            shop_name: account.businessName,
            full_name: account.fullName,
            phone: opts.loginType === "phone" ? id : "",
            age: account.age,
            email: opts.loginType === "email" ? id : email,
            updated_at: new Date().toISOString(),
          });
          if (pe) console.warn("[auth] profile upsert", pe.message);
        }
      }
    } catch (e) {
      console.warn("[auth] cloud signup exception", e);
      cloudBlocked = true;
    }
  }

  if (cloudBlocked && supabaseConfigured && navigator.onLine) {
    return { ok: false, error: "cloud_unavailable" };
  }

  const existing = await getAccount();
  if (existing && existing.identifier !== id) {
    await factoryReset(false);
  }
  await saveAccount(account);
  setLoggedIn(true);
  // New account: push profile + any seed; pull (usually empty)
  fullSync().catch(() => trySync({ force: true }).catch(() => {}));

  return { ok: true };
}

export async function signIn(opts: {
  loginType: "phone" | "email";
  identifier: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = normalizeId(opts.loginType, opts.identifier);
  if (!id || opts.password.length < 1) return { ok: false, error: "bad_password" };

  const client = await ensureSupabase();
  const email = opts.loginType === "email" ? id : syntheticEmail(id);

  // 1) Cloud first when online — password checked against auth.users
  if (supabaseConfigured && client && navigator.onLine) {
    const { data, error } = await client.auth.signInWithPassword({ email, password: opts.password });
    if (error) {
      console.warn("[auth] cloud signin", error.message);
      if (/email not confirmed|confirm your email/i.test(error.message)) {
        return { ok: false, error: "confirmation_required" };
      }
      if (/invalid api key|invalid api|api key/i.test(error.message)) {
        return { ok: false, error: "cloud_unavailable" };
      }
    }
    if (data?.session?.user) {
      const uid = data.session.user.id;
      const prev = await getAccount();
      const sameUser =
        !!prev &&
        (prev.supabaseUserId === uid ||
          (prev.loginType === opts.loginType && prev.identifier === id));

      // Different account than what's on this phone → drop local shop data
      if (!sameUser) {
        await clearShopTables();
      }

      const passwordHash = await sha256(opts.password);
      let account: Account = {
        loginType: opts.loginType,
        identifier: id,
        passwordHash,
        fullName: prev && sameUser ? prev.fullName : "",
        businessName: prev && sameUser ? prev.businessName : "Iduka Ryanjye",
        age: prev && sameUser ? prev.age : "",
        createdAt: prev && sameUser ? prev.createdAt : Date.now(),
        supabaseUserId: uid,
      };
      account = await applyProfileFromCloud(account, uid, data.session.user.email);
      setLoggedIn(true);

      // Always bidirectional: push local changes, then force-pull cloud shop.
      // Same account on phone 2 / after logout gets the latest shared data.
      const syncResult = await fullSync().catch((e) => {
        console.warn("[auth] fullSync", e);
        return { ok: false as const, reason: String(e) };
      });
      if (!syncResult.ok) {
        // Fallback: at least try pull so empty phones get data
        const pull = await pullFromCloud({ force: true }).catch((e) => {
          console.warn("[auth] pull fallback", e);
          return { ok: false as const, reason: String(e) };
        });
        console.info("[auth] pullFromCloud fallback", pull);
      } else {
        console.info("[auth] fullSync ok", syncResult);
      }
      return { ok: true };
    }
  }

  // Online + Supabase configured: wrong password / unknown user → do not fall back to local
  if (supabaseConfigured && client && navigator.onLine) {
    return { ok: false, error: "bad_password" };
  }

  // 2) Offline / no cloud: local password only
  const account = await getAccount();
  if (!account) return { ok: false, error: "no_account" };
  if (account.loginType !== opts.loginType || account.identifier !== id) {
    return { ok: false, error: "mismatch" };
  }
  const hash = await sha256(opts.password);
  if (hash !== account.passwordHash) return { ok: false, error: "bad_password" };

  setLoggedIn(true);
  return { ok: true };
}

export async function recoverPassword(opts: {
  loginType: "phone" | "email";
  identifier: string;
  fullName: string;
  businessName: string;
  newPassword?: string;
}): Promise<{ ok: true; mode: "email" | "local" } | { ok: false; error: string }> {
  const id = normalizeId(opts.loginType, opts.identifier);
  if (!id) return { ok: false, error: "verify_fail" };

  const client = await ensureSupabase();

  // Cloud accounts must use Supabase's actual recovery flow.
  if (supabaseConfigured && client && navigator.onLine) {
    if (opts.loginType !== "email") {
      return { ok: false, error: "phone_support" };
    }
    const account = await getAccount();
    if (
      account &&
      (account.loginType !== "email" ||
        account.identifier !== id ||
        account.fullName.trim().toLowerCase() !== opts.fullName.trim().toLowerCase() ||
        account.businessName.trim().toLowerCase() !== opts.businessName.trim().toLowerCase())
    ) {
      return { ok: false, error: "verify_fail" };
    }
    const { error } = await client.auth.resetPasswordForEmail(id, {
      redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
    });
    if (error) {
      console.warn("[auth] password reset request", error.message);
      return { ok: false, error: "recovery_unavailable" };
    }
    return { ok: true, mode: "email" };
  }

  if (!opts.newPassword || opts.newPassword.length < MIN_PASSWORD) return { ok: false, error: "password_short" };
  const account = await getAccount();
  if (!account) return { ok: false, error: navigator.onLine ? "no_account" : "internet_required" };
  const match =
    account.loginType === opts.loginType &&
    account.identifier === id &&
    account.fullName.trim().toLowerCase() === opts.fullName.trim().toLowerCase() &&
    account.businessName.trim().toLowerCase() === opts.businessName.trim().toLowerCase();
  if (!match) return { ok: false, error: "verify_fail" };

  account.passwordHash = await sha256(opts.newPassword);
  await saveAccount(account);
  setLoggedIn(false);
  return { ok: true, mode: "local" };
}

export async function completePasswordRecovery(
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (newPassword.length < MIN_PASSWORD) return { ok: false, error: "password_short" };
  const client = await ensureSupabase();
  if (!client || !supabaseConfigured || !navigator.onLine) {
    return { ok: false, error: "recovery_unavailable" };
  }
  const { error } = await client.auth.updateUser({ password: newPassword });
  if (error) {
    console.warn("[auth] finish password recovery", error.message);
    return { ok: false, error: "recovery_unavailable" };
  }
  const account = await getAccount();
  if (account) {
    account.passwordHash = await sha256(newPassword);
    await saveAccount(account);
  }
  setLoggedIn(false);
  return { ok: true };
}

export function clearSessionOnly() {
  setLoggedIn(false);
}

/** Logout: clear session + local shop + account on this phone (cloud kept). */
export async function signOutLocal() {
  setLoggedIn(false);
  if (supabase) {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Clear local app data even if the local auth session is already invalid.
    }
  }
  await factoryReset(false);
  await db.settings.delete(KEY);
  await db.settings.delete("shopName");
}

export async function wipeCloudData(): Promise<{ ok: boolean; reason?: string }> {
  if (!supabaseConfigured || !supabase) return { ok: false, reason: "not_configured" };
  if (!navigator.onLine) return { ok: false, reason: "offline" };

  const sb = supabase;
  const run = async (): Promise<{ ok: boolean; reason?: string }> => {
    try {
      const supabase = sb;
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;
      if (!uid) return { ok: false, reason: "no_session" };
      const deletions = [
        await supabase.from("movements").delete().eq("user_id", uid),
        await supabase.from("payments").delete().eq("user_id", uid),
        await supabase.from("debts").delete().eq("user_id", uid),
        await supabase.from("sales").delete().eq("user_id", uid),
        await supabase.from("parties").delete().eq("user_id", uid),
        await supabase.from("products").delete().eq("user_id", uid),
        await supabase.from("profiles").delete().eq("id", uid),
      ];
      const failed = deletions.find((result) => result.error);
      if (failed?.error) return { ok: false, reason: failed.error.message };
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: String(e) };
    }
  };

  return Promise.race([
    run(),
    new Promise<{ ok: boolean; reason?: string }>((resolve) =>
      setTimeout(() => resolve({ ok: false, reason: "timeout" }), 15000),
    ),
  ]);
}
