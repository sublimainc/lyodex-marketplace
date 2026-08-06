/**
 * Loads the crawled price dataset into product_benchmarks.
 *
 * Re-running is safe and is the expected way to refresh: rows are matched on
 * (source_url, variant) and updated in place. Appending instead would double the
 * dataset on every run and drag every median toward whichever sellers happened
 * to be crawled most often.
 *
 * Curation is deliberately not automatic. Rows land with included_in_public
 * false, exactly like market_observations — a crawl can pick up a seller's test
 * product or a placeholder price, and the public benchmark should not inherit
 * whatever the last run found. The one thing this script decides on its own is
 * to leave low-confidence weights unpublishable, because those rest on a
 * shipping-weight field that many sellers never fill in.
 *
 *   DATABASE_URL='postgresql://…' node scripts/market-research/fd-import-benchmarks.mjs <csv> [--publish-high]
 */

import { readFile } from "node:fs/promises";
import pg from "pg";

const [CSV, ...flags] = process.argv.slice(2);
if (!CSV) throw new Error("usage: node fd-import-benchmarks.mjs <csv> [--publish-high]");
const publishHigh = flags.includes("--publish-high");

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  console.error("\n  DATABASE_URL is required.\n");
  process.exit(1);
}

function parseCsv(text) {
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

const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };

// The CSV records the exact provenance string ("net_weight_declared_x12"); the
// table stores the family, with the multiplier folded into one value, so that
// filtering on provenance does not require matching a dozen variants.
function weightSourceFamily(s) {
  if (!s) return "none";
  if (/_x\d+$/.test(s)) return "derived_multipack";
  if (s === "shopify_shipping_weight") return "shipping_weight";
  return s;
}

const rows = parseCsv(await readFile(CSV, "utf8"));
console.log(`${rows.length} rows read from ${CSV}`);

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1")
    ? false
    : { rejectUnauthorized: false },
});

const client = await pool.connect();
let inserted = 0, updated = 0, skipped = 0;

try {
  await client.query("BEGIN");

  for (const r of rows) {
    const price = num(r.price);
    if (!r.source_url || price === null) { skipped++; continue; }

    const conf = r.weight_confidence || "none";
    const perKgCad = num(r.price_per_kg_cad);
    // Only high-confidence rows are ever auto-published, and only when asked.
    const publish = publishHigh && conf === "high" && perKgCad !== null;

    const res = await client.query(
      `INSERT INTO product_benchmarks (
         vendor_name, vendor_domain, vendor_country, vendor_region, vendor_type,
         product_name, variant, category, vendor_category,
         net_weight_g, weight_source, weight_confidence,
         price, currency, price_per_kg, price_per_kg_cad, fx_rate_to_cad, fx_date,
         source_url, in_stock, collection_method, observed_at, included_in_public
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
       ON CONFLICT (source_url, variant) DO UPDATE SET
         price              = EXCLUDED.price,
         currency           = EXCLUDED.currency,
         net_weight_g       = EXCLUDED.net_weight_g,
         weight_source      = EXCLUDED.weight_source,
         weight_confidence  = EXCLUDED.weight_confidence,
         price_per_kg       = EXCLUDED.price_per_kg,
         price_per_kg_cad   = EXCLUDED.price_per_kg_cad,
         fx_rate_to_cad     = EXCLUDED.fx_rate_to_cad,
         fx_date            = EXCLUDED.fx_date,
         in_stock           = EXCLUDED.in_stock,
         observed_at        = EXCLUDED.observed_at,
         category           = EXCLUDED.category,
         product_name       = EXCLUDED.product_name,
         updated_at         = now()
       RETURNING (xmax = 0) AS was_insert`,
      [
        r.vendor, r.vendor_domain, r.vendor_country, r.vendor_region || null, r.vendor_type || null,
        r.product_name, r.variant ?? "", r.category, r.product_type || null,
        num(r.net_weight_g), weightSourceFamily(r.weight_source), conf,
        price, r.currency, num(r.price_per_kg), perKgCad,
        num(r.fx_rate_to_cad), r.fx_date || null,
        r.source_url, r.in_stock === "yes", r.collection_method || "catalog_feed",
        r.observed_at ? new Date(r.observed_at) : new Date(), publish,
      ],
    );

    if (res.rows[0]?.was_insert) inserted++; else updated++;
  }

  await client.query("COMMIT");
} catch (err) {
  await client.query("ROLLBACK");
  console.error("Import failed, nothing was written:", err.message);
  process.exit(1);
} finally {
  client.release();
}

const summary = await pool.query(`
  SELECT category,
         count(*)                                              AS rows,
         count(*) FILTER (WHERE weight_confidence = 'high')     AS high_conf,
         count(DISTINCT vendor_domain)                          AS vendors,
         round(percentile_cont(0.5) WITHIN GROUP (
           ORDER BY price_per_kg_cad) FILTER (WHERE weight_confidence = 'high')::numeric, 2) AS median_cad_kg
  FROM product_benchmarks
  WHERE price_per_kg_cad IS NOT NULL
  GROUP BY category
  ORDER BY count(*) FILTER (WHERE weight_confidence = 'high') DESC
`);

console.log(`\ninserted ${inserted}  ·  updated ${updated}  ·  skipped ${skipped}\n`);
console.table(summary.rows);

await pool.end();
