/**
 * Renders the harvested dataset as a readable markdown briefing.
 *
 *   node scripts/fd-report.mjs <data-dir>
 */

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DIR = process.argv[2];
if (!DIR) throw new Error("usage: node fd-report.mjs <data-dir>");

function parseCsv(text) {
  // The dataset is written with a UTF-8 BOM so Excel renders accents correctly.
  // Left in place it would name the first column "﻿vendor" and every lookup
  // against it would silently return undefined.
  const lines = text.replace(/^﻿/, "").trim().split(/\r?\n/);
  const cols = lines[0].split(",");
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const out = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') inQ = false;
        else cur += c;
      } else if (c === '"') inQ = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return Object.fromEntries(cols.map((c, i) => [c, out[i] ?? ""]));
  });
}

const rows = parseCsv(await readFile(join(DIR, "freeze-dried-products.csv"), "utf8"));
const meta = JSON.parse(await readFile(join(DIR, "dataset-metadata.json"), "utf8"));

const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
const median = xs => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const fmt = n => n === null ? "—" : n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Only high-confidence weights inform the published figures. Medium and low
// tiers stay in the CSV for anyone who wants them.
const solid = rows.filter(r => r.price_per_kg_cad && r.weight_confidence === "high");

const byCat = {};
for (const r of solid) (byCat[r.category] ??= []).push({ v: num(r.price_per_kg_cad), vendor: r.vendor });

const catRows = Object.entries(byCat)
  .map(([cat, xs]) => {
    const vals = xs.map(x => x.v);
    return {
      cat,
      n: vals.length,
      vendors: new Set(xs.map(x => x.vendor)).size,
      med: median(vals),
      p25: median(vals.filter(v => v <= median(vals))),
      min: Math.min(...vals),
      max: Math.max(...vals),
    };
  })
  .sort((a, b) => b.n - a.n);

const byVendor = {};
for (const r of solid) (byVendor[r.vendor] ??= []).push(num(r.price_per_kg_cad));

const vendorRows = Object.entries(byVendor)
  .map(([vendor, vals]) => {
    const row = rows.find(r => r.vendor === vendor);
    return { vendor, country: row?.vendor_country ?? "", currency: row?.currency ?? "", n: vals.length, med: median(vals) };
  })
  .sort((a, b) => a.med - b.med);

const withKg = rows.filter(r => r.price_per_kg).length;
const noWeight = rows.filter(r => !r.net_weight_g).length;

const md = `# Freeze-dried retail pricing — observed dataset

Built ${meta.built_at.slice(0, 10)} from the public catalogues of ${meta.totals.stores_with_data} storefronts.

| | |
|---|---|
| Storefronts surveyed | ${meta.totals.stores_surveyed} |
| Storefronts that yielded data | ${meta.totals.stores_with_data} |
| Product/variant rows | ${rows.length} |
| Rows with a price per kg | ${withKg} |
| Rows with no published weight | ${noWeight} |
| Rows behind the figures below | ${solid.length} |

Every price and weight below was read from the merchant's own listing. Nothing is
estimated. Where a merchant does not publish a net weight, the row keeps its price
and has no price per kg — that gap is left visible rather than filled in.

Currency converted to CAD at mid-market rates of ${meta.fx_date}:
${Object.entries(meta.fx_rates_to_cad).filter(([c]) => new Set(rows.map(r => r.currency)).has(c)).map(([c, r]) => `${c} ${r}`).join(" · ")}

## Price per kilogram by category (CAD)

Median, not average: a handful of single-serve candy packs would otherwise drag the
figure somewhere no real buyer trades.

| Category | Observations | Vendors | Median | Low quartile | Min | Max |
|---|---:|---:|---:|---:|---:|---:|
${catRows.map(r => `| ${r.cat.replace(/_/g, " ")} | ${r.n} | ${r.vendors} | **$${fmt(r.med)}** | $${fmt(r.p25)} | $${fmt(r.min)} | $${fmt(r.max)} |`).join("\n")}

## Vendors, cheapest median first (CAD/kg)

| Vendor | Country | Prices in | Rows | Median |
|---|---|---|---:|---:|
${vendorRows.map(r => `| ${r.vendor} | ${r.country} | ${r.currency} | ${r.n} | $${fmt(r.med)} |`).join("\n")}

## How the weight was established

The price is easy; the weight is the whole difficulty. Counts by source:

| Weight source | Rows |
|---|---:|
${Object.entries(rows.reduce((a, r) => { a[r.weight_source] = (a[r.weight_source] ?? 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1]).map(([s, n]) => `| ${s} | ${n} |`).join("\n")}

Shopify publishes a \`grams\` field per variant. It is a shipping weight, not net
contents, and many merchants leave it at a placeholder — one Quebec store reports
5 g for both a freeze-dried chili and a $69 bear bag. Rows resting on that field
are marked low confidence and are excluded from every figure above.

## Collection status per storefront

| Vendor | Domain | Status | Rows |
|---|---|---|---:|
${meta.stores.sort((a, b) => b.rows - a.rows).map(s => `| ${s.vendor} | ${s.domain} | ${s.fetch_status} | ${s.rows} |`).join("\n")}

\`no_feed\` means the storefront publishes no machine-readable catalogue — it is a
statement about how the site is built, not about the merchant's prices.
`;

await writeFile(join(DIR, "REPORT.md"), md, "utf8");
console.log(`Report written to ${join(DIR, "REPORT.md")}`);
console.log(`\nCategories: ${catRows.length}, vendors with data: ${vendorRows.length}, rows behind figures: ${solid.length}`);
