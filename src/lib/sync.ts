/**
 * Offline-first sync: push Dexie → Supabase when online + signed in.
 * pullFromCloud: restore products/sales/etc. after cloud login on empty device.
 */
import { db } from "./db";
import { ensureSupabase, supabaseConfigured } from "./supabase";

let running: Promise<{ ok: boolean; reason?: string }> | null = null;
let again = false;
/** Serialised: one sync at a time; actions during a sync trigger one more pass. */
export function trySync(): Promise<{ ok: boolean; reason?: string }> {
  if (running) { again = true; return running; }
  running = doSync().finally(() => {
    running = null;
    if (again) { again = false; trySync().catch(() => {}); }
  });
  return running;
}

async function doSync(): Promise<{ ok: boolean; reason?: string }> {
  if (!supabaseConfigured) return { ok: false, reason: "not_configured" };
  if (!navigator.onLine) return { ok: false, reason: "offline" };

  const client = await ensureSupabase();
  if (!client) return { ok: false, reason: "not_configured" };

  let session;
  try {
    const res = await client.auth.getSession();
    session = res.data?.session;
  } catch {
    return { ok: false, reason: "auth_error" };
  }
  if (!session?.user) return { ok: false, reason: "no_session" };

  const userId = session.user.id;

  // Profile
  try {
    const accRow = await db.settings.get("account");
    const shop = (await db.settings.get("shopName"))?.value ?? "Iduka Ryanjye";
    let full_name = "";
    let age = "";
    let phone = "";
    let email: string | null = session.user.email ?? null;
    if (accRow?.value) {
      try {
        const a = JSON.parse(accRow.value);
        full_name = a.fullName ?? "";
        age = a.age ?? "";
        phone = a.loginType === "phone" ? a.identifier : "";
        if (a.loginType === "email") email = a.identifier;
      } catch {
        /* */
      }
    }
    const { error: profileErr } = await client.from("profiles").upsert({
      id: userId,
      shop_name: shop,
      full_name,
      age,
      phone,
      email,
      updated_at: new Date().toISOString(),
    });
    if (profileErr) console.warn("[sync] profile", profileErr.message);
  } catch (e) {
    console.warn("[sync] profile", e);
  }

  const pending = await db.outbox.orderBy("createdAt").toArray();
  // Still push full snapshot when outbox has work OR always push if we have local data
  const [products, parties, sales, debts, payments, movements] = await Promise.all([
    db.products.toArray(),
    db.parties.toArray(),
    db.sales.toArray(),
    db.debts.toArray(),
    db.payments.toArray(),
    db.movements.toArray(),
  ]);

  // Propagate local deletions first
  for (const row of pending) {
    const m = /^del:(products|debts):(\d+)$/.exec(row.op);
    if (!m) continue;
    const { error } = await client.from(m[1]!).delete().eq("user_id", userId).eq("local_id", Number(m[2]));
    if (error) return { ok: false, reason: error.message };
  }

  if (products.length === 0 && parties.length === 0 && sales.length === 0 && pending.length === 0) {
    return { ok: true };
  }

  if (products.length) {
    const { error: pe } = await client.from("products").upsert(
      products.map((p) => ({
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
      })),
      { onConflict: "user_id,local_id" },
    );
    if (pe) {
      console.warn("[sync] products", pe.message);
      return { ok: false, reason: pe.message };
    }
  }

  if (parties.length) {
    const { error: pae } = await client.from("parties").upsert(
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
    if (pae) {
      console.warn("[sync] parties", pae.message);
      return { ok: false, reason: pae.message };
    }
  }

  if (sales.length) {
    const { error: se } = await client.from("sales").upsert(
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
    if (se) {
      console.warn("[sync] sales", se.message);
      return { ok: false, reason: se.message };
    }
  }

  if (debts.length) {
    const { error: de } = await client.from("debts").upsert(
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
    if (de) console.warn("[sync] debts", de.message);
  }

  if (payments.length) {
    const { error: paye } = await client.from("payments").upsert(
      payments.map((p) => ({
        user_id: userId,
        local_id: p.id,
        party_local_id: p.partyId,
        amount: p.amount,
        created_at: new Date(p.createdAt).toISOString(),
      })),
      { onConflict: "user_id,local_id" },
    );
    if (paye) console.warn("[sync] payments", paye.message);
  }

  if (movements.length) {
    const { error: me } = await client.from("movements").upsert(
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
    if (me) console.warn("[sync] movements", me.message);
  }

  const ids = pending.map((p) => p.id!).filter(Boolean);
  if (ids.length) await db.outbox.bulkDelete(ids);
  return { ok: true };
}

/** After cloud login on empty device: download user's rows into Dexie. */
export async function pullFromCloud(): Promise<{ ok: boolean; reason?: string }> {
  if (!supabaseConfigured || !navigator.onLine) return { ok: false, reason: "offline" };
  const client = await ensureSupabase();
  if (!client) return { ok: false, reason: "not_configured" };

  const { data: sess } = await client.auth.getSession();
  const userId = sess.session?.user?.id;
  if (!userId) return { ok: false, reason: "no_session" };

  const localCount = await db.products.count();
  // Only full-replace when local shop is empty (avoid wiping newer local work)
  if (localCount > 0) return { ok: true, reason: "local_has_data" };

  const { data: products, error: pe } = await client.from("products").select("*").eq("user_id", userId);
  if (pe) return { ok: false, reason: pe.message };
  if (!products?.length) return { ok: true };

  const { data: parties } = await client.from("parties").select("*").eq("user_id", userId);
  const { data: sales } = await client.from("sales").select("*").eq("user_id", userId);
  const { data: debts } = await client.from("debts").select("*").eq("user_id", userId);
  const { data: payments } = await client.from("payments").select("*").eq("user_id", userId);
  const { data: movements } = await client.from("movements").select("*").eq("user_id", userId);

  await db.transaction("rw", [db.products, db.parties, db.sales, db.debts, db.payments, db.movements], async () => {
    await db.products.clear();
    await db.parties.clear();
    await db.sales.clear();
    await db.debts.clear();
    await db.payments.clear();
    await db.movements.clear();

    if (products?.length) {
      await db.products.bulkAdd(
        products.map((p) => ({
          id: Number(p.local_id),
          name: p.name,
          category: p.category,
          unit: p.unit,
          cost: Number(p.cost),
          price: Number(p.price),
          stock: Number(p.stock),
          min: Number(p.min),
          emoji: p.emoji || "📦",
          updatedAt: p.updated_at ? new Date(p.updated_at).getTime() : Date.now(),
        })),
      );
    }
    if (parties?.length) {
      await db.parties.bulkAdd(
        parties.map((p) => ({
          id: Number(p.local_id),
          name: p.name,
          phone: p.phone || "",
          kind: p.kind,
          createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
        })),
      );
    }
    if (sales?.length) {
      await db.sales.bulkAdd(
        sales.map((s) => ({
          id: Number(s.local_id),
          productId: Number(s.product_local_id),
          productName: s.product_name,
          qty: Number(s.qty),
          unitPrice: Number(s.unit_price),
          unitCost: Number(s.unit_cost),
          total: Number(s.total),
          type: s.type,
          partyId: s.party_local_id != null ? Number(s.party_local_id) : undefined,
          createdAt: s.created_at ? new Date(s.created_at).getTime() : Date.now(),
          reversed: (s.reversed ? 1 : 0) as 0 | 1,
        })),
      );
    }
    if (debts?.length) {
      await db.debts.bulkAdd(
        debts.map((d) => ({
          id: Number(d.local_id),
          partyId: Number(d.party_local_id),
          description: d.description || "",
          amount: Number(d.amount),
          createdAt: d.created_at ? new Date(d.created_at).getTime() : Date.now(),
          saleId: d.sale_local_id != null ? Number(d.sale_local_id) : undefined,
        })),
      );
    }
    if (payments?.length) {
      await db.payments.bulkAdd(
        payments.map((p) => ({
          id: Number(p.local_id),
          partyId: Number(p.party_local_id),
          amount: Number(p.amount),
          createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
        })),
      );
    }
    if (movements?.length) {
      await db.movements.bulkAdd(
        movements.map((m) => ({
          id: Number(m.local_id),
          productId: Number(m.product_local_id),
          type: m.type,
          qty: Number(m.qty),
          unitCost: m.unit_cost != null ? Number(m.unit_cost) : undefined,
          createdAt: m.created_at ? new Date(m.created_at).getTime() : Date.now(),
        })),
      );
    }
  });

  return { ok: true };
}
