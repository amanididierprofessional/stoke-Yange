import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Pencil, Phone, MessageCircle, Cloud, RefreshCw, Download } from "lucide-react";
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
import { buildReportHtml, exportPdfReport, exportSalesCsv } from "@/lib/report";
import { downloadBlob } from "@/lib/download";
import { clearLocalShopKeepAccount, fullSync, pauseSync } from "@/lib/sync";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Stoke Yange" },
      { name: "description", content: "Shop profile, backups and data reset." },
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
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const [reportName, setReportName] = useState("");
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
              ? "Nta internet ihari."
              : "No internet."
            : result.reason === "no_session"
              ? lang === "rw"
                ? "Banza winjire muri konti."
                : "Sign in first."
              : `Sync: ${result.reason ?? "failed"}`;
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

  const openReport = async () => {
    try {
      const { html, filename } = await buildReportHtml(name || shop);
      setReportHtml(html);
      setReportName(filename);
    } catch (e) {
      toast.error(String(e));
    }
  };

  const downloadReport = () => {
    if (!reportHtml) return;
    downloadBlob(new Blob([reportHtml], { type: "text/html;charset=utf-8" }), reportName || "report.html");
    toast.success(t("exportPdf"));
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

  const resetAppOnly = async () => {
    setBusy(true);
    let resumeSync: (() => void) | undefined;
    try {
      resumeSync = await pauseSync();
      await clearLocalShopKeepAccount();
      toast.success(
        lang === "rw"
          ? "Amakuru y'iduka yasibwe. Konti yawe iracyari."
          : "Shop data cleared. You are still signed in.",
      );
      window.location.reload();
    } catch (error) {
      toast.error(String(error));
    } finally {
      resumeSync?.();
      setBusy(false);
      setResetOpen(false);
    }
  };

  const resetFull = async () => {
    setBusy(true);
    let resumeSync: (() => void) | undefined;
    try {
      resumeSync = await pauseSync();
      const cloud = await wipeCloudData();
      if (!cloud.ok) {
        toast.error(lang === "rw" ? "Cloud ntiyasibwe." : "Cloud reset failed.");
        return;
      }
      await clearLocalShopKeepAccount();
      toast.success(
        lang === "rw"
          ? "Amakuru yasibwe kuri telefone no kuri cloud."
          : "Shop data cleared on phone and cloud.",
      );
      window.location.reload();
    } catch (error) {
      toast.error(String(error));
    } finally {
      resumeSync?.();
      setBusy(false);
      setResetOpen(false);
    }
  };

  if (reportHtml) {
    return (
      <div className="fixed inset-0 z-[80] flex flex-col bg-background">
        <div className="flex items-center gap-2 border-b px-3 py-3">
          <button
            type="button"
            onClick={() => setReportHtml(null)}
            className="grid size-10 place-items-center rounded-full border"
            aria-label={lang === "rw" ? "Subira" : "Back"}
          >
            <ArrowLeft className="size-5" />
          </button>
          <p className="min-w-0 flex-1 truncate font-semibold">{lang === "rw" ? "Raporo" : "Report"}</p>
          <button
            type="button"
            onClick={downloadReport}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            <Download className="size-4" />
            {lang === "rw" ? "Kuramo" : "Download"}
          </button>
        </div>
        <iframe title="report" className="min-h-0 w-full flex-1 border-0 bg-white" srcDoc={reportHtml} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{t("settings")}</h2>

      {syncMode === "auto" ? (
        <section className="flex min-h-36 items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-card p-5 shadow-card">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <Cloud className="size-5" />
              </span>
              <h3 className="text-base font-bold">Cloud Sync</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {lang === "rw"
                ? "Auto push + pull mu gihe ufite internet."
                : "Auto upload + download while online."}
            </p>
            {pendingSync > 0 && <p className="mt-1 text-[11px] text-muted-foreground">{pendingSync} pending</p>}
          </div>
          <div className="flex flex-col gap-2">
            <button type="button" disabled={syncing} onClick={syncNow} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground">
              <RefreshCw className={`size-3.5 ${syncing ? "animate-spin" : ""}`} /> Sync
            </button>
            <button
              type="button"
              onClick={async () => {
                await db.settings.put({ key: "cloudSyncMode", value: "manual" });
                toast.success(lang === "rw" ? "Auto-sync yahagaritswe." : "Auto-sync off.");
              }}
              className="h-9 rounded-full border px-3 text-xs font-semibold"
            >
              Off
            </button>
          </div>
        </section>
      ) : (
        <section className="flex min-h-36 items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-card p-5 shadow-card">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <Cloud className="size-5" />
              </span>
              <h3 className="text-base font-bold">Cloud Sync</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {lang === "rw" ? "Kanda Sync cyangwa Auto." : "Tap Sync or enable Auto."}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button type="button" disabled={syncing} onClick={syncNow} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground">
              <RefreshCw className={`size-3.5 ${syncing ? "animate-spin" : ""}`} /> Sync
            </button>
            <button
              type="button"
              onClick={async () => {
                await db.settings.put({ key: "cloudSyncMode", value: "auto" });
                await db.settings.put({ key: "cloudSyncPromptDismissed", value: "1" });
                void fullSync();
                toast.success("Auto");
              }}
              className="h-9 rounded-full border border-primary/40 px-3 text-xs font-semibold text-primary"
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
              <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="h-10 flex-1 rounded-xl" onKeyDown={(e) => e.key === "Enter" && saveShopName()} />
              <button type="button" onClick={saveShopName} className="h-10 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">{t("save")}</button>
            </>
          ) : (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-muted-foreground">{t("shopName")}</p>
                <p className="truncate font-semibold">{shop}</p>
              </div>
              <button type="button" onClick={() => { setName(shop); setEditingShop(true); }} className="grid size-10 place-items-center rounded-full border" aria-label={t("edit")}>
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
          <span className="text-muted-foreground">Language</span>
          <div className="flex gap-1 rounded-full bg-muted p-1">
            {(["en", "rw"] as const).map((l) => (
              <button key={l} type="button" onClick={() => setLang(l)} className={`h-8 rounded-full px-3 text-xs font-semibold ${lang === l ? "bg-card text-primary shadow-card" : ""}`}>
                {l === "en" ? "EN" : "RW"}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-2 rounded-2xl bg-card p-4 shadow-card">
        <button type="button" onClick={openReport} className="h-12 w-full rounded-full border font-semibold">{t("exportPdf")}</button>
        <button type="button" onClick={exportCsv} className="h-12 w-full rounded-full border font-semibold">{t("exportCsv")}</button>
      </section>

      <section className="space-y-2 rounded-2xl bg-card p-4 shadow-card">
        <button type="button" disabled={busy} onClick={logout} className="h-12 w-full rounded-full bg-secondary font-semibold text-secondary-foreground">{t("logout")}</button>
        <button type="button" disabled={busy} onClick={() => setResetOpen(true)} className="h-12 w-full rounded-full bg-destructive font-semibold text-destructive-foreground">{t("reset")}</button>
      </section>

      {resetOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={() => !busy && setResetOpen(false)}>
          <div className="w-full max-w-sm rounded-3xl bg-background p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-bold">{t("resetTitle")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("resetBody")}</p>
            <div className="mt-4 space-y-2">
              <button type="button" disabled={busy} onClick={resetAppOnly} className="h-12 w-full rounded-full border font-semibold">{t("resetPhoneOnly")}</button>
              <button type="button" disabled={busy} onClick={resetFull} className="h-12 w-full rounded-full bg-destructive font-semibold text-destructive-foreground">{t("resetFull")}</button>
              <button type="button" disabled={busy} onClick={() => setResetOpen(false)} className="h-11 w-full rounded-full text-sm text-muted-foreground">{t("cancel")}</button>
            </div>
          </div>
        </div>
      )}

      <section className="rounded-2xl border bg-card px-3 py-2.5">
        <p className="mb-2 text-center text-[11px] text-muted-foreground">{t("contactDev")}</p>
        <div className="flex items-center justify-center gap-2">
          <a href="tel:0796919900" className="inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold">
            <Phone className="size-3.5" /> Call
          </a>
          <a href="https://wa.me/250796919900" target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#128C7E] px-3 text-xs font-semibold text-white">
            <MessageCircle className="size-3.5" /> WhatsApp
          </a>
        </div>
      </section>
    </div>
  );
}
