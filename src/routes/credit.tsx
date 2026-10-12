import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { ChevronDown, MessageCircle, MessageSquare, Plus } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { db, type Party, type PartyKind } from "@/lib/db";
import { addDebt, addParty, fmt, recordPayment } from "@/lib/actions";
import { reminderText, useI18n } from "@/lib/i18n";
import { useShopName } from "@/components/AppShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/credit")({
  head: () => ({
    meta: [
      { title: "Credit (Amadeni) — Stoke Yange" },
      { name: "description", content: "Track who owes you and which suppliers you owe." },
      { property: "og:title", content: "Credit — Stoke Yange" },
      { property: "og:description", content: "Track who owes you and which suppliers you owe." },
    ],
  }),
  component: CreditPage,
});

const DAY = 86400000;
const when = (ts: number) => new Date(ts).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

function CreditPage() {
  const { t, lang } = useI18n();
  const shop = useShopName();
  const [kind, setKind] = useState<PartyKind>("customer");
  const [openId, setOpenId] = useState<number | null>(null);
  const [payFor, setPayFor] = useState<Party | null>(null);
  const [adding, setAdding] = useState(false);

  const data = useLiveQuery(async () => {
    const parties = await db.parties.where("kind").equals(kind).toArray();
    const debts = await db.debts.toArray();
    const pays = await db.payments.toArray();
    return parties
      .map((p) => {
        const d = debts.filter((x) => x.partyId === p.id).sort((a, b) => a.createdAt - b.createdAt);
        const py = pays.filter((x) => x.partyId === p.id).sort((a, b) => b.createdAt - a.createdAt);
        const balance = d.reduce((a, x) => a + x.amount, 0) - py.reduce((a, x) => a + x.amount, 0);
        const oldest = d[0];
        const overdue = !!oldest && balance > 0 && Date.now() - oldest.createdAt > (oldest.dueDays ?? 7) * DAY;
        return { p, debts: d, pays: py, balance, oldest: oldest?.createdAt ?? p.createdAt, overdue };
      })
      .filter((r) => r.balance > 0 || r.debts.length === 0)
      .sort((a, b) => a.oldest - b.oldest);
  }, [kind]) ?? [];

  const total = data.reduce((a, r) => a + r.balance, 0);

  const remind = (r: (typeof data)[number], via: "wa" | "sms") => {
    const msg = encodeURIComponent(reminderText(lang, r.p.name, fmt(r.balance), shop));
    const phone = r.p.phone.replace(/\D/g, "").replace(/^0/, "250");
    window.open(via === "wa" ? `https://wa.me/${phone}?text=${msg}` : `sms:+${phone}?body=${msg}`, "_blank");
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{t("credit")}</h2>
      <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
        {(["customer", "supplier"] as const).map((k) => (
          <button key={k} onClick={() => setKind(k)} className={cn("h-11 rounded-full px-2 text-xs font-semibold leading-tight", kind === k ? "bg-card text-primary shadow-card" : "text-muted-foreground")}>
            {k === "customer" ? t("owesMe") : t("iOwe")}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between rounded-2xl bg-ink p-4 text-ink-foreground">
        <div>
          <p className="text-xs opacity-70">{t("total")}</p>
          <p className="text-2xl font-bold tabular-nums">{fmt(total)}</p>
        </div>
        <button onClick={() => setAdding(true)} className="flex h-10 items-center gap-1 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">
          <Plus className="size-4" /> {t("addParty")}
        </button>
      </div>

      <ul className="space-y-2">
        {data.map((r) => {
          const open = openId === r.p.id;
          return (
            <li key={r.p.id} className="rounded-2xl bg-card p-3 shadow-card">
              <button className="flex w-full items-center gap-3 text-left" onClick={() => setOpenId(open ? null : r.p.id!)}>
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent font-bold text-accent-foreground">{r.p.name[0]}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r.p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.p.phone} · {Math.floor((Date.now() - r.oldest) / DAY)} {t("days")}
                    {r.overdue && <span className="ml-1 rounded-full bg-destructive/10 px-2 font-semibold text-destructive">{t("overdue")}</span>}
                  </p>
                </div>
                <span className="font-bold tabular-nums text-primary">{fmt(r.balance)}</span>
                <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
              </button>
              {open && (
                <div className="mt-3 space-y-3 border-t pt-3">
                  <ul className="space-y-1 text-sm">
                    {r.debts.map((d) => (
                      <li key={d.id} className="flex justify-between gap-2">
                        <span><span className="block">{d.description}</span><span className="text-xs text-muted-foreground">{when(d.createdAt)} · {d.dueDays ?? 7} {t("days")}</span></span>
                        <span className="tabular-nums">{fmt(d.amount)}</span>
                      </li>
                    ))}
                  </ul>
                  {r.pays.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">{t("payments")}</p>
                      {r.pays.map((x) => (
                        <p key={x.id} className="flex justify-between text-sm text-success"><span>{when(x.createdAt)}</span><span>−{fmt(x.amount)}</span></p>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => setPayFor(r.p)} className="h-11 flex-1 rounded-full bg-primary text-sm font-semibold text-primary-foreground">{t("recordPayment")}</button>
                    {kind === "customer" && r.p.phone && (
                      <>
                        <button onClick={() => remind(r, "wa")} aria-label="WhatsApp" className="grid size-11 place-items-center rounded-full bg-success text-success-foreground"><MessageCircle className="size-5" /></button>
                        <button onClick={() => remind(r, "sms")} aria-label="SMS" className="grid size-11 place-items-center rounded-full border"><MessageSquare className="size-5" /></button>
                      </>
                    )}
                  </div>
                  <AddDebtInline partyId={r.p.id!} />
                </div>
              )}
            </li>
          );
        })}
        {data.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">{t("noItems")}</p>}
      </ul>

      <Drawer open={!!payFor} onOpenChange={(o) => !o && setPayFor(null)}>
        <DrawerContent className="mx-auto max-w-md">{payFor && <PayForm party={payFor} max={data.find((r) => r.p.id === payFor.id)?.balance ?? 0} onDone={() => setPayFor(null)} />}</DrawerContent>
      </Drawer>
      <Drawer open={adding} onOpenChange={setAdding}>
        <DrawerContent className="mx-auto max-w-md"><AddPartyForm kind={kind} onDone={() => setAdding(false)} /></DrawerContent>
      </Drawer>
    </div>
  );
}

function PayForm({ party, max, onDone }: { party: Party; max: number; onDone: () => void }) {
  const { t } = useI18n();
  const [amt, setAmt] = useState(String(max));
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const save = async () => {
    const n = Number(amt) || 0;
    if (n <= 0) return toast.error(t("amount"));
    const d = new Date(date);
    const now = new Date();
    d.setHours(now.getHours(), now.getMinutes());
    await recordPayment(party.id!, n, d.getTime());
    toast.success(`${t("recordPayment")}: ${fmt(n)}`);
    onDone();
  };
  return (
    <div>
      <DrawerHeader><DrawerTitle>{t("recordPayment")} — {party.name}</DrawerTitle></DrawerHeader>
      <div className="space-y-3 px-4 pb-6">
        <p className="text-sm text-muted-foreground">{t("balance")}: <b className="text-foreground">{fmt(max)}</b></p>
        <Input inputMode="numeric" value={amt} onChange={(e) => setAmt(e.target.value.replace(/\D/g, ""))} className="h-12 rounded-xl text-lg font-semibold" />
        <div className="flex gap-2">
          {[0.25, 0.5, 1].map((f) => (
            <button key={f} onClick={() => setAmt(String(Math.round(max * f)))} className="h-9 flex-1 rounded-full border text-sm">{f * 100}%</button>
          ))}
        </div>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 rounded-xl" />
        <button onClick={save} className="w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground">{t("save")}</button>
      </div>
    </div>
  );
}

function AddPartyForm({ kind, onDone }: { kind: PartyKind; onDone: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [desc, setDesc] = useState("");
  const [amt, setAmt] = useState("");
  const save = async () => {
    if (!name.trim()) return toast.error(t("name"));
    const id = await addParty(name, phone, kind);
    if (Number(amt) > 0) await addDebt(id, desc || "—", Number(amt));
    onDone();
  };
  return (
    <div>
      <DrawerHeader><DrawerTitle>{kind === "customer" ? t("customer") : t("supplier")}</DrawerTitle></DrawerHeader>
      <div className="space-y-2 px-4 pb-6">
        <Input placeholder={t("name")} value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" />
        <Input placeholder={t("phone")} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11 rounded-xl" />
        <Input placeholder={t("description")} value={desc} onChange={(e) => setDesc(e.target.value)} className="h-11 rounded-xl" />
        <Input placeholder={`${t("amount")} (RWF)`} inputMode="numeric" value={amt} onChange={(e) => setAmt(e.target.value.replace(/\D/g, ""))} className="h-11 rounded-xl" />
        <button onClick={save} className="mt-2 w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground">{t("save")}</button>
      </div>
    </div>
  );
}

function AddDebtInline({ partyId }: { partyId: number }) {
  const { t } = useI18n();
  const [desc, setDesc] = useState("");
  const [amt, setAmt] = useState("");
  return (
    <div className="flex gap-2">
      <Input placeholder={t("description")} value={desc} onChange={(e) => setDesc(e.target.value)} className="h-10 rounded-xl" />
      <Input placeholder="RWF" inputMode="numeric" value={amt} onChange={(e) => setAmt(e.target.value.replace(/\D/g, ""))} className="h-10 w-24 rounded-xl" />
      <button
        onClick={async () => { if (Number(amt) > 0) { await addDebt(partyId, desc || "—", Number(amt)); setDesc(""); setAmt(""); } }}
        className="h-10 shrink-0 rounded-full border px-3 text-xs font-semibold"
      >
        {t("addDebtLbl")}
      </button>
    </div>
  );
}
