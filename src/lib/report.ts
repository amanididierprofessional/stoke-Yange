import { db } from "./db";
import { fmt } from "./actions";
import { downloadBlob } from "./download";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Build HTML report body (no outer chrome). */
export async function buildReportHtml(shopName: string): Promise<{ html: string; filename: string }> {
  const [products, sales, parties, debts, payments] = await Promise.all([
    db.products.orderBy("name").toArray(),
    db.sales.orderBy("createdAt").reverse().toArray(),
    db.parties.toArray(),
    db.debts.toArray(),
    db.payments.toArray(),
  ]);
  const live = sales.filter((s) => !s.reversed);
  const cash = live.filter((s) => s.type === "cash").reduce((a, s) => a + s.total, 0);
  const credit = live.filter((s) => s.type === "credit").reduce((a, s) => a + s.total, 0);
  const profit = live.reduce((a, s) => a + (s.unitPrice - s.unitCost) * s.qty, 0);
  const stockCost = products.reduce((a, p) => a + p.stock * p.cost, 0);
  const stockSale = products.reduce((a, p) => a + p.stock * p.price, 0);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const today = live.filter((s) => s.createdAt >= start.getTime());
  const todayCash = today.filter((s) => s.type === "cash").reduce((a, s) => a + s.total, 0);
  const todayCredit = today.filter((s) => s.type === "credit").reduce((a, s) => a + s.total, 0);

  const partyBal = (id: number) => {
    const d = debts.filter((x) => x.partyId === id).reduce((a, x) => a + x.amount, 0);
    const pay = payments.filter((x) => x.partyId === id).reduce((a, x) => a + x.amount, 0);
    return d - pay;
  };

  const productRows = products
    .map(
      (p) =>
        `<tr><td>${p.emoji} ${esc(p.name)}</td><td>${esc(p.category)}</td><td>${p.stock} ${esc(p.unit)}</td><td class="r">${fmt(p.cost)}</td><td class="r">${fmt(p.price)}</td><td class="r">${fmt(p.stock * p.cost)}</td></tr>`,
    )
    .join("");

  const saleRows = live
    .slice(0, 200)
    .map(
      (s) =>
        `<tr><td>${new Date(s.createdAt).toLocaleString()}</td><td>${esc(s.productName)}</td><td>${s.qty}</td><td>${s.type}</td><td class="r">${fmt(s.total)}</td></tr>`,
    )
    .join("");

  const debtRows = parties
    .map((p) => {
      const b = partyBal(p.id!);
      if (Math.abs(b) < 1) return "";
      return `<tr><td>${esc(p.name)}</td><td>${p.kind}</td><td class="r">${fmt(b)}</td></tr>`;
    })
    .filter(Boolean)
    .join("");

  const stamp = new Date().toISOString().slice(0, 10);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(shopName)} — Report</title>
<style>
  *{box-sizing:border-box} body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;padding:16px;color:#1a1a1a;background:#fff;font-size:13px;line-height:1.45}
  h1{font-size:22px;margin:0 0 4px;color:#e85d04} h2{font-size:15px;margin:28px 0 10px;padding-bottom:6px;border-bottom:2px solid #e85d04;color:#333}
  .meta{color:#666;font-size:12px;margin-bottom:20px}
  .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin:16px 0}
  .card{background:linear-gradient(135deg,#fff7ed,#ffedd5);border-radius:12px;padding:12px 14px;border:1px solid #fed7aa}
  .card b{display:block;font-size:18px;margin-top:4px;color:#c2410c}
  .card span{font-size:11px;color:#9a3412;text-transform:uppercase;letter-spacing:.03em}
  table{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px}
  th{text-align:left;background:#fff7ed;padding:8px 6px;border-bottom:2px solid #fdba74;font-size:11px;text-transform:uppercase;color:#9a3412}
  td{padding:7px 6px;border-bottom:1px solid #f3f4f6}
  td.r,th.r{text-align:right}
  tr:nth-child(even) td{background:#fafafa}
  .footer{margin-top:32px;font-size:11px;color:#888;text-align:center}
</style></head><body>
  <h1>${esc(shopName)}</h1>
  <p class="meta">Stoke Yange report · ${new Date().toLocaleString()}</p>
  <h2>Summary / Incamake</h2>
  <div class="cards">
    <div class="card"><span>Today cash</span><b>${fmt(todayCash)}</b></div>
    <div class="card"><span>Today credit</span><b>${fmt(todayCredit)}</b></div>
    <div class="card"><span>All cash sales</span><b>${fmt(cash)}</b></div>
    <div class="card"><span>All credit sales</span><b>${fmt(credit)}</b></div>
    <div class="card"><span>Profit (est.)</span><b>${fmt(profit)}</b></div>
    <div class="card"><span>Stock value (cost)</span><b>${fmt(stockCost)}</b></div>
    <div class="card"><span>Stock value (sell)</span><b>${fmt(stockSale)}</b></div>
    <div class="card"><span>Products</span><b>${products.length}</b></div>
  </div>
  <h2>Products / Ibicuruzwa</h2>
  <table><thead><tr><th>Name</th><th>Category</th><th>Stock</th><th class="r">Cost</th><th class="r">Price</th><th class="r">Value</th></tr></thead>
  <tbody>${productRows || "<tr><td colspan=6>No products</td></tr>"}</tbody></table>
  <h2>Sales / Igurisha (latest 200)</h2>
  <table><thead><tr><th>Date</th><th>Product</th><th>Qty</th><th>Type</th><th class="r">Total</th></tr></thead>
  <tbody>${saleRows || "<tr><td colspan=5>No sales</td></tr>"}</tbody></table>
  <h2>Balances / Amadeni</h2>
  <table><thead><tr><th>Name</th><th>Kind</th><th class="r">Balance</th></tr></thead>
  <tbody>${debtRows || "<tr><td colspan=3>No open balances</td></tr>"}</tbody></table>
  <p class="footer">Generated by Stoke Yange · Offline-first POS</p>
</body></html>`;

  return { html, filename: `stoke-yange-report-${stamp}.html` };
}

function pdfEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function pdfAscii(value: unknown) {
  return String(value ?? "").normalize("NFKD").replace(/[^\x20-\x7E]/g, "?");
}

/** Build a valid PDF file locally; no print dialog or external service is required. */
export async function buildReportPdf(shopName: string): Promise<{ blob: Blob; filename: string }> {
  const [products, sales, parties, debts, payments] = await Promise.all([
    db.products.orderBy("name").toArray(),
    db.sales.orderBy("createdAt").reverse().toArray(),
    db.parties.toArray(),
    db.debts.toArray(),
    db.payments.toArray(),
  ]);
  const live = sales.filter((s) => !s.reversed);
  const total = (rows: typeof live, pick: (s: (typeof live)[number]) => number) => rows.reduce((n, s) => n + pick(s), 0);
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const today = live.filter((s) => s.createdAt >= start.getTime());
  const balance = (id: number) => debts.filter((d) => d.partyId === id).reduce((n, d) => n + d.amount, 0) - payments.filter((p) => p.partyId === id).reduce((n, p) => n + p.amount, 0);
  const lines: string[] = [
    pdfAscii(shopName), "STOKE YANGE - SHOP REPORT", "Generated: " + new Date().toLocaleString(), "",
    "SUMMARY",
    "Today's cash sales: " + fmt(total(today.filter((s) => s.type === "cash"), (s) => s.total)),
    "Today's credit sales: " + fmt(total(today.filter((s) => s.type === "credit"), (s) => s.total)),
    "All cash sales: " + fmt(total(live.filter((s) => s.type === "cash"), (s) => s.total)),
    "All credit sales: " + fmt(total(live.filter((s) => s.type === "credit"), (s) => s.total)),
    "Estimated profit: " + fmt(total(live, (s) => (s.unitPrice - s.unitCost) * s.qty)),
    "Stock value (cost): " + fmt(products.reduce((n, p) => n + p.stock * p.cost, 0)),
    "Stock value (selling): " + fmt(products.reduce((n, p) => n + p.stock * p.price, 0)),
    "Products: " + products.length, "", "INVENTORY", "Product | Category | Stock | Cost | Price",
    ...products.map((p) => pdfAscii(p.name + " | " + p.category + " | " + p.stock + " " + p.unit + " | " + fmt(p.cost) + " | " + fmt(p.price))),
    "", "SALES (latest 200)", "Date | Product | Qty | Type | Total",
    ...live.slice(0, 200).map((s) => pdfAscii(new Date(s.createdAt).toLocaleString() + " | " + s.productName + " | " + s.qty + " | " + s.type + " | " + fmt(s.total))),
    "", "OPEN BALANCES", "Name | Type | Balance",
    ...parties.map((p) => ({ p, b: balance(p.id!) })).filter((x) => Math.abs(x.b) >= 1).map(({ p, b }) => pdfAscii(p.name + " | " + p.kind + " | " + fmt(b))),
  ];
  const wrapped = lines.flatMap((line) => {
    const value = pdfAscii(line);
    if (value.length <= 88) return [value];
    const result: string[] = [];
    for (let i = 0; i < value.length; i += 88) result.push(value.slice(i, i + 88));
    return result;
  });
  const pages: string[][] = [];
  for (let i = 0; i < wrapped.length; i += 48) pages.push(wrapped.slice(i, i + 48));
  if (!pages.length) pages.push(["Stoke Yange report"]);
  const objects: string[] = [];
  const add = (value: string) => { objects.push(value); return objects.length; };
  const catalog = add("");
  const pagesRoot = add("");
  const font = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds: number[] = [];
  const contentIds: number[] = [];
  for (const page of pages) {
    const commands = ["BT", "/F1 9 Tf", "48 794 Td", "13 TL"];
    page.forEach((line, i) => { if (i > 0) commands.push("T*"); commands.push("(" + pdfEscape(line) + ") Tj"); });
    commands.push("ET");
    const stream = commands.join("\n");
    contentIds.push(add("<< /Length " + new TextEncoder().encode(stream).length + " >>\nstream\n" + stream + "\nendstream"));
    pageIds.push(add(""));
  }
  objects[catalog - 1] = "<< /Type /Catalog /Pages " + pagesRoot + " 0 R >>";
  objects[pagesRoot - 1] = "<< /Type /Pages /Kids [" + pageIds.map((id) => id + " 0 R").join(" ") + "] /Count " + pageIds.length + " >>";
  pageIds.forEach((id, i) => {
    objects[id - 1] = "<< /Type /Page /Parent " + pagesRoot + " 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 " + font + " 0 R >> >> /Contents " + contentIds[i] + " 0 R >>";
  });
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((obj, i) => { offsets.push(new TextEncoder().encode(pdf).length); pdf += (i + 1) + " 0 obj\n" + obj + "\nendobj\n"; });
  const xref = new TextEncoder().encode(pdf).length;
  pdf += "xref\n0 " + (objects.length + 1) + "\n0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => { pdf += String(offset).padStart(10, "0") + " 00000 n \n"; });
  pdf += "trailer\n<< /Size " + (objects.length + 1) + " /Root " + catalog + " 0 R >>\nstartxref\n" + xref + "\n%%EOF";
  const stamp = new Date().toISOString().slice(0, 10);
  return { blob: new Blob([pdf], { type: "application/pdf" }), filename: "stoke-yange-report-" + stamp + ".pdf" };
}

export async function exportPdfReport(shopName: string) {
  const report = await buildReportPdf(shopName);
  await downloadBlob(report.blob, report.filename);
  return report;
}

export async function exportSalesCsv() {
  const rows = await db.sales.orderBy("createdAt").toArray();
  const head = "date,product,qty,unit_price,total,type,reversed";
  const body = rows.map((s) =>
    [
      new Date(s.createdAt).toISOString(),
      `"${String(s.productName).replace(/"/g, '""')}"`,
      s.qty,
      s.unitPrice,
      s.total,
      s.type,
      s.reversed ? 1 : 0,
    ].join(","),
  );
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(
    new Blob([[head, ...body].join("\n")], { type: "text/csv;charset=utf-8" }),
    `stoke-yange-sales-${stamp}.csv`,
  );
}
