/**
 * Local-first shop accounts (phone or email + password).
 * Optionally mirrors to Supabase Auth when configured.
 * Recovery uses name + business + age.
 */
import { db } from "./db";
import { supabase, supabaseConfigured } from "./supabase";
import { trySync } from "./sync";

export type Account = {
  loginType: "phone" | "email";
  identifier: string;
  passwordHash: string;
  fullName: string;
  businessName: string;
  age: string;
  createdAt: number;
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

  const existing = await getAccount();
  if (existing) return { ok: false, error: "exists" };

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
  await saveAccount(account);
  setLoggedIn(true);

  if (supabaseConfigured && supabase) {
    try {
      const email = opts.loginType === "email" ? id : syntheticEmail(id);
      const { error } = await supabase.auth.signUp({
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
      if (error && !/already/i.test(error.message)) {
        console.warn("[auth] supabase signup", error.message);
      }
      await supabase.auth.signInWithPassword({ email, password: opts.password }).catch(() => {});
      trySync().catch(() => {});
    } catch (e) {
      console.warn("[auth] cloud signup skipped", e);
    }
  }

  return { ok: true };
}

export async function signIn(opts: {
  loginType: "phone" | "email";
  identifier: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = normalizeId(opts.loginType, opts.identifier);
  const account = await getAccount();
  if (!account) return { ok: false, error: "no_account" };

  if (account.loginType !== opts.loginType || account.identifier !== id) {
    return { ok: false, error: "mismatch" };
  }
  const hash = await sha256(opts.password);
  if (hash !== account.passwordHash) return { ok: false, error: "bad_password" };

  setLoggedIn(true);

  if (supabaseConfigured && supabase) {
    try {
      const email = opts.loginType === "email" ? id : syntheticEmail(id);
      await supabase.auth.signInWithPassword({ email, password: opts.password });
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

  if (supabaseConfigured && supabase) {
    try {
      await supabase.auth.updateUser({ password: opts.newPassword });
    } catch {
      /* ignore */
    }
  }
  return { ok: true };
}

export async function signOutLocal() {
  setLoggedIn(false);
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      /* */
    }
  }
}
