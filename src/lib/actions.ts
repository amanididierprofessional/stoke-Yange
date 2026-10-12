import { db, type Product, type SaleType, type PartyKind } from "./db";

export const UNDO_WINDOW_MS = 10 * 60 * 1000;

const queue = (op: string) => db.outbox.add({ op, createdAt: Date.now() });

export function computeSale(qty: number, unitPrice: number) {
  if (!Number.isFinite(qty) || qty <= 0) throw new Error("Quantity must be positive");
  if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error("Price invalid");
  return Math.round(qty * unitPrice);
}

export async function recordSale(opts: {
  productId: number;
  qty: number;
  unitPrice: number;
  type: SaleType;
  partyId?: number | undefined;
}) {
  const now = Date.now();
  return db.transaction("rw", [db.products, db.sales, db.movements, db.debts, db.outbox], async () => {
    const p = await db.products.get(opts.productId);
    if (!p) throw new Error("Product not found");
    if (opts.qty > p.stock) throw new Error("Not enough stock");
    const total = computeSale(opts.qty, opts.unitPrice);
    const saleId = await db.sales.add({
      productId: p.id!, productName: p.name, qty: opts.qty, unitPrice: opts.unitPrice, unitCost: p.cost,
      total, type: opts.type, partyId: opts.partyId, createdAt: now, reversed: 0,
    });
    await db.products.update(p.id!, { stock: p.stock - opts.qty, updatedAt: now });
    await db.movements.add({ productId: p.id!, type: "sale", qty: -opts.qty, createdAt: now });
    if (opts.type === "credit") {
      if (!opts.partyId) throw new Error("Customer required");
      await db.debts.add({ partyId: opts.partyId, description: `${opts.qty} × ${p.name}`, amount: total, createdAt: now, saleId });
    }
    await queue("sale");
    return saleId;
  });
}

export async function reverseSale(saleId: number) {
  return db.transaction("rw", [db.products, db.sales, db.movements, db.debts, db.outbox], async () => {
    const s = await db.sales.get(saleId);
    if (!s || s.reversed) throw new Error("Already reversed");
    if (Date.now() - s.createdAt > UNDO_WINDOW_MS) throw new Error("Undo window passed");
    const p = await db.products.get(s.productId);
    if (p) await db.products.update(p.id!, { stock: p.stock + s.qty, updatedAt: Date.now() });
    await db.movements.add({ productId: s.productId, type: "reverse", qty: s.qty, createdAt: Date.now() });
    await db.sales.update(saleId, { reversed: 1 });
    await db.debts.where("partyId").equals(s.partyId ?? -1).filter((d) => d.saleId === saleId).delete();
    await queue("reverse");
  });
}

export async function saveProduct(p: Omit<Product, "updatedAt">) {
  const now = Date.now();
  if (p.id) {
    await db.products.update(p.id, { ...p, updatedAt: now });
  } else {
    const id = await db.products.add({ ...p, updatedAt: now });
    if (p.stock > 0) await db.movements.add({ productId: id, type: "open", qty: p.stock, unitCost: p.cost, createdAt: now });
  }
  await queue("product");
}

/** Remove a product type from the catalogue (keeps past sales history). */
export async function deleteProduct(productId: number) {
  await db.transaction("rw", [db.products, db.movements, db.outbox], async () => {
    const p = await db.products.get(productId);
    if (!p) throw new Error("Product not found");
    await db.products.delete(productId);
    await queue("productDelete");
  });
}

export async function stockIn(productId: number, qty: number, unitCost: number, supplierId?: number) {
  const now = Date.now();
  await db.transaction("rw", [db.products, db.movements, db.debts, db.outbox], async () => {
    const p = await db.products.get(productId);
    if (!p || qty <= 0) throw new Error("Invalid");
    const newStock = p.stock + qty;
    const avg = Math.round((p.stock * p.cost + qty * unitCost) / newStock);
    await db.products.update(productId, { stock: newStock, cost: avg, updatedAt: now });
    await db.movements.add({ productId, type: "in", qty, unitCost, createdAt: now });
    if (supplierId) await db.debts.add({ partyId: supplierId, description: `${qty} × ${p.name}`, amount: qty * unitCost, createdAt: now, dueDays: 14 });
    await queue("stockIn");
  });
}

export async function adjustCount(productId: number, counted: number) {
  const now = Date.now();
  await db.transaction("rw", [db.products, db.movements, db.outbox], async () => {
    const p = await db.products.get(productId);
    if (!p || counted < 0) throw new Error("Invalid");
    const diff = counted - p.stock;
    if (diff === 0) return;
    await db.products.update(productId, { stock: counted, updatedAt: now });
    await db.movements.add({ productId, type: "adjust", qty: diff, createdAt: now });
    await queue("adjust");
  });
}

export async function addParty(name: string, phone: string, kind: PartyKind) {
  const id = await db.parties.add({ name: name.trim(), phone: phone.trim(), kind, createdAt: Date.now() });
  await queue("party");
  return id;
}

export async function addDebt(partyId: number, description: string, amount: number) {
  await db.debts.add({ partyId, description, amount, createdAt: Date.now(), dueDays: 14 });
  await queue("debt");
}

export async function recordPayment(partyId: number, amount: number, createdAt = Date.now()) {
  if (amount <= 0) throw new Error("Invalid amount");
  await db.payments.add({ partyId, amount, createdAt });
  await queue("payment");
}

export const fmt = (n: number) => `${Math.round(n).toLocaleString("en-US")} RWF`;
