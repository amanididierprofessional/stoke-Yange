import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Cloud,
  CreditCard,
  Download,
  History,
  Languages,
  Package,
  ShoppingBag,
  Smartphone,
  WifiOff,
  Zap,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { enterAppMode, isStandalone, preferApp } from "@/lib/app-mode";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Stoke Yange — Your shop, on your phone" },
      {
        name: "description",
        content:
          "Built for small shops and big ones. Works both online and offline. Free to install.",
      },
      { property: "og:title", content: "Stoke Yange — Your shop, on your phone" },
      {
        property: "og:description",
        content: "Built for small shops and big ones. Works both online and offline.",
      },
    ],
  }),
  component: WelcomePage,
});

type Lang = "en" | "rw";

const copy = {
  en: {
    heroTitle: "Your shop, on your phone",
    heroSub: "Built for small shops and big ones.",
    heroSub2: "Works both online and offline.",
    install: "Install app",
    open: "Open app",
    installing: "Installing…",
    iosHint: "On iPhone: Share → Add to Home Screen",
    androidHint: "Download the Android app directly. Open the downloaded file to install it.",
    desktopHint: "Tap Install, or use Chrome menu → Install app",
    androidDownload: "Download Android app",
    featuresTitle: "Everything your shop needs",
    featuresSub: "Short tools. Clear numbers. No clutter.",
    howTitle: "How it works",
    howSub: "Three steps. Ready in minutes.",
    ctaTitle: "Start free today",
    ctaSub: "Install once. Your shop data stays on your phone and syncs when online.",
    footer: "Stoke Yange · Made for your shop",
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
    s1d: "Add Stoke Yange to your phone.",
    s2t: "Add products",
    s2d: "Use quick defaults or type your own.",
    s3t: "Start selling",
    s3d: "Cash today. Credit tracked for you.",
    offlineTitle: "No internet? No problem.",
    offlineBody: "Sales and stock save on your phone. When you connect, they go to the cloud automatically.",
    lang: "Language",
  },
  rw: {
    heroTitle: "Iduka ryawe, kuri telefone",
    heroSub: "Yagenewe amaduka mato ndetse n'amanini.",
    heroSub2: "Ikora iyo ufite murandasi n'iyo utayifite.",
    install: "Shyiramo app",
    open: "Fungura app",
    installing: "Birimo…",
    iosHint: "Kuri iPhone: Share → Add to Home Screen",
    androidHint: "Manura application ya Android. Fungura dosiye umaze kuyimanura kugira ngo uyishyiremo.",
    desktopHint: "Kanda Shyiramo, cyangwa menu ya Chrome → Install app",
    androidDownload: "Manura application ya Android",
    featuresTitle: "Ibyo iduka ryawe rikeneye",
    featuresSub: "Ibikoresho byoroshye. Imibare isobanutse.",
    howTitle: "Uko bikora",
    howSub: "Intambwe eshatu. Umererwa neza vuba.",
    ctaTitle: "Tangira ubu k'ubuntu",
    ctaSub:
      "Shyiramo application rimwe maze amakuru y'iduka abikwe kuri telefone yawe kandi ajya kuri cloud iyo ufite murandasi.",
    footer: "Stoke Yange · Yagenewe iduka ryawe",
    contact: "Ubufasha",
    f1t: "Gurisha byihuse",
    f1d: "Kanda igicuruzwa, ugurishe hakoreshejwe amafaranga cyangwa ideni.",
    f2t: "Ububiko ufite ubu",
    f2d: "Menya ibisigaye mbere yo kugurisha.",
    f3t: "Igitabo cy'amadeni",
    f3d: "Abakurimo ideni n'abakuranguje ku ideni.",
    f4t: "Nta murandasi",
    f4d: "Nta network? Komeza ugurishe. Ohereza nyuma.",
    f5t: "Amateka y'igurisha",
    f5d: "Igurishwa ryose rirabikwa ukaba wanarisib iyo wibeshye.",
    f6t: "Kopi kuri cloud",
    f6d: "Iyandikishe rimwe, amakuru y'iduka ryawe ube wayabona aho uri hose.",
    s1t: "Shyiramo",
    s1d: "Ongeraho Stoke Yange kuri phone.",
    s2t: "Ongeraho ibicuruzwa",
    s2d: "Koresha ibisanzwe cyangwa wandike ibyawe.",
    s3t: "Tangira kugurisha",
    s3d: "Amafaranga uyu munsi. Amadeni arakurikirwa.",
    offlineTitle: "Nta murandasi? Nta kibazo.",
    offlineBody: "Igurisha n'ububiko bibikwa kuri telefone. Iyo uhujwe, bijya kuri cloud automatic.",
    lang: "Ururimi",
  },
} as const;

const ANDROID_APK_URL = "https://github.com/amanididierprofessional/stoke-Yange/releases/download/android-latest/stoke-yange.apk";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function WelcomePage() {
  const navigate = useNavigate();
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
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      enterAppMode();
      navigate({ to: "/", replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    localStorage.setItem("sy-lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const hasApp = isStandalone() || preferApp();
    setInstalled(hasApp);
    const ua = navigator.userAgent;
    setIsAndroid(/Android/i.test(ua));
    setIsIos(/iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream);

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => {
      enterAppMode();
      setInstalled(true);
      navigate({ to: "/", replace: true });
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [navigate]);

  const goApp = () => {
    enterAppMode();
    navigate({ to: "/" });
  };

  const install = async () => {
    if (deferred) {
      setBusy(true);
      try {
        await deferred.prompt();
        const { outcome } = await deferred.userChoice;
        if (outcome === "accepted") {
          enterAppMode();
          setInstalled(true);
          navigate({ to: "/", replace: true });
        }
        setDeferred(null);
      } finally {
        setBusy(false);
      }
      return;
    }
    goApp();
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

  const showOpen = installed;

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-foreground">
      <header className="sticky top-0 z-40 border-b border-black/5 bg-[#FAF8F5]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4 sm:h-16 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandLogo className="size-9 rounded-xl" />
            <span className="truncate text-base font-bold tracking-tight sm:text-lg">Stoke Yange</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
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
            {isAndroid && !isStandalone() ? (
              <a href={ANDROID_APK_URL} download="stoke-yange.apk" className="hidden h-9 max-w-[12rem] items-center gap-1 truncate rounded-full bg-primary px-3 text-[11px] font-bold text-primary-foreground sm:inline-flex">
                <Download className="size-3.5 shrink-0" />
                <span className="truncate">{t.androidDownload}</span>
              </a>
            ) : (
              <button type="button" onClick={showOpen ? goApp : install} disabled={busy} className="hidden h-9 max-w-[9.5rem] items-center gap-1 truncate rounded-full bg-primary px-3 text-[11px] font-bold text-primary-foreground sm:inline-flex">
                {showOpen ? <Smartphone className="size-3.5 shrink-0" /> : <Download className="size-3.5 shrink-0" />}
                <span className="truncate">{busy ? t.installing : showOpen ? t.open : t.install}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="text-center lg:text-left">
            <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl lg:text-[2.5rem]">
              {t.heroTitle}
            </h1>
            <div className="mx-auto mt-4 max-w-md space-y-1 text-pretty text-base leading-snug text-muted-foreground sm:text-lg lg:mx-0">
              <p>{t.heroSub}</p>
              <p>{t.heroSub2}</p>
            </div>

            <div className="mt-8 flex justify-center lg:justify-start">
              {isAndroid && !isStandalone() ? (
                <a href={ANDROID_APK_URL} download="stoke-yange.apk" className="inline-flex min-h-13 w-full max-w-xs items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-base font-bold leading-tight text-primary-foreground shadow-card sm:w-auto sm:min-w-[12rem]">
                  <Download className="size-5 shrink-0" /><span className="text-center">{t.androidDownload}</span>
                </a>
              ) : (
                <button type="button" onClick={showOpen ? goApp : install} disabled={busy} className="inline-flex min-h-13 w-full max-w-xs items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-base font-bold leading-tight text-primary-foreground shadow-card disabled:opacity-70 sm:w-auto sm:min-w-[12rem]">
                  {showOpen ? <Smartphone className="size-5 shrink-0" /> : <Download className="size-5 shrink-0" />}
                  <span className="text-center">{busy ? t.installing : showOpen ? t.open : t.install}</span>
                </button>
              )}
            </div>

            {!showOpen && isIos && <p className="mt-4 text-pretty text-xs leading-snug text-muted-foreground">{t.iosHint}</p>}
            {!showOpen && !isIos && !deferred && (
              <p className="mt-3 text-pretty text-xs leading-snug text-muted-foreground">{isAndroid ? t.androidHint : t.desktopHint}</p>
            )}
          </div>

          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-orange-200/60 via-amber-100/40 to-transparent blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-black/5 bg-white p-3 shadow-2xl shadow-orange-900/10">
              <div className="overflow-hidden rounded-[1.5rem] bg-hero p-5 text-white">
                <p className="text-xs font-medium opacity-90">{lang === "en" ? "Today's cash" : "Amafaranga y'uyu munsi"}</p>
                <p className="mt-1 text-3xl font-bold tabular-nums">12,500 RWF</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-white/15 p-3">
                    <p className="text-[10px] leading-tight opacity-90">{lang === "en" ? "Stock value" : "Agaciro k'ububiko"}</p>
                    <p className="font-bold tabular-nums">84,000</p>
                  </div>
                  <div className="rounded-2xl bg-white/15 p-3">
                    <p className="text-[10px] leading-tight opacity-90">{lang === "en" ? "Credit today" : "Amadeni"}</p>
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

      <section className="border-t border-black/5 bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">{t.featuresTitle}</h2>
            <p className="mt-2 text-pretty text-muted-foreground">{t.featuresSub}</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, body, tone }) => (
              <article key={title} className="rounded-3xl border border-black/5 bg-[#FAF8F5] p-5 transition-shadow hover:shadow-card">
                <div className={cn("mb-4 grid size-12 place-items-center rounded-2xl", tone)}>
                  <Icon className="size-6" strokeWidth={2} />
                </div>
                <h3 className="text-balance text-base font-bold leading-snug">{title}</h3>
                <p className="mt-1.5 text-pretty text-sm leading-relaxed text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink py-12 text-ink-foreground sm:py-14">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 text-center sm:flex-row sm:px-6 sm:text-left">
          <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/10">
            <WifiOff className="size-7" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-balance text-xl font-bold">{t.offlineTitle}</h2>
            <p className="mt-1 text-pretty text-sm text-white/70 sm:text-base">{t.offlineBody}</p>
          </div>
          <Languages className="hidden size-10 shrink-0 opacity-30 sm:block" />
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">{t.howTitle}</h2>
            <p className="mt-2 text-pretty text-muted-foreground">{t.howSub}</p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {steps.map(({ n, title, body, icon: Icon }) => (
              <div key={n} className="rounded-3xl border border-black/5 bg-white p-6 text-center shadow-sm">
                <span className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground">{n}</span>
                <Icon className="mx-auto mb-3 size-6 text-primary" />
                <h3 className="text-balance font-bold leading-snug">{title}</h3>
                <p className="mt-1.5 text-pretty text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-black/5 bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-lg px-4 text-center sm:px-6">
          <BrandLogo className="mx-auto mb-5 size-16 rounded-3xl" />
          <h2 className="text-balance text-2xl font-bold tracking-tight">{t.ctaTitle}</h2>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">{t.ctaSub}</p>
          <div className="mt-8 flex justify-center">
            {isAndroid && !isStandalone() ? (
              <a href={ANDROID_APK_URL} download="stoke-yange.apk" className="inline-flex min-h-13 w-full max-w-xs items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-base font-bold leading-tight text-primary-foreground sm:w-auto">
                <Download className="size-5 shrink-0" /><span>{t.androidDownload}</span>
              </a>
            ) : (
              <button type="button" onClick={showOpen ? goApp : install} disabled={busy} className="inline-flex min-h-13 w-full max-w-xs items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-base font-bold leading-tight text-primary-foreground sm:w-auto">
                {showOpen ? <Smartphone className="size-5 shrink-0" /> : <Download className="size-5 shrink-0" />}
                <span>{busy ? t.installing : showOpen ? t.open : t.install}</span>
              </button>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-black/5 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 text-center text-xs text-muted-foreground sm:flex-row sm:px-6 sm:text-left">
          <p className="text-pretty">{t.footer}</p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end" aria-label={t.contact}>
            <span className="mr-1 font-medium">{t.contact}:</span>
            <a
              href="tel:0796919900"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-4 py-2 font-semibold text-primary shadow-sm transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Smartphone className="size-4" />
              Call support
            </a>
            <a
              href="https://wa.me/250796919900"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#128C7E] px-4 py-2 font-semibold text-white shadow-sm transition-colors hover:bg-[#0E766B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#128C7E] focus-visible:ring-offset-2"
            >
              <span aria-hidden="true" className="text-base">◉</span>
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
