import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Undo2 } from "lucide-react";
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
      { property: "og:title", content: "History — Stoke Yange" },
      { property: "og:description", content: "All sales with daily cash and credit summaries." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { t } = useI18n();
  const sales = useLiveQuery(() => db.sales.orderBy("createdAt").reverse().limit(500).toArray(), []) ?? [];
  const parties = useLiveQuery(() => db.parties.toArray(), []) ?? [];
  const groups = new Map<string, Sale[]>();
  for (const s of sales) {
    const k = new Date(s.createdAt).toDateString();
    groups.set(k, [...(groups.get(k) ?? []), s]);
  }
  const todayKey = new Date().toDateString();

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold">{t("history")}</h2>
      {[...groups.entries()].map(([day, list]) => {
        const live = list.filter((s) => !s.reversed);
        const cash = live.filter((s) => s.type === "cash").reduce((a, s) => a + s.total, 0);
        const credit = live.filter((s) => s.type === "credit").reduce((a, s) => a + s.total, 0);
        const profit = live.reduce((a, s) => a + (s.unitPrice - s.unitCost) * s.qty, 0);
        return (
          <section key={day} className="space-y-2">
            <div className="rounded-2xl bg-card p-3 shadow-card sm:p-4">
              <p className="font-semibold text-sm sm:text-base">
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
              {list.map((s) => {
                const canUndo = !s.reversed && Date.now() - s.createdAt < UNDO_WINDOW_MS;
                return (
                  <li key={s.id} className={cn("flex items-center gap-2 rounded-2xl bg-card px-3 py-2.5 sm:gap-3", s.reversed && "opacity-50")}>
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-sm font-medium", s.reversed && "line-through")}>
                        {s.qty} × {s.productName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                        {s.partyId && ` · ${parties.find((p) => p.id === s.partyId)?.name ?? ""}`}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:text-[11px]",
                        s.reversed ? "bg-muted" : s.type === "cash" ? "bg-success/15 text-success" : "bg-primary/15 text-primary",
                      )}
                    >
                      {s.reversed ? t("reversed") : s.type === "cash" ? t("cash") : t("creditIdeni")}
                    </span>
                    <span className="w-16 shrink-0 text-right text-xs font-semibold tabular-nums sm:w-24 sm:text-sm">{fmt(s.total)}</span>
                    {canUndo && (
                      <button
                        type="button"
                        aria-label={t("undo")}
                        onClick={() => reverseSale(s.id!).then(() => toast(t("reversed"))).catch((e) => toast.error(e.message))}
                        className="grid size-9 shrink-0 place-items-center rounded-full border"
                      >
                        <Undo2 className="size-4" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {sales.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">{t("noItems")}</p>}
    </div>
  );
}

function Stat({ label, v, cls }: { label: string; v: string; cls: string }) {
  return (
    <div className="rounded-xl bg-muted px-2 py-2 text-center sm:p-2">
      <p className="text-[10px] leading-tight text-muted-foreground sm:text-[10px]">{label}</p>
      <p className={cn("mt-0.5 text-sm font-bold tabular-nums sm:text-sm", cls)}>{v}</p>
    </div>
  );
}
