import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Cloud,
  CreditCard,
  Download,
  History,
  Languages,
  Package,
  Shield,
  ShoppingBag,
  Smartphone,
  WifiOff,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Stoke Yange — Shop stock, sales & credit" },
      {
        name: "description",
        content:
          "Simple POS for small shops in Rwanda. Sell in one tap, track stock and credit, work offline. Free to install.",
      },
      { property: "og:title", content: "Stoke Yange" },
      {
        property: "og:description",
        content: "Record sales, stock and credit — even without internet.",
      },
    ],
  }),
  component: WelcomePage,
});

type Lang = "en" | "rw";

const copy = {
  en: {
    badge: "Free for shop owners",
    heroTitle: "Sell, stock and credit — in one simple app",
    heroSub: "Built for small shops. Works on your phone. Works offline.",
    install: "Install app",
    open: "Open app",
    installing: "Installing…",
    installed: "Already installed",
    iosHint: "On iPhone: Share → Add to Home Screen",
    featuresTitle: "Everything your shop needs",
    featuresSub: "Short tools. Clear numbers. No clutter.",
    howTitle: "How it works",
    howSub: "Three steps. Ready in minutes.",
    ctaTitle: "Start free today",
    ctaSub: "Install once. Your shop data stays on your phone and syncs when online.",
    footer: "Stoke Yange · Made for Rwanda shops",
    contact: "Help",
    f1t: "One-tap sell",
    f1d: "Tap a product. Cash or credit. Done.",
    f2t: "Live stock",
    f2d: "Know what is left before you sell.",
    f3t: "Credit book",
    f3d: "Who owes you. What you owe suppliers.",
    f4t: "Works offline",
    f4d: "No signal? Keep selling. Sync later.",
    f5t: "Sales history",
    f5d: "Every sale recorded. Undo when needed.",
    f6t: "Cloud backup",
    f6d: "Sign in once. Restore on a new phone.",
    s1t: "Install",
    s1d: "Add Stoke Yange to your home screen.",
    s2t: "Add products",
    s2d: "Use quick defaults or type your own.",
    s3t: "Start selling",
    s3d: "Cash today. Credit tracked for you.",
    offlineTitle: "No internet? No problem.",
    offlineBody: "Sales and stock save on your phone. When you connect, they go to the cloud automatically.",
    lang: "Language",
  },
  rw: {
    badge: "Ubuntu ku bacuruzi",
    heroTitle: "Gurisha, ububiko n'amadeni — muri porogaramu imwe",
    heroSub: "Yagenewe iduka nto. Ikora kuri telefone. Ikora nta murandasi.",
    install: "Shyira porogaramu",
    open: "Fungura porogaramu",
    installing: "Birimo…",
    installed: "Isanzwe yashyizwe",
    iosHint: "Kuri iPhone: Share → Add to Home Screen",
    featuresTitle: "Ibyo iduka ryawe rikeneye",
    featuresSub: "Ibikoresho byoroshye. Imibare isobanutse.",
    howTitle: "Uko bikora",
    howSub: "Intambwe eshatu. Umererwa neza mu minota mike.",
    ctaTitle: "Tangira ubuntu uyu munsi",
    ctaSub: "Shyira rimwe. Amakuru y'iduka aba kuri telefone kandi ajya kuri cloud iyo ufite murandasi.",
    footer: "Stoke Yange · Yagenewe iduka zo mu Rwanda",
    contact: "Ubufasha",
    f1t: "Gurisha byihuse",
    f1d: "Kanda igicuruzwa. Amafaranga cyangwa ideni. Byarangiye.",
    f2t: "Ububiko bw'ubu",
    f2d: "Menya ibisigaye mbere yo kugurisha.",
    f3t: "Igitabo cy'amadeni",
    f3d: "Abakwishyura. Abo ubereyemo.",
    f4t: "Nta murandasi",
    f4d: "Nta network? Komeza ugurishe. Ohereza nyuma.",
    f5t: "Amateka y'igurisha",
    f5d: "Igurisha ryose ryanditswe. Subiza iyo bikenewe.",
    f6t: "Kopi kuri cloud",
    f6d: "Injira rimwe. Garura kuri telefone nshya.",
    s1t: "Shyira",
    s1d: "Ongeraho Stoke Yange ku mugaragaro.",
    s2t: "Ongeraho ibicuruzwa",
    s2d: "Koresha ibisanzwe cyangwa wandike ibyawe.",
    s3t: "Tangira kugurisha",
    s3d: "Amafaranga uyu munsi. Amadeni arakurikirwa.",
    offlineTitle: "Nta murandasi? Nta kibazo.",
    offlineBody: "Igurisha n'ububiko bibikwa kuri telefone. Iyo uhujwe, bijya kuri cloud automatic.",
    lang: "Ururimi",
  },
} as const;

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function WelcomePage() {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    const s = localStorage.getItem("sy-lang");
    return s === "rw" ? "rw" : "en";
  });
  const t = copy[lang];
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    localStorage.setItem("sy-lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS
      window.navigator.standalone === true;
    setInstalled(standalone);
    const ua = navigator.userAgent;
    setIsIos(/iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream);

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  const install = async () => {
    if (!deferred) return;
    setBusy(true);
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferred(null);
    } finally {
      setBusy(false);
    }
  };

  const features = [
    { icon: ShoppingBag, title: t.f1t, body: t.f1d, tone: "bg-orange-50 text-orange-600" },
    { icon: Package, title: t.f2t, body: t.f2d, tone: "bg-amber-50 text-amber-700" },
    { icon: CreditCard, title: t.f3t, body: t.f3d, tone: "bg-rose-50 text-rose-600" },
    { icon: WifiOff, title: t.f4t, body: t.f4d, tone: "bg-sky-50 text-sky-700" },
    { icon: History, title: t.f5t, body: t.f5d, tone: "bg-violet-50 text-violet-700" },
    { icon: Cloud, title: t.f6t, body: t.f6d, tone: "bg-emerald-50 text-emerald-700" },
  ];

  const steps = [
    { n: "1", title: t.s1t, body: t.s1d, icon: Download },
    { n: "2", title: t.s2t, body: t.s2d, icon: Package },
    { n: "3", title: t.s3t, body: t.s3d, icon: Zap },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-black/5 bg-[#FAF8F5]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-hero text-lg text-white shadow-card">🏪</span>
            <span className="text-base font-bold tracking-tight sm:text-lg">Stoke Yange</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-full border bg-white p-0.5 shadow-sm" aria-label={t.lang}>
              <button
                type="button"
                onClick={() => setLang("en")}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors",
                  lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang("rw")}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors",
                  lang === "rw" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                RW
              </button>
            </div>
            {!installed && deferred && (
              <button
                type="button"
                onClick={install}
                disabled={busy}
                className="hidden h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground sm:inline-flex"
              >
                <Download className="size-3.5" />
                {busy ? t.installing : t.install}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="text-center lg:text-left">
            <p className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Shield className="size-3.5" />
              {t.badge}
            </p>
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl lg:text-[2.75rem]">
              {t.heroTitle}
            </h1>
            <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground sm:text-lg lg:mx-0">
              {t.heroSub}
            </p>
            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center lg:justify-start">
              {installed ? (
                <Link
                  to="/"
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-bold text-primary-foreground shadow-card"
                >
                  <Smartphone className="size-5" />
                  {t.open}
                </Link>
              ) : deferred ? (
                <button
                  type="button"
                  onClick={install}
                  disabled={busy}
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-bold text-primary-foreground shadow-card disabled:opacity-70"
                >
                  <Download className="size-5" />
                  {busy ? t.installing : t.install}
                </button>
              ) : (
                <Link
                  to="/"
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-bold text-primary-foreground shadow-card"
                >
                  <Smartphone className="size-5" />
                  {t.open}
                </Link>
              )}
              <Link
                to="/"
                className="inline-flex h-13 items-center justify-center rounded-full border border-black/10 bg-white px-8 text-base font-semibold text-foreground shadow-sm"
              >
                {t.open}
              </Link>
            </div>
            {isIos && !installed && (
              <p className="mt-4 text-xs text-muted-foreground">{t.iosHint}</p>
            )}
            {!deferred && !installed && !isIos && (
              <p className="mt-3 text-xs text-muted-foreground">
                {lang === "en"
                  ? "Open in Chrome or Edge on Android to install."
                  : "Fungura muri Chrome cyangwa Edge kuri Android kugira ngo ushyire."}
              </p>
            )}
          </div>

          {/* Phone mock */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-orange-200/60 via-amber-100/40 to-transparent blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-black/5 bg-white p-3 shadow-2xl shadow-orange-900/10">
              <div className="overflow-hidden rounded-[1.5rem] bg-hero p-5 text-white">
                <p className="text-xs font-medium opacity-90">{lang === "en" ? "Today's cash" : "Amafaranga y'uyu munsi"}</p>
                <p className="mt-1 text-3xl font-bold tabular-nums">12,500 RWF</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-white/15 p-3">
                    <p className="text-[10px] opacity-90">{lang === "en" ? "Stock value" : "Agaciro k'ububiko"}</p>
                    <p className="font-bold tabular-nums">84,000</p>
                  </div>
                  <div className="rounded-2xl bg-white/15 p-3">
                    <p className="text-[10px] opacity-90">{lang === "en" ? "Credit today" : "Amadeni"}</p>
                    <p className="font-bold tabular-nums">3,200</p>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 p-1">
                {["🥛 Milk", "🍺 Primus", "🍚 Sugar", "🧼 Soap"].map((x) => (
                  <div key={x} className="rounded-2xl border border-black/5 bg-[#FAF8F5] p-3">
                    <p className="text-2xl">{x.split(" ")[0]}</p>
                    <p className="mt-1 truncate text-xs font-semibold">{x.split(" ").slice(1).join(" ")}</p>
                    <p className="mt-0.5 text-sm font-bold text-primary">500 RWF</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-black/5 bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.featuresTitle}</h2>
            <p className="mt-2 text-muted-foreground">{t.featuresSub}</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, body, tone }) => (
              <article
                key={title}
                className="group rounded-3xl border border-black/5 bg-[#FAF8F5] p-5 transition-shadow hover:shadow-card"
              >
                <div className={cn("mb-4 grid size-12 place-items-center rounded-2xl", tone)}>
                  <Icon className="size-6" strokeWidth={2} />
                </div>
                <h3 className="text-base font-bold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Offline band */}
      <section className="bg-ink py-12 text-ink-foreground sm:py-14">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 text-center sm:flex-row sm:px-6 sm:text-left">
          <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/10">
            <WifiOff className="size-7" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{t.offlineTitle}</h2>
            <p className="mt-1 text-sm text-white/70 sm:text-base">{t.offlineBody}</p>
          </div>
          <Languages className="hidden size-10 opacity-30 sm:block" />
        </div>
      </section>

      {/* How it works */}
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.howTitle}</h2>
            <p className="mt-2 text-muted-foreground">{t.howSub}</p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {steps.map(({ n, title, body, icon: Icon }) => (
              <div key={n} className="relative rounded-3xl border border-black/5 bg-white p-6 text-center shadow-sm">
                <span className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {n}
                </span>
                <Icon className="mx-auto mb-3 size-6 text-primary" />
                <h3 className="font-bold">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-black/5 bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-lg px-4 text-center sm:px-6">
          <div className="mx-auto mb-5 grid size-16 place-items-center rounded-3xl bg-hero text-3xl text-white shadow-card">🏪</div>
          <h2 className="text-2xl font-bold tracking-tight">{t.ctaTitle}</h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">{t.ctaSub}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {deferred && !installed ? (
              <button
                type="button"
                onClick={install}
                disabled={busy}
                className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-bold text-primary-foreground"
              >
                <Download className="size-5" />
                {busy ? t.installing : t.install}
              </button>
            ) : (
              <Link
                to="/"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-bold text-primary-foreground"
              >
                <Smartphone className="size-5" />
                {t.open}
              </Link>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-black/5 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 text-center text-xs text-muted-foreground sm:flex-row sm:px-6 sm:text-left">
          <p>{t.footer}</p>
          <p>
            {t.contact}:{" "}
            <a href="tel:0796919900" className="font-medium text-primary underline-offset-2 hover:underline">
              0796919900
            </a>
            {" · "}
            <a href="https://wa.me/250796919900" target="_blank" rel="noreferrer" className="font-medium text-primary underline-offset-2 hover:underline">
              WhatsApp
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
