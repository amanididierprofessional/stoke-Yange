import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { Plus, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { db, type Sale } from "@/lib/db";
import { fmt, reverseSale, UNDO_WINDOW_MS } from "@/lib/actions";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — Stoke Yange" },
      { name: "description", content: "All sales with daily cash and credit summaries." },
    ],
  }),
  component: HistoryPage,
});

type FeedItem =
  | { kind: "sale"; at: number; sale: Sale }
  | { kind: "debt"; at: number; id: number; partyName: string; description: string; amount: number; partyKind: string }
  | { kind: "payment"; at: number; id: number; partyName: string; amount: number };

function HistoryPage() {
  const { t, lang } = useI18n();
  const sales = useLiveQuery(() => db.sales.orderBy("createdAt").reverse().limit(400).toArray(), []) ?? [];
  const parties = useLiveQuery(() => db.parties.toArray(), []) ?? [];
  const debts = useLiveQuery(() => db.debts.orderBy("createdAt").reverse().limit(200).toArray(), []) ?? [];
  const payments = useLiveQuery(() => db.payments.orderBy("createdAt").reverse().limit(200).toArray(), []) ?? [];
  const [selected, setSelected] = useState<number[]>([]);

  const partyName = (id?: number) => parties.find((p) => p.id === id)?.name ?? "";
  const partyKind = (id?: number) => parties.find((p) => p.id === id)?.kind ?? "";

  const feed: FeedItem[] = useMemo(() => {
    const items: FeedItem[] = [];
    for (const s of sales) items.push({ kind: "sale", at: s.createdAt, sale: s });
    for (const d of debts) {
      // Skip debts that are pure sale-linked duplicates already in sales feed as credit sale
      if (d.saleId != null) continue;
      items.push({
        kind: "debt",
        at: d.createdAt,
        id: d.id!,
        partyName: partyName(d.partyId),
        description: d.description,
        amount: d.amount,
        partyKind: partyKind(d.partyId),
      });
    }
    for (const p of payments) {
      items.push({
        kind: "payment",
        at: p.createdAt,
        id: p.id!,
        partyName: partyName(p.partyId),
        amount: p.amount,
      });
    }
    items.sort((a, b) => b.at - a.at);
    return items;
  }, [sales, debts, payments, parties]);

  const toggle = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const clearSel = () => setSelected([]);

  const selectedSales = sales.filter((s) => s.id != null && selected.includes(s.id) && !s.reversed);
  const selectedTotal = selectedSales.reduce((a, s) => a + s.total, 0);

  const groups = new Map<string, FeedItem[]>();
  for (const item of feed) {
    const k = new Date(item.at).toDateString();
    groups.set(k, [...(groups.get(k) ?? []), item]);
  }
  const todayKey = new Date().toDateString();

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">{t("history")}</h2>

      {selected.length > 0 && (
        <section className="relative rounded-3xl bg-hero p-5 text-primary-foreground shadow-card">
          <button type="button" onClick={clearSel} className="absolute right-3 top-3 z-20 grid size-9 place-items-center rounded-full bg-black/30 ring-1 ring-white/50" aria-label="Close">
            <X className="size-4" />
          </button>
          <p className="text-xs font-medium opacity-90">{t("selectedTotal")}</p>
          <p className="pr-10 text-3xl font-bold tabular-nums tracking-tight">{fmt(selectedTotal)}</p>
          <p className="mt-1 text-xs opacity-90">
            {selectedSales.length} {t("itemsSelected")}
          </p>
        </section>
      )}

      {[...groups.entries()].map(([day, list]) => {
        const daySales = list.filter((i): i is Extract<FeedItem, { kind: "sale" }> => i.kind === "sale").map((i) => i.sale);
        const live = daySales.filter((s) => !s.reversed);
        const cash = live.filter((s) => s.type === "cash").reduce((a, s) => a + s.total, 0);
        const credit = live.filter((s) => s.type === "credit").reduce((a, s) => a + s.total, 0);
        const profit = live.reduce((a, s) => a + (s.unitPrice - s.unitCost) * s.qty, 0);
        return (
          <section key={day} className="space-y-2">
            <div className="rounded-2xl bg-card p-3 shadow-card sm:p-4">
              <p className="text-sm font-semibold sm:text-base">
                {day === todayKey
                  ? t("today")
                  : new Date(day).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-1.5 sm:gap-2">
                <Stat label={t("cashCollected")} v={fmt(cash)} cls="text-success" />
                <Stat label={t("creditGiven")} v={fmt(credit)} cls="text-primary" />
                <Stat label={t("profit")} v={fmt(profit)} cls="text-foreground" />
              </div>
            </div>
            <ul className="space-y-2">
              {list.map((item) => {
                if (item.kind === "debt") {
                  return (
                    <li key={`d-${item.id}`} className="flex items-center gap-2 rounded-2xl bg-card px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.partyName || "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} ·{" "}
                          {item.description}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {lang === "rw" ? "Ideni" : "Debt"}
                      </span>
                      <span className="w-16 shrink-0 text-right text-xs font-semibold tabular-nums">{fmt(item.amount)}</span>
                    </li>
                  );
                }
                if (item.kind === "payment") {
                  return (
                    <li key={`p-${item.id}`} className="flex items-center gap-2 rounded-2xl bg-card px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.partyName || "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
                        {t("payments")}
                      </span>
                      <span className="w-16 shrink-0 text-right text-xs font-semibold tabular-nums text-success">−{fmt(item.amount)}</span>
                    </li>
                  );
                }
                const s = item.sale;
                const canUndo = !s.reversed && Date.now() - s.createdAt < UNDO_WINDOW_MS;
                const isSel = s.id != null && selected.includes(s.id);
                return (
                  <li
                    key={`s-${s.id}`}
                    className={cn(
                      "flex items-center gap-1.5 rounded-2xl bg-card px-3 py-2.5 sm:gap-2",
                      s.reversed && "opacity-50",
                      isSel && "bg-primary/5 ring-2 ring-primary",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-sm font-medium", s.reversed && "line-through")}>
                        {s.qty} × {s.productName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                        {s.partyId && ` · ${partyName(s.partyId)}`}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        s.reversed ? "bg-muted" : s.type === "cash" ? "bg-success/15 text-success" : "bg-primary/15 text-primary",
                      )}
                    >
                      {s.reversed ? t("reversed") : s.type === "cash" ? t("cash") : t("creditIdeni")}
                    </span>
                    <span className="w-14 shrink-0 text-right text-xs font-semibold tabular-nums sm:w-20">{fmt(s.total)}</span>
                    <div className="flex shrink-0 items-center gap-0.5">
                      {!s.reversed && (
                        <button
                          type="button"
                          aria-label="Select"
                          onClick={() => s.id != null && toggle(s.id)}
                          className={cn("grid size-7 place-items-center rounded-full border", isSel && "border-primary bg-primary text-primary-foreground")}
                        >
                          <Plus className="size-3.5" />
                        </button>
                      )}
                      {canUndo && (
                        <button
                          type="button"
                          aria-label={t("undo")}
                          onClick={() => reverseSale(s.id!).then(() => toast(t("reversed"))).catch((e) => toast.error(e.message))}
                          className="grid size-7 place-items-center rounded-full border"
                        >
                          <Undo2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {feed.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">{t("noItems")}</p>}
    </div>
  );
}

function Stat({ label, v, cls }: { label: string; v: string; cls: string }) {
  return (
    <div className="rounded-xl bg-muted px-2 py-2 text-center sm:p-2">
      <p className="truncate text-[10px] text-muted-foreground sm:text-xs">{label}</p>
      <p className={cn("text-xs font-bold tabular-nums sm:text-sm", cls)}>{v}</p>
    </div>
  );
}
