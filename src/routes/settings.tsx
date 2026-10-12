import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { db, factoryReset } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { useShopName } from "@/components/AppShell";
import { getAccount, isLoggedIn, signOutLocal, type Account } from "@/lib/auth";
import { exportPdfReport } from "@/lib/report";

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
  const [account, setAccount] = useState<Account | null>(null);
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

  const stamp = new Date().toISOString().slice(0, 10);

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
    await signOutLocal();
    toast.success(t("signedOut"));
    window.location.reload();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{t("settings")}</h2>

      {account && (
        <section className="space-y-2 rounded-2xl bg-card p-4 shadow-card">
          <p className="text-sm font-bold">{t("accountInfo")}</p>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t("fullName")}</dt><dd className="font-medium">{account.fullName}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t("businessName")}</dt><dd className="font-medium">{account.businessName}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{account.loginType === "phone" ? t("phone") : t("email")}</dt><dd className="font-medium">{account.identifier}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t("age")}</dt><dd className="font-medium">{account.age || "—"}</dd></div>
          </dl>
          <p className="pt-1 text-[11px] text-muted-foreground">{t("notSyncedHint")}</p>
        </section>
      )}

      <section className="space-y-3 rounded-2xl bg-card p-4 shadow-card">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">{t("shopName")}</span>
          <div className="mt-1 flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" />
            <button
              type="button"
              onClick={async () => {
                await db.settings.put({ key: "shopName", value: name.trim() || shop });
                await db.outbox.add({ op: "profile", createdAt: Date.now() });
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
              <button key={l} type="button" onClick={() => setLang(l)} className={`h-8 rounded-full px-3 text-xs font-semibold ${lang === l ? "bg-card text-primary shadow-card" : ""}`}>
                {l === "en" ? "English" : "Kinyarwanda"}
              </button>
            ))}
          </div>
        </div>
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
        <button type="button" onClick={logout} className="h-12 w-full rounded-full bg-secondary font-semibold text-secondary-foreground">
          {t("logout")}
        </button>
        <button
          type="button"
          onClick={async () => {
            if (confirm(t("confirmReset"))) {
              await factoryReset(false);
              await signOutLocal();
              toast.success(t("reset"));
              window.location.reload();
            }
          }}
          className="h-12 w-full rounded-full bg-destructive font-semibold text-destructive-foreground"
        >
          {t("reset")}
        </button>
      </section>

      <p className="text-center text-[11px] text-muted-foreground">
        {t("contactDev")}{" "}
        <a href="tel:0796919900" className="underline-offset-2 hover:underline">0796919900</a>
        {" · "}
        <a href="https://wa.me/250796919900" target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">WhatsApp</a>
      </p>
      <p className="text-center text-xs text-muted-foreground">Stoke Yange · offline-first · auto-sync when online</p>
    </div>
  );
}
