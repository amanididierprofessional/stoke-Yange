import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { db, factoryReset } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { useShopName } from "@/components/AppShell";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { trySync } from "@/lib/sync";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Stoke Yange" },
      { name: "description", content: "Shop profile, backups and data reset." },
      { property: "og:title", content: "Settings — Stoke Yange" },
      { property: "og:description", content: "Shop profile, backups and data reset." },
    ],
  }),
  component: SettingsPage,
});

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const shop = useShopName();
  const [name, setName] = useState(shop);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  useEffect(() => setName(shop), [shop]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const stamp = new Date().toISOString().slice(0, 10);

  const exportJson = async () => {
    const out: Record<string, unknown> = { exportedAt: new Date().toISOString() };
    for (const tb of db.tables) out[tb.name] = await tb.toArray();
    download(`stoke-yange-${stamp}.json`, JSON.stringify(out, null, 2), "application/json");
  };
  const exportCsv = async () => {
    const rows = await db.sales.orderBy("createdAt").toArray();
    const head = "date,product,qty,unit_price,total,type,reversed";
    const body = rows.map((s) =>
      [new Date(s.createdAt).toISOString(), `"${s.productName}"`, s.qty, s.unitPrice, s.total, s.type, s.reversed ? 1 : 0].join(","),
    );
    download(`stoke-yange-sales-${stamp}.csv`, [head, ...body].join("\n"), "text/csv");
  };

  const signInEmail = async () => {
    if (!supabase) return;
    setAuthBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
      else {
        toast.success("Signed in");
        await trySync();
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const signUpEmail = async () => {
    if (!supabase) return;
    setAuthBusy(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) toast.error(error.message);
      else toast.success("Check your email to confirm, then sign in");
    } finally {
      setAuthBusy(false);
    }
  };

  const signInGoogle = async () => {
    if (!supabase) return;
    setAuthBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) toast.error(error.message);
    } finally {
      setAuthBusy(false);
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    toast.success("Signed out");
  };

  const syncNow = async () => {
    const r = await trySync();
    if (r.ok) toast.success("Synced to cloud");
    else
      toast.error(
        r.reason === "no_session"
          ? "Sign in first"
          : r.reason === "offline"
            ? "You are offline"
            : r.reason ?? "Sync failed",
      );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{t("settings")}</h2>
      <section className="space-y-3 rounded-2xl bg-card p-4 shadow-card">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">{t("shopName")}</span>
          <div className="mt-1 flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" />
            <button
              type="button"
              onClick={async () => {
                await db.settings.put({ key: "shopName", value: name.trim() || shop });
                toast.success(t("save"));
              }}
              className="rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              {t("save")}
            </button>
          </div>
        </label>
        <div className="flex items-center justify-between text-sm">
          <span>{t("currency")}</span>
          <b>RWF (Rwandan Franc)</b>
        </div>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span>Language / Ururimi</span>
          <div className="flex gap-1 rounded-full bg-muted p-1">
            {(["en", "rw"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`h-8 rounded-full px-3 text-xs font-semibold ${lang === l ? "bg-card text-primary shadow-card" : ""}`}
              >
                {l === "en" ? "English" : "Kinyarwanda"}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl bg-card p-4 shadow-card">
        <p className="text-sm font-semibold">Cloud backup & login</p>
        {!supabaseConfigured ? (
          <p className="text-xs text-muted-foreground">
            Add VITE_SUPABASE_ANON_KEY to enable Google / email login and cloud sync. The app already works fully offline without it.
          </p>
        ) : userEmail ? (
          <div className="space-y-2">
            <p className="text-sm">
              Signed in as <b>{userEmail}</b>
            </p>
            <button type="button" onClick={syncNow} className="h-11 w-full rounded-full bg-primary font-semibold text-primary-foreground">
              Sync now
            </button>
            <button type="button" onClick={signOut} className="h-11 w-full rounded-full border font-semibold">
              Sign out
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <button type="button" disabled={authBusy} onClick={signInGoogle} className="h-11 w-full rounded-full border font-semibold">
              Continue with Google
            </button>
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-xl" />
            <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-xl" />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={authBusy} onClick={signInEmail} className="h-11 rounded-full bg-primary font-semibold text-primary-foreground">
                Sign in
              </button>
              <button type="button" disabled={authBusy} onClick={signUpEmail} className="h-11 rounded-full border font-semibold">
                Sign up
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              WhatsApp login needs a paid OTP provider — use Google or email for now.
            </p>
          </div>
        )}
      </section>

      <section className="space-y-2 rounded-2xl bg-card p-4 shadow-card">
        <button type="button" onClick={exportJson} className="h-12 w-full rounded-full border font-semibold">
          {t("exportJson")}
        </button>
        <button type="button" onClick={exportCsv} className="h-12 w-full rounded-full border font-semibold">
          {t("exportCsv")}
        </button>
      </section>
      <section className="space-y-2 rounded-2xl bg-card p-4 shadow-card">
        <button
          type="button"
          onClick={async () => {
            if (confirm(t("confirmReset"))) {
              await factoryReset(true);
              toast.success(t("reloadDemo"));
            }
          }}
          className="h-12 w-full rounded-full bg-secondary font-semibold text-secondary-foreground"
        >
          {t("reloadDemo")}
        </button>
        <button
          type="button"
          onClick={async () => {
            if (confirm(t("confirmReset"))) {
              await factoryReset(false);
              toast.success(t("reset"));
            }
          }}
          className="h-12 w-full rounded-full bg-destructive font-semibold text-destructive-foreground"
        >
          {t("reset")}
        </button>
      </section>
      <p className="text-center text-xs text-muted-foreground">Stoke Yange · offline-first · data on this phone</p>
    </div>
  );
}
