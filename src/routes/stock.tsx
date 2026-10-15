import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { PackagePlus, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { db, CATEGORIES, PRODUCT_EMOJIS, UNITS, type Product } from "@/lib/db";
import { CATALOG, CATALOG_CATEGORIES, type DefaultProduct } from "@/lib/defaults";
import { deleteProduct, fmt, saveProduct, stockIn } from "@/lib/actions";
import { useI18n } from "@/lib/i18n";
import { CategoryPills } from "@/components/AppShell";
import { ProductThumb } from "@/components/ProductThumb";
import { cn } from "@/lib/utils";
import { unitLabel } from "@/lib/i18n";
import { Capacitor } from "@capacitor/core";
import { CameraPreview } from "@capacitor-community/camera-preview";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/stock")({
  validateSearch: (s: Record<string, unknown>): { low?: boolean } => (s["low"] ? { low: true } : {}),
  head: () => ({
    meta: [
      { title: "Stock — Stoke Yange" },
      { name: "description", content: "Manage products, receive goods and count stock." },
      { property: "og:title", content: "Stock — Stoke Yange" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:description", content: "Manage products, receive goods and count stock." },
    ],
  }),
  component: StockPage,
});

const EMOJI_CATEGORY: Record<string, string> = {
  "🥛": "Beverages", "🍺": "Beverages", "🥤": "Beverages", "💧": "Beverages", "🧃": "Beverages", "☕": "Beverages", "🍵": "Beverages",
  "🌾": "Food", "🍚": "Food", "🍙": "Food", "🍞": "Food",
  "🥚": "Food", "🧀": "Food", "🫒": "Cooking", "🧂": "Seasonings",
  "🍪": "Food", "🍫": "Food", "🍬": "Food", "🌶️": "Seasonings",
  "🍎": "Food", "🍌": "Food", "🥕": "Food", "🧅": "Cooking",
  "🧼": "Daily use", "🪥": "Daily use", "🧴": "Daily use", "🧻": "Daily use", "🧽": "Household", "🧹": "Household",
  "📱": "Airtime", "📶": "Airtime", "🔋": "Household", "💡": "Household", "🕯️": "Household", "🔦": "Household",
  "🍼": "Daily use", "👗": "Clothes", "👟": "Shoes", "✏️": "School", "📒": "School", "🧸": "School",
  "👕": "Clothes", "👖": "Clothes", "🧥": "Clothes", "📦": "Household",
};

type Mode = { kind: "edit"; p?: Product } | { kind: "in"; p: Product } | null;

function StockPage() {
  const { t, lang } = useI18n();
  const { low } = Route.useSearch();
  const nav = Route.useNavigate();
  const [cat, setCat] = useState("__all");
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<Mode>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const products = useLiveQuery(() => db.products.orderBy("name").toArray(), []) ?? [];
  const cats = [...new Set([...CATEGORIES, ...products.map((p) => p.category)])];
  const list = products.filter(
    (p) => (cat === "__all" || p.category === cat) && (!low || p.stock <= p.min) && p.name.toLowerCase().includes(q.toLowerCase()),
  );
  const allCost = products.reduce((a, p) => a + (Number(p.stock) || 0) * (Number(p.cost) || 0), 0);
  const allSale = products.reduce((a, p) => a + (Number(p.stock) || 0) * (Number(p.price) || 0), 0);

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-hero p-5 text-primary-foreground shadow-card">
        <p className="text-xs font-medium opacity-90">{t("stockValue")}</p>
        <p className="text-3xl font-bold tabular-nums tracking-tight">{fmt(allCost)}</p>
        <p className="mt-1 text-xs opacity-90">
          {t("salesValue")}: <b>{fmt(allSale)}</b> · {products.length} {t("stock").toLowerCase()}
        </p>
      </section>

      <div className="flex items-end justify-between gap-2">
        <h2 className="text-2xl font-bold">{t("stock")}</h2>
        <button type="button" onClick={() => setMode({ kind: "edit" })} className="flex h-11 items-center gap-1 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">
          <Plus className="size-4" /> {t("addProduct")}
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} className="h-12 w-full rounded-full border bg-card pl-11 pr-4 text-sm outline-none" />
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => nav({ search: low ? {} : { low: true } })} className={cn("h-9 shrink-0 rounded-full px-4 text-sm font-medium", low ? "bg-warning text-warning-foreground" : "border bg-card")}>
          ⚠ {t("low")}
        </button>
      </div>
      <CategoryPills value={cat} onChange={setCat} categories={cats} />
      <ul className="space-y-2">
        {list.map((p) => {
          const isLow = p.stock <= p.min;
          return (
            <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card">
              <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setMode({ kind: "edit", p })}>
                <ProductThumb emoji={p.emoji} image={p.image} color={p.color} name={p.name} className="size-12 shrink-0" emojiClassName="text-2xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold underline-offset-2 hover:underline">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className={cn("font-semibold", isLow ? "text-destructive" : "text-foreground")}>{p.stock} {unitLabel(p.unit, lang)}</span>
                    {" · min "}{p.min}{" · "}{fmt(p.price)}
                  </p>
                </div>
              </button>
              <div className="flex gap-1">
                <IconBtn label={t("stockIn")} onClick={() => setMode({ kind: "in", p })}>
                  <PackagePlus className="size-4" />
                </IconBtn>
                <IconBtn label={t("deleteProduct")} onClick={() => setDeleteTarget(p)}>
                  <Trash2 className="size-4 text-destructive" />
                </IconBtn>
              </div>
            </li>
          );
        })}
        {list.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">{t("emptyShop")}</p>}
      </ul>

      <Drawer open={!!mode} onOpenChange={(o) => !o && setMode(null)}>
        <DrawerContent className="mx-auto max-h-[92vh] max-w-md">
          {mode?.kind === "edit" && <ProductForm p={mode.p} cats={cats} onDone={() => setMode(null)} />}
          {mode?.kind === "in" && <StockInForm p={mode.p} onDone={() => setMode(null)} />}
        </DrawerContent>
      </Drawer>

      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-sm rounded-3xl bg-background p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-bold">{t("confirmDeleteTitle")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("confirmDeleteBody")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{deleteTarget.emoji} {deleteTarget.name}</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="h-11 flex-1 rounded-full border font-semibold">{t("cancel")}</button>
              <button
                type="button"
                onClick={() => {
                  deleteProduct(deleteTarget.id!)
                    .then(() => { toast.success(t("deleteProduct")); setDeleteTarget(null); })
                    .catch((e) => toast.error(e.message));
                }}
                className="h-11 flex-1 rounded-full bg-destructive font-semibold text-destructive-foreground"
              >
                {t("deleteProduct")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IconBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="grid size-10 place-items-center rounded-full border bg-background">
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const num = (v: string) => Number(v.replace(/[^\d.]/g, "")) || 0;

function ProductForm({ p, cats, onDone }: { p?: Product | undefined; cats: string[]; onDone: () => void }) {
  const { t, lang } = useI18n();
  const [showDefaults, setShowDefaults] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const nativePreviewRef = useRef<HTMLDivElement>(null);
  const nativePreviewStarted = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraRequest = useRef(0);
  const [cameraBusy, setCameraBusy] = useState(false);
  const existing = useLiveQuery(() => db.products.toArray(), []) ?? [];

  const stopCamera = () => {
    cameraRequest.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (Capacitor.isNativePlatform() && nativePreviewStarted.current) {
      nativePreviewStarted.current = false;
      void CameraPreview.stop().catch(() => {});
    }
    setCameraOpen(false);
    setCameraBusy(false);
  };

  useEffect(() => () => {
    cameraRequest.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (nativePreviewStarted.current) void CameraPreview.stop().catch(() => {});
  }, []);

  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play().catch(() => {});
    }
  }, [cameraOpen]);

  const openCamera = async () => {
    if (cameraBusy) return;
    const request = ++cameraRequest.current;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraBusy(true);
    setCameraError("");
    setCameraOpen(true);
    try {
      if (Capacitor.isNativePlatform()) {
        // A native camera preview is more reliable than WebView getUserMedia on Android.
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        if (request !== cameraRequest.current) return;
        const host = nativePreviewRef.current;
        if (!host) throw new Error("Camera preview area is not ready");
        const rect = host.getBoundingClientRect();
        if (rect.width < 10 || rect.height < 10) throw new Error("Camera preview area has no size");
        await CameraPreview.start({
          position: "rear",
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          toBack: false,
          storeToFile: false,
          disableAudio: true,
          enableZoom: true,
        });
        nativePreviewStarted.current = true;
        if (request !== cameraRequest.current) {
          nativePreviewStarted.current = false;
          await CameraPreview.stop().catch(() => {});
          return;
        }
      } else {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError(t("cameraUnsupported"));
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false,
        });
        if (request !== cameraRequest.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      }
    } catch (error) {
      console.error("[product-camera] preview failed", error);
      if (request === cameraRequest.current) {
        setCameraError(lang === "rw"
          ? "Kamera ntiyafungutse. Reba ko wemereye Stoke Yange gukoresha kamera muri Settings > Apps > Stoke Yange > Permissions > Camera, hanyuma ukande Ongera ugerageze."
          : "The camera preview could not start. Allow camera access in Settings > Apps > Stoke Yange > Permissions > Camera, then try again.");
      }
    } finally {
      if (request === cameraRequest.current) setCameraBusy(false);
    }
  };

  const capturePhoto = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        if (!nativePreviewStarted.current) throw new Error("Camera preview is not running");
        const result = await CameraPreview.capture({ quality: 82, width: 900, height: 900 });
        const raw = result.value;
        if (!raw) throw new Error("Camera returned an empty image");
        const dataUrl = raw.startsWith("data:") ? raw : `data:image/jpeg;base64,${raw}`;
        setF((prev) => ({ ...prev, image: dataUrl }));
        stopCamera();
      } catch (error) {
        console.error("[product-camera] capture failed", error);
        setCameraError(lang === "rw" ? "Ifoto ntiyafashwe. Ongera ugerageze." : "Could not capture the photo. Please try again.");
      }
      return;
    }
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError(t("cameraStarting"));
      return;
    }
    const canvas = document.createElement("canvas");
    const maxSide = 900;
    const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCameraError(t("cameraFailed"));
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setF((prev) => ({ ...prev, image: canvas.toDataURL("image/webp", 0.82) }));
    stopCamera();
  };
  const existingNames = new Set(existing.map((x) => x.name.toLowerCase()));
  const [f, setF] = useState({
    name: p?.name ?? "",
    category: p?.category ?? cats[0] ?? "Food",
    unit: p?.unit ?? "pcs",
    emoji: p?.emoji ?? "📦",
    image: p?.image ?? "",
    color: p?.color ?? "",
    cost: String(p?.cost ?? ""),
    price: String(p?.price ?? ""),
    stock: String(p?.stock ?? ""),
    min: String(p?.min ?? "3"),
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const pickEmoji = (e: string) => setF({ ...f, emoji: e, category: EMOJI_CATEGORY[e] ?? f.category });

  const save = async () => {
    if (!f.name.trim()) { toast.error(t("name")); return; }
    const data = {
      name: f.name.trim(),
      category: f.category,
      unit: f.unit,
      emoji: f.emoji,
      image: f.image || undefined,
      color: f.color || undefined,
      cost: num(f.cost),
      price: num(f.price),
      min: num(f.min),
      stock: p ? p.stock : num(f.stock),
    };
    await saveProduct(p?.id ? { ...data, id: p.id } : data);
    toast.success(t("save"));
    onDone();
  };

  const addDefault = async (d: DefaultProduct) => {
    const label = lang === "rw" && d.nameRw ? d.nameRw : d.name;
    if (existingNames.has(label.toLowerCase()) || existingNames.has(d.name.toLowerCase())) {
      toast.message(t("alreadyHave"));
      return;
    }
    await saveProduct({
      name: label,
      category: d.category,
      unit: d.unit,
      emoji: d.emoji,
      image: d.image,
      color: d.color,
      cost: 0,
      price: 0,
      stock: 0,
      min: 3,
    });
    toast.success(t("addedDefault"));
  };

  if (showDefaults && !p) {
    return <DefaultsPicker lang={lang} existingNames={existingNames} onAdd={addDefault} onBack={() => setShowDefaults(false)} />;
  }

  return (
    <div className="overflow-y-auto">
      <DrawerHeader className="flex-row items-center justify-between space-y-0 gap-2">
        {!p && (
          <button type="button" onClick={() => setShowDefaults(true)} className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">{t("defaults")}</button>
        )}
        <DrawerTitle className="flex-1 text-center">{p ? t("edit") : t("addProduct")}</DrawerTitle>
        {!p && <span className="w-16" />}
      </DrawerHeader>
      <div className="space-y-3 px-4 pb-6">
        <div className="flex flex-col items-center gap-2">
          <ProductThumb emoji={f.emoji} image={f.image || undefined} color={f.color || undefined} name={f.name} className="size-24" emojiClassName="text-4xl" />
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" variant="outline" disabled={cameraBusy} onClick={() => void openCamera()} className="rounded-full text-xs">{t("takePhoto")}</Button>
            {f.image && <Button type="button" variant="outline" onClick={() => setF((prev) => ({ ...prev, image: "" }))} className="rounded-full text-xs">{t("removePhoto")}</Button>}
          </div>
        </div>
        {cameraOpen && (
          <div className="space-y-3 rounded-2xl border bg-card p-3">
              {cameraError ? (
              <div className="space-y-2">
                <p className="text-sm text-destructive">{cameraError}</p>
                <Button type="button" disabled={cameraBusy} onClick={() => void openCamera()} className="h-10 w-full rounded-full">{t("retryCamera")}</Button>
              </div>
            ) : (
              Capacitor.isNativePlatform() ? (
                <div ref={nativePreviewRef} className="h-72 w-full rounded-xl bg-black" aria-label={lang === "rw" ? "Ishusho ya kamera" : "Camera preview"} />
              ) : (
                <video ref={videoRef} autoPlay playsInline muted className="h-72 w-full rounded-xl bg-black object-contain" />
              )
            )}
            <div className="flex gap-2">
              {!cameraError && <Button type="button" disabled={cameraBusy} onClick={capturePhoto} className="h-11 flex-1 rounded-full">{t("capturePhoto")}</Button>}
              <Button type="button" variant="outline" onClick={stopCamera} className="h-11 flex-1 rounded-full">{t("closeCamera")}</Button>
            </div>
          </div>
        )}
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {PRODUCT_EMOJIS.map((e) => (
            <button key={e} type="button" onClick={() => pickEmoji(e)} className={cn("grid size-11 shrink-0 place-items-center rounded-xl text-2xl", f.emoji === e ? "bg-primary/20 ring-2 ring-primary" : "bg-muted")}>
              {e}
            </button>
          ))}
        </div>
        <Field label={t("name")}><Input value={f.name} onChange={set("name")} className="h-11 rounded-xl" /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t("category")}>
            <input list="cats" value={f.category} onChange={set("category")} className="h-11 w-full rounded-xl border bg-card px-3 text-sm" />
            <datalist id="cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
          <div className="col-span-2">
          <Field label={t("unit")}>
            <div className="grid grid-cols-2 gap-2">
              {UNITS.map((u) => {
                const selected = f.unit === u;
                const unitIcons: Record<string, string> = { pcs: "🧩", kg: "⚖️", pack: "📦", bottle: "🧴", crate: "🧺", litre: "🫗", sack: "🌾" };
                return (
                  <button
                    key={u}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setF((prev) => ({ ...prev, unit: u }))}
                    className={cn(
                      "flex min-h-12 items-center gap-2 rounded-2xl border px-3 py-2 text-left text-sm transition-all",
                      selected
                        ? "border-primary bg-primary/10 text-foreground shadow-sm ring-1 ring-primary/30"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-accent/40",
                    )}
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-muted text-lg">{unitIcons[u] ?? "📦"}</span>
                    <span className="min-w-0 flex-1 font-medium">{unitLabel(u, lang)}</span>
                    <span className={cn("grid size-4 shrink-0 place-items-center rounded-full border", selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40")}>
                      {selected && <span className="size-1.5 rounded-full bg-current" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>
          </div>
          <Field label={t("cost")}><Input inputMode="numeric" value={f.cost} onChange={set("cost")} className="h-11 rounded-xl" /></Field>
          <Field label={t("sellPrice")}><Input inputMode="numeric" value={f.price} onChange={set("price")} className="h-11 rounded-xl" /></Field>
          {!p && <Field label={t("openingStock")}><Input inputMode="numeric" value={f.stock} onChange={set("stock")} className="h-11 rounded-xl" /></Field>}
          <Field label={t("minAlert")}><Input inputMode="numeric" value={f.min} onChange={set("min")} className="h-11 rounded-xl" /></Field>
        </div>
        <button type="button" onClick={save} className="h-13 w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground">{t("save")}</button>
      </div>
    </div>
  );
}

function StockInForm({ p, onDone }: { p: Product; onDone: () => void }) {
  const { t } = useI18n();
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState(String(p.cost));
  const [price, setPrice] = useState(String(p.price));
  const [sup, setSup] = useState<number | "">("");
  const suppliers = useLiveQuery(() => db.parties.where("kind").equals("supplier").toArray(), []) ?? [];
  const save = async () => {
    try {
      await stockIn(p.id!, num(qty), num(cost), sup === "" ? undefined : sup, num(price));
      toast.success(`+${num(qty)} ${p.name}`);
      onDone();
    } catch {
      toast.error(t("quantity"));
    }
  };
  return (
    <div className="overflow-y-auto">
      <DrawerHeader><DrawerTitle>{t("stockIn")}: {p.emoji} {p.name}</DrawerTitle></DrawerHeader>
      <div className="space-y-3 px-4 pb-6">
        <div className="grid grid-cols-2 gap-2">
          <Field label={t("quantity")}><Input autoFocus inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} className="h-12 rounded-xl text-lg" /></Field>
          <Field label={t("cost")}><Input inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} className="h-12 rounded-xl text-lg" /></Field>
        </div>
        <Field label={t("sellPrice")}><Input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} className="h-12 rounded-xl text-lg" /></Field>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{t("fromSupplier")}</p>
          <button type="button" onClick={() => setSup("")} className={cn("w-full rounded-xl border px-3 py-2.5 text-left text-sm", sup === "" && "border-primary bg-primary/10")}>{t("none")}</button>
          {suppliers.map((s) => (
            <button key={s.id} type="button" onClick={() => setSup(s.id!)} className={cn("w-full rounded-xl border px-3 py-2.5 text-left text-sm", sup === s.id && "border-primary bg-primary/10")}>{s.name}</button>
          ))}
        </div>
        <p className="text-sm font-semibold">{t("total")}: {fmt(num(qty) * num(cost))}</p>
        <button type="button" onClick={save} className="h-13 w-full rounded-full bg-primary py-4 font-semibold text-primary-foreground">{t("save")}</button>
      </div>
    </div>
  );
}

function DefaultsPicker({
  lang,
  existingNames,
  onAdd,
  onBack,
}: {
  lang: string;
  existingNames: Set<string>;
  onAdd: (d: DefaultProduct) => void;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("__all");
  const query = q.trim().toLowerCase();

  // Filter correctly per category — no hard slice that hides Food/etc.
  const list = useMemo(() => {
    return CATALOG.filter((d) => {
      const catOk = cat === "__all" || d.category === cat;
      if (!catOk) return false;
      if (!query) return true;
      return d.name.toLowerCase().includes(query) || (d.nameRw ?? "").toLowerCase().includes(query);
    });
  }, [cat, query]);

  // When All + no search, show base products first (not thousands of variants)
  const display = useMemo(() => {
    if (cat === "__all" && !query) {
      // base items only under All; open Clothes/Shoes for colour×size
      return list.filter((d) => !/ size \d| size [SMLX]/.test(d.name));
    }
    return list;
  }, [list, cat, query]);

  return (
    <div className="flex max-h-[85vh] flex-col">
      <DrawerHeader className="flex-row items-center gap-2 space-y-0">
        <button type="button" onClick={onBack} className="rounded-full border px-3 py-1.5 text-xs font-semibold">←</button>
        <DrawerTitle>{t("defaultsTitle")}</DrawerTitle>
      </DrawerHeader>
      <div className="space-y-2 px-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search")}
            className="h-11 w-full rounded-full border bg-card pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <CategoryPills value={cat} onChange={setCat} categories={CATALOG_CATEGORIES} />
        <p className="text-[11px] text-muted-foreground">
          {display.length} · {t("defaultsHint")}
          {cat === "__all" && !query ? " · Clothes/Shoes: open tab for colours & sizes" : ""}
        </p>
      </div>
      <ul className="flex-1 space-y-1.5 overflow-y-auto px-4 pb-6 pt-2">
        {display.map((d) => {
          const label = lang === "rw" && d.nameRw ? d.nameRw : d.name;
          const have = existingNames.has(label.toLowerCase()) || existingNames.has(d.name.toLowerCase());
          return (
            <li key={d.name} className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2">
              <ProductThumb
                emoji={d.emoji}
                image={d.image}
                color={d.color}
                name={label}
                className="size-11 shrink-0"
                emojiClassName="text-xl"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{label}</p>
                <p className="text-[10px] text-muted-foreground">{d.category} · {unitLabel(d.unit, lang === "rw" ? "rw" : "en")}</p>
              </div>
              <button
                type="button"
                disabled={have}
                onClick={() => onAdd(d)}
                className="h-9 shrink-0 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-40"
              >
                {have ? t("alreadyHave") : t("addDefault")}
              </button>
            </li>
          );
        })}
        {display.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">{t("noItems")}</p>}
      </ul>
    </div>
  );
}
