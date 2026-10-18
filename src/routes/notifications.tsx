import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle, Package } from "lucide-react";
import { db } from "@/lib/db";
import { fmt } from "@/lib/actions";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Stoke Yange" },
      { name: "description", content: "Low stock alerts for your shop." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { t, lang } = useI18n();
  const low =
    useLiveQuery(async () => {
      const products = await db.products.toArray();
      return products
        .filter((p) => p.stock <= p.min)
        .sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name));
    }, []) ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">{lang === "rw" ? "Ubutumwa" : "Notifications"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {lang === "rw" ? "Ibicuruzwa biri hafi gushira" : "Items that need restocking"}
        </p>
      </div>

      {low.length > 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-warning bg-warning/15 p-3">
          <AlertTriangle className="size-5 shrink-0 text-warning-foreground" />
          <p className="text-sm">
            <b>{low.length}</b> {t("lowBanner")}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-card p-8 text-center shadow-card">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-success/15 text-success">
            <Package className="size-6" />
          </div>
          <p className="font-semibold">{lang === "rw" ? "Nta kimenyetso" : "All clear"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {lang === "rw" ? "Nta bicuruzwa biri hafi gushira." : "No products are low on stock."}
          </p>
        </div>
      )}

      <ul className="space-y-2">
        {low.map((p) => (
          <li key={p.id}>
            <Link
              to="/stock"
              className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card transition-colors active:bg-muted"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-muted text-2xl">{p.emoji || "📦"}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.category} · {lang === "rw" ? "Ntarengwa" : "Min"} {p.min}
                </p>
              </div>
              <div className="text-right">
                <p className={`font-bold tabular-nums ${p.stock <= 0 ? "text-destructive" : "text-warning-foreground"}`}>
                  {p.stock} {p.unit}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {p.stock <= 0 ? t("out") : t("low")}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {low.length > 0 && (
        <Link
          to="/stock"
          className="flex h-12 items-center justify-center rounded-full border font-semibold"
        >
          {lang === "rw" ? "Jya muri ububiko" : "Open stock"}
        </Link>
      )}

      {/* keep fmt imported usable if we show values later */}
      <span className="sr-only">{fmt(0)}</span>
    </div>
  );
}
