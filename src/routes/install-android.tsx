import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Download, FileCheck2, Settings2, ShieldCheck, Smartphone } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/install-android")({
  head: () => ({
    meta: [
      { title: "Uko washyiramo Stoke Yange kuri Android" },
      { name: "description", content: "Intambwe zoroshye zo gushyira Stoke Yange kuri telefone ya Android." },
    ],
  }),
  component: AndroidInstallGuide,
});

const steps = [
  {
    n: "1",
    title: "Manura Stoke Yange",
    body: "Kanda kuri buto iri hasi yitwa “Manura application”. Tegereza ko dosiye stoke-yange.apk irangira kumanuka.",
    icon: Download,
    screen: "stoke-yange.apk",
    hint: "Reba akamenyetso ka download kuri browser yawe.",
  },
  {
    n: "2",
    title: "Fungura dosiye wamanuyе",
    body: "Kanda kuri dosiye stoke-yange.apk. Niba utayibona, fungura Files cyangwa My Files → Downloads, ushake iyo dosiye.",
    icon: FileCheck2,
    screen: "Downloads",
    hint: "Hitamo dosiye ya Stoke Yange gusa.",
  },
  {
    n: "3",
    title: "Emera kwinjiza app ivuye muri browser",
    body: "Niba telefone ivuze ko itemerewe gushyiramo app ivuye aha, kanda Settings ku butumwa bugaragaye, hanyuma ufungure “Allow from this source” cyangwa “Install unknown apps” kuri browser wakoresheje.",
    icon: Settings2,
    screen: "Allow from this source",
    hint: "Amazina ashobora gutandukana bitewe na telefone. Ibi byemerera iyo browser gusa.",
  },
  {
    n: "4",
    title: "Subira inyuma ukande Install",
    body: "Subira kuri dosiye ya Stoke Yange, wongere uyifungure niba bikenewe, hanyuma ukande Install. Tegereza irangire, maze ukande Open.",
    icon: CheckCircle2,
    screen: "Install · Open",
    hint: "Ntukeneye guhindura izindi settings.",
  },
];

function AndroidInstallGuide() {
  return (
    <main className="min-h-screen bg-[#FAF8F5] text-foreground">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 sm:px-6">
          <BrandLogo className="size-10 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="font-bold">Stoke Yange</p>
            <p className="text-xs text-muted-foreground">Ubufasha bwo gushyiramo application</p>
          </div>
          <Link to="/welcome" className="inline-flex items-center gap-1 rounded-full border px-3 py-2 text-sm font-semibold">
            <ArrowLeft className="size-4" /> Subira
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 pb-12 pt-8 sm:px-6 sm:pt-12">
        <div className="rounded-3xl bg-[#172554] p-6 text-white sm:p-8">
          <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-white/10">
            <Smartphone className="size-6" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-200">Android · Intambwe 4</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">Uko washyiramo Stoke Yange</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
            Kurikiza izi ntambwe uko zikurikirana. Ubutumwa bwo kwemerera installation bushobora gutandukana bitewe n'ubwoko bwa telefone.
          </p>
          <a href="https://github.com/amanididierprofessional/stoke-Yange/releases/download/android-latest/stoke-yange.apk"
             className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-orange-500 px-5 py-3 font-bold text-white shadow-lg transition hover:bg-orange-600 sm:w-auto">
            <Download className="size-5" /> Manura application ya Stoke Yange
          </a>
          <p className="mt-3 text-xs text-white/65">Dosiye: stoke-yange.apk · Manura kuri internet yizewe.</p>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <ShieldCheck className="mt-0.5 size-5 shrink-0" />
          <p><strong>Umutekano:</strong> Emerera gusa dosiye ya Stoke Yange wamanuriye ku rubuga rwacu. Ntuzimye Play Protect kandi ntugire izindi porogaramu z'umutekano uhagarika.</p>
        </div>

        <div className="mt-8 space-y-4">
          {steps.map(({ n, title, body, icon: Icon, screen, hint }) => (
            <article key={n} className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
              <div className="flex gap-4 p-5 sm:p-6">
                <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-orange-50 text-orange-700">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-orange-700">Intambwe {n}</p>
                  <h2 className="mt-1 text-lg font-bold">{title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                  <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#F5F5F4] p-3">
                    <div className="grid size-12 shrink-0 place-items-center rounded-xl border border-black/10 bg-white shadow-sm">
                      <Icon className="size-6 text-slate-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="break-words text-sm font-bold">{screen}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{hint}</p>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-3xl border border-black/5 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-bold">Niba bitarakunze</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Niba handitse “App not installed”, banza urebe ko download yarangiye neza. Niba hari verisiyo ya kera yashyizwemo, ntuyisibe niba irimo amakuru utarabika cyangwa utarahuje; tubwire kugira ngo tugufashe.
          </p>
          <a href="https://wa.me/250796919900?text=Mwaramutse%2C%20ndashaka%20ubufasha%20bwo%20gushyiramo%20Stoke%20Yange."
             target="_blank" rel="noreferrer"
             className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-[#128C7E] px-5 py-3 text-sm font-bold text-white">
            Tubwire kuri WhatsApp
          </a>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">Stoke Yange · Yagenewe iduka ryawe</p>
      </section>
    </main>
  );
}
