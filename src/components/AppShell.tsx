import { Link, useRouterState } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Bell, BookUser, History, Package, Settings, ShoppingBag, Wifi, WifiOff, Cloud, X, RefreshCw } from "lucide-react";
import { db, ensureSeeded } from "@/lib/db";
import { trySync } from "@/lib/sync";
import { isLoggedIn } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { AuthWelcome } from "@/components/AuthWelcome";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";

export function useShopName() {
  return useLiveQuery(() => db.settings.get("shopName"), [])?.value ?? "Iduka Ryanjye";
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const [online, setOnline] = useState(true);
  const [ready, setReady] = useState(false);
  const [startupError, setStartupError] = useState(false);
  const [startupProgress, setStartupProgress] = useState(0);
  const [authed, setAuthed] = useState(false);
  const shop = useShopName();
  const pending = useLiveQuery(() => db.outbox.count(), []) ?? 0;
  const transactionCount = useLiveQuery(() => db.sales.count(), []) ?? 0;
  const syncMode = useLiveQuery(() => db.settings.get("cloudSyncMode"), [])?.value;
  const promptDismissed = useLiveQuery(() => db.settings.get("cloudSyncPromptDismissed"), [])?.value === "1";
  const [showCloudPrompt, setShowCloudPrompt] = useState(false);
  const lowCount = useLiveQuery(() => db.products.filter((p) => p.stock <= p.min).count(), []) ?? 0;
  const path = useRouterState({ select: (s) => s.location.pathname });

  // Public website pages must never initialize the app shell or show auth.
  const isLanding = path === "/welcome" || path.startsWith("/welcome/") || path === "/install-android" || path.startsWith("/install-android/");
  const isNative = Capacitor.isNativePlatform();

  const onAuthed = useCallback(() => setAuthed(true), []);

  useEffect(() => {
    if (transactionCount >= 10 && !syncMode && !promptDismissed) setShowCloudPrompt(true);
  }, [transactionCount, syncMode, promptDismissed]);

  const chooseSyncMode = async (mode: "auto" | "manual") => {
    await db.settings.put({ key: "cloudSyncMode", value: mode });
    await db.settings.put({ key: "cloudSyncPromptDismissed", value: "1" });
    setShowCloudPrompt(false);
    if (mode === "auto" && navigator.onLine) {
      const result = await trySync({ force: true });
      if (!result.ok && result.reason !== "no_session") {
        console.warn("[cloud-sync] automatic sync setup:", result.reason);
      }
    }
  };

  const dismissCloudPrompt = async () => {
    await db.settings.put({ key: "cloudSyncPromptDismissed", value: "1" });
    setShowCloudPrompt(false);
  };

  useEffect(() => {
    let cancelled = false;
    setStartupError(false);
    setStartupProgress(0);
    // Advance visibly while real local initialization is running.
    let progress = 0;
    const progressTicker = window.setInterval(() => {
      progress = Math.min(90, progress + Math.max(1, Math.round((90 - progress) * 0.08)));
      if (!cancelled) setStartupProgress(progress);
    }, 180);
    // The system launch splash cannot be removed on Android 12+, but do not
    // hold a second native splash over the original PWA loading screen.
    if (isNative) void SplashScreen.hide().catch(() => {});
    const startupTimeout = window.setTimeout(() => {
      if (!cancelled) setStartupError(true);
    }, 8000);

    const finishStartup = () => {
      if (cancelled) return;
      window.clearTimeout(startupTimeout);
      window.clearInterval(progressTicker);
      setStartupError(false);
      setStartupProgress(100);
      setReady(true);
    };

    if (isLanding) {
      finishStartup();
    } else {
      (async () => {
        // Seed first, then read the small local state in parallel. Cloud sync is never
        // awaited during launch, so a weak connection cannot delay opening the shop.
        await ensureSeeded();
        if (cancelled) return;
        setStartupProgress(38);
        const loggedIn = await isLoggedIn();
        if (cancelled) return;
        setStartupProgress(76);
        if (cancelled) return;
        setAuthed(loggedIn);
        if (navigator.onLine) {
          void trySync().catch((error) => console.warn("[cloud-sync] background sync failed:", error));
        }
        finishStartup();
      })().catch((error) => {
        console.error("[startup] Local initialization failed:", error);
        window.clearTimeout(startupTimeout);
        if (!cancelled) setStartupError(true);
      });
    }

    setOnline(navigator.onLine);
    const on = () => { setOnline(true); trySync().catch(() => {}); };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      cancelled = true;
      window.clearTimeout(startupTimeout);
      window.clearInterval(progressTicker);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [isLanding, isNative]);

  const tabs = [
    { to: "/" as const, label: t("sell"), icon: ShoppingBag },
    { to: "/stock" as const, label: t("stock"), icon: Package },
    { to: "/credit" as const, label: t("credit"), icon: BookUser },
    { to: "/history" as const, label: t("history"), icon: History },
  ];

  if (isLanding) {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-8">
        <BrandLogo className="mb-5 size-16 rounded-none" imgClassName="rounded-none object-contain" />
        <p className="text-sm font-semibold text-foreground">Stoke Yange</p>
        <div className="mt-5 w-48" role="status" aria-live="polite" aria-label={lang === "rw" ? "App irafunguka" : "App is loading"}>
          <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{lang === "rw" ? "Turimo gutegura app yawe…" : "Getting your app ready…"}</span>
          </div>
          <div
            className="h-2.5 w-full overflow-hidden rounded-full bg-primary/10"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={startupProgress}
          >
            <div className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out" style={{ width: `${startupProgress}%` }} />
          </div>
        </div>
        {startupError && (
          <div className="mt-4 max-w-xs text-center" role="alert">
            <p className="text-sm text-muted-foreground">{lang === "rw" ? "Amakuru yo kuri telefone ntiyafungutse. Funga izindi paji z'iyi app wongere ugerageze." : "Device data could not open. Close other copies of this app and try again."}</p>
            <Button variant="outline" onClick={() => window.location.reload()} className="mt-4 rounded-full">{lang === "rw" ? "Ongera ugerageze" : "Try again"}</Button>
          </div>
        )}
      </div>
    );
  }

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
            <button type="button" onClick={() => setLang(lang === "en" ? "rw" : "en")} className="flex h-9 items-center gap-0.5 rounded-full border bg-card p-0.5 shadow-sm" aria-label="Toggle language">
              <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors", lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>EN</span>
              <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors", lang === "rw" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>RW</span>
            </button>
            <Link to="/stock" search={{ low: true }} className="relative grid size-9 place-items-center rounded-full border bg-card" aria-label="Low stock">
              <Bell className="size-4" />
              {lowCount > 0 && <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{lowCount}</span>}
            </Link>
            <Link to="/settings" className="grid size-9 place-items-center rounded-full border bg-card" aria-label={t("settings")}>
              <Settings className="size-4" />
            </Link>
          </div>
        </div>
      </header>
      <main className="px-4">{children}</main>
      {!authed && <AuthWelcome onAuthed={onAuthed} />}
      {showCloudPrompt && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="cloud-backup-title">
          <section className="relative w-full max-w-sm rounded-3xl border bg-card p-5 shadow-2xl">
            <button type="button" onClick={dismissCloudPrompt} aria-label="Funga" className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <X className="size-4" />
            </button>
            <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Cloud className="size-6" />
            </div>
            <h2 id="cloud-backup-title" className="pr-7 text-lg font-bold">Bika amakuru yawe kuri cloud</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Bika amakuru yawe kuri cloud kugira ngo ubashe kuyagarura ahazaza.</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => chooseSyncMode("auto")} className="flex min-h-32 flex-col items-start rounded-2xl border border-primary/40 bg-primary/5 p-3 text-left transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <span className="mb-3 grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><RefreshCw className="size-4" /></span>
                <span className="text-sm font-bold leading-snug">Kwibika mu gihe ufite internet</span>
                <span className="mt-1 text-[11px] leading-snug text-muted-foreground">Amakuru azajya abikwa igihe cyose ufite internet.</span>
              </button>
              <button type="button" onClick={() => chooseSyncMode("manual")} className="flex min-h-32 flex-col items-start rounded-2xl border p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <span className="mb-3 grid size-9 place-items-center rounded-xl bg-muted"><Cloud className="size-4" /></span>
                <span className="text-sm font-bold leading-snug">Kuyishyiriraho</span>
                <span className="mt-1 text-[11px] leading-snug text-muted-foreground">Wowe uhitamo igihe cyo kubika amakuru.</span>
              </button>
            </div>
          </section>
        </div>
      )}
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
