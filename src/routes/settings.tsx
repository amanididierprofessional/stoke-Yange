import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Pencil, Phone, MessageCircle, Cloud, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { useShopName } from "@/components/AppShell";
import {
  getAccount,
  isLoggedIn,
  signOutLocal,
  wipeCloudData,
  type Account,
} from "@/lib/auth";
import { exportPdfReport, exportSalesCsv } from "@/lib/report";
import { clearLocalShopKeepAccount, fullSync, pauseSync } from "@/lib/sync";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Stoke Yange" },
      { name: "description", content: "Shop profile, backups and data reset." },
      { property: "og:title", content: "Settings — Stoke Yange" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  const [syncing, setSyncing] = useState(false);
  const syncMode = useLiveQuery(() => db.settings.get("cloudSyncMode"), [])?.value;
  const pendingSync = useLiveQuery(() => db.outbox.count(), []) ?? 0;

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

  const syncNow = async () => {
    setSyncing(true);
    try {
      // Push this phone then pull cloud (other devices / workers)
      const result = await fullSync();
      if (result.ok) {
        toast.success(
          lang === "rw"
            ? "Amakuru yoherejwe kandi yakiriwe kuri cloud."
            : "Data uploaded and refreshed from cloud.",
        );
      } else {
        const message =
          result.reason === "offline"
            ? lang === "rw"
              ? "Nta internet ihari. Ongera ugerageze umaze kuyibona."
              : "No internet. Try again when you are online."
            : result.reason === "no_session"
              ? lang === "rw"
                ? "Banza winjire muri konti yawe kugira ngo ubike amakuru."
                : "Sign in first so we can sync your shop."
              : lang === "rw"
                ? `Kubika amakuru ntibyagenze neza: ${result.reason ?? "gerageza nanone"}`
                : `Sync failed: ${result.reason ?? "try again"}`;
        toast.error(message);
      }
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSyncing(false);
    }
  };

  const saveShopName = async () => {
    const v = name.trim() || shop;
    await db.settings.put({ key: "shopName", value: v });
    await db.outbox.add({ op: "profile", createdAt: Date.now() });
    setEditingShop(false);
    toast.success(t("save"));
  };

  const exportCsv = async () => {
    try {
      await exportSalesCsv();
      toast.success(t("exportCsv"));
    } catch (e) {
      toast.error(String(e));
    }
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

  /** Clear shop data on this phone; KEEP account + session (stay logged in). */
  const resetAppOnly = async () => {
    setBusy(true);
    let resumeSync: (() => void) | undefined;
    try {
      resumeSync = await pauseSync();
      await clearLocalShopKeepAccount();
      toast.success(
        lang === "rw"
          ? "Amakuru y'iduka yasibwe kuri iyi telefone. Konti yawe iracyari. Ayari kuri cloud arasigaye."
          : "Shop data on this phone was cleared. You are still signed in. Cloud backup was kept.",
      );
      window.location.reload();
    } catch (error) {
      toast.error(
        lang === "rw"
          ? "Gusiba amakuru kuri telefone ntibyagenze neza."
          : "Could not clear this phone's data: " + String(error),
      );
    } finally {
      resumeSync?.();
      setBusy(false);
      setResetOpen(false);
    }
  };

  /** Wipe cloud shop + local shop; KEEP account logged in with empty shop. */
  const resetFull = async () => {
    setBusy(true);
    let resumeSync: (() => void) | undefined;
    try {
      resumeSync = await pauseSync();
      const cloud = await wipeCloudData();
      if (!cloud.ok) {
        toast.error(
          lang === "rw"
            ? "Cloud ntiyasibwe; nta makuru yasibwe kuri telefone. Ongera ugerageze ufite internet: " +
                (cloud.reason || "ikosa ritazwi")
            : "Cloud reset failed. Nothing was cleared on this phone; reconnect and retry. " +
                (cloud.reason || "Unknown error"),
        );
        return;
      }
      await clearLocalShopKeepAccount();
      toast.success(
        lang === "rw"
          ? "Amakuru y'iduka yasibwe kuri telefone no kuri cloud. Konti yawe iracyari."
          : "Shop data was cleared on this phone and the cloud. You are still signed in.",
      );
      window.location.reload();
    } catch (error) {
      toast.error(
        lang === "rw"
          ? "Gusiba amakuru ntibyagenze neza."
          : "Could not finish clearing data: " + String(error),
      );
    } finally {
      resumeSync?.();
      setBusy(false);
      setResetOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{t("settings")}</h2>

      {syncMode === "auto" ? (
        <section className="flex min-h-36 items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-card p-5 shadow-card">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Cloud className="size-5" />
              </span>
              <h3 className="text-base font-bold">Cloud Sync</h3>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {lang === "rw"
                ? "Amakuru arajya akoherezwa kandi akakirwa automatic mu gihe ufite internet (n'izindi telefone zikoresha iyi konti)."
                : "Data is uploaded and downloaded automatically while online (including other phones on this account)."}
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-success">
              <span className="size-2 rounded-full bg-success" />
              {lang === "rw" ? "Auto-sync irakora" : "Auto-sync is on"}
            </p>
            {pendingSync > 0 && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {pendingSync} {lang === "rw" ? "bitaroherezwa" : "pending upload"}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <button
              type="button"
              disabled={syncing}
              onClick={syncNow}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-60"
            >
              <RefreshCw className={`size-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "…" : "Sync"}
            </button>
            <button
              type="button"
              onClick={async () => {
                await db.settings.put({ key: "cloudSyncMode", value: "manual" });
                toast.success(lang === "rw" ? "Auto-sync yahagaritswe." : "Auto-sync turned off.");
              }}
              className="inline-flex h-9 items-center justify-center rounded-full border px-3 text-xs font-semibold"
            >
              {lang === "rw" ? "Hagarika" : "Off"}
            </button>
          </div>
        </section>
      ) : (
        <section className="flex min-h-36 items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-card p-5 shadow-card">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Cloud className="size-5" />
              </span>
              <h3 className="text-base font-bold">Cloud Sync</h3>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {lang === "rw"
                ? "Kanda Sync kugira ngo wohereze kandi wakire amakuru. Hitamo Auto kugira ngo bikore mu buryo bwikora."
                : "Tap Sync to upload and download. Choose Auto for continuous two-way sync."}
            </p>
            <p className="mt-2 text-[11px] font-medium text-muted-foreground">
              {lang === "rw" ? "Manual" : "Manual"}
              {pendingSync > 0 ? ` · ${pendingSync} ${lang === "rw" ? "bitaroherezwa" : "pending"}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <button
              type="button"
              disabled={syncing}
              onClick={syncNow}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-60"
            >
              <RefreshCw className={`size-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? (lang === "rw" ? "Birabikwa…" : "Syncing…") : "Sync"}
            </button>
            <button
              type="button"
              onClick={async () => {
                await db.settings.put({ key: "cloudSyncMode", value: "auto" });
                await db.settings.put({ key: "cloudSyncPromptDismissed", value: "1" });
                toast.success(lang === "rw" ? "Auto-sync yatangiye." : "Auto-sync enabled.");
                void fullSync().catch(() => {});
              }}
              className="inline-flex h-9 items-center justify-center rounded-full border border-primary/40 px-3 text-xs font-semibold text-primary"
            >
              Auto
            </button>
          </div>
        </section>
      )}

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
              <button
                type="button"
                onClick={saveShopName}
                className="h-10 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
              >
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
        <button
          type="button"
          disabled={busy}
          onClick={logout}
          className="h-12 w-full rounded-full bg-secondary font-semibold text-secondary-foreground"
        >
          {t("logout")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setResetOpen(true)}
          className="h-12 w-full rounded-full bg-destructive font-semibold text-destructive-foreground"
        >
          {t("reset")}
        </button>
      </section>

      {resetOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => !busy && setResetOpen(false)}
        >
          <div className="w-full max-w-sm rounded-3xl bg-background p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-bold">{t("resetTitle")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("resetBody")}</p>
            <div className="mt-3 space-y-2 rounded-xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
              <p>
                {lang === "rw"
                  ? "Telefone gusa: isiba amakuru y'iduka kuri iyi telefone. Konti yawe n'inyandiko zo kwinjira zisigara. Cloud irasigara."
                  : "Phone only: clears shop data on this device. You stay signed in. Cloud backup is kept."}
              </p>
              <p>
                {lang === "rw"
                  ? "Telefone + cloud: isiba amakuru y'iduka hano no kuri cloud. Konti yawe irasigara yinjiye."
                  : "Phone + cloud: clears shop data here and in the cloud. You stay signed in with an empty shop."}
              </p>
            </div>
            {busy && <p className="mt-2 text-center text-xs text-primary">{t("pleaseWait")}</p>}
            <div className="mt-4 space-y-2">
              <button type="button" disabled={busy} onClick={resetAppOnly} className="h-12 w-full rounded-full border font-semibold">
                {t("resetPhoneOnly")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={resetFull}
                className="h-12 w-full rounded-full bg-destructive font-semibold text-destructive-foreground"
              >
                {t("resetFull")}
              </button>
              <button type="button" disabled={busy} onClick={() => setResetOpen(false)} className="h-11 w-full rounded-full text-sm text-muted-foreground">
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="rounded-2xl border bg-card px-3 py-2.5">
        <p className="mb-2 text-center text-[11px] text-muted-foreground">{t("contactDev")}</p>
        <div className="flex items-center justify-center gap-2">
          <a
            href="tel:0796919900"
            aria-label="Call Stoke Yange support"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Phone className="size-3.5" />
            Call
          </a>
          <a
            href="https://wa.me/250796919900"
            target="_blank"
            rel="noreferrer"
            aria-label="Chat with Stoke Yange support on WhatsApp"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-[#128C7E] px-3 text-xs font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <MessageCircle className="size-3.5" />
            WhatsApp
          </a>
        </div>
      </section>
    </div>
  );
}
