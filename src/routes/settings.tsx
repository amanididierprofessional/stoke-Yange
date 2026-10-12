import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { db, factoryReset } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { useShopName } from "@/components/AppShell";

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
  useEffect(() => setName(shop), [shop]);
  const stamp = new Date().toISOString().slice(0, 10);

  const exportJson = async () => {
    const out: Record<string, unknown> = { exportedAt: new Date().toISOString() };
    for (const tb of db.tables) out[tb.name] = await tb.toArray();
    download(`stoke-yange-${stamp}.json`, JSON.stringify(out, null, 2), "application/json");
  };
  const exportCsv = async () => {
    const rows = await db.sales.orderBy("createdAt").toArray();
    const head = "date,product,qty,unit_price,total,type,reversed";
    const body = rows.map((s) => [new Date(s.createdAt).toISOString(), `"${s.productName}"`, s.qty, s.unitPrice, s.total, s.type, s.reversed ? 1 : 0].join(","));
    download(`stoke-yange-sales-${stamp}.csv`, [head, ...body].join("\n"), "text/csv");
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{t("settings")}</h2>
      <section className="space-y-3 rounded-2xl bg-card p-4 shadow-card">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">{t("shopName")}</span>
          <div className="mt-1 flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" />
            <button onClick={async () => { await db.settings.put({ key: "shopName", value: name.trim() || shop }); toast.success(t("save")); }} className="rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">{t("save")}</button>
          </div>
        </label>
        <div className="flex items-center justify-between text-sm">
          <span>{t("currency")}</span><b>RWF (Rwandan Franc)</b>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>Language / Ururimi</span>
          <div className="flex gap-1 rounded-full bg-muted p-1">
            {(["en", "rw"] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)} className={`h-8 rounded-full px-3 text-xs font-semibold ${lang === l ? "bg-card text-primary shadow-card" : ""}`}>
                {l === "en" ? "English" : "Kinyarwanda"}
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="space-y-2 rounded-2xl bg-card p-4 shadow-card">
        <button onClick={exportJson} className="h-12 w-full rounded-full border font-semibold">{t("exportJson")}</button>
        <button onClick={exportCsv} className="h-12 w-full rounded-full border font-semibold">{t("exportCsv")}</button>
      </section>
      <section className="space-y-2 rounded-2xl bg-card p-4 shadow-card">
        <button onClick={async () => { if (confirm(t("confirmReset"))) { await factoryReset(true); toast.success(t("reloadDemo")); } }} className="h-12 w-full rounded-full bg-secondary font-semibold text-secondary-foreground">{t("reloadDemo")}</button>
        <button onClick={async () => { if (confirm(t("confirmReset"))) { await factoryReset(false); toast.success(t("reset")); } }} className="h-12 w-full rounded-full bg-destructive font-semibold text-destructive-foreground">{t("reset")}</button>
      </section>
      <p className="text-center text-xs text-muted-foreground">Stoke Yange · beta · data stays on this phone</p>
    </div>
  );
}
