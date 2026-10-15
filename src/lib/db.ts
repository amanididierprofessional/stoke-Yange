import Dexie, { type Table } from "dexie";

export type Product = {
  id?: number;
  name: string;
  category: string;
  unit: string;
  cost: number;
  price: number;
  stock: number;
  min: number;
  emoji: string;
  /** Optional photo URL */
  image?: string | undefined;
  /** Optional colour hex (apparel variants) */
  color?: string | undefined;
  updatedAt: number;
};
export type SaleType = "cash" | "credit";
export type Sale = {
  id?: number;
  productId: number;
  productName: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
  total: number;
  type: SaleType;
  partyId?: number | undefined;
  createdAt: number;
  reversed?: 0 | 1;
};
export type PartyKind = "customer" | "supplier";
export type Party = { id?: number; name: string; phone: string; kind: PartyKind; createdAt: number };
export type Debt = {
  id?: number;
  partyId: number;
  description: string;
  amount: number;
  createdAt: number;
  saleId?: number;
  dueDays?: number;
};
export type Payment = { id?: number; partyId: number; amount: number; createdAt: number };
export type Movement = {
  id?: number;
  productId: number;
  type: "in" | "sale" | "adjust" | "reverse" | "open";
  qty: number;
  unitCost?: number;
  createdAt: number;
};
export type Outbox = { id?: number; op: string; createdAt: number };
export type Setting = { key: string; value: string };

class StokeDB extends Dexie {
  products!: Table<Product, number>;
  sales!: Table<Sale, number>;
  parties!: Table<Party, number>;
  debts!: Table<Debt, number>;
  payments!: Table<Payment, number>;
  movements!: Table<Movement, number>;
  outbox!: Table<Outbox, number>;
  settings!: Table<Setting, string>;
  constructor() {
    super("stoke-yange");
    this.version(1).stores({
      products: "++id, name, category",
      sales: "++id, productId, createdAt, type, partyId",
      parties: "++id, kind, name",
      debts: "++id, partyId, createdAt",
      payments: "++id, partyId, createdAt",
      movements: "++id, productId, createdAt",
      outbox: "++id, createdAt",
      settings: "key",
    });
  }
}

export const db = new StokeDB();

export const CATEGORIES = [
  "Food",
  "Cooking",
  "Seasonings",
  "Beverages",
  "Daily use",
  "School",
  "Household",
  "Airtime",
  "Clothes",
  "Shoes",
  "Grains & Flour",
  "Snacks",
  "Toiletries",
];
export const UNITS = ["pcs", "kg", "pack", "bottle", "crate", "litre", "sack"];

export const PRODUCT_EMOJIS = [
  "📦", "🥛", "🍺", "🥤", "💧", "🧃", "☕", "🍵",
  "🌾", "🍚", "🍙", "🍞", "🥚", "🧀", "🫒", "🧂",
  "🍪", "🍫", "🍬", "🌶️", "🍎", "🍌", "🥕", "🧅",
  "🧼", "🪥", "🧴", "🧻", "🧽", "🧹",
  "📱", "📶", "🔋", "💡", "🕯️", "🔦",
  "🍼", "👗", "👟", "✏️", "📒", "🧸", "👕", "👖", "🧥",
];

export async function ensureSeeded() {
  const s = await db.settings.get("initialized");
  if (!s) {
    await db.settings.put({ key: "initialized", value: "1" });
  }
}

export async function seedDemo() {
  const H = 3600_000;
  const D = 24 * H;
  const now = Date.now();
  const SEED: Omit<Product, "updatedAt">[] = [
    { name: "Inyange Milk 500ml", category: "Beverages", unit: "pcs", cost: 400, price: 500, stock: 24, min: 6, emoji: "🥛" },
    { name: "Primus 72cl", category: "Beverages", unit: "bottle", cost: 900, price: 1100, stock: 18, min: 6, emoji: "🍺" },
    { name: "Inyange Water 1.5L", category: "Beverages", unit: "bottle", cost: 450, price: 600, stock: 3, min: 5, emoji: "💧" },
    { name: "Fanta Citron 30cl", category: "Beverages", unit: "bottle", cost: 380, price: 500, stock: 30, min: 8, emoji: "🥤" },
    { name: "Azam Wheat Flour 2kg", category: "Grains & Flour", unit: "pack", cost: 2400, price: 2800, stock: 10, min: 3, emoji: "🌾" },
    { name: "Minerval Sugar 1kg", category: "Grains & Flour", unit: "kg", cost: 1300, price: 1500, stock: 2, min: 4, emoji: "🍚" },
    { name: "Rice (Kigori) 1kg", category: "Grains & Flour", unit: "kg", cost: 1100, price: 1300, stock: 40, min: 10, emoji: "🍙" },
    { name: "Akabanga Pili Pili", category: "Snacks", unit: "pcs", cost: 700, price: 1000, stock: 15, min: 4, emoji: "🌶️" },
    { name: "Biscuits Glucose", category: "Snacks", unit: "pack", cost: 150, price: 200, stock: 48, min: 12, emoji: "🍪" },
    { name: "Colgate 100ml", category: "Toiletries", unit: "pcs", cost: 1000, price: 1300, stock: 8, min: 3, emoji: "🪥" },
    { name: "Soap Bar (Isabune)", category: "Toiletries", unit: "pcs", cost: 400, price: 500, stock: 20, min: 6, emoji: "🧼" },
    { name: "MTN Airtime 1000", category: "Airtime", unit: "pcs", cost: 950, price: 1000, stock: 25, min: 5, emoji: "📱" },
    { name: "Airtel Airtime 500", category: "Airtime", unit: "pcs", cost: 475, price: 500, stock: 12, min: 5, emoji: "📶" },
    { name: "Cooking Oil 1L", category: "Household", unit: "litre", cost: 2600, price: 3000, stock: 6, min: 2, emoji: "🫒" },
    { name: "Candles (pack 6)", category: "Household", unit: "pack", cost: 500, price: 700, stock: 1, min: 3, emoji: "🕯️" },
  ];
  await db.transaction("rw", [db.products, db.parties, db.debts, db.payments, db.sales, db.movements, db.settings], async () => {
    const ids = await db.products.bulkAdd(SEED.map((p) => ({ ...p, updatedAt: now })), { allKeys: true });
    await db.movements.bulkAdd(
      SEED.map((p, i) => ({ productId: ids[i]!, type: "open" as const, qty: p.stock, unitCost: p.cost, createdAt: now - 7 * D })),
    );
    const c1 = await db.parties.add({ name: "Mukamana Claudine", phone: "0788123456", kind: "customer", createdAt: now - 20 * D });
    const c2 = await db.parties.add({ name: "Habimana Eric", phone: "0722987654", kind: "customer", createdAt: now - 5 * D });
    const s1 = await db.parties.add({ name: "Inyange Distributor", phone: "0788555111", kind: "supplier", createdAt: now - 10 * D });
    await db.debts.bulkAdd([
      { partyId: c1, description: "2 × Azam Wheat Flour 2kg", amount: 5600, createdAt: now - 18 * D, dueDays: 7 },
      { partyId: c1, description: "3 × Minerval Sugar 1kg", amount: 4500, createdAt: now - 9 * D, dueDays: 7 },
      { partyId: c2, description: "4 × Primus 72cl", amount: 4400, createdAt: now - 3 * D, dueDays: 14 },
      { partyId: s1, description: "Milk delivery (48 pcs)", amount: 19200, createdAt: now - 6 * D, dueDays: 14 },
    ]);
    await db.payments.add({ partyId: c1, amount: 3000, createdAt: now - 4 * D });
    await db.sales.bulkAdd([
      { productId: ids[0]!, productName: SEED[0]!.name, qty: 2, unitPrice: 500, unitCost: 400, total: 1000, type: "cash", createdAt: now - 2 * H },
      { productId: ids[8]!, productName: SEED[8]!.name, qty: 5, unitPrice: 200, unitCost: 150, total: 1000, type: "cash", createdAt: now - 1 * H },
      { productId: ids[11]!, productName: SEED[11]!.name, qty: 1, unitPrice: 1000, unitCost: 950, total: 1000, type: "cash", createdAt: now - D },
    ]);
    await db.settings.put({ key: "initialized", value: "1" });
  });
}

export async function factoryReset(withDemo: boolean) {
  await db.transaction("rw", db.tables, async () => {
    for (const t of db.tables) if (t.name !== "settings") await t.clear();
    await db.settings.delete("initialized");
    await db.settings.delete("seeded");
  });
  if (withDemo) await seedDemo();
  else await db.settings.put({ key: "initialized", value: "1" });
}
