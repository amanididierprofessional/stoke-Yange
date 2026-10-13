import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Minus, Plus, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { db, type Product, type SaleType } from "@/lib/db";
import { addParty, fmt, recordSale, reverseSale } from "@/lib/actions";
import { useI18n, type Key } from "@/lib/i18n";
import { ProductThumb } from "@/components/ProductThumb";
import { cn } from "@/lib/utils";

export async function quickSell(p: Product, t: (k: Key) => string) {
  try {
    if (p.stock < 1) {
      toast.error(t("notEnough"));
      return;
    }
    const id = await recordSale({ productId: p.id!, qty: 1, unitPrice: p.price, type: "cash" });
    toast.success(`${t("sold")}: ${p.name}`, {
      description: fmt(p.price),
      action: { label: t("undo"), onClick: () => reverseSale(id).catch(() => {}) },
    });
  } catch (e) {
    toast.error((e as Error).message === "Not enough stock" ? t("notEnough") : (e as Error).message);
  }
}

export function SellSheet({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const { t } = useI18n();
  const [qty, setQty] = useState(1);
  const [qtyText, setQtyText] = useState("1");
  const [price, setPrice] = useState("");
  const [type, setType] = useState<SaleType>("cash");
  const [partyId, setPartyId] = useState<number | "new" | "">("");
  const [newName, setNewName] = useState("");
  const customers = useLiveQuery(() => db.parties.where("kind").equals("customer").toArray(), []) ?? [];

  useEffect(() => {
    if (product) {
      setQty(1);
      setQtyText("1");
      setPrice(String(product.price ?? 0));
      setType("cash");
      setPartyId("");
      setNewName("");
    }
  }, [product]);

  useEffect(() => {
    if (!product) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [product, onClose]);

  if (!product) return null;

  const maxStock = Math.max(0, product.stock);
  const unit = Number(price) || 0;
  const total = qty * unit;

  const applyQty = (n: number) => {
    const floor = Math.floor(Number(n)) || 0;
    const clamped = maxStock <= 0 ? 0 : Math.max(1, Math.min(maxStock, floor || 1));
    setQty(clamped);
    setQtyText(String(clamped || ""));
  };

  const submit = async () => {
    try {
      if (maxStock < 1 || qty < 1) {
        toast.error(t("notEnough"));
        return;
      }
      let pid: number | undefined;
      if (type === "credit") {
        if (partyId === "new") {
          if (!newName.trim()) {
            toast.error(t("name"));
            return;
          }
          pid = await addParty(newName, "", "customer");
        } else if (typeof partyId === "number") {
          pid = partyId;
        } else {
          toast.error(t("customer"));
          return;
        }
      }
      const id = await recordSale({
        productId: product.id!,
        qty,
        unitPrice: unit,
        type,
        partyId: pid,
      });
      toast.success(`${t("sold")}: ${qty} × ${product.name}`, {
        description: fmt(total),
        action: { label: t("undo"), onClick: () => reverseSale(id).catch(() => {}) },
      });
      onClose();
    } catch (e) {
      toast.error((e as Error).message === "Not enough stock" ? t("notEnough") : (e as Error).message);
    }
  };

  const sortedCustomers = [...customers].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close" onClick={onClose} />
      <div className="relative z-[81] flex max-h-[90vh] w-full max-w-md flex-col rounded-t-3xl bg-background shadow-2xl sm:rounded-3xl">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <ProductThumb emoji={product.emoji} image={product.image} color={product.color} name={product.name} className="size-14 shrink-0" emojiClassName="text-3xl" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold">{product.name}</h2>
            <p className="text-sm text-muted-foreground">
              {product.stock} {product.unit} {t("left")}
            </p>
          </div>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full border" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-4 py-4">
          <div className="flex items-center justify-between rounded-2xl bg-muted p-3">
            <span className="text-sm font-medium">{t("quantity")}</span>
            <div className="flex items-center gap-2">
              <button type="button" className="grid size-11 place-items-center rounded-full bg-card shadow-card" onClick={() => applyQty(qty - 1)} aria-label="minus">
                <Minus className="size-4" />
              </button>
              <input type="text" inputMode="numeric" value={qtyText} onChange={(e) => { const raw = e.target.value.replace(/\D/g, ""); setQtyText(raw); if (raw) applyQty(Number(raw)); }} onBlur={() => applyQty(Number(qtyText) || 1)} className="h-11 w-16 rounded-xl border bg-card text-center text-xl font-bold tabular-nums outline-none focus:ring-2 focus:ring-ring" aria-label={t("quantity")} />
              <button type="button" className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground" onClick={() => applyQty(qty + 1)} aria-label="plus">
                <Plus className="size-4" />
              </button>
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-medium">{t("price")} (RWF)</span>
            <Input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} className="mt-1 h-12 rounded-xl text-lg font-semibold" />
          </label>

          <div className="grid grid-cols-2 gap-2 rounded-full bg-muted p-1">
            {(["cash", "credit"] as const).map((k) => (
              <button key={k} type="button" onClick={() => setType(k)} className={cn("h-11 rounded-full text-sm font-semibold", type === k ? "bg-card text-primary shadow-card" : "text-muted-foreground")}>
                {k === "cash" ? t("cash") : t("creditIdeni")}
              </button>
            ))}
          </div>

          {type === "credit" && (
            <div className="space-y-3 rounded-2xl border bg-card p-3">
              <p className="text-sm font-semibold">{t("customer")}</p>
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {sortedCustomers.map((c) => (
                  <button key={c.id} type="button" onClick={() => setPartyId(c.id!)} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors", partyId === c.id ? "bg-primary/15 font-semibold text-primary ring-1 ring-primary" : "hover:bg-muted")}>
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent font-bold text-accent-foreground">{c.name[0]?.toUpperCase() ?? "?"}</span>
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
                {sortedCustomers.length === 0 && <p className="py-2 text-center text-xs text-muted-foreground">{t("noItems")}</p>}
              </div>
              {partyId === "new" ? (
                <div className="space-y-2 rounded-xl bg-muted/60 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">{t("newCustomer")}</span>
                    <button type="button" onClick={() => setPartyId("")} className="rounded-full p-1 hover:bg-card" aria-label="close"><X className="size-4" /></button>
                  </div>
                  <Input autoFocus placeholder={t("name")} value={newName} onChange={(e) => setNewName(e.target.value)} className="h-12 rounded-xl text-base" />
                </div>
              ) : (
                <button type="button" onClick={() => { setPartyId("new"); setNewName(""); }} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 text-sm font-semibold text-primary">
                  <UserPlus className="size-4" /> {t("newCustomer")}
                </button>
              )}
            </div>
          )}

          <button type="button" onClick={submit} disabled={maxStock < 1} className="flex h-14 w-full items-center justify-between rounded-full bg-primary px-6 text-primary-foreground disabled:opacity-40">
            <span className="font-semibold">{t("complete")}</span>
            <span className="font-bold tabular-nums">{fmt(total)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProductCard({ p, onOpen }: { p: Product; onOpen: () => void }) {
  const { t } = useI18n();
  const low = p.stock <= p.min;
  return (
    <div className="flex flex-col rounded-2xl bg-card p-3 shadow-card">
      <button type="button" onClick={onOpen} className="text-left">
        <div className="relative">
          <ProductThumb
            emoji={p.emoji}
            image={p.image}
            color={p.color}
            name={p.name}
            className="aspect-[4/3] w-full text-5xl"
            emojiClassName="text-5xl"
          />
          <span className={cn("absolute left-2 top-2 max-w-[85%] truncate rounded-full px-2 py-0.5 text-[10px] font-semibold", p.stock === 0 ? "bg-destructive text-destructive-foreground" : low ? "bg-warning text-warning-foreground" : "bg-card text-foreground")}>
            {p.stock === 0 ? t("out") : `${p.stock} ${t("left")}${low ? ` · ${t("low")}` : ""}`}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-tight">{p.name}</p>
        <p className="mt-1 text-base font-extrabold tabular-nums leading-tight text-foreground">
          {(p.price ?? 0).toLocaleString()}
          <span className="ml-0.5 text-[10px] font-bold text-muted-foreground"> RWF</span>
        </p>
      </button>
      <button type="button" disabled={p.stock === 0} onClick={() => quickSell(p, t)} className="mt-2 h-10 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-40">
        {t("sell")}
      </button>
    </div>
  );
}
