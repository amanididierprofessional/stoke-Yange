import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "rw";

const dict = {
  sell: ["Sell", "Kugurisha"],
  stock: ["Stock", "Ububiko"],
  credit: ["Credit", "Amadeni"],
  history: ["History", "Amateka"],
  settings: ["Settings", "Igenamiterere"],
  all: ["All", "Byose"],
  search: ["Search products…", "Shakisha igicuruzwa…"],
  left: ["left", "bisigaye"],
  low: ["Low!", "Bike!"],
  out: ["Out", "Byashize"],
  stockValue: ["Inventory value (cost)", "Agaciro k'ububiko (ikiguzi)"],
  salesValue: ["Potential sales value", "Agaciro ko kugurisha"],
  todayCash: ["Today's cash", "Amafaranga y'uyu munsi"],
  todayCredit: ["Today's credit", "Amadeni y'uyu munsi"],
  lowBanner: ["items are low on stock", "ibicuruzwa biri hafi gushira"],
  quantity: ["Quantity", "Ingano"],
  price: ["Price per unit", "Igiciro kimwe"],
  cash: ["Cash", "Amafaranga"],
  creditIdeni: ["Credit (Ideni)", "Ideni"],
  complete: ["Complete sale", "Emeza igurisha"],
  customer: ["Customer", "Umukiriya"],
  newCustomer: ["New customer", "Umukiriya mushya"],
  name: ["Name", "Izina"],
  phone: ["Phone", "Telefone"],
  total: ["Total", "Igiteranyo"],
  sold: ["Sale recorded", "Igurisha ryanditswe"],
  undo: ["Undo", "Siba"],
  owesMe: ["Customers who owe me", "Abakiriya Barimo Amadeni"],
  iOwe: ["Suppliers I owe", "Abo Mbereyemo Amadeni"],
  balance: ["Balance", "Asigaye"],
  recordPayment: ["Record payment", "Andika ubwishyu"],
  amount: ["Amount", "Amafaranga"],
  remind: ["Remind", "Ibutsa"],
  addProduct: ["Add product", "Ongeraho igicuruzwa"],
  edit: ["Edit", "Hindura"],
  save: ["Save", "Bika"],
  cancel: ["Cancel", "Reka"],
  category: ["Category", "Icyiciro"],
  unit: ["Unit", "Igipimo"],
  cost: ["Cost price", "Igiciro cyo kurangura"],
  sellPrice: ["Selling price", "Igiciro cyo kugurisha"],
  openingStock: ["Opening stock", "Ububiko bwo gutangira"],
  minAlert: ["Minimum alert level", "Urugero ntarengwa"],
  stockIn: ["Receive", "Rangura"],
  count: ["Count", "Bara"],
  counted: ["Counted on shelf", "Ibyabaruwe"],
  system: ["System", "Sisitemu"],
  fromSupplier: ["On credit from supplier (optional)", "Ku ideni ry'urangura (si ngombwa)"],
  none: ["None", "Ntawe"],
  days: ["days", "iminsi"],
  overdue: ["Overdue", "Byarenze igihe"],
  payments: ["Payments", "Ubwishyu"],
  noItems: ["Nothing here yet", "Nta kintu kirimo"],
  cashCollected: ["Cash collected", "Amafaranga yinjiye"],
  creditGiven: ["Credit given", "Amadeni yatanzwe"],
  today: ["Today", "Uyu munsi"],
  reversed: ["Reversed", "Byasubijwe"],
  online: ["Online", "Kuri murandasi"],
  offline: ["Offline", "Nta murandasi"],
  pending: ["saved on phone", "bibitswe kuri telefone"],
  shopName: ["Shop name", "Izina ry'iduka"],
  currency: ["Currency", "Ifaranga"],
  exportJson: ["Export backup (JSON)", "Bika kopi (JSON)"],
  exportCsv: ["Export sales (CSV)", "Bika igurisha (CSV)"],
  reloadDemo: ["Reload demo data", "Garura amakuru y'igerageza"],
  deleteProduct: ["Delete product", "Siba igicuruzwa"],
  confirmDelete: ["Delete this product type? Past sales stay in history.", "Siba iki gicuruzwa? Amakuru y'ubucuruzi asigala."],
  emptyShop: ["No products yet. Tap + to add your first real item.", "Nta bicuruzwa. Kanda + wongereho igicuruzwa cyawe."],
  reset: ["Factory reset (empty)", "Siba byose"],
  confirmReset: ["This deletes all data on this phone. Continue?", "Ibi bisiba amakuru yose. Ukomeze?"],
  addParty: ["Add person", "Ongeraho umuntu"],
  addDebtLbl: ["Add debt", "Ongeraho ideni"],
  description: ["Description", "Ibisobanuro"],
  supplier: ["Supplier", "Urangura"],
  dueIn: ["Credit period", "Igihe cy'ideni"],
  notEnough: ["Not enough stock", "Ububiko ntibuhagije"],
  profit: ["Profit", "Inyungu"],
} as const;

export type Key = keyof typeof dict;

export function reminderText(lang: Lang, name: string, amount: string, shop: string) {
  return lang === "rw"
    ? `Muraho ${name}, turabibutsa ko mufite ideni rya ${amount} muri ${shop}. Murakoze cyane!`
    : `Hello ${name}, a friendly reminder that you have a balance of ${amount} at ${shop}. Thank you!`;
}

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string }>({
  lang: "en",
  setLang: () => {},
  t: (k) => dict[k][0],
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const s = localStorage.getItem("sy-lang");
    if (s === "rw" || s === "en") setLangState(s);
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("sy-lang", l);
    document.documentElement.lang = l;
  };
  const t = (k: Key) => dict[k][lang === "en" ? 0 : 1];
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
