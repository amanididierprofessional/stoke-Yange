/**
 * Auth: local (IndexedDB) offline + Supabase Auth when online.
 * Recovery: email OTP (6-digit) or recovery link; phone = local verify or support.
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
        if (/already|registered|exists/i.test(msg)) return { ok: false, error: "exists" };
        if (/password/i.test(msg) && /6|least|characters/i.test(msg)) return { ok: false, error: "password_short" };
        cloudBlocked = true;
      } else {
        if (!data.session) {
          const sign = await client.auth.signInWithPassword({ email, password: opts.password });
          if (sign.error) {
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
          await client.from("profiles").upsert({
            id: uid,
            shop_name: account.businessName,
            full_name: account.fullName,
            phone: opts.loginType === "phone" ? id : "",
            age: account.age,
            email: opts.loginType === "email" ? id : email,
            updated_at: new Date().toISOString(),
          });
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

  if (supabaseConfigured && client && navigator.onLine) {
    const { data, error } = await client.auth.signInWithPassword({ email, password: opts.password });
    if (error) {
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

      if (!sameUser) await clearShopTables();

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

      const syncResult = await fullSync().catch((e) => {
        console.warn("[auth] fullSync", e);
        return { ok: false as const, reason: String(e) };
      });
      if (!syncResult.ok) {
        await pullFromCloud({ force: true }).catch(() => {});
      }
      return { ok: true };
    }
  }

  if (supabaseConfigured && client && navigator.onLine) {
    return { ok: false, error: "bad_password" };
  }

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

/** Send 6-digit email OTP (Supabase email magic/OTP). Requires Email OTP enabled in Supabase. */
export async function requestEmailOtp(
  emailRaw: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = emailRaw.trim().toLowerCase();
  if (!email || !email.includes("@")) return { ok: false, error: "identifier" };
  const client = await ensureSupabase();
  if (!client || !supabaseConfigured || !navigator.onLine) {
    return { ok: false, error: "internet_required" };
  }
  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
    },
  });
  if (error) {
    console.warn("[auth] email otp", error.message);
    // Fallback: recovery link email
    const { error: e2 } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/` : undefined,
    });
    if (e2) {
      console.warn("[auth] reset link", e2.message);
      return { ok: false, error: "recovery_unavailable" };
    }
    return { ok: true };
  }
  return { ok: true };
}

/** Verify email OTP then set a new password (user is temporarily signed in). */
export async function verifyEmailOtpAndSetPassword(opts: {
  email: string;
  token: string;
  newPassword: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = opts.email.trim().toLowerCase();
  const token = opts.token.trim().replace(/\s/g, "");
  if (!email || token.length < 4) return { ok: false, error: "bad_code" };
  if (opts.newPassword.length < MIN_PASSWORD) return { ok: false, error: "password_short" };

  const client = await ensureSupabase();
  if (!client || !supabaseConfigured || !navigator.onLine) {
    return { ok: false, error: "internet_required" };
  }

  const { data, error } = await client.auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  if (error || !data.session) {
    // Try recovery type (from reset link flow codes if any)
    const second = await client.auth.verifyOtp({
      email,
      token,
      type: "recovery",
    });
    if (second.error || !second.data.session) {
      console.warn("[auth] verify otp", error?.message || second.error?.message);
      return { ok: false, error: "bad_code" };
    }
  }

  const { error: upErr } = await client.auth.updateUser({ password: opts.newPassword });
  if (upErr) {
    console.warn("[auth] update password after otp", upErr.message);
    return { ok: false, error: "recovery_unavailable" };
  }

  const account = await getAccount();
  if (account && account.loginType === "email" && account.identifier === email) {
    account.passwordHash = await sha256(opts.newPassword);
    await saveAccount(account);
  }
  // Sign out recovery session — user must sign in with new password
  try {
    await client.auth.signOut({ scope: "local" });
  } catch {
    /* */
  }
  setLoggedIn(false);
  return { ok: true };
}

export async function recoverPassword(opts: {
  loginType: "phone" | "email";
  identifier: string;
  fullName: string;
  businessName: string;
  newPassword?: string;
}): Promise<{ ok: true; mode: "email" | "local" | "otp_sent" } | { ok: false; error: string }> {
  const id = normalizeId(opts.loginType, opts.identifier);
  if (!id) return { ok: false, error: "verify_fail" };

  const client = await ensureSupabase();

  // Email + online → send OTP / recovery email
  if (opts.loginType === "email" && supabaseConfigured && client && navigator.onLine) {
    const sent = await requestEmailOtp(id);
    if (!sent.ok) return { ok: false, error: sent.error };
    return { ok: true, mode: "otp_sent" };
  }

  // Phone + online without local match → needs support (no SMS provider yet)
  if (opts.loginType === "phone" && supabaseConfigured && client && navigator.onLine) {
    const account = await getAccount();
    const match =
      account &&
      account.loginType === "phone" &&
      account.identifier === id &&
      account.fullName.trim().toLowerCase() === opts.fullName.trim().toLowerCase() &&
      account.businessName.trim().toLowerCase() === opts.businessName.trim().toLowerCase();
    if (match) {
      if (!opts.newPassword || opts.newPassword.length < MIN_PASSWORD) {
        return { ok: false, error: "password_short" };
      }
      // Update local hash; try cloud password update only if already signed in as this user
      account.passwordHash = await sha256(opts.newPassword);
      await saveAccount(account);
      try {
        const { data: sess } = await client.auth.getSession();
        if (sess.session?.user) {
          await client.auth.updateUser({ password: opts.newPassword });
        }
      } catch {
        /* cloud password may stay old until they use support / email path */
      }
      setLoggedIn(false);
      return { ok: true, mode: "local" };
    }
    return { ok: false, error: "phone_support" };
  }

  // Offline / local-only recovery on this device
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
  try {
    await client.auth.signOut({ scope: "local" });
  } catch {
    /* */
  }
  setLoggedIn(false);
  return { ok: true };
}

/** True if URL/hash indicates a Supabase recovery session. */
export function isRecoveryHash(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hash || "";
  const s = window.location.search || "";
  return h.includes("type=recovery") || s.includes("type=recovery") || h.includes("type=signup");
}

export function clearSessionOnly() {
  setLoggedIn(false);
}

export async function signOutLocal() {
  setLoggedIn(false);
  if (supabase) {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* */
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
      const { data } = await sb.auth.getSession();
      const uid = data.session?.user?.id;
      if (!uid) return { ok: false, reason: "no_session" };
      const deletions = [
        await sb.from("movements").delete().eq("user_id", uid),
        await sb.from("payments").delete().eq("user_id", uid),
        await sb.from("debts").delete().eq("user_id", uid),
        await sb.from("sales").delete().eq("user_id", uid),
        await sb.from("parties").delete().eq("user_id", uid),
        await sb.from("products").delete().eq("user_id", uid),
        await sb.from("profiles").delete().eq("id", uid),
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
