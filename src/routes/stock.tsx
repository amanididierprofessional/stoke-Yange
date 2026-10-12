import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { ClipboardCheck, PackagePlus, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { db, CATEGORIES, UNITS, type Product } from "@/lib/db";
import { adjustCount, fmt, saveProduct, stockIn } from "@/lib/actions";
import { useI18n } from "@/lib/i18n";
import { CategoryPills } from "@/components/AppShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/stock")({
  validateSearch: (s: Record<string, unknown>): { low?: boolean } => (s["low"] ? { low: true } : {}),
  head: () => ({
    meta: [
      { title: "Stock — Stoke Yange" },
      { name: "description", content: "Manage products, receive goods and count stock." },
      { property: "og:title", content: "Stock — Stoke Yange" },
      { property: "og:description", content: "Manage products, receive goods and count stock." },
    ],
  }),
  component: StockPage,
});

type Mode = { kind: "edit"; p?: Product } | { kind: "in"; p: Product } | { kind: "count"; p: Product } | null;
const EMOJIS = ["📦", "🥛", "🍺", "🥤", "🌾", "🍚", "🍪", "🧼", "📱", "🫒", "🕯️", "🍞", "🥚", "🧃", "🧂"];

function StockPage() {
  const { t } = useI18n();
  const { low } = Route.useSearch();
  const nav = Route.useNavigate();
  const [cat, setCat] = useState("__all");
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<Mode>(null);
  const products = useLiveQuery(() => db.products.orderBy("name").toArray(), []) ?? [];
  const cats = [...new Set([...CATEGORIES, ...products.map((p) => p.category)])];
  const list = products.filter(
    (p) => (cat === "__all" || p.category === cat) && (!low || p.stock <= p.min) && p.name.toLowerCase().includes(q.toLowerCase()),
  );
  const total = list.reduce((a, p) => a + p.stock * p.cost, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("stock")}</h2>
          <p className="text-sm text-muted-foreground">{list.length} · {fmt(total)}</p>
        </div>
        <button onClick={() => setMode({ kind: "edit" })} className="flex h-11 items-center gap-1 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">
          <Plus className="size-4" /> {t("addProduct")}
        </button>
      </div>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} className="h-12 w-full rounded-full border bg-card pl-11 pr-4 text-sm outline-none" />
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => nav({ search: low ? {} : { low: true } })} className={cn("h-9 shrink-0 rounded-full px-4 text-sm font-medium", low ? "bg-warning text-warning-foreground" : "border bg-card")}>
          ⚠ {t("low")}
        </button>
      </div>
      <CategoryPills value={cat} onChange={setCat} categories={cats} />
      <ul className="space-y-2">
        {list.map((p) => {
          const isLow = p.stock <= p.min;
          return (
            <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-2xl">{p.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  <span className={cn("font-semibold", isLow ? "text-destructive" : "text-foreground")}>{p.stock} {p.unit}</span> · min {p.min} · {fmt(p.price)}
                </p>
              </div>
              <div className="flex gap-1">
                <IconBtn label={t("stockIn")} onClick={() => setMode({ kind: "in", p })}><PackagePlus className="size-4" /></IconBtn>
                <IconBtn label={t("count")} onClick={() => setMode({ kind: "count", p })}><ClipboardCheck className="size-4" /></IconBtn>
                <IconBtn label={t("edit")} onClick={() => setMode({ kind: "edit", p })}><Pencil className="size-4" /></IconBtn>
              </div>
            </li>
          );
        })}
        {list.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">{t("noItems")}</p>}
      </ul>

      <Drawer open={!!mode} onOpenChange={(o) => !o && setMode(null)}>
        <DrawerContent className="mx-auto max-h-[92vh] max-w-md">
          {mode?.kind === "edit" && <ProductForm p={mode.p} cats={cats} onDone={() => setMode(null)} />}
          {mode?.kind === "in" && <StockInForm p={mode.p} onDone={() => setMode(null)} />}
          {mode?.kind === "count" && <CountForm p={mode.p} onDone={() => setMode(null)} />}
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function IconBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="grid size-10 place-items-center rounded-full border bg-background">
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const num = (v: string) => Number(v.replace(/[^\d.]/g, "")) || 0;

function ProductForm({ p, cats, onDone }: { p?: Product | undefined; cats: string[]; onDone: () => void }) {
  const { t } = useI18n();
  const [f, setF] = useState({
    name: p?.name ?? "", category: p?.category ?? cats[0]!, unit: p?.unit ?? "pcs", emoji: p?.emoji ?? "📦",
    cost: String(p?.cost ?? ""), price: String(p?.price ?? ""), stock: String(p?.stock ?? ""), min: String(p?.min ?? "3"),
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    if (!f.name.trim()) { toast.error(t("name")); return; }
    const data = { name: f.name.trim(), category: f.category, unit: f.unit, emoji: f.emoji, cost: num(f.cost), price: num(f.price), min: num(f.min), stock: p ? p.stock : num(f.stock) };
    await saveProduct(p?.id ? { ...data, id: p.id } : data);
    toast.success(t("save"));
    onDone();
  };
  return (
    <div className="overflow-y-auto">
      <DrawerHeader><DrawerTitle>{p ? t("edit") : t("addProduct")}</DrawerTitle></DrawerHeader>
      <div className="space-y-3 px-4 pb-6">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => setF({ ...f, emoji: e })} className={cn("grid size-11 shrink-0 place-items-center rounded-xl text-2xl", f.emoji === e ? "bg-primary/20 ring-2 ring-primary" : "bg-muted")}>{e}</button>
          ))}
        </div>
        <Field label={t("name")}><Input value={f.name} onChange={set("name")} className="h-11 rounded-xl" /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t("category")}>
            <input list="cats" value={f.category} onChange={set("category")} className="h-11 w-full rounded-xl border bg-card px-3 text-sm" />
            <datalist id="cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
          <Field label={t("unit")}>
            <select value={f.unit} onChange={set("unit")} className="h-11 w-full rounded-xl border bg-card px-3 text-sm">{UNITS.map((u) => <option key={u}>{u}</option>)}</select>
          </Field>
          <Field label={t("cost")}><Input inputMode="numeric" value={f.cost} onChange={set("cost")} className="h-11 rounded-xl" /></Field>
          <Field label={t("sellPrice")}><Input inputMode="numeric" value={f.price} onChange={set("price")} className="h-11 rounded-xl" /></Field>
          {!p && <Field label={t("openingStock")}><Input inputMode="numeric" value={f.stock} onChange={set("stock")} className="h-11 rounded-xl" /></Field>}
          <Field label={t("minAlert")}><Input inputMode="numeric" value={f.min} onChange={set("min")} className="h-11 rounded-xl" /></Field>
        </div>
        <button onClick={save} className="h-13 w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground">{t("save")}</button>
      </div>
    </div>
  );
}

function StockInForm({ p, onDone }: { p: Product; onDone: () => void }) {
  const { t } = useI18n();
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState(String(p.cost));
  const [sup, setSup] = useState("");
  const suppliers = useLiveQuery(() => db.parties.where("kind").equals("supplier").toArray(), []) ?? [];
  const save = async () => {
    try {
      await stockIn(p.id!, num(qty), num(cost), sup ? Number(sup) : undefined);
      toast.success(`+${num(qty)} ${p.name}`);
      onDone();
    } catch { toast.error(t("quantity")); }
  };
  return (
    <div>
      <DrawerHeader><DrawerTitle>{t("stockIn")}: {p.emoji} {p.name}</DrawerTitle></DrawerHeader>
      <div className="space-y-3 px-4 pb-6">
        <div className="grid grid-cols-2 gap-2">
          <Field label={t("quantity")}><Input autoFocus inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} className="h-12 rounded-xl text-lg" /></Field>
          <Field label={t("cost")}><Input inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} className="h-12 rounded-xl text-lg" /></Field>
        </div>
        <Field label={t("fromSupplier")}>
          <select value={sup} onChange={(e) => setSup(e.target.value)} className="h-11 w-full rounded-xl border bg-card px-3 text-sm">
            <option value="">{t("none")}</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <p className="text-sm text-muted-foreground">{t("total")}: <b className="text-foreground">{fmt(num(qty) * num(cost))}</b></p>
        <button onClick={save} className="w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground">{t("save")}</button>
      </div>
    </div>
  );
}

function CountForm({ p, onDone }: { p: Product; onDone: () => void }) {
  const { t } = useI18n();
  const [c, setC] = useState(String(p.stock));
  const diff = num(c) - p.stock;
  const save = async () => {
    await adjustCount(p.id!, num(c));
    toast.success(t("save"));
    onDone();
  };
  return (
    <div>
      <DrawerHeader><DrawerTitle>{t("count")}: {p.emoji} {p.name}</DrawerTitle></DrawerHeader>
      <div className="space-y-3 px-4 pb-6">
        <p className="text-sm">{t("system")}: <b>{p.stock} {p.unit}</b></p>
        <Field label={t("counted")}><Input autoFocus inputMode="numeric" value={c} onChange={(e) => setC(e.target.value)} className="h-12 rounded-xl text-lg" /></Field>
        {diff !== 0 && (
          <p className={cn("text-sm font-semibold", diff < 0 ? "text-destructive" : "text-success")}>
            {diff > 0 ? "+" : ""}{diff} {p.unit} ({fmt(diff * p.cost)})
          </p>
        )}
        <button onClick={save} className="w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground">{t("save")}</button>
      </div>
    </div>
  );
}
