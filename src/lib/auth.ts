/**
 * Auth: local (IndexedDB) for offline + Supabase Auth for cloud verify.
 * Sign-in tries Supabase first when online; falls back to local hash offline.
 * Passwords live in auth.users only — NEVER in profiles.
 */
import { db, factoryReset } from "./db";
import { ensureSupabase, supabase, supabaseConfigured } from "./supabase";
import { pullFromCloud, trySync } from "./sync";

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
  return `${normalizePhone(phone)}@phone.stokeyange.local`;
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

async function applyProfileFromCloud(
  account: Account,
  userId: string,
  email: string | undefined,
) {
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
  if (opts.password.length < 4) return { ok: false, error: "password" };
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
        // User already in Auth → try sign-in instead
        if (/already|registered|exists/i.test(error.message)) {
          return { ok: false, error: "exists" };
        }
        console.warn("[auth] signup", error.message);
        return { ok: false, error: error.message };
      }
      // Ensure session (if confirm-email is off)
      if (!data.session) {
        const sign = await client.auth.signInWithPassword({ email, password: opts.password });
        if (sign.error) {
          // Account created but needs email confirm — still save local so offline works
          console.warn("[auth] post-signup signin", sign.error.message);
        }
      }
      const { data: sess } = await client.auth.getSession();
      const uid = sess.session?.user?.id;
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
    } catch (e) {
      console.warn("[auth] cloud signup", e);
    }
  }

  // Local always saved so offline works
  const existing = await getAccount();
  if (existing && existing.identifier !== id) {
    // Different user on this device — wipe shop data first
    await factoryReset(false);
  }
  await saveAccount(account);
  setLoggedIn(true);
  trySync().catch(() => {});
  return { ok: true };
}

export async function signIn(opts: {
  loginType: "phone" | "email";
  identifier: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = normalizeId(opts.loginType, opts.identifier);
  if (!id || opts.password.length < 4) return { ok: false, error: "bad_password" };

  const client = await ensureSupabase();
  const email = opts.loginType === "email" ? id : syntheticEmail(id);

  // 1) Prefer Supabase Auth when online + configured
  if (supabaseConfigured && client && navigator.onLine) {
    const { data, error } = await client.auth.signInWithPassword({ email, password: opts.password });
    if (error) {
      // Invalid login credentials from cloud
      if (/invalid|credentials|password/i.test(error.message)) {
        // Fall through to local check (may still work offline-created account)
      } else {
        console.warn("[auth] cloud signin", error.message);
      }
    }
    if (data?.session?.user) {
      const uid = data.session.user.id;
      const passwordHash = await sha256(opts.password);
      let account: Account = {
        loginType: opts.loginType,
        identifier: id,
        passwordHash,
        fullName: "",
        businessName: "Iduka Ryanjye",
        age: "",
        createdAt: Date.now(),
        supabaseUserId: uid,
      };
      account = await applyProfileFromCloud(account, uid, data.session.user.email);
      setLoggedIn(true);
      // Restore shop data from cloud if local is empty
      await pullFromCloud().catch((e) => console.warn("[auth] pull", e));
      trySync().catch(() => {});
      return { ok: true };
    }
  }

  // 2) Local fallback (offline or cloud failed)
  const account = await getAccount();
  if (!account) return { ok: false, error: "no_account" };
  if (account.loginType !== opts.loginType || account.identifier !== id) {
    return { ok: false, error: "mismatch" };
  }
  const hash = await sha256(opts.password);
  if (hash !== account.passwordHash) return { ok: false, error: "bad_password" };

  setLoggedIn(true);
  if (supabaseConfigured && client && navigator.onLine) {
    try {
      await client.auth.signInWithPassword({ email, password: opts.password });
      trySync().catch(() => {});
    } catch {
      /* offline ok */
    }
  }
  return { ok: true };
}

export async function recoverPassword(opts: {
  fullName: string;
  businessName: string;
  age: string;
  newPassword: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const account = await getAccount();
  if (!account) return { ok: false, error: "no_account" };
  const match =
    account.fullName.toLowerCase() === opts.fullName.trim().toLowerCase() &&
    account.businessName.toLowerCase() === opts.businessName.trim().toLowerCase() &&
    String(account.age) === String(opts.age).trim();
  if (!match) return { ok: false, error: "verify_fail" };
  if (opts.newPassword.length < 4) return { ok: false, error: "password" };

  account.passwordHash = await sha256(opts.newPassword);
  await saveAccount(account);
  setLoggedIn(true);

  const client = await ensureSupabase();
  if (client) {
    try {
      await client.auth.updateUser({ password: opts.newPassword });
    } catch {
      /* may need re-login */
    }
  }
  return { ok: true };
}

export function clearSessionOnly() {
  setLoggedIn(false);
}

export async function signOutLocal() {
  setLoggedIn(false);
  if (supabase) {
    void supabase.auth.signOut().catch(() => {});
  }
  await factoryReset(false);
  await db.settings.delete(KEY);
  await db.settings.delete("shopName");
}

export async function wipeCloudData(): Promise<{ ok: boolean; reason?: string }> {
  if (!supabaseConfigured || !supabase) return { ok: false, reason: "not_configured" };
  if (!navigator.onLine) return { ok: false, reason: "offline" };

  const run = async (): Promise<{ ok: boolean; reason?: string }> => {
    try {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;
      if (!uid) return { ok: false, reason: "no_session" };

      await Promise.all([
        supabase.from("movements").delete().eq("user_id", uid),
        supabase.from("payments").delete().eq("user_id", uid),
        supabase.from("debts").delete().eq("user_id", uid),
        supabase.from("sales").delete().eq("user_id", uid),
        supabase.from("parties").delete().eq("user_id", uid),
        supabase.from("products").delete().eq("user_id", uid),
        supabase.from("profiles").delete().eq("id", uid),
      ]);
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: String(e) };
    }
  };

  return Promise.race([
    run(),
    new Promise<{ ok: boolean; reason?: string }>((resolve) =>
      setTimeout(() => resolve({ ok: false, reason: "timeout" }), 6000),
    ),
  ]);
}
