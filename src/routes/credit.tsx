import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, MessageCircle, MessageSquare, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { db, type Party, type PartyKind } from "@/lib/db";
import { addDebt, addParty, deleteParty, fmt, recordPayment, updateParty } from "@/lib/actions";
import { reminderText, useI18n } from "@/lib/i18n";
import { useShopName } from "@/components/AppShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/credit")({
  head: () => ({
    meta: [
      { title: "Credit (Amadeni) — Stoke Yange" },
      { name: "description", content: "Track who owes you and which suppliers you owe." },
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
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [payFor, setPayFor] = useState<Party | null>(null);
  const [debtFor, setDebtFor] = useState<Party | null>(null);
  const [adding, setAdding] = useState(false);
  const [editParty, setEditParty] = useState<Party | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [histOpen, setHistOpen] = useState<Record<number, boolean>>({});
  const longTimer = useRef<number | null>(null);

  const data =
    useLiveQuery(async () => {
      const parties = await db.parties.where("kind").equals(kind).toArray();
      const debts = await db.debts.toArray();
      const pays = await db.payments.toArray();
      return parties
        .map((p) => {
          const d = debts.filter((x) => x.partyId === p.id).sort((a, b) => a.createdAt - b.createdAt);
          const py = pays.filter((x) => x.partyId === p.id).sort((a, b) => b.createdAt - a.createdAt);
          const balance = d.reduce((a, x) => a + x.amount, 0) - py.reduce((a, x) => a + x.amount, 0);
          const oldest = d[0];
          const outstanding = balance > 0 ? d : [];
          const deadlineAt = outstanding.length
            ? Math.min(...outstanding.map((debt) => debt.createdAt + (debt.dueDays ?? 7) * DAY))
            : Number.POSITIVE_INFINITY;
          const overdue = !!oldest && balance > 0 && deadlineAt < Date.now();
          const sortAt = outstanding.length ? deadlineAt : (oldest?.createdAt ?? p.createdAt);
          return { p, debts: d, pays: py, balance, oldest: oldest?.createdAt ?? p.createdAt, sortAt, overdue };
        })
        .filter((r) => r.balance > 0 || r.debts.length === 0)
        .sort((a, b) => a.sortAt - b.sortAt || a.oldest - b.oldest);
    }, [kind]) ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    const digits = q.replace(/\D/g, "");
    return data.filter((r) => {
      const name = (r.p.name || "").toLowerCase();
      const phone = (r.p.phone || "").replace(/\D/g, "");
      if (name.includes(q)) return true;
      if (digits && phone.includes(digits)) return true;
      // also match description lines for quick find
      if (r.debts.some((d) => (d.description || "").toLowerCase().includes(q))) return true;
      return false;
    });
  }, [data, query]);

  const total = filtered.reduce((a, r) => a + r.balance, 0);

  const remind = (r: (typeof data)[number], via: "wa" | "sms") => {
    const msg = encodeURIComponent(reminderText(lang, r.p.name, fmt(r.balance), shop));
    const phone = r.p.phone.replace(/\D/g, "").replace(/^0/, "250");
    window.open(via === "wa" ? `https://wa.me/${phone}?text=${msg}` : `sms:+${phone}?body=${msg}`, "_blank");
  };

  const startLongPress = (id: number) => {
    if (longTimer.current) window.clearTimeout(longTimer.current);
    longTimer.current = window.setTimeout(() => setDeleteId(id), 480);
  };
  const endLongPress = () => {
    if (longTimer.current) {
      window.clearTimeout(longTimer.current);
      longTimer.current = null;
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{t("credit")}</h2>
      <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
        {(["customer", "supplier"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setKind(k);
              setQuery("");
              setOpenId(null);
            }}
            className={cn(
              "h-11 rounded-full px-2 text-xs font-semibold leading-tight",
              kind === k ? "bg-card text-primary shadow-card" : "text-muted-foreground",
            )}
          >
            {k === "customer" ? t("owesMe") : t("iOwe")}
          </button>
        ))}
      </div>

      {/* Search — works for both tabs: people who owe you + people you owe */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            lang === "rw"
              ? kind === "customer"
                ? "Shakisha umukiliya (izina cyangwa telefone)…"
                : "Shakisha utanga (izina cyangwa telefone)…"
              : kind === "customer"
                ? "Search who owes you (name or phone)…"
                : "Search who you owe (name or phone)…"
          }
          className="h-12 rounded-xl pl-10 pr-10"
          inputMode="search"
          autoComplete="off"
        />
        {query.trim() && (
          <button
            type="button"
            className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted"
            onClick={() => setQuery("")}
            aria-label={lang === "rw" ? "Siba" : "Clear"}
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-ink p-4 text-ink-foreground">
        <div>
          <p className="text-xs opacity-70">
            {query.trim()
              ? lang === "rw"
                ? `Ibisubizo (${filtered.length})`
                : `Results (${filtered.length})`
              : t("total")}
          </p>
          <p className="text-2xl font-bold tabular-nums">{fmt(total)}</p>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex h-10 items-center gap-1 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="size-4" /> {t("addParty")}
        </button>
      </div>

      <ul className="space-y-2">
        {filtered.map((r) => {
          const open = openId === r.p.id;
          const showDel = deleteId === r.p.id;
          const histExpanded = !!histOpen[r.p.id!];
          const debtPreview = histExpanded ? r.debts : r.debts.slice(-3);
          const payPreview = histExpanded ? r.pays : r.pays.slice(0, 2);
          const moreHist = r.debts.length > 3 || r.pays.length > 2;
          return (
            <li key={r.p.id} className="rounded-2xl bg-card p-3 shadow-card">
              <div className="flex w-full items-center gap-3">
                <button
                  type="button"
                  className="grid size-11 shrink-0 place-items-center rounded-full bg-accent font-bold text-accent-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditParty(r.p);
                  }}
                  aria-label={t("edit")}
                >
                  {r.p.name[0]?.toUpperCase()}
                </button>
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => {
                    if (showDel) {
                      setDeleteId(null);
                      return;
                    }
                    setOpenId(open ? null : r.p.id!);
                  }}
                  onPointerDown={() => startLongPress(r.p.id!)}
                  onPointerUp={endLongPress}
                  onPointerLeave={endLongPress}
                  onPointerCancel={endLongPress}
                >
                  <p className="truncate font-semibold">{r.p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.p.phone || "—"} · {Math.floor((Date.now() - r.oldest) / DAY)} {t("days")}
                    {r.overdue && (
                      <span className="ml-1 rounded-full bg-destructive/10 px-2 font-semibold text-destructive">{t("overdue")}</span>
                    )}
                  </p>
                </button>
                <span className="font-bold tabular-nums text-primary">{fmt(r.balance)}</span>
                {showDel ? (
                  <button
                    type="button"
                    className="grid size-10 place-items-center rounded-full bg-destructive text-destructive-foreground"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await deleteParty(r.p.id!);
                        toast.success(lang === "rw" ? "Umuntu yasibwe" : "Person deleted");
                        setDeleteId(null);
                        if (openId === r.p.id) setOpenId(null);
                      } catch (err) {
                        toast.error(String(err));
                      }
                    }}
                    aria-label={lang === "rw" ? "Siba" : "Delete"}
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : (
                  <ChevronDown className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} />
                )}
              </div>

              {open && (
                <div className="mt-3 space-y-3 border-t pt-3">
                  <ul className="space-y-1 text-sm">
                    {debtPreview.map((d) => (
                      <li key={d.id} className="flex justify-between gap-2">
                        <span>
                          <span className="block">{d.description}</span>
                          <span className="text-xs text-muted-foreground">
                            {when(d.createdAt)}
                            {d.dueDays != null ? ` · ${d.dueDays} ${t("days")}` : ""}
                          </span>
                        </span>
                        <span className="tabular-nums">{fmt(d.amount)}</span>
                      </li>
                    ))}
                  </ul>
                  {payPreview.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">{t("payments")}</p>
                      {payPreview.map((x) => (
                        <p key={x.id} className="flex justify-between text-sm text-success">
                          <span>{when(x.createdAt)}</span>
                          <span>−{fmt(x.amount)}</span>
                        </p>
                      ))}
                    </div>
                  )}
                  {moreHist && (
                    <button
                      type="button"
                      className="text-xs font-semibold text-primary"
                      onClick={() => setHistOpen((h) => ({ ...h, [r.p.id!]: !histExpanded }))}
                    >
                      {histExpanded
                        ? lang === "rw"
                          ? "Hisha amateka"
                          : "Hide history"
                        : lang === "rw"
                          ? "Reba amateka yose"
                          : "Show full history"}
                    </button>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPayFor(r.p)}
                      className="h-11 flex-1 rounded-full bg-primary text-sm font-semibold text-primary-foreground"
                    >
                      {t("recordPayment")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDebtFor(r.p)}
                      className="h-11 flex-1 rounded-full border text-sm font-semibold"
                    >
                      {t("addDebtLbl")}
                    </button>
                    {kind === "customer" && r.p.phone && (
                      <>
                        <button type="button" onClick={() => remind(r, "wa")} aria-label="WhatsApp" className="grid size-11 place-items-center rounded-full bg-success text-success-foreground">
                          <MessageCircle className="size-5" />
                        </button>
                        <button type="button" onClick={() => remind(r, "sms")} aria-label="SMS" className="grid size-11 place-items-center rounded-full border">
                          <MessageSquare className="size-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {query.trim()
              ? lang === "rw"
                ? "Nta muntu uhuye n'ubushakashatsi."
                : "No person matches your search."
              : t("noItems")}
          </p>
        )}
      </ul>

      <Drawer open={!!payFor} onOpenChange={(o) => !o && setPayFor(null)}>
        <DrawerContent className="mx-auto max-w-md">
          {payFor && (
            <PayForm
              key={payFor.id}
              party={payFor}
              max={data.find((r) => r.p.id === payFor.id)?.balance ?? 0}
              onDone={() => setPayFor(null)}
            />
          )}
        </DrawerContent>
      </Drawer>

      <Drawer open={!!debtFor} onOpenChange={(o) => !o && setDebtFor(null)}>
        <DrawerContent className="mx-auto max-w-md">
          {debtFor && <AddDebtForm party={debtFor} onDone={() => setDebtFor(null)} />}
        </DrawerContent>
      </Drawer>

      <Drawer open={adding} onOpenChange={setAdding}>
        <DrawerContent className="mx-auto max-w-md">
          <AddPartyForm kind={kind} onDone={() => setAdding(false)} />
        </DrawerContent>
      </Drawer>

      <Drawer open={!!editParty} onOpenChange={(o) => !o && setEditParty(null)}>
        <DrawerContent className="mx-auto max-w-md">
          {editParty && <EditPartyForm party={editParty} onDone={() => setEditParty(null)} />}
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function PayForm({ party, max, onDone }: { party: Party; max: number; onDone: () => void }) {
  const { t } = useI18n();
  const balance = Math.max(0, Math.round(Number(max) || 0));
  const [amt, setAmt] = useState(() => String(balance));
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    setAmt(String(balance));
  }, [balance, party.id]);

  const applyPercent = (pct: number) => {
    setAmt(String(Math.max(0, Math.round(balance * (pct / 100)))));
  };

  const save = async () => {
    const n = Number(amt) || 0;
    if (n <= 0) {
      toast.error(t("amount"));
      return;
    }
    const d = new Date(date);
    const now = new Date();
    d.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    await recordPayment(party.id!, n, d.getTime());
    toast.success(`${t("recordPayment")}: ${fmt(n)}`);
    onDone();
  };

  const currentNum = Number(amt) || 0;

  return (
    <div>
      <DrawerHeader>
        <DrawerTitle>
          {t("recordPayment")} — {party.name}
        </DrawerTitle>
      </DrawerHeader>
      <div className="space-y-3 px-4 pb-6">
        <p className="text-sm text-muted-foreground">
          {t("balance")}: <b className="text-foreground">{fmt(balance)}</b>
        </p>
        <Input
          inputMode="numeric"
          value={amt}
          onChange={(e) => setAmt(e.target.value.replace(/\D/g, ""))}
          className="h-12 rounded-xl text-lg font-semibold"
        />
        <div className="flex gap-2">
          {([20, 50, 100] as const).map((pct) => {
            const target = Math.round(balance * (pct / 100));
            const active = currentNum === target && target > 0;
            return (
              <button
                key={pct}
                type="button"
                onClick={() => applyPercent(pct)}
                className={cn(
                  "h-11 flex-1 rounded-full border text-sm font-semibold touch-manipulation",
                  active ? "border-primary bg-primary text-primary-foreground" : "bg-card active:bg-muted",
                )}
              >
                {pct}%
              </button>
            );
          })}
        </div>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 rounded-xl" />
        <button type="button" onClick={save} className="w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground">
          {t("save")}
        </button>
      </div>
    </div>
  );
}

function AddDebtForm({ party, onDone }: { party: Party; onDone: () => void }) {
  const { t, lang } = useI18n();
  const [desc, setDesc] = useState("");
  const [amt, setAmt] = useState("");
  const [due, setDue] = useState("");

  const save = async () => {
    const n = Number(amt) || 0;
    if (n <= 0) {
      toast.error(t("amount"));
      return;
    }
    const days = due.trim() ? Number(due) : undefined;
    await addDebt(party.id!, desc.trim() || "—", n, days && days > 0 ? days : undefined);
    toast.success(t("addDebtLbl"));
    onDone();
  };

  return (
    <div>
      <DrawerHeader>
        <DrawerTitle>
          {t("addDebtLbl")} — {party.name}
        </DrawerTitle>
      </DrawerHeader>
      <div className="space-y-2 px-4 pb-6">
        <Input
          placeholder={`${t("amount")} (RWF) *`}
          inputMode="numeric"
          value={amt}
          onChange={(e) => setAmt(e.target.value.replace(/\D/g, ""))}
          className="h-12 rounded-xl text-lg font-semibold"
        />
        <Input placeholder={t("description")} value={desc} onChange={(e) => setDesc(e.target.value)} className="h-11 rounded-xl" />
        <Input
          placeholder={lang === "rw" ? "Igihe (iminsi) — si ngombwa" : "Deadline (days) — optional"}
          inputMode="numeric"
          value={due}
          onChange={(e) => setDue(e.target.value.replace(/\D/g, ""))}
          className="h-11 rounded-xl"
        />
        <button type="button" onClick={save} className="mt-2 w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground">
          {t("save")}
        </button>
      </div>
    </div>
  );
}

function AddPartyForm({ kind, onDone }: { kind: PartyKind; onDone: () => void }) {
  const { t, lang } = useI18n();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [desc, setDesc] = useState("");
  const [amt, setAmt] = useState("");
  const [due, setDue] = useState("");

  const save = async () => {
    if (!name.trim()) {
      toast.error(t("name"));
      return;
    }
    const id = await addParty(name, phone, kind);
    if (Number(amt) > 0) {
      const days = due.trim() ? Number(due) : undefined;
      await addDebt(id, desc || "—", Number(amt), days && days > 0 ? days : undefined);
    }
    onDone();
  };

  return (
    <div>
      <DrawerHeader>
        <DrawerTitle>{kind === "customer" ? t("customer") : t("supplier")}</DrawerTitle>
      </DrawerHeader>
      <div className="space-y-2 px-4 pb-6">
        <Input placeholder={t("name")} value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" />
        <Input placeholder={t("phone")} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11 rounded-xl" />
        <Input placeholder={t("description")} value={desc} onChange={(e) => setDesc(e.target.value)} className="h-11 rounded-xl" />
        <Input
          placeholder={lang === "rw" ? "Igihe (iminsi) — si ngombwa" : "Deadline (days) — optional"}
          inputMode="numeric"
          value={due}
          onChange={(e) => setDue(e.target.value.replace(/\D/g, ""))}
          className="h-11 rounded-xl"
        />
        <Input
          placeholder={`${t("amount")} (RWF)`}
          inputMode="numeric"
          value={amt}
          onChange={(e) => setAmt(e.target.value.replace(/\D/g, ""))}
          className="h-11 rounded-xl"
        />
        <button type="button" onClick={save} className="mt-2 w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground">
          {t("save")}
        </button>
      </div>
    </div>
  );
}

function EditPartyForm({ party, onDone }: { party: Party; onDone: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState(party.name);
  const [phone, setPhone] = useState(party.phone || "");

  const save = async () => {
    if (!name.trim()) {
      toast.error(t("name"));
      return;
    }
    await updateParty(party.id!, { name: name.trim(), phone: phone.trim() });
    toast.success(t("save"));
    onDone();
  };

  return (
    <div>
      <DrawerHeader>
        <DrawerTitle>{t("edit")}</DrawerTitle>
      </DrawerHeader>
      <div className="space-y-2 px-4 pb-6">
        <Input placeholder={t("name")} value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" />
        <Input placeholder={t("phone")} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11 rounded-xl" />
        <button type="button" onClick={save} className="mt-2 w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground">
          {t("save")}
        </button>
      </div>
    </div>
  );
}
