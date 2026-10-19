/**
 * Offline-first sync: push Dexie → Supabase, pull Supabase → Dexie.
 * fullSync = push then force-pull (multi-device / same business account).
 * checkRemoteAhead = lightweight “other phone has newer data” detector for the sync pill.
 * blockCloudPull = set after “clear phone only” so auto-sync does not refill the shop.
 */
import { db } from "./db";
import { ensureSupabase, supabaseConfigured } from "./supabase";

let running: Promise<{ ok: boolean; reason?: string }> | null = null;
let again = false;
let forceAgain = false;
let syncPaused = false;

export async function pauseSync(): Promise<() => void> {
  syncPaused = true;
  const active = running;
  if (active) {
    try {
      await active;
    } catch {
      /* */
    }
  }
  return () => {
    syncPaused = false;
  };
}

export function trySync(opts?: { force?: boolean; pushOnly?: boolean }): Promise<{ ok: boolean; reason?: string }> {
  if (syncPaused) return Promise.resolve({ ok: false, reason: "reset_in_progress" });
  if (running) {
    again = true;
    if (opts?.force) forceAgain = true;
    return running;
  }
  running = (async () => {
    if (!opts?.force) {
      const mode = (await db.settings.get("cloudSyncMode"))?.value;
      if (mode !== "auto") return { ok: false, reason: "manual_mode" };
    }
    if (opts?.pushOnly) return doPush();
    return doFullSync({ allowBlockedPull: false });
  })().finally(() => {
    running = null;
    if (again) {
      again = false;
      const force = forceAgain;
      forceAgain = false;
      trySync({ force }).catch(() => {});
    }
  });
  return running;
}

/** User-triggered sync always clears the phone-only clear block and may pull. */
export async function fullSync(): Promise<{ ok: boolean; reason?: string; pulled?: number }> {
  if (syncPaused) return { ok: false, reason: "reset_in_progress" };
  if (running) {
    try {
      await running;
    } catch {
      /* */
    }
  }
  if (syncPaused) return { ok: false, reason: "reset_in_progress" };

  // Manual Sync means the user wants cloud data again
  await db.settings.delete("blockCloudPull");

  running = (async () => doFullSync({ allowBlockedPull: true }))().finally(() => {
    running = null;
  });

  return running as Promise<{ ok: boolean; reason?: string; pulled?: number }>;
}

async function isPullBlocked(): Promise<boolean> {
  const row = await db.settings.get("blockCloudPull");
  return row?.value === "1";
}

async function doFullSync(opts: { allowBlockedPull: boolean }): Promise<{ ok: boolean; reason?: string; pulled?: number }> {
  const push = await doPush();
  if (!navigator.onLine) return push;
  if (push.reason === "no_session" || push.reason === "not_configured" || push.reason === "offline") {
    return push;
  }

  if (!opts.allowBlockedPull && (await isPullBlocked())) {
    console.info("[sync] skip pull — phone-only clear active until user taps Sync");
    return { ok: true, reason: "pull_blocked_after_local_clear", pulled: 0 };
  }

  const localCount = await db.products.count();
  if (!push.ok && localCount > 0) {
    console.warn("[sync] skip force-pull after failed push", push.reason);
    return { ok: false, reason: push.reason };
  }

  const pull = await pullFromCloud({ force: true });
  if (!pull.ok) return { ok: false, reason: pull.reason ?? "pull_failed", pulled: pull.pulled };
  await db.settings.put({ key: "lastFullSyncAt", value: String(Date.now()) });
  return { ok: true, pulled: pull.pulled };
}

export async function clearShopTables() {
  await db.transaction(
    "rw",
    [db.products, db.parties, db.sales, db.debts, db.payments, db.movements, db.outbox],
    async () => {
      await db.products.clear();
      await db.parties.clear();
      await db.sales.clear();
      await db.debts.clear();
      await db.payments.clear();
      await db.movements.clear();
      await db.outbox.clear();
    },
  );
}

/** Wipe shop data on this phone only; keep account/session. Blocks auto cloud refill. */
export async function clearLocalShopKeepAccount() {
  await clearShopTables();
  await db.settings.delete("seeded");
  await db.settings.put({ key: "initialized", value: "1" });
  // Prevent AppShell auto fullSync from immediately restoring cloud data
  await db.settings.put({ key: "blockCloudPull", value: "1" });
  await db.settings.put({ key: "cloudSyncMode", value: "manual" });
}

/** Snapshot of local shop size for remote comparison. */
async function localFingerprint() {
  const [products, sales, debts, payments, parties] = await Promise.all([
    db.products.toArray(),
    db.sales.toArray(),
    db.debts.toArray(),
    db.payments.toArray(),
    db.parties.toArray(),
  ]);
  const maxProduct = products.reduce((m, p) => Math.max(m, p.updatedAt || 0), 0);
  const maxSale = sales.reduce((m, s) => Math.max(m, s.createdAt || 0), 0);
  const maxDebt = debts.reduce((m, d) => Math.max(m, d.createdAt || 0), 0);
  const maxPay = payments.reduce((m, p) => Math.max(m, p.createdAt || 0), 0);
  return {
    productCount: products.length,
    saleCount: sales.length,
    debtCount: debts.length,
    paymentCount: payments.length,
    partyCount: parties.length,
    maxTs: Math.max(maxProduct, maxSale, maxDebt, maxPay),
  };
}

/**
 * Returns true when cloud has more rows or a newer timestamp than this phone.
 * Used for the top “New changes — Sync” pill (manual mode, reconnect, lag behind auto).
 */
export async function checkRemoteAhead(): Promise<{ ahead: boolean; reason?: string }> {
  if (!supabaseConfigured || !navigator.onLine) return { ahead: false, reason: "offline" };
  if (await isPullBlocked()) {
    // After phone-only clear, cloud is “ahead” by design — show pill so user can restore
    const local = await localFingerprint();
    if (local.productCount === 0 && local.saleCount === 0) {
      return { ahead: true, reason: "local_cleared" };
    }
  }
  const client = await ensureSupabase();
  if (!client) return { ahead: false, reason: "not_configured" };

  const { data: sess } = await client.auth.getSession();
  const userId = sess.session?.user?.id;
  if (!userId) return { ahead: false, reason: "no_session" };

  try {
    const local = await localFingerprint();
    const [pr, sa, de, pa, pt] = await Promise.all([
      client.from("products").select("local_id, updated_at").eq("user_id", userId),
      client.from("sales").select("local_id, created_at").eq("user_id", userId),
      client.from("debts").select("local_id, created_at").eq("user_id", userId),
      client.from("payments").select("local_id, created_at").eq("user_id", userId),
      client.from("parties").select("local_id, created_at").eq("user_id", userId),
    ]);
    if (pr.error || sa.error || de.error || pa.error || pt.error) {
      return { ahead: false, reason: "query_error" };
    }

    const remoteProductCount = pr.data?.length ?? 0;
    const remoteSaleCount = sa.data?.length ?? 0;
    const remoteDebtCount = de.data?.length ?? 0;
    const remotePayCount = pa.data?.length ?? 0;
    const remotePartyCount = pt.data?.length ?? 0;

    const remoteMax = Math.max(
      ...(pr.data ?? []).map((r) => (r.updated_at ? new Date(r.updated_at).getTime() : 0)),
      ...(sa.data ?? []).map((r) => (r.created_at ? new Date(r.created_at).getTime() : 0)),
      ...(de.data ?? []).map((r) => (r.created_at ? new Date(r.created_at).getTime() : 0)),
      ...(pa.data ?? []).map((r) => (r.created_at ? new Date(r.created_at).getTime() : 0)),
      0,
    );

    const moreRows =
      remoteProductCount > local.productCount ||
      remoteSaleCount > local.saleCount ||
      remoteDebtCount > local.debtCount ||
      remotePayCount > local.paymentCount ||
      remotePartyCount > local.partyCount;

    const newer = remoteMax > local.maxTs + 5000;

    return { ahead: moreRows || newer };
  } catch (e) {
    console.warn("[sync] checkRemoteAhead", e);
    return { ahead: false, reason: String(e) };
  }
}

async function doPush(): Promise<{ ok: boolean; reason?: string }> {
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
    if (profileErr) return { ok: false, reason: `profile: ${profileErr.message}` };
  } catch (e) {
    return { ok: false, reason: `profile: ${String(e)}` };
  }

  // After phone-only clear we must NOT push empty tables over cloud data
  if (await isPullBlocked()) {
    const n =
      (await db.products.count()) +
      (await db.parties.count()) +
      (await db.sales.count()) +
      (await db.debts.count());
    if (n === 0) {
      return { ok: true, reason: "skip_empty_push_after_local_clear" };
    }
  }

  const pending = await db.outbox.orderBy("createdAt").toArray();
  const [products, parties, sales, debts, payments, movements] = await Promise.all([
    db.products.toArray(),
    db.parties.toArray(),
    db.sales.toArray(),
    db.debts.toArray(),
    db.payments.toArray(),
    db.movements.toArray(),
  ]);

  for (const row of pending) {
    const m = /^del:(products|debts|parties):(\d+)$/.exec(row.op);
    if (!m) continue;
    const { error } = await client.from(m[1]!).delete().eq("user_id", userId).eq("local_id", Number(m[2]));
    if (error) return { ok: false, reason: error.message };
  }

  if (
    products.length === 0 &&
    parties.length === 0 &&
    sales.length === 0 &&
    debts.length === 0 &&
    payments.length === 0 &&
    movements.length === 0 &&
    pending.length === 0
  ) {
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
    if (pe) return { ok: false, reason: pe.message };
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
    if (pae) return { ok: false, reason: pae.message };
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
    if (se) return { ok: false, reason: se.message };
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
        due_days: d.dueDays ?? null,
      })),
      { onConflict: "user_id,local_id" },
    );
    if (de) return { ok: false, reason: `debts: ${de.message}` };
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
    if (paye) return { ok: false, reason: `payments: ${paye.message}` };
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
    if (me) return { ok: false, reason: `movements: ${me.message}` };
  }

  const ids = pending.map((p) => p.id!).filter(Boolean);
  if (ids.length) await db.outbox.bulkDelete(ids);
  return { ok: true };
}

export async function pullFromCloud(opts?: {
  force?: boolean;
}): Promise<{ ok: boolean; reason?: string; pulled?: number }> {
  if (!supabaseConfigured || !navigator.onLine) return { ok: false, reason: "offline" };
  if (await isPullBlocked()) return { ok: false, reason: "pull_blocked_after_local_clear", pulled: 0 };

  const client = await ensureSupabase();
  if (!client) return { ok: false, reason: "not_configured" };

  const { data: sess } = await client.auth.getSession();
  const userId = sess.session?.user?.id;
  if (!userId) return { ok: false, reason: "no_session" };

  const force = opts?.force === true;
  const localCount = await db.products.count();
  if (!force && localCount > 0) return { ok: true, reason: "local_has_data", pulled: 0 };

  const [productRes, partyRes, saleRes, debtRes, paymentRes, movementRes] = await Promise.all([
    client.from("products").select("*").eq("user_id", userId),
    client.from("parties").select("*").eq("user_id", userId),
    client.from("sales").select("*").eq("user_id", userId),
    client.from("debts").select("*").eq("user_id", userId),
    client.from("payments").select("*").eq("user_id", userId),
    client.from("movements").select("*").eq("user_id", userId),
  ]);
  const failed = [productRes, partyRes, saleRes, debtRes, paymentRes, movementRes].find((r) => r.error);
  if (failed?.error) return { ok: false, reason: failed.error.message };
  const products = productRes.data;
  const parties = partyRes.data;
  const sales = saleRes.data;
  const debts = debtRes.data;
  const payments = paymentRes.data;
  const movements = movementRes.data;

  await db.transaction("rw", [db.products, db.parties, db.sales, db.debts, db.payments, db.movements, db.outbox], async () => {
    await db.products.clear();
    await db.parties.clear();
    await db.sales.clear();
    await db.debts.clear();
    await db.payments.clear();
    await db.movements.clear();
    if (force) await db.outbox.clear();

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
          ...(d.sale_local_id != null ? { saleId: Number(d.sale_local_id) } : {}),
          ...(d.due_days != null ? { dueDays: Number(d.due_days) } : {}),
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
          ...(m.unit_cost != null ? { unitCost: Number(m.unit_cost) } : {}),
          createdAt: m.created_at ? new Date(m.created_at).getTime() : Date.now(),
        })),
      );
    }
  });

  return { ok: true, pulled: products?.length ?? 0 };
}
