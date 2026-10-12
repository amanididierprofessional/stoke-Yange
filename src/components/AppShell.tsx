import { Link, useRouterState } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState, type ReactNode } from "react";
import { Bell, BookUser, History, Package, Settings, ShoppingBag, Wifi, WifiOff } from "lucide-react";
import { db, ensureSeeded } from "@/lib/db";
import { trySync } from "@/lib/sync";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { AuthWelcome } from "@/components/AuthWelcome";

export function useShopName() {
  return useLiveQuery(() => db.settings.get("shopName"), [])?.value ?? "Iduka Ryanjye";
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const [online, setOnline] = useState(true);
  const [ready, setReady] = useState(false);
  const shop = useShopName();
  const pending = useLiveQuery(() => db.outbox.count(), []) ?? 0;
  const lowCount = useLiveQuery(() => db.products.filter((p) => p.stock <= p.min).count(), []) ?? 0;
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    let cancelled = false;
    ensureSeeded()
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    setOnline(navigator.onLine);
    const on = () => { setOnline(true); trySync().catch(() => {}); };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    if (navigator.onLine) trySync().catch(() => {});
    return () => {
      cancelled = true;
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const tabs = [
    { to: "/" as const, label: t("sell"), icon: ShoppingBag },
    { to: "/stock" as const, label: t("stock"), icon: Package },
    { to: "/credit" as const, label: t("credit"), icon: BookUser },
    { to: "/history" as const, label: t("history"), icon: History },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-32">
      <header className="sticky top-0 z-30 bg-background/90 px-3 pb-3 pt-3 backdrop-blur sm:px-4 sm:pt-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold leading-tight sm:text-lg">{shop}</h1>
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground sm:text-xs">
              {online ? <Wifi className="size-3 text-success" /> : <WifiOff className="size-3 text-warning-foreground" />}
              {online ? t("online") : t("offline")}
              {pending > 0 ? ` · ${pending} ${t("pending")}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setLang(lang === "en" ? "rw" : "en")}
              className="flex h-9 items-center gap-0.5 rounded-full border bg-card p-0.5 shadow-sm"
              aria-label="Toggle language"
            >
              <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors", lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                EN
              </span>
              <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors", lang === "rw" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                RW
              </span>
            </button>
            <Link to="/stock" search={{ low: true }} className="relative grid size-9 place-items-center rounded-full border bg-card" aria-label="Low stock">
              <Bell className="size-4" />
              {lowCount > 0 && (
                <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{lowCount}</span>
              )}
            </Link>
            <Link to="/settings" className="grid size-9 place-items-center rounded-full border bg-card" aria-label={t("settings")}>
              <Settings className="size-4" />
            </Link>
          </div>
        </div>
      </header>
      <main className="px-4">{ready ? children : <BootSkeleton />}</main>
      <AuthWelcome />
      <nav className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-[calc(100%-2rem)] max-w-sm items-center justify-between gap-1 rounded-full bg-ink p-1.5 shadow-card">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? path === "/" : path.startsWith(to);
          return (
            <Link key={to} to={to} className={cn("flex h-12 items-center justify-center gap-2 rounded-full transition-all", active ? "flex-[2] bg-primary px-4 text-primary-foreground" : "flex-1 text-ink-foreground/70")}>
              <Icon className="size-5 shrink-0" />
              {active && <span className="truncate text-sm font-semibold">{label}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function BootSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-36 rounded-3xl bg-primary/20" />
      <div className="h-12 rounded-full bg-muted" />
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-40 rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}

export function CategoryPills({ value, onChange, categories }: { value: string; onChange: (c: string) => void; categories: string[] }) {
  const { t } = useI18n();
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {["__all", ...categories].map((c) => (
        <button key={c} type="button" onClick={() => onChange(c)} className={cn("h-9 shrink-0 rounded-full px-4 text-sm font-medium transition-colors", value === c ? "bg-primary text-primary-foreground" : "border bg-card text-foreground")}>
          {c === "__all" ? t("all") : c}
        </button>
      ))}
    </div>
  );
}
