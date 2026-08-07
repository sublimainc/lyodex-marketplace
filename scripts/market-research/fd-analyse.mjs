/**
 * Turns the benchmark rows into figures a visitor can actually use.
 *
 * The raw table answers "what does this seller charge for this bag". A visitor
 * arrives with a different question — "what is normal", "am I expensive", "does
 * selling bigger bags pay" — and those need distributions, not rows.
 *
 * Three deliberate choices about which statistics get computed:
 *
 *   Median AND mean, side by side. They are reported together because the gap
 *   between them is itself the finding: retail freeze-dried pricing is skewed by
 *   novelty single-serve packs, so a mean well above the median is a warning
 *   that the average describes no ordinary transaction.
 *
 *   Quartiles rather than min/max alone. The extremes of any retail set are an
 *   8 g sampler and a 25 kg sack; quoting only those describes the edges of the
 *   catalogue, not the market. Min and max are still reported, next to the
 *   quartiles that give them context.
 *
 *   A pack-size breakdown. This is the one figure with direct commercial
 *   consequence for an operator deciding what to package, and it cannot be read
 *   off any single row.
 *
 * Only rows whose net weight the seller published are counted. That is roughly
 * a quarter of the table, and using the rest would mean averaging numbers we
 * inferred rather than numbers anyone stated.
 *
 *   node scripts/market-research/fd-analyse.mjs <dataset-dir> <output-dir>
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const [DATA, OUT] = process.argv.slice(2);
if (!DATA || !OUT) throw new Error("usage: node fd-analyse.mjs <dataset-dir> <output-dir>");

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

const quantile = (sorted, q) => {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
};

function describe(values) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const n = s.length;
  const mean = s.reduce((a, b) => a + b, 0) / n;
  const median = quantile(s, 0.5);
  const sd = Math.sqrt(s.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  return {
    n,
    min: +s[0].toFixed(2),
    p10: +quantile(s, 0.10).toFixed(2),
    p25: +quantile(s, 0.25).toFixed(2),
    median: +median.toFixed(2),
    mean: +mean.toFixed(2),
    p75: +quantile(s, 0.75).toFixed(2),
    p90: +quantile(s, 0.90).toFixed(2),
    max: +s[n - 1].toFixed(2),
    std_dev: +sd.toFixed(2),
    // Positive means the mean sits above the median: a few expensive listings
    // are pulling the average away from what a typical listing costs.
    mean_vs_median_pct: median > 0 ? +(((mean - median) / median) * 100).toFixed(1) : null,
  };
}

const CAT_LABEL = {
  fruit: "Fruits", vegetable: "Légumes", meat: "Viandes", seafood: "Fruits de mer",
  candy: "Confiseries", meal: "Repas complets", dairy: "Produits laitiers",
  yogurt: "Yogourt", egg: "Œufs", powder: "Poudres", beverage: "Boissons",
  ice_cream: "Crème glacée", herb_spice: "Herbes et épices", pet: "Animaux",
  other: "Autres",
};

const COUNTRY_LABEL = {
  CA: "Canada", US: "États-Unis", MX: "Mexique", GB: "Royaume-Uni",
  FR: "France", PL: "Pologne", NZ: "Nouvelle-Zélande", AU: "Australie",
};

/**
 * Pack-size bands. The boundaries follow how this trade actually packages
 * things — single-serve snack, retail bag, family bag, bulk tin, wholesale
 * sack — rather than round numbers, so each band holds comparable products.
 */
const SIZE_BANDS = [
  { key: "under_50g",   label: "Moins de 50 g",   min: 0,     max: 50,    note: "Portion unique, échantillon" },
  { key: "50_150g",     label: "50 à 150 g",      min: 50,    max: 150,   note: "Sachet de détail courant" },
  { key: "150_500g",    label: "150 à 500 g",     min: 150,   max: 500,   note: "Grand format de détail" },
  { key: "500g_2kg",    label: "500 g à 2 kg",    min: 500,   max: 2000,  note: "Format familial, boîte" },
  { key: "over_2kg",    label: "Plus de 2 kg",    min: 2000,  max: Infinity, note: "Vrac, gros contenant" },
];

// ── Load ────────────────────────────────────────────────────────────────────
const rows = parseCsv(await readFile(join(DATA, "freeze-dried-products.csv"), "utf8"));
const meta = JSON.parse(await readFile(join(DATA, "dataset-metadata.json"), "utf8"));

// Only seller-stated weights inform any published figure.
const solid = rows
  .map(r => ({ ...r, ppk: num(r.price_per_kg_cad), grams: num(r.net_weight_g) }))
  .filter(r => r.ppk !== null && r.weight_confidence === "high");

await mkdir(OUT, { recursive: true });

// ── By category ─────────────────────────────────────────────────────────────
const catGroups = new Map();
for (const r of solid) {
  if (!catGroups.has(r.category)) catGroups.set(r.category, []);
  catGroups.get(r.category).push(r);
}

const byCategory = [...catGroups.entries()]
  .map(([category, rs]) => ({
    category,
    label: CAT_LABEL[category] ?? category,
    vendors: new Set(rs.map(r => r.vendor_domain)).size,
    countries: new Set(rs.map(r => r.vendor_country)).size,
    ...describe(rs.map(r => r.ppk)),
  }))
  // A category resting on fewer than three sellers is one company's price list
  // wearing a statistic's clothing.
  .filter(c => c.vendors >= 3)
  .sort((a, b) => b.n - a.n);

// ── By country ──────────────────────────────────────────────────────────────
const countryGroups = new Map();
for (const r of solid) {
  if (!countryGroups.has(r.vendor_country)) countryGroups.set(r.vendor_country, []);
  countryGroups.get(r.vendor_country).push(r);
}

const byCountry = [...countryGroups.entries()]
  .map(([country, rs]) => ({
    country,
    label: COUNTRY_LABEL[country] ?? country,
    vendors: new Set(rs.map(r => r.vendor_domain)).size,
    ...describe(rs.map(r => r.ppk)),
  }))
  .filter(c => c.vendors >= 3)
  .sort((a, b) => a.median - b.median);

// ── By pack size — the volume effect ────────────────────────────────────────
const bySize = SIZE_BANDS.map(band => {
  const rs = solid.filter(r => r.grams !== null && r.grams >= band.min && r.grams < band.max);
  const stats = describe(rs.map(r => r.ppk));
  return stats ? {
    band: band.key,
    label: band.label,
    note: band.note,
    vendors: new Set(rs.map(r => r.vendor_domain)).size,
    ...stats,
  } : null;
}).filter(Boolean).filter(b => b.vendors >= 3);

/**
 * The shape of the volume curve, stated as it actually is.
 *
 * The obvious summary — "the biggest packs cost X% less per kilo than the
 * smallest" — is wrong here, and wrong in the direction that flatters bulk. The
 * curve is not monotonic: price per kilo falls steeply up to roughly 150 g and
 * then flattens, rising slightly in the largest band. Comparing only the first
 * and last bands would have reported a 44% bulk discount that does not exist.
 *
 * So the trough is located rather than assumed, and whether the curve keeps
 * falling afterwards is reported as its own fact.
 */
function volumeCurve(bands) {
  if (bands.length < 2) return null;
  const cheapest = bands.reduce((a, b) => (b.median < a.median ? b : a));
  const first = bands[0];
  const last = bands[bands.length - 1];

  return {
    smallest_band: first.label,
    smallest_median: first.median,
    cheapest_band: cheapest.label,
    cheapest_median: cheapest.median,
    largest_band: last.label,
    largest_median: last.median,
    /** Drop from the smallest packs to the cheapest band — the real saving. */
    drop_to_cheapest_pct: +(((first.median - cheapest.median) / first.median) * 100).toFixed(1),
    /** True when every band is cheaper than the one before it. It is not, here. */
    monotonic: bands.every((b, i) => i === 0 || b.median <= bands[i - 1].median),
    /** Positive when the largest band costs more per kilo than the cheapest one. */
    rebound_pct: cheapest.median > 0
      ? +(((last.median - cheapest.median) / cheapest.median) * 100).toFixed(1)
      : null,
  };
}

const volumeEffect = volumeCurve(bySize);

// ── Fruit detail — the category with the most data ──────────────────────────
// Broken out by size because fruit is what most Quebec operators actually dry,
// and a single fruit median hides a fivefold spread between a snack pouch and
// a bulk tin.
const fruitBySize = SIZE_BANDS.map(band => {
  const rs = solid.filter(r =>
    r.category === "fruit" && r.grams !== null && r.grams >= band.min && r.grams < band.max);
  const stats = describe(rs.map(r => r.ppk));
  return stats && new Set(rs.map(r => r.vendor_domain)).size >= 3
    ? { band: band.key, label: band.label, vendors: new Set(rs.map(r => r.vendor_domain)).size, ...stats }
    : null;
}).filter(Boolean);

// The same honest shape for fruit alone. This is the methodologically sound
// comparison: comparable products, so a difference between bands is a volume
// effect rather than a change in what is sitting in the band.
const fruitVolumeEffect = volumeCurve(fruitBySize);

// ── Overall ─────────────────────────────────────────────────────────────────
const overall = describe(solid.map(r => r.ppk));

// ── Write ───────────────────────────────────────────────────────────────────
const esc = v => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (headers, data) =>
  "﻿" + [headers.join(",")].concat(data.map(r => headers.map(h => esc(r[h])).join(","))).join("\n");

const STAT_COLS = ["n", "vendors", "min", "p10", "p25", "median", "mean", "p75", "p90", "max", "std_dev", "mean_vs_median_pct"];

await writeFile(join(OUT, "prix-par-categorie.csv"),
  toCsv(["category", "label", "countries", ...STAT_COLS], byCategory), "utf8");

await writeFile(join(OUT, "prix-par-pays.csv"),
  toCsv(["country", "label", ...STAT_COLS], byCountry), "utf8");

await writeFile(join(OUT, "prix-par-format.csv"),
  toCsv(["band", "label", "note", ...STAT_COLS], bySize), "utf8");

const payload = {
  generated_at: new Date().toISOString(),
  observed_at: meta.built_at.slice(0, 10),
  currency: "CAD",
  fx_date: meta.fx_date,
  fx_rates: meta.fx_rates_to_cad,
  coverage: {
    vendors_surveyed: meta.totals.stores_surveyed,
    vendors_with_data: meta.totals.stores_with_data,
    total_rows: rows.length,
    rows_used: solid.length,
    countries: new Set(solid.map(r => r.vendor_country)).size,
  },
  overall,
  by_category: byCategory,
  by_country: byCountry,
  by_size: bySize,
  volume_effect: volumeEffect,
  fruit_by_size: fruitBySize,
  fruit_volume_effect: fruitVolumeEffect,
  method:
    "Prix de détail relevés dans les catalogues publics des marchands. Seules les lignes dont le " +
    "marchand publie lui-même le poids net sont comptées. Les prix en devises étrangères sont " +
    "convertis en dollars canadiens au taux du " + meta.fx_date + ". Ce sont des prix de produits " +
    "finis vendus au détail — pas un tarif de lyophilisation à façon, qui est un prix de service.",
};

await writeFile(join(OUT, "market-intelligence.json"), JSON.stringify(payload, null, 2), "utf8");

console.log(`Lignes exploitées      : ${solid.length} sur ${rows.length}`);
console.log(`Catégories retenues    : ${byCategory.length}`);
console.log(`Pays retenus           : ${byCountry.length}`);
console.log(`Bandes de format       : ${bySize.length}\n`);

console.table(byCategory.map(c => ({
  Catégorie: c.label, n: c.n, Marchands: c.vendors,
  Min: c.min, "1er q.": c.p25, Médiane: c.median, Moyenne: c.mean, "3e q.": c.p75, Max: c.max,
  "Moy/méd %": c.mean_vs_median_pct,
})));

console.log("\nEffet du format sur le prix au kilo :");
console.table(bySize.map(b => ({
  Format: b.label, n: b.n, Marchands: b.vendors,
  Médiane: b.median, Moyenne: b.mean, "1er q.": b.p25, "3e q.": b.p75,
})));

if (volumeEffect) {
  console.log(`\nCourbe de volume — tous produits`);
  console.log(`  ${volumeEffect.smallest_band} : ${volumeEffect.smallest_median} $/kg`);
  console.log(`  creux à ${volumeEffect.cheapest_band} : ${volumeEffect.cheapest_median} $/kg  (−${volumeEffect.drop_to_cheapest_pct} %)`);
  console.log(`  ${volumeEffect.largest_band} : ${volumeEffect.largest_median} $/kg`);
  console.log(`  décroissante sur toute la plage : ${volumeEffect.monotonic ? "oui" : "NON — elle remonte après le creux"}`);
}

if (fruitVolumeEffect) {
  console.log(`\nMêmes bandes, fruits seulement (produits comparables) :`);
  console.log(`  ${fruitVolumeEffect.smallest_median} → creux ${fruitVolumeEffect.cheapest_median} $/kg (−${fruitVolumeEffect.drop_to_cheapest_pct} %), puis ${fruitVolumeEffect.largest_median}`);
}
