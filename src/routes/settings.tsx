import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { db, factoryReset } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { useShopName } from "@/components/AppShell";
import {
  clearSessionOnly,
  getAccount,
  isLoggedIn,
  signOutLocal,
  wipeCloudData,
  type Account,
} from "@/lib/auth";
import { checkCloudHealth, type CloudHealth } from "@/lib/supabase";
import { exportPdfReport } from "@/lib/report";
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

function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const shop = useShopName();
  const [name, setName] = useState(shop);
  const [editingShop, setEditingShop] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [health, setHealth] = useState<CloudHealth | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => setName(shop), [shop]);

  useEffect(() => {
    (async () => {
      if (!(await isLoggedIn())) {
        setAccount(null);
        return;
      }
      setAccount(await getAccount());
    })();
  }, []);

  const runHealth = async () => {
    setChecking(true);
    try {
      const h = await checkCloudHealth();
      setHealth(h);
      if (h.session) {
        const sync = await trySync();
        if (!sync.ok && sync.reason) {
          setHealth({ ...h, message: `${h.message} · Sync: ${sync.reason}` });
        }
      }
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    runHealth();
  }, []);

  const stamp = new Date().toISOString().slice(0, 10);

  const saveShopName = async () => {
    const v = name.trim() || shop;
    await db.settings.put({ key: "shopName", value: v });
    await db.outbox.add({ op: "profile", createdAt: Date.now() });
    setEditingShop(false);
    toast.success(t("save"));
  };

  const exportCsv = async () => {
    const rows = await db.sales.orderBy("createdAt").toArray();
    const head = "date,product,qty,unit_price,total,type,reversed";
    const body = rows.map((s) =>
      [new Date(s.createdAt).toISOString(), `"${s.productName}"`, s.qty, s.unitPrice, s.total, s.type, s.reversed ? 1 : 0].join(","),
    );
    const url = URL.createObjectURL(new Blob([[head, ...body].join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `stoke-yange-sales-${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const logout = async () => {
    setBusy(true);
    try {
      await signOutLocal();
      toast.success(t("signedOut"));
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  const resetAppOnly = async () => {
    setBusy(true);
    try {
      await factoryReset(false);
      await db.settings.delete("account");
      await db.settings.delete("shopName");
      clearSessionOnly();
      toast.success(t("resetPhoneDone"));
      window.location.reload();
    } finally {
      setBusy(false);
      setResetOpen(false);
    }
  };

  const resetFull = async () => {
    setBusy(true);
    try {
      const cloud = await wipeCloudData();
      if (!cloud.ok && cloud.reason !== "no_session" && cloud.reason !== "not_configured" && cloud.reason !== "timeout") {
        toast.error(cloud.reason ?? "Cloud wipe failed");
      }
      await factoryReset(false);
      await db.settings.delete("account");
      await db.settings.delete("shopName");
      clearSessionOnly();
      toast.success(t("resetFullDone"));
      window.location.reload();
    } finally {
      setBusy(false);
      setResetOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{t("settings")}</h2>

      {/* Cloud diagnostic — shows the real reason sync fails */}
      <section className="space-y-2 rounded-2xl border border-primary/20 bg-card p-4 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold">Cloud / Supabase</p>
          <button
            type="button"
            disabled={checking}
            onClick={runHealth}
            className="h-8 rounded-full border px-3 text-xs font-semibold"
          >
            {checking ? t("pleaseWait") : "Check"}
          </button>
        </div>
        {health && (
          <div className="space-y-1 text-xs">
            <p>
              Key: <b className={health.hasKey ? "text-success" : "text-destructive"}>{health.hasKey ? "YES" : "NO"}</b>
              {" · "}Tables:{" "}
              <b className={health.productsTableOk ? "text-success" : "text-destructive"}>
                {health.productsTableOk ? "OK" : "MISSING"}
              </b>
              {" · "}Session:{" "}
              <b className={health.session ? "text-success" : "text-muted-foreground"}>{health.session ? "ON" : "OFF"}</b>
            </p>
            <p className="leading-snug text-muted-foreground">{health.message}</p>
            {health.userId && (
              <p className="truncate text-[10px] text-muted-foreground">user: {health.userId}</p>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-2xl bg-card p-4 shadow-card">
        {account && (
          <div>
            <p className="text-sm font-bold">{t("accountInfo")}</p>
            <p className="mt-1 text-base font-semibold">{account.fullName}</p>
          </div>
        )}

        <div className="flex items-center gap-2">
          {editingShop ? (
            <>
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 flex-1 rounded-xl"
                onKeyDown={(e) => e.key === "Enter" && saveShopName()}
              />
              <button type="button" onClick={saveShopName} className="h-10 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">
                {t("save")}
              </button>
            </>
          ) : (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-muted-foreground">{t("shopName")}</p>
                <p className="truncate font-semibold">{shop}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setName(shop);
                  setEditingShop(true);
                }}
                className="grid size-10 place-items-center rounded-full border"
                aria-label={t("edit")}
              >
                <Pencil className="size-4" />
              </button>
            </>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("currency")}</span>
          <b>RWF</b>
        </div>

        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Language / Ururimi</span>
          <div className="flex gap-1 rounded-full bg-muted p-1">
            {(["en", "rw"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`h-8 rounded-full px-3 text-xs font-semibold ${lang === l ? "bg-card text-primary shadow-card" : ""}`}
              >
                {l === "en" ? "EN" : "RW"}
              </button>
            ))}
          </div>
        </div>

        {account && <p className="text-[11px] text-muted-foreground">{t("notSyncedHint")}</p>}
      </section>

      <section className="space-y-2 rounded-2xl bg-card p-4 shadow-card">
        <button
          type="button"
          onClick={async () => {
            try {
              await exportPdfReport(name || shop);
              toast.success(t("exportPdf"));
            } catch (e) {
              toast.error(String(e));
            }
          }}
          className="h-12 w-full rounded-full border font-semibold"
        >
          {t("exportPdf")}
        </button>
        <button type="button" onClick={exportCsv} className="h-12 w-full rounded-full border font-semibold">
          {t("exportCsv")}
        </button>
      </section>

      <section className="space-y-2 rounded-2xl bg-card p-4 shadow-card">
        <button type="button" disabled={busy} onClick={logout} className="h-12 w-full rounded-full bg-secondary font-semibold text-secondary-foreground">
          {t("logout")}
        </button>
        <button type="button" disabled={busy} onClick={() => setResetOpen(true)} className="h-12 w-full rounded-full bg-destructive font-semibold text-destructive-foreground">
          {t("reset")}
        </button>
      </section>

      {resetOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={() => !busy && setResetOpen(false)}>
          <div className="w-full max-w-sm rounded-3xl bg-background p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-bold">{t("resetTitle")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("resetBody")}</p>
            {busy && <p className="mt-2 text-center text-xs text-primary">{t("pleaseWait")}</p>}
            <div className="mt-4 space-y-2">
              <button type="button" disabled={busy} onClick={resetAppOnly} className="h-12 w-full rounded-full border font-semibold">
                {t("resetPhoneOnly")}
              </button>
              <button type="button" disabled={busy} onClick={resetFull} className="h-12 w-full rounded-full bg-destructive font-semibold text-destructive-foreground">
                {t("resetFull")}
              </button>
              <button type="button" disabled={busy} onClick={() => setResetOpen(false)} className="h-11 w-full rounded-full text-sm text-muted-foreground">
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-center text-[11px] text-muted-foreground">
        {t("contactDev")}{" "}
        <a href="tel:0796919900" className="underline-offset-2 hover:underline">
          0796919900
        </a>
        {" · "}
        <a href="https://wa.me/250796919900" target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
          WhatsApp
        </a>
      </p>
    </div>
  );
}
