import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_RW = ["Cy", "Mb", "Lb", "Wb", "Ng", "Ju", "Gp"];
/** Full weekday names — do not rely on toLocaleDateString('rw-RW') (many phones fall back to English). */
const WEEKDAYS_LONG_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAYS_LONG_RW = [
  "Ku cyumweru",
  "Ku wa mbere",
  "Ku wa kabiri",
  "Ku wa gatatu",
  "Ku wa kane",
  "Ku wa gatanu",
  "Ku wa gatandatu",
];
const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTHS_RW = [
  "Mutarama",
  "Gashyantare",
  "Werurwe",
  "Mata",
  "Gicurasi",
  "Kamena",
  "Nyakanga",
  "Kanama",
  "Nzeri",
  "Ukwakira",
  "Ugushyingo",
  "Ukuboza",
];

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function toIso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIso(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d!);
  if (dt.getFullYear() !== y || dt.getMonth() !== m! - 1 || dt.getDate() !== d) return null;
  return startOfDay(dt);
}

/** Convert optional ISO date to dueDays from today (whole days). */
export function isoToDueDays(iso: string | null | undefined): number | undefined {
  if (!iso) return undefined;
  const target = parseIso(iso);
  if (!target) return undefined;
  const today = startOfDay(new Date());
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diff < 1) return 1;
  return diff;
}

type Props = {
  valueIso: string;
  onChange: (iso: string) => void;
  lang?: "en" | "rw";
  placeholder?: string;
};

export function DeadlinePicker({ valueIso, onChange, lang = "en", placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState(valueIso);
  const selected = valueIso ? parseIso(valueIso) : null;

  const viewSeed = selected ?? startOfDay(new Date());
  const [viewY, setViewY] = useState(viewSeed.getFullYear());
  const [viewM, setViewM] = useState(viewSeed.getMonth());

  useEffect(() => {
    setManual(valueIso);
  }, [valueIso]);

  useEffect(() => {
    if (!open) return;
    const s = selected ?? startOfDay(new Date());
    setViewY(s.getFullYear());
    setViewM(s.getMonth());
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const months = lang === "rw" ? MONTHS_RW : MONTHS_EN;
  const weekdays = lang === "rw" ? WEEKDAYS_RW : WEEKDAYS_EN;
  const weekdaysLong = lang === "rw" ? WEEKDAYS_LONG_RW : WEEKDAYS_LONG_EN;

  const dayName = selected ? weekdaysLong[selected.getDay()] : null;

  const displayDate = selected
    ? lang === "rw"
      ? `${selected.getDate()} ${months[selected.getMonth()]} ${selected.getFullYear()}`
      : selected.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
    : null;

  const cells = useMemo(() => {
    const first = new Date(viewY, viewM, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
    const prevDays = new Date(viewY, viewM, 0).getDate();
    const out: { day: number; inMonth: boolean; date: Date }[] = [];
    for (let i = startPad - 1; i >= 0; i--) {
      const day = prevDays - i;
      out.push({ day, inMonth: false, date: new Date(viewY, viewM - 1, day) });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      out.push({ day: d, inMonth: true, date: new Date(viewY, viewM, d) });
    }
    while (out.length % 7 !== 0 || out.length < 42) {
      const day = out.length - (startPad + daysInMonth) + 1;
      out.push({ day, inMonth: false, date: new Date(viewY, viewM + 1, day) });
    }
    return out;
  }, [viewY, viewM]);

  const today = startOfDay(new Date());

  const prevMonth = () => {
    if (viewM === 0) {
      setViewM(11);
      setViewY((y) => y - 1);
    } else setViewM((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewM === 11) {
      setViewM(0);
      setViewY((y) => y + 1);
    } else setViewM((m) => m + 1);
  };

  const applyManual = () => {
    const cleaned = manual.trim();
    if (!cleaned) {
      onChange("");
      setOpen(false);
      return;
    }
    // Accept YYYY-MM-DD or DD/MM/YYYY
    let iso = cleaned;
    const slash = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(cleaned);
    if (slash) {
      const dd = slash[1]!.padStart(2, "0");
      const mm = slash[2]!.padStart(2, "0");
      iso = `${slash[3]}-${mm}-${dd}`;
    }
    const parsed = parseIso(iso);
    if (!parsed) return;
    onChange(toIso(parsed));
    setOpen(false);
  };

  const pick = (d: Date) => {
    const s = startOfDay(d);
    onChange(toIso(s));
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-12 w-full items-center gap-3 rounded-xl border bg-card px-3 text-left shadow-sm transition active:scale-[0.99]"
      >
        <span
          className={cn(
            "min-w-[4.5rem] shrink-0 text-sm font-bold capitalize",
            selected ? "text-primary" : "text-muted-foreground",
          )}
        >
          {dayName ?? (lang === "rw" ? "Umunsi" : "Day")}
        </span>
        <span className={cn("min-w-0 flex-1 truncate text-sm", selected ? "font-semibold" : "text-muted-foreground")}>
          {displayDate ??
            placeholder ??
            (lang === "rw" ? "Hitamo itariki (si ngombwa)" : "Pick deadline date (optional)")}
        </span>
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <CalendarDays className="size-4" strokeWidth={2.25} />
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-3 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[min(92dvh,640px)] w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
              <p className="text-sm font-bold">{lang === "rw" ? "Igihe cyo kwishyura" : "Payment deadline"}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-9 place-items-center rounded-full border"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="bg-gradient-to-br from-primary to-orange-600 px-4 py-4 text-primary-foreground">
              <p className="text-xs font-medium opacity-90">{lang === "rw" ? "Itariki yahiswemo" : "Selected"}</p>
              <p className="mt-1 text-lg font-bold leading-snug sm:text-xl">
                {selected
                  ? lang === "rw"
                    ? `${weekdaysLong[selected.getDay()]}, ${selected.getDate()} ${months[selected.getMonth()]} ${selected.getFullYear()}`
                    : `${weekdaysLong[selected.getDay()]}, ${selected.getDate()} ${months[selected.getMonth()]} ${selected.getFullYear()}`
                  : lang === "rw"
                    ? "Nta tariki"
                    : "No date"}
              </p>
            </div>

            <div className="flex items-center justify-between px-3 py-3">
              <button type="button" onClick={prevMonth} className="grid size-10 place-items-center rounded-full border">
                <ChevronLeft className="size-5" />
              </button>
              <div className="flex items-center gap-2">
                <select
                  value={viewM}
                  onChange={(e) => setViewM(Number(e.target.value))}
                  className="h-9 rounded-full border bg-card px-3 text-sm font-semibold"
                >
                  {months.map((m, i) => (
                    <option key={m} value={i}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={viewY}
                  onChange={(e) => setViewY(Number(e.target.value))}
                  className="h-9 rounded-full border bg-card px-3 text-sm font-semibold"
                >
                  {Array.from({ length: 12 }, (_, i) => new Date().getFullYear() - 1 + i).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <button type="button" onClick={nextMonth} className="grid size-10 place-items-center rounded-full border">
                <ChevronRight className="size-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 px-3 pb-1 text-center text-[11px] font-semibold text-muted-foreground">
              {weekdays.map((w) => (
                <div key={w} className="py-1">
                  {w}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 px-3 pb-3">
              {cells.map((c, i) => {
                const isToday = toIso(c.date) === toIso(today);
                const isSel = selected && toIso(c.date) === toIso(selected);
                const past = startOfDay(c.date).getTime() < today.getTime();
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={past && c.inMonth}
                    onClick={() => c.inMonth && !past && pick(c.date)}
                    className={cn(
                      "mx-auto flex size-9 items-center justify-center rounded-full text-sm font-medium transition",
                      !c.inMonth && "text-muted-foreground/40",
                      c.inMonth && past && "text-muted-foreground/35",
                      c.inMonth && !past && !isSel && "hover:bg-primary/10",
                      isToday && !isSel && "ring-1 ring-primary/40",
                      isSel && "bg-primary font-bold text-primary-foreground shadow-md",
                    )}
                  >
                    {c.day}
                  </button>
                );
              })}
            </div>

            <div className="space-y-2 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <p className="text-[11px] text-muted-foreground">
                {lang === "rw" ? "Cyangwa andika itariki (YYYY-MM-DD cyangwa DD/MM/YYYY)" : "Or type a date (YYYY-MM-DD or DD/MM/YYYY)"}
              </p>
              <div className="flex gap-2">
                <input
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  placeholder="2026-12-31"
                  className="h-11 min-w-0 flex-1 rounded-xl border bg-card px-3 text-sm"
                />
                <button
                  type="button"
                  onClick={applyManual}
                  className="h-11 shrink-0 rounded-full bg-secondary px-4 text-sm font-semibold"
                >
                  {lang === "rw" ? "Shyiramo" : "Set"}
                </button>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  className="h-10 flex-1 rounded-full border text-sm font-semibold text-muted-foreground"
                >
                  {lang === "rw" ? "Siba" : "Clear"}
                </button>
                <button
                  type="button"
                  onClick={() => pick(today)}
                  className="h-10 flex-1 rounded-full border border-primary/30 text-sm font-semibold text-primary"
                >
                  {lang === "rw" ? "Uyu munsi" : "Today"}
                </button>
              </div>
            </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
