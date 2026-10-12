import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { AlertTriangle, Search } from "lucide-react";
import { db, CATEGORIES, type Product } from "@/lib/db";
import { fmt } from "@/lib/actions";
import { useI18n } from "@/lib/i18n";
import { CategoryPills } from "@/components/AppShell";
import { ProductCard, SellSheet } from "@/components/SellSheet";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sell — Stoke Yange" },
      { name: "description", content: "One-tap selling, inventory value and today's cash for your shop." },
      { property: "og:title", content: "Stoke Yange — Sell in one tap" },
      { property: "og:description", content: "Track stock, sales and credit for small shops, even offline." },
    ],
  }),
  component: SellPage,
});

const startOfDay = () => new Date(new Date().setHours(0, 0, 0, 0)).getTime();

function SellPage() {
  const { t } = useI18n();
  const [cat, setCat] = useState("__all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Product | null>(null);
  const products = useLiveQuery(() => db.products.orderBy("name").toArray(), []) ?? [];
  const today = useLiveQuery(() => db.sales.where("createdAt").aboveOrEqual(startOfDay()).filter((s) => !s.reversed).toArray(), []) ?? [];

  const costValue = products.reduce((a, p) => a + p.stock * p.cost, 0);
  const saleValue = products.reduce((a, p) => a + p.stock * p.price, 0);
  const cash = today.filter((s) => s.type === "cash").reduce((a, s) => a + s.total, 0);
  const credit = today.filter((s) => s.type === "credit").reduce((a, s) => a + s.total, 0);
  const low = products.filter((p) => p.stock <= p.min);
  const list = products.filter((p) => (cat === "__all" || p.category === cat) && p.name.toLowerCase().includes(q.toLowerCase()));
  const cats = [...new Set([...CATEGORIES, ...products.map((p) => p.category)])];

  return (
    <div className="space-y-4">
      {/* Hero: Today's cash primary, inventory secondary */}
      <section className="rounded-3xl bg-hero p-5 text-primary-foreground shadow-card">
        <p className="text-xs font-medium opacity-90">{t("todayCash")}</p>
        <p className="text-3xl font-bold tabular-nums tracking-tight">{fmt(cash)}</p>
        <p className="mt-1 text-xs opacity-90">
          {t("salesValue")}: <b>{fmt(saleValue)}</b>
        </p>
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

      {list.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("noItems")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {list.map((p) => (
            <ProductCard key={p.id} p={p} onOpen={() => setOpen(p)} />
          ))}
        </div>
      )}
      <SellSheet product={open} onClose={() => setOpen(null)} />
    </div>
  );
}
