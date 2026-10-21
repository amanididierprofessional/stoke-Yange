import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Download, FileCheck2, Settings2, ShieldCheck, Smartphone } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/install-android")({
  head: () => ({
    meta: [
      { title: "Uko washyiramo Stoke Yange kuri Android | Install guide" },
      { name: "description", content: "Uko umanura kandi ugashyiramo Stoke Yange kuri Android, mu Kinyarwanda no mu Cyongereza." },
    ],
  }),
  component: AndroidInstallGuide,
});

const APK_URL = "https://github.com/amanididierprofessional/stoke-Yange/releases/download/android-latest/stoke-yange.apk";

type Lang = "rw" | "en";
const content = {
  rw: {
    back: "Subira ku rubuga", subtitle: "Ubufasha bwo gushyiramo application",
    eyebrow: "ANDROID · INTAMBWE 4", title: "Manura, hanyuma ushyiremo Stoke Yange",
    intro: "Kanda buto yo kumanura. Dosiye izatangira kumanuka; urupapuro ruzaguma rugaragaza intambwe zo kuyishyiramo.",
    download: "Downloadinga application", file: "Dosiye: stoke-yange.apk",
    safetyTitle: "Umutekano wawe", safety: "Emera gusa dosiye ya Stoke Yange wakuye kuri iyi link yemewe. Ntuzimye Play Protect.",
    steps: [
      { title: "Manura application", body: "Kanda “Manura app ubu” hejuru. Tegereza kugeza download irangiye.", screen: "stoke-yange.apk", hint: "Reba ikimenyetso cya download muri Chrome cyangwa mu butumwa bwa telefone.", visual: "download" },
      { title: "Fungura dosiye yamanutse", body: "Kanda kuri dosiye imaze kumanuka. Niba utayibona, fungura Files / My Files → Downloads.", screen: "Downloads", hint: "Hitamo stoke-yange.apk.", visual: "file" },
      { title: "Emera installation niba telefone ibigusabye", body: "Niba hagaragaye ubutumwa bwo kubuza installation, kanda Settings hanyuma wemere “Allow from this source” kuri browser wakoresheje.", screen: "Allow from this source", hint: "Ibi byemerera browser gusa. Amazina ashobora gutandukana kuri telefone.", visual: "settings" },
      { title: "Kanda Install, hanyuma Open", body: "Subira kuri dosiye ya Stoke Yange niba bikenewe, uyifungure, ukande Install. Iyo irangiye, kanda Open.", screen: "Install  →  Open", hint: "Niba buto ya Install itagaragara, reba niba download yarangiye.", visual: "install" },
    ],
    helpTitle: "Biracyanga?", help: "Niba ubonye “App not installed”, banza urebe ko download yarangiye neza. Niba hari verisiyo ishaje irimo amakuru utarabika, ntuyisibe utarabona ubufasha.",
    whatsapp: "Saba ubufasha kuri WhatsApp", footer: "Stoke Yange · Yagenewe iduka ryawe",
  },
  en: {
    back: "Back to website", subtitle: "App installation help",
    eyebrow: "ANDROID · 4 STEPS", title: "Download, then install Stoke Yange",
    intro: "Tap the download button. The APK will start downloading, and this page will stay available with clear installation steps.",
    download: "Download the app now", file: "File: stoke-yange.apk",
    safetyTitle: "Stay safe", safety: "Only install the Stoke Yange file from this official link. Do not turn off Play Protect.",
    steps: [
      { title: "Download the app", body: "Tap “Download the app now” above. Wait until the download finishes.", screen: "stoke-yange.apk", hint: "Look for the download icon in Chrome or your phone's notifications.", visual: "download" },
      { title: "Open the downloaded file", body: "Tap the downloaded file. If you cannot find it, open Files / My Files → Downloads.", screen: "Downloads", hint: "Choose stoke-yange.apk.", visual: "file" },
      { title: "Allow installation if prompted", body: "If Android blocks installation, tap Settings and allow “Install unknown apps” or “Allow from this source” for the browser you used.", screen: "Allow from this source", hint: "This permission applies to that browser only. Wording varies by phone.", visual: "settings" },
      { title: "Tap Install, then Open", body: "Return to the Stoke Yange file if needed, open it, and tap Install. When it finishes, tap Open.", screen: "Install  →  Open", hint: "If Install is unavailable, check that the download has finished.", visual: "install" },
    ],
    helpTitle: "Still having trouble?", help: "If you see “App not installed”, first check that the download finished. If an older version contains data you have not backed up, do not uninstall it before getting help.",
    whatsapp: "Get help on WhatsApp", footer: "Stoke Yange · Made for your shop",
  },
} as const;

function StepVisual({ kind, lang }: { kind: string; lang: Lang }) {
  const label = lang === "rw";
  return (
    <div className="mx-auto w-full max-w-[230px] rounded-[1.8rem] border-[5px] border-slate-800 bg-slate-900 p-2 shadow-xl">
      <div className="overflow-hidden rounded-[1.25rem] bg-white">
        <div className="flex h-5 items-center justify-center bg-slate-100"><div className="h-1 w-12 rounded-full bg-slate-300" /></div>
        {kind === "download" && <div className="p-4 text-center"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-orange-100 text-orange-600"><Download className="size-7" /></div><p className="mt-3 text-sm font-bold text-slate-900">Stoke Yange</p><p className="mt-1 break-all text-[10px] text-slate-500">stoke-yange.apk</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-full rounded-full bg-orange-500" /></div><p className="mt-2 text-[10px] font-semibold text-emerald-700">{label ? "Dosiye irimo kumanuka" : "File downloading"}</p></div>}
        {kind === "file" && <div className="p-3"><p className="text-xs font-bold text-slate-900">{label ? "Downloads" : "Downloads"}</p><div className="mt-3 flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 p-2"><div className="grid size-9 place-items-center rounded-lg bg-orange-100 text-orange-600"><FileCheck2 className="size-5" /></div><div className="min-w-0"><p className="break-all text-[9px] font-bold text-slate-900">stoke-yange.apk</p><p className="text-[9px] text-slate-500">APK · Stoke Yange</p></div><CheckCircle2 className="size-4 shrink-0 text-emerald-600" /></div><p className="mt-3 text-center text-[9px] text-slate-500">{label ? "Kanda kuri dosiye" : "Tap the file"}</p></div>}
        {kind === "settings" && <div className="p-3"><p className="text-xs font-bold text-slate-900">{label ? "Shyiramo app" : "Install app"}</p><p className="mt-1 text-[9px] text-slate-500">{label ? "Browser" : "Browser"}</p><div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-2"><p className="text-[9px] font-bold text-slate-800">Allow from this source</p><div className="mt-2 flex justify-end"><div className="h-5 w-9 rounded-full bg-emerald-600 p-0.5"><div className="ml-auto size-4 rounded-full bg-white" /></div></div></div><p className="mt-2 text-[9px] text-slate-500">{label ? "Emerera gusa niba ari wowe watangije download." : "Only allow if you started this download."}</p></div>}
        {kind === "install" && <div className="p-3 text-center"><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-orange-100 text-orange-600"><Smartphone className="size-6" /></div><p className="mt-2 text-xs font-bold text-slate-900">Stoke Yange</p><p className="mt-1 text-[9px] text-slate-500">{label ? "Urashaka gushyiramo iyi app?" : "Install this application?"}</p><div className="mt-3 flex justify-center gap-2"><span className="rounded-full bg-slate-100 px-3 py-1 text-[9px] font-semibold text-slate-600">{label ? "Hagarika" : "Cancel"}</span><span className="rounded-full bg-orange-500 px-3 py-1 text-[9px] font-bold text-white">Install</span></div></div>}
      </div>
    </div>
  );
}

function AndroidInstallGuide() {
  const [lang, setLang] = useState<Lang>("rw");
  const t = content[lang];
  useEffect(() => {
    const saved = localStorage.getItem("sy-lang");
    if (saved === "en") setLang("en");
  }, []);
  const download = () => {
    // GitHub release assets are cross-origin; the HTML download attribute is
    // not reliable there. Navigate directly to the official asset endpoint.
    // Keep this page open in history so users can return to the install guide.
    window.location.assign(APK_URL);
  };

  return (
    <main className="min-h-screen bg-[#FAF8F5] text-foreground">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4 sm:px-6">
          <BrandLogo className="size-10 rounded-xl" />
          <div className="min-w-0 flex-1"><p className="font-bold">Stoke Yange</p><p className="text-xs text-muted-foreground">{t.subtitle}</p></div>
          <div className="flex rounded-full border bg-slate-50 p-1 text-xs font-bold">
            <button onClick={() => { setLang("rw"); localStorage.setItem("sy-lang", "rw"); }} className={lang === "rw" ? "rounded-full bg-orange-500 px-3 py-1.5 text-white" : "px-3 py-1.5 text-slate-600"}>RW</button>
            <button onClick={() => { setLang("en"); localStorage.setItem("sy-lang", "en"); }} className={lang === "en" ? "rounded-full bg-orange-500 px-3 py-1.5 text-white" : "px-3 py-1.5 text-slate-600"}>EN</button>
          </div>
          <Link to="/welcome" className="hidden items-center gap-1 rounded-full border px-3 py-2 text-sm font-semibold sm:inline-flex"><ArrowLeft className="size-4" />{t.back}</Link>
        </div>
      </header>
      <section className="mx-auto max-w-4xl px-4 pb-12 pt-7 sm:px-6 sm:pt-10">
        <div className="rounded-[2rem] bg-[#172554] p-6 text-white sm:p-9">
          <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-white/10"><Smartphone className="size-6" /></div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-200">{t.eyebrow}</p>
          <h1 className="mt-2 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">{t.title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">{t.intro}</p>
          <button onClick={download} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-orange-500 px-5 py-3 font-bold text-white shadow-lg transition hover:bg-orange-600 sm:w-auto"><Download className="size-5" />{t.download}</button>
          <p className="mt-3 text-xs text-white/65">{t.file}</p>
        </div>
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><ShieldCheck className="mt-0.5 size-5 shrink-0" /><p><strong>{t.safetyTitle}:</strong> {t.safety}</p></div>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {t.steps.map((step, index) => (
            <article key={step.title} className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
              <div className="p-5 sm:p-6">
                <p className="text-xs font-bold uppercase tracking-wider text-orange-700">{lang === "rw" ? "Intambwe" : "Step"} {index + 1}</p>
                <h2 className="mt-1 text-lg font-bold">{step.title}</h2>
                <p className="mt-2 min-h-[4.5rem] text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                <div className="my-5 rounded-2xl bg-[#F4F2EF] px-3 py-4"><StepVisual kind={step.visual} lang={lang} /></div>
                <p className="text-sm font-bold">{step.screen}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.hint}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-6 rounded-3xl border border-black/5 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-bold">{t.helpTitle}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.help}</p>
          <a href="https://wa.me/250796919900?text=Mwaramutse%2C%20ndashaka%20ubufasha%20bwo%20gushyiramo%20Stoke%20Yange." target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-[#128C7E] px-5 py-3 text-sm font-bold text-white">{t.whatsapp}</a>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">{t.footer}</p>
      </section>
    </main>
  );
}
