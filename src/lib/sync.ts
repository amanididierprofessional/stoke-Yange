/**
 * Offline-first sync: flush Dexie outbox to Supabase when online + signed in.
 * Call trySync() on boot and on window "online".
 */
import { db } from "./db";
import { supabase, supabaseConfigured } from "./supabase";

export async function trySync(): Promise<{ ok: boolean; reason?: string }> {
  if (!supabaseConfigured || !supabase) return { ok: false, reason: "not_configured" };
  if (!navigator.onLine) return { ok: false, reason: "offline" };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return { ok: false, reason: "no_session" };

  const userId = session.user.id;
  const pending = await db.outbox.orderBy("createdAt").toArray();
  if (pending.length === 0) return { ok: true };

  // Full snapshot push (simple + reliable for small shops)
  const [products, parties, sales, debts, payments, movements] = await Promise.all([
    db.products.toArray(),
    db.parties.toArray(),
    db.sales.toArray(),
    db.debts.toArray(),
    db.payments.toArray(),
    db.movements.toArray(),
  ]);

  const mapProduct = (p: (typeof products)[0]) => ({
    user_id: userId,
    local_id: p.id,
    name: p.name,
    category: p.category,
    unit: p.unit,
    cost: p.cost,
    price: p.price,
    stock: p.stock,
    min: p.min,
    emoji: p.emoji,
    updated_at: new Date(p.updatedAt).toISOString(),
  });

  const { error: pe } = await supabase.from("products").upsert(products.map(mapProduct), {
    onConflict: "user_id,local_id",
  });
  if (pe) return { ok: false, reason: pe.message };

  const { error: pae } = await supabase.from("parties").upsert(
    parties.map((p) => ({
      user_id: userId,
      local_id: p.id,
      name: p.name,
      phone: p.phone ?? "",
      kind: p.kind,
      created_at: new Date(p.createdAt).toISOString(),
    })),
    { onConflict: "user_id,local_id" },
  );
  if (pae) return { ok: false, reason: pae.message };

  const { error: se } = await supabase.from("sales").upsert(
    sales.map((s) => ({
      user_id: userId,
      local_id: s.id,
      product_local_id: s.productId,
      product_name: s.productName,
      qty: s.qty,
      unit_price: s.unitPrice,
      unit_cost: s.unitCost,
      total: s.total,
      type: s.type,
      party_local_id: s.partyId ?? null,
      created_at: new Date(s.createdAt).toISOString(),
      reversed: s.reversed ?? 0,
    })),
    { onConflict: "user_id,local_id" },
  );
  if (se) return { ok: false, reason: se.message };

  const { error: de } = await supabase.from("debts").upsert(
    debts.map((d) => ({
      user_id: userId,
      local_id: d.id,
      party_local_id: d.partyId,
      description: d.description,
      amount: d.amount,
      created_at: new Date(d.createdAt).toISOString(),
      sale_local_id: d.saleId ?? null,
    })),
    { onConflict: "user_id,local_id" },
  );
  if (de) return { ok: false, reason: de.message };

  const { error: paye } = await supabase.from("payments").upsert(
    payments.map((p) => ({
      user_id: userId,
      local_id: p.id,
      party_local_id: p.partyId,
      amount: p.amount,
      created_at: new Date(p.createdAt).toISOString(),
    })),
    { onConflict: "user_id,local_id" },
  );
  if (paye) return { ok: false, reason: paye.message };

  const { error: me } = await supabase.from("movements").upsert(
    movements.map((m) => ({
      user_id: userId,
      local_id: m.id,
      product_local_id: m.productId,
      type: m.type,
      qty: m.qty,
      unit_cost: m.unitCost ?? null,
      created_at: new Date(m.createdAt).toISOString(),
    })),
    { onConflict: "user_id,local_id" },
  );
  if (me) return { ok: false, reason: me.message };

  // Clear outbox after successful full push
  await db.outbox.clear();
  return { ok: true };
}
