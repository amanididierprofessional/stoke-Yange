import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { db, type Product, type SaleType } from "@/lib/db";
import { addParty, fmt, recordSale, reverseSale } from "@/lib/actions";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export async function quickSell(p: Product, t: (k: any) => string) {
  try {
    const id = await recordSale({ productId: p.id!, qty: 1, unitPrice: p.price, type: "cash" });
    toast.success(`${t("sold")}: ${p.name}`, {
      description: fmt(p.price),
      action: { label: t("undo"), onClick: () => reverseSale(id) },
    });
  } catch (e) {
    toast.error((e as Error).message === "Not enough stock" ? t("notEnough") : (e as Error).message);
  }
}

export function SellSheet({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const { t } = useI18n();
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState("");
  const [type, setType] = useState<SaleType>("cash");
  const [partyId, setPartyId] = useState<number | "new" | "">("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [dueDays, setDueDays] = useState(7);
  const customers = useLiveQuery(() => db.parties.where("kind").equals("customer").sortBy("name"), []) ?? [];

  useEffect(() => {
    if (product) {
      setQty(1);
      setPrice(String(product.price));
      setType("cash");
      setPartyId("");
      setNewName("");
      setNewPhone("");
    }
  }, [product]);

  if (!product) return null;
  const unit = Number(price) || 0;
  const total = qty * unit;

  const submit = async () => {
    try {
      let pid: number | undefined;
      if (type === "credit") {
        if (partyId === "new") {
          if (!newName.trim()) return toast.error(t("name"));
          pid = await addParty(newName, newPhone, "customer");
        } else if (partyId) pid = partyId;
        else return toast.error(t("customer"));
      }
      const id = await recordSale({ productId: product.id!, qty, unitPrice: unit, type, partyId: pid, dueDays });
      toast.success(`${t("sold")}: ${qty} × ${product.name}`, {
        description: fmt(total),
        action: { label: t("undo"), onClick: () => reverseSale(id) },
      });
      onClose();
    } catch (e) {
      toast.error((e as Error).message === "Not enough stock" ? t("notEnough") : (e as Error).message);
    }
  };

  return (
    <Drawer open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="mx-auto max-w-md">
        <DrawerHeader className="flex-row items-center gap-3 text-left">
          <span className="grid size-14 place-items-center rounded-2xl bg-accent text-3xl">{product.emoji}</span>
          <div>
            <DrawerTitle className="text-lg">{product.name}</DrawerTitle>
            <p className="text-sm text-muted-foreground">
              {product.stock} {product.unit} {t("left")}
            </p>
          </div>
        </DrawerHeader>
        <div className="space-y-4 px-4 pb-6">
          <div className="flex items-center justify-between rounded-2xl bg-muted p-3">
            <span className="text-sm font-medium">{t("quantity")}</span>
            <div className="flex items-center gap-3">
              <button className="grid size-11 place-items-center rounded-full bg-card shadow-card" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="minus">
                <Minus className="size-4" />
              </button>
              <span className="w-8 text-center text-xl font-bold tabular-nums">{qty}</span>
              <button className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground" onClick={() => setQty((q) => Math.min(product.stock, q + 1))} aria-label="plus">
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
              <button key={k} onClick={() => setType(k)} className={cn("h-11 rounded-full text-sm font-semibold", type === k ? "bg-card shadow-card text-primary" : "text-muted-foreground")}>
                {k === "cash" ? t("cash") : t("creditIdeni")}
              </button>
            ))}
          </div>
          {type === "credit" && (
            <div className="space-y-2">
              <select
                value={String(partyId)}
                onChange={(e) => setPartyId(e.target.value === "new" ? "new" : e.target.value ? Number(e.target.value) : "")}
                className="h-12 w-full rounded-xl border bg-card px-3"
              >
                <option value="">{t("customer")}…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                <option value="new">+ {t("newCustomer")}</option>
              </select>
              {partyId === "new" && (
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder={t("name")} value={newName} onChange={(e) => setNewName(e.target.value)} className="h-11 rounded-xl" />
                  <Input placeholder={t("phone")} inputMode="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="h-11 rounded-xl" />
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{t("dueIn")}:</span>
                {[7, 14, 30].map((d) => (
                  <button key={d} onClick={() => setDueDays(d)} className={cn("h-8 rounded-full px-3", dueDays === d ? "bg-primary text-primary-foreground" : "border")}>
                    {d} {t("days")}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button onClick={submit} className="flex h-14 w-full items-center justify-between rounded-full bg-primary px-6 text-primary-foreground">
            <span className="font-semibold">{t("complete")}</span>
            <span className="font-bold tabular-nums">{fmt(total)}</span>
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function ProductCard({ p, onOpen }: { p: Product; onOpen: () => void }) {
  const { t } = useI18n();
  const low = p.stock <= p.min;
  return (
    <div className="flex flex-col rounded-2xl bg-card p-3 shadow-card">
      <button onClick={onOpen} className="text-left">
        <div className="relative grid aspect-[4/3] place-items-center rounded-xl bg-accent text-5xl">
          {p.emoji}
          <span
            className={cn(
              "absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              p.stock === 0 ? "bg-destructive text-destructive-foreground" : low ? "bg-warning text-warning-foreground" : "bg-card text-foreground",
            )}
          >
            {p.stock === 0 ? t("out") : `${p.stock} ${t("left")}${low ? ` · ${t("low")}` : ""}`}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 min-h-10 text-sm font-semibold leading-tight">{p.name}</p>
      </button>
      <div className="mt-2 flex items-center justify-between gap-1">
        <span className="rounded-full bg-ink px-2 py-1 text-xs font-bold text-ink-foreground">{p.price.toLocaleString()} RWF</span>
        <button
          disabled={p.stock === 0}
          onClick={() => quickSell(p, t)}
          className="h-9 rounded-full bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          + {t("sell")}
        </button>
      </div>
    </div>
  );
}
