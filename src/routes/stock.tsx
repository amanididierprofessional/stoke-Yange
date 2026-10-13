import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { PackagePlus, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { db, CATEGORIES, PRODUCT_EMOJIS, UNITS, type Product } from "@/lib/db";
import { DEFAULT_PRODUCTS } from "@/lib/defaults";
import { deleteProduct, fmt, saveProduct, stockIn } from "@/lib/actions";
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

const EMOJI_CATEGORY: Record<string, string> = {
  "🥛": "Beverages", "🍺": "Beverages", "🥤": "Beverages", "💧": "Beverages", "🧃": "Beverages", "☕": "Beverages", "🍵": "Beverages",
  "🌾": "Grains & Flour", "🍚": "Grains & Flour", "🍙": "Grains & Flour", "🍞": "Grains & Flour",
  "🥚": "Food", "🧀": "Food", "🫒": "Cooking", "🧂": "Seasonings",
  "🍪": "Snacks", "🍫": "Snacks", "🍬": "Snacks", "🌶️": "Seasonings",
  "🍎": "Food", "🍌": "Food", "🥕": "Food", "🧅": "Cooking",
  "🧼": "Toiletries", "🪥": "Toiletries", "🧴": "Toiletries", "🧻": "Toiletries", "🧽": "Household", "🧹": "Household",
  "📱": "Airtime", "📶": "Airtime", "🔋": "Household", "💡": "Household", "🕯️": "Household", "🔦": "Household",
  "🍼": "Daily use", "👗": "Clothes", "👟": "Clothes", "✏️": "School", "📒": "School", "🧸": "School",
  "📦": "Household",
};

type Mode = { kind: "edit"; p?: Product } | { kind: "in"; p: Product } | null;

function StockPage() {
  const { t } = useI18n();
  const { low } = Route.useSearch();
  const nav = Route.useNavigate();
  const [cat, setCat] = useState("__all");
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<Mode>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const products = useLiveQuery(() => db.products.orderBy("name").toArray(), []) ?? [];
  const cats = [...new Set([...CATEGORIES, ...products.map((p) => p.category)])];
  const list = products.filter(
    (p) => (cat === "__all" || p.category === cat) && (!low || p.stock <= p.min) && p.name.toLowerCase().includes(q.toLowerCase()),
  );
  const allCost = products.reduce((a, p) => a + (Number(p.stock) || 0) * (Number(p.cost) || 0), 0);
  const allSale = products.reduce((a, p) => a + (Number(p.stock) || 0) * (Number(p.price) || 0), 0);

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-hero p-5 text-primary-foreground shadow-card">
        <p className="text-xs font-medium opacity-90">{t("stockValue")}</p>
        <p className="text-3xl font-bold tabular-nums tracking-tight">{fmt(allCost)}</p>
        <p className="mt-1 text-xs opacity-90">
          {t("salesValue")}: <b>{fmt(allSale)}</b> · {products.length} {t("stock").toLowerCase()}
        </p>
      </section>

      <div className="flex items-end justify-between gap-2">
        <h2 className="text-2xl font-bold">{t("stock")}</h2>
        <button type="button" onClick={() => setMode({ kind: "edit" })} className="flex h-11 items-center gap-1 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">
          <Plus className="size-4" /> {t("addProduct")}
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} className="h-12 w-full rounded-full border bg-card pl-11 pr-4 text-sm outline-none" />
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => nav({ search: low ? {} : { low: true } })} className={cn("h-9 shrink-0 rounded-full px-4 text-sm font-medium", low ? "bg-warning text-warning-foreground" : "border bg-card")}>
          ⚠ {t("low")}
        </button>
      </div>
      <CategoryPills value={cat} onChange={setCat} categories={cats} />
      <ul className="space-y-2">
        {list.map((p) => {
          const isLow = p.stock <= p.min;
          return (
            <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card">
              <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setMode({ kind: "edit", p })}>
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-2xl">{p.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold underline-offset-2 hover:underline">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className={cn("font-semibold", isLow ? "text-destructive" : "text-foreground")}>{p.stock} {p.unit}</span>
                    {" · min "}{p.min}{" · "}{fmt(p.price)}
                  </p>
                </div>
              </button>
              <div className="flex gap-1">
                <IconBtn label={t("stockIn")} onClick={() => setMode({ kind: "in", p })}>
                  <PackagePlus className="size-4" />
                </IconBtn>
                <IconBtn label={t("deleteProduct")} onClick={() => setDeleteTarget(p)}>
                  <Trash2 className="size-4 text-destructive" />
                </IconBtn>
              </div>
            </li>
          );
        })}
        {list.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">{t("emptyShop")}</p>}
      </ul>

      <Drawer open={!!mode} onOpenChange={(o) => !o && setMode(null)}>
        <DrawerContent className="mx-auto max-h-[92vh] max-w-md">
          {mode?.kind === "edit" && <ProductForm p={mode.p} cats={cats} onDone={() => setMode(null)} />}
          {mode?.kind === "in" && <StockInForm p={mode.p} onDone={() => setMode(null)} />}
        </DrawerContent>
      </Drawer>

      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-sm rounded-3xl bg-background p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-bold">{t("confirmDeleteTitle")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("confirmDeleteBody")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{deleteTarget.emoji} {deleteTarget.name}</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="h-11 flex-1 rounded-full border font-semibold">{t("cancel")}</button>
              <button
                type="button"
                onClick={() => {
                  deleteProduct(deleteTarget.id!)
                    .then(() => { toast.success(t("deleteProduct")); setDeleteTarget(null); })
                    .catch((e) => toast.error(e.message));
                }}
                className="h-11 flex-1 rounded-full bg-destructive font-semibold text-destructive-foreground"
              >
                {t("deleteProduct")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IconBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="grid size-10 place-items-center rounded-full border bg-background">
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
  const { t, lang } = useI18n();
  const [showDefaults, setShowDefaults] = useState(false);
  const existing = useLiveQuery(() => db.products.toArray(), []) ?? [];
  const existingNames = new Set(existing.map((x) => x.name.toLowerCase()));
  const [f, setF] = useState({
    name: p?.name ?? "",
    category: p?.category ?? cats[0] ?? "Food",
    unit: p?.unit ?? "pcs",
    emoji: p?.emoji ?? "📦",
    cost: String(p?.cost ?? ""),
    price: String(p?.price ?? ""),
    stock: String(p?.stock ?? ""),
    min: String(p?.min ?? "3"),
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const pickEmoji = (e: string) => setF({ ...f, emoji: e, category: EMOJI_CATEGORY[e] ?? f.category });

  const save = async () => {
    if (!f.name.trim()) { toast.error(t("name")); return; }
    const data = {
      name: f.name.trim(), category: f.category, unit: f.unit, emoji: f.emoji,
      cost: num(f.cost), price: num(f.price), min: num(f.min), stock: p ? p.stock : num(f.stock),
    };
    await saveProduct(p?.id ? { ...data, id: p.id } : data);
    toast.success(t("save"));
    onDone();
  };

  const addDefault = async (d: (typeof DEFAULT_PRODUCTS)[0]) => {
    const label = lang === "rw" && d.nameRw ? d.nameRw : d.name;
    if (existingNames.has(label.toLowerCase()) || existingNames.has(d.name.toLowerCase())) {
      toast.message(t("alreadyHave")); return;
    }
    await saveProduct({ name: label, category: d.category, unit: d.unit, emoji: d.emoji, cost: 0, price: 0, stock: 0, min: 3 });
    toast.success(t("addedDefault"));
  };

  if (showDefaults && !p) {
    return <DefaultsPicker lang={lang} existingNames={existingNames} onAdd={addDefault} onBack={() => setShowDefaults(false)} />;
  }

  return (
    <div className="overflow-y-auto">
      <DrawerHeader className="flex-row items-center justify-between space-y-0 gap-2">
        {!p && (
          <button type="button" onClick={() => setShowDefaults(true)} className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">{t("defaults")}</button>
        )}
        <DrawerTitle className="flex-1 text-center">{p ? t("edit") : t("addProduct")}</DrawerTitle>
        {!p && <span className="w-16" />}
      </DrawerHeader>
      <div className="space-y-3 px-4 pb-6">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {PRODUCT_EMOJIS.map((e) => (
            <button key={e} type="button" onClick={() => pickEmoji(e)} className={cn("grid size-11 shrink-0 place-items-center rounded-xl text-2xl", f.emoji === e ? "bg-primary/20 ring-2 ring-primary" : "bg-muted")}>
              {e}
            </button>
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
        <button type="button" onClick={save} className="h-13 w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground">{t("save")}</button>
      </div>
    </div>
  );
}

function StockInForm({ p, onDone }: { p: Product; onDone: () => void }) {
  const { t } = useI18n();
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState(String(p.cost));
  const [price, setPrice] = useState(String(p.price));
  const [sup, setSup] = useState<number | "">("");
  const suppliers = useLiveQuery(() => db.parties.where("kind").equals("supplier").toArray(), []) ?? [];
  const save = async () => {
    try {
      await stockIn(p.id!, num(qty), num(cost), sup === "" ? undefined : sup, num(price));
      toast.success(`+${num(qty)} ${p.name}`);
      onDone();
    } catch {
      toast.error(t("quantity"));
    }
  };
  return (
    <div className="overflow-y-auto">
      <DrawerHeader><DrawerTitle>{t("stockIn")}: {p.emoji} {p.name}</DrawerTitle></DrawerHeader>
      <div className="space-y-3 px-4 pb-6">
        <div className="grid grid-cols-2 gap-2">
          <Field label={t("quantity")}><Input autoFocus inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} className="h-12 rounded-xl text-lg" /></Field>
          <Field label={t("cost")}><Input inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} className="h-12 rounded-xl text-lg" /></Field>
        </div>
        <Field label={t("sellPrice")}><Input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} className="h-12 rounded-xl text-lg" /></Field>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{t("fromSupplier")}</p>
          <button type="button" onClick={() => setSup("")} className={cn("w-full rounded-xl border px-3 py-2.5 text-left text-sm", sup === "" && "border-primary bg-primary/10")}>{t("none")}</button>
          {suppliers.map((s) => (
            <button key={s.id} type="button" onClick={() => setSup(s.id!)} className={cn("w-full rounded-xl border px-3 py-2.5 text-left text-sm", sup === s.id && "border-primary bg-primary/10")}>{s.name}</button>
          ))}
        </div>
        <p className="text-sm font-semibold">{t("total")}: {fmt(num(qty) * num(cost))}</p>
        <button type="button" onClick={save} className="h-13 w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground">{t("save")}</button>
      </div>
    </div>
  );
}
