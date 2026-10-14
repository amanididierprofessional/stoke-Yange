import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { AlertTriangle, Search } from "lucide-react";
import { db, CATEGORIES, type Product } from "@/lib/db";
import { fmt } from "@/lib/actions";
import { useI18n } from "@/lib/i18n";
import { isAppMode } from "@/lib/app-mode";
import { CategoryPills } from "@/components/AppShell";
import { ProductCard, SellSheet } from "@/components/SellSheet";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Stoke Yange" },
      {
        name: "description",
        content: "Sell, stock and credit for small shops — install free or open the app.",
      },
      { property: "og:title", content: "Stoke Yange — Shop stock & credit" },
      {
        property: "og:description",
        content: "Record sales, track stock and credit, even offline.",
      },
    ],
  }),
  component: RootEntry,
});

/**
 * Shared link https://stoke-yange.vercel.app/
 * - Browser (not installed): → landing /welcome
 * - Installed PWA or "Open app": → sell screen (never marketing again)
 */
function RootEntry() {
  const navigate = useNavigate();
  const [showApp, setShowApp] = useState(false);

  useEffect(() => {
    // A native Capacitor install is already the app; never route it through the
    // PWA/marketing mode gate, which otherwise leaves a logo-only screen visible.
    if (Capacitor.isNativePlatform()) {
      enterAppMode();
      setShowApp(true);
      return;
    }
    if (isAppMode()) {
      setShowApp(true);
      return;
    }
    navigate({ to: "/welcome", replace: true });
  }, [navigate]);

  if (!showApp) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-8">
        <BrandLogo className="size-16" />
        <p className="text-sm font-semibold text-foreground">Stoke Yange</p>
        <div className="h-1.5 w-full max-w-56 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
        </div>
      </div>
    );
  }

  return <SellPage />;
}

const startOfDay = () => new Date(new Date().setHours(0, 0, 0, 0)).getTime();

function SellPage() {
  const { t } = useI18n();
  const [cat, setCat] = useState("__all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Product | null>(null);
  const products = useLiveQuery(() => db.products.orderBy("name").toArray(), []) ?? [];
  const today =
    useLiveQuery(
      () => db.sales.where("createdAt").aboveOrEqual(startOfDay()).filter((s) => !s.reversed).toArray(),
      [],
    ) ?? [];

  const allSales = useLiveQuery(() => db.sales.toArray(), []) ?? [];
  const sold = new Map<number, number>();
  for (const s of allSales) if (!s.reversed) sold.set(s.productId, (sold.get(s.productId) ?? 0) + s.qty);
  const costValue = products.reduce((a, p) => a + p.stock * p.cost, 0);
  const cash = today.filter((s) => s.type === "cash").reduce((a, s) => a + s.total, 0);
  const credit = today.filter((s) => s.type === "credit").reduce((a, s) => a + s.total, 0);
  const low = products.filter((p) => p.stock <= p.min);
  const list = products
    .filter((p) => (cat === "__all" || p.category === cat) && p.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (sold.get(b.id!) ?? 0) - (sold.get(a.id!) ?? 0) || a.name.localeCompare(b.name));
  const cats = [...new Set([...CATEGORIES, ...products.map((p) => p.category)])];

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-hero p-5 text-primary-foreground shadow-card">
        <p className="text-xs font-medium opacity-90">{t("todayCash")}</p>
        <p className="text-3xl font-bold tabular-nums tracking-tight">{fmt(cash)}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-primary-foreground/15 p-3">
            <p className="text-[11px] opacity-90">{t("stockValue")}</p>
            <p className="font-bold tabular-nums">{fmt(costValue)}</p>
          </div>
          <div className="rounded-2xl bg-primary-foreground/15 p-3">
            <p className="text-[11px] opacity-90">{t("todayCredit")}</p>
            <p className="font-bold tabular-nums">{fmt(credit)}</p>
          </div>
        </div>
      </section>

      {low.length > 0 && (
        <Link to="/stock" search={{ low: true }} className="flex items-center gap-3 rounded-2xl border border-warning bg-warning/20 p-3">
          <AlertTriangle className="size-5 shrink-0 text-warning-foreground" />
          <p className="text-sm">
            <b>{low.length}</b> {t("lowBanner")}: {low.slice(0, 3).map((p) => p.name).join(", ")}
            {low.length > 3 ? "…" : ""}
          </p>
        </Link>
      )}

      <div className="relative">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search")}
          className="h-12 w-full rounded-full border bg-card pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <CategoryPills value={cat} onChange={setCat} categories={cats} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {list.map((p) => (
          <ProductCard key={p.id} p={p} onOpen={() => setOpen(p)} />
        ))}
      </div>
      {list.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">{t("noItems")}</p>}

      <SellSheet product={open} onClose={() => setOpen(null)} />
    </div>
  );
}
