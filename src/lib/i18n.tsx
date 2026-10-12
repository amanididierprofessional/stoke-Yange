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
  welcomeTitle: ["Welcome to Stoke Yange", "Murakaza neza kuri Stoke Yange"],
  welcomeBody: ["Sign in to back up your shop to the cloud. You can skip and work offline.", "Injira kugira ngo ubike iduka yawe kuri cloud. Urashobora gusiga ukakoresha nta murandasi."],
  continueGoogle: ["Continue with Google", "Komeza na Google"],
  email: ["Email", "Imeyili"],
  password: ["Password", "Ijambo ry'ibanga"],
  signIn: ["Sign in", "Injira"],
  signUp: ["Sign up", "Iyandikishe"],
  skipForNow: ["Skip for now — use offline", "Siga ubu — koresha nta murandasi"],
  skipHint: ["Your sales stay on this phone until you sign in and sync.", "Igurisha ryawe riba kuri telefone kugeza winjiye ukoherereze."],
  signedIn: ["Signed in", "Winjiye"],
  checkEmail: ["Check your email to confirm, then sign in", "Reba imeyili yawe, hanyuma winjire"],
  cloudAdvice: ["Create a free account so your stock and sales sync online. If this phone is lost, you can restore on another device.", "Kora konti y'ubuntu kugira ngo ububiko n'igurisha bigende kuri cloud. Niba telefone yaraye, ushobora kugarura kuri indi."],
  defaults: ["Defaults", "Ibisanzwe"],
  defaultsTitle: ["Quick-add products", "Ongeramo ibicuruzwa byihuse"],
  defaultsHint: ["Tap Add — items appear with zero stock. Open them to set cost and sell price.", "Kanda Ongeraho — bigaragara n'ububiko 0. Fungura ushyiremo ibiciro."],
  addDefault: ["Add", "Ongeraho"],
  addedDefault: ["Added — set prices in stock", "Byongewe — shyiramo ibiciro muri stock"],
  alreadyHave: ["Already in stock", "Birimo"],
  continue: ["Continue", "Komeza"],
  reenterPassword: ["Re-enter password", "Ongera ushyire ijambo ry'ibanga"],
  fullName: ["Your name", "Izina ryawe"],
  businessName: ["Business name", "Izina ry'iduka"],
  age: ["Age", "Imyaka"],
  submit: ["Submit", "Ohereza"],
  welcomeBtn: ["Welcome!", "Murakaza neza!"],
  needSignUp: ["No account? Sign up", "Nta konti? Iyandikishe"],
  needLogin: ["Have an account? Sign in", "Ufite konti? Injira"],
  badLogin: ["Wrong phone/email or password", "Telefone/imeyili cyangwa ijambo ntabwo aribyo"],
  passwordMismatch: ["Passwords do not match", "Amagambo y'ibanga ntabwo ahura"],
  forgotPassword: ["Forgot password?", "Wibagiwe ijambo ry'ibanga?"],
  recoverTitle: ["Verify it's you", "Emeza ko uri wowe"],
  recoverHint: ["Enter name, business and age you used at sign-up", "Andika izina, iduka n'imyaka wakoresheje"],
  loginHint: ["Sign in with phone or email", "Injira ukoresheje telefone cyangwa imeyili"],
  signupHint: ["Create your shop account", "Kora konti y'iduka yawe"],
  verifyFail: ["Details do not match", "Amakuru ntabwo ahura"],
  newPassword: ["New password", "Ijambo ry'ibanga rishya"],
  selectedTotal: ["Selected sales total", "Igiteranyo cyatoranyijwe"],
  itemsSelected: ["items selected", "byatoranyijwe"],
  logout: ["Log out", "Sohoka"],
  signedOut: ["Logged out", "Wasohotse"],
  syncNow: ["Sync to cloud now", "Ohereza kuri cloud"],
  synced: ["Synced to cloud", "Byoherejwe kuri cloud"],
  contactDev: ["Need help?", "Ukeneye ubufasha?"],
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
