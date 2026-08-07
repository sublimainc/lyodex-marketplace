/**
 * Step 2 of 2 — turns cached catalogs into a per-product price dataset in $/kg.
 *
 * The hard part is the weight, not the price.
 *
 * Shopify exposes a `grams` field on every variant, and it is tempting to treat
 * it as the net weight. It is not. It is the shipping weight, and a large share
 * of merchants never set it meaningfully — Mount Trail reports 5 g for a $69
 * bear bag and 5 g for a freeze-dried chili, which would price that chili at
 * $3,294/kg. Trusting that field produced a dataset that looked complete and was
 * quietly wrong.
 *
 * So the net weight is read from the text the merchant wrote for shoppers, where
 * they have an actual reason to be accurate, and `grams` is used only as a last
 * resort and only when the resulting price lands in a plausible band. Every row
 * records which source its weight came from, so a reader can discard the weaker
 * tiers.
 *
 * Rows whose weight cannot be established keep their price and get an empty
 * price_per_kg. A missing number is a fact; an invented one is not.
 *
 *   node scripts/market-research/fd-build-dataset.mjs <cache-dir> <output-dir>
 */

import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { loadRegistry } from "./fd-registry.mjs";

const [CACHE, OUT] = process.argv.slice(2);
if (!CACHE || !OUT) throw new Error("usage: node fd-build-dataset.mjs <cache-dir> <output-dir>");

// ── Currency ────────────────────────────────────────────────────────────────
// Mid-market rates captured on the date below. They are recorded in the output
// so any figure can be traced back to the rate that produced it, and restated
// later without re-collecting anything.
const FX_DATE = "2026-08-05";
const TO_CAD = {
  CAD: 1,
  USD: 1.37,
  EUR: 1.49,
  GBP: 1.74,
  AUD: 0.89,
  NZD: 0.82,
  NOK: 0.13,
  PLN: 0.35,
  SEK: 0.13,
  DKK: 0.20,
  CHF: 1.60,
  MXN: 0.075,
};

// ── Weight parsing ──────────────────────────────────────────────────────────
const OZ_G = 28.349523125;
const LB_G = 453.59237;

// Ordered most-specific first. Each returns grams.
const UNIT_PATTERNS = [
  { re: /(\d+(?:[.,]\d+)?)\s*(?:kg|kilo(?:gram)?s?|kilogrammes?)\b/i,        f: n => n * 1000 },
  { re: /(\d+(?:[.,]\d+)?)\s*(?:g|gr|gram(?:me)?s?|grammes?)\b(?!\/)/i,      f: n => n },
  { re: /(\d+(?:[.,]\d+)?)\s*(?:lbs?|pounds?)\b/i,                           f: n => n * LB_G },
  { re: /(\d+(?:[.,]\d+)?)\s*(?:oz|ounces?)\b/i,                             f: n => n * OZ_G },
];

// "2 x 100 g", "4-pack of 60g", "12 × 25 g" — the multiplier must be applied or
// a multipack reads as a single unit and its $/kg comes out several times high.
const MULTI_RE = /(\d{1,3})\s*(?:x|×|-\s*pack(?:\s+of)?|\s*pack\s+of)\s*/i;

function parseWeightGrams(text) {
  if (!text) return null;
  const clean = String(text).replace(/<[^>]+>/g, " ").replace(/&nbsp;?/gi, " ").replace(/\s+/g, " ");

  for (const { re, f } of UNIT_PATTERNS) {
    const m = clean.match(re);
    if (!m) continue;
    const value = parseFloat(m[1].replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) continue;

    let grams = f(value);

    // Look just before the match for a multiplier.
    const before = clean.slice(Math.max(0, m.index - 18), m.index);
    const mult = before.match(MULTI_RE);
    if (mult) {
      const count = parseInt(mult[1], 10);
      if (count > 1 && count <= 100) grams *= count;
    }

    // A retail freeze-dried pack under 5 g or over 30 kg is almost certainly a
    // misread — a serving count, a dimension, or a case pallet weight.
    if (grams < 5 || grams > 30000) continue;
    return Math.round(grams);
  }
  return null;
}

// An explicit net-weight declaration is worth more than a size that happens to
// appear in a marketing sentence.
const NET_WEIGHT_RE = /(?:net\s*(?:wt\.?|weight)|poids\s*net|nettogewicht|peso\s*neto|drained\s*weight)\s*[:\-]?\s*([^<.;,\n]{1,24})/i;

/**
 * A variant that selects a quantity of packs rather than a size — "3 Packages",
 * "Case of 6", "12-Pack". The declared net weight then describes one pack, not
 * the variant, so it has to be multiplied.
 *
 * Missing this priced Freeze Dry Wholesalers' pork chops at $1,922/kg: the
 * 12-pack cost twelve times the single but kept the single's 312 g weight.
 * Serving counts are deliberately not matched — a "12 servings" bulk can is one
 * can, not twelve.
 */
const PACK_COUNT_RE = /(?:^|\b)(?:case\s+of\s+|caja\s+de\s+)?(\d{1,3})\s*[-\s]?(?:packages?|packs?|cans?|pouches?|bags?|boxes|jars?|tubs?|tins?|buckets?|units?|pzas?|piezas?|unidades?|sobres?|bolsas?|sachets?|unit[ée]s?)\b/i;

function packMultiplier(variantTitle) {
  if (!variantTitle || variantTitle === "Default Title") return 1;
  const m = variantTitle.match(PACK_COUNT_RE);
  if (!m) return 1;
  const n = parseInt(m[1], 10);
  return n > 1 && n <= 200 ? n : 1;
}

/**
 * A variant naming a pack without a number — "case", "bulk", "carton". The size
 * printed elsewhere then belongs to one unit, and the pack holds an unknown
 * number of them. Safecastle sells broccoli florets this way: the title gives
 * 136 g, the variant says "case", and the pair read naively price it at
 * $1,813/kg.
 */
const UNCOUNTED_PACK_RE = /^(?:case|caja|bulk|wholesale|carton)\b/i;

function resolveWeight(product, variant) {
  const body = product.body_html ?? "";
  const vTitle = variant.title && variant.title !== "Default Title" ? variant.title : "";

  const variantMult = packMultiplier(vTitle);
  const titleMult = packMultiplier(product.title);

  // Nothing can be salvaged when the pack size is unstated: every weight on the
  // page describes one unit, and we do not know how many the box holds.
  if (UNCOUNTED_PACK_RE.test(vTitle) && variantMult === 1) {
    return { grams: null, source: "pack_size_unstated", confidence: "none" };
  }

  // 1. The seller's own net-weight declaration. It describes a single unit, so a
  //    pack count from *either* the variant or the product name applies.
  //    "Crumbled Blue Cheese 12 Cans Per Case" states the count in the title
  //    while the variant is empty; reading only the 283 g of one can priced it
  //    at $1,791/kg.
  const netDecl = body.match(NET_WEIGHT_RE);
  if (netDecl) {
    const g = parseWeightGrams(netDecl[1]);
    if (g) {
      const m = Math.max(variantMult, titleMult);
      return {
        grams: Math.round(g * m),
        source: m > 1 ? `net_weight_declared_x${m}` : "net_weight_declared",
        // A multiplied figure rests on our reading of the pack count rather than
        // on anything the seller stated outright, so it drops a tier.
        confidence: m > 1 ? "medium" : "high",
      };
    }
  }

  // 2. Size in the variant the shopper picks. It already describes that variant,
  //    unless the same string also names a count ("12 PACK | 1 oz").
  if (vTitle) {
    const g = parseWeightGrams(vTitle);
    if (g) {
      const m = variantMult > 1 && g <= 500 ? variantMult : 1;
      return {
        grams: Math.round(g * m),
        source: m > 1 ? `variant_title_x${m}` : "variant_title",
        confidence: m > 1 ? "medium" : "high",
      };
    }
  }

  // 3. Size in the product name.
  const g1 = parseWeightGrams(product.title);
  if (g1) {
    // A variant that names a count ("22 cans") settles it: the title size is per
    // unit whatever its magnitude. A count inside the title itself is ambiguous —
    // "12 pack 1.2 kg" may already be the total — so the half-kilo guard applies
    // to that case only.
    let m = 1;
    if (variantMult > 1) m = variantMult;
    else if (titleMult > 1 && g1 <= 500) m = titleMult;
    return {
      grams: Math.round(g1 * m),
      source: m > 1 ? `product_title_x${m}` : "product_title",
      confidence: m > 1 ? "medium" : "high",
    };
  }


  // Deliberately NOT falling back to "first weight-looking number in the
  // description". That was tried and it read nutrition panels as net weights —
  // "10 g of protein" became a 10 g package, pricing a $2,999 bundle at
  // $410,998/kg and dragging the fruit median to $636/kg. A description weight
  // is only trustworthy when the merchant labelled it as a net weight, which
  // NET_WEIGHT_RE above already catches.

  // Shipping weight, last resort. Only accepted when it is not obviously a
  // placeholder and the price it implies is not absurd — see the header.
  const shipping = Number(variant.grams);
  if (shipping >= 20 && shipping <= 30000) {
    return { grams: shipping, source: "shopify_shipping_weight", confidence: "low" };
  }

  return { grams: null, source: "none", confidence: "none" };
}

// ── Classification ──────────────────────────────────────────────────────────
const CATEGORIES = [
  ["ice_cream",  /ice\s?cream|astronaut|gelato|sherbet|dippin/i],
  ["candy",      /candy|gummy|gummi|gummies|taffy|skittle|nerd|warhead|jolly\s?rancher|salt\s?water|marshmallow|sour\s|chocolate|bon\s?bon|krunch|caramel|lollip|peep|airhead|starburst|jelly\s?bean/i],
  ["yogurt",     /yogh?urt|yogourt|kefir|yaourt/i],
  ["dairy",      /cheese|milk|butter|whey|mozzarella|cheddar|fromage|lait/i],
  ["egg",        /\beggs?\b|oeuf/i],
  ["pet",        /\bpet\b|\bdog\b|\bcat\b|raw\s?pet|pet\s?treat/i],
  ["meat",       /beef|chicken|pork|turkey|bacon|sausage|\bham\b|meat|steak|jerky|lamb|venison|shrimp|salmon|tuna|fish|seafood|crab|poulet|boeuf|porc|viande|kylling/i],
  ["meal",       /meal|entr[ée]e|dinner|breakfast|lunch|stew|curry|pasta|risotto|chili|soup|stroganoff|pad\s?thai|casserole|bowl|repas|ration|pilaf|lasagn|burrito|taco|shepherd|porridge|oatmeal|noodle|couscous|paella|goulash/i],
  ["fruit",      /apple|banana|berr|strawberr|blueberr|raspberr|blackberr|cherr|mango|peach|pear|pineapple|grape|melon|kiwi|orange|citrus|lemon|lime|apricot|plum|\bfig\b|cranberr|fruit|dragonfruit|papaya|passion|pomme|fraise|framboise/i],
  ["vegetable",  /vegetable|veggie|corn|\bpeas?\b|carrot|broccoli|spinach|kale|potato|onion|pepper|tomato|bean|celery|cabbage|cauliflower|mushroom|zucchini|squash|asparagus|beet|okra|leek|garlic|edamame|l[ée]gume/i],
  ["herb_spice", /herb|spice|basil|parsley|cilantro|oregano|thyme|rosemary|chive|\bmint\b|[ée]pice/i],
  ["beverage",   /coffee|\btea\b|juice|smoothie|drink|latte|caf[ée]/i],
  ["powder",     /powder|flour|poudre/i],
];

/**
 * The product title decides the category; tags and product_type are only
 * consulted when the title says nothing useful. Merchant tags describe how a
 * thing is *used* — a bag of sliced strawberries tagged "yogurt topping" was
 * being filed under yogurt, which would have made the yogurt figures describe
 * fruit.
 */
/**
 * Product URL differs by platform: Shopify serves /products/<handle>, WordPress
 * serves /product/<slug>, and Squarespace serves <the shop path the owner
 * chose>/<urlId>. Emitting the Shopify shape everywhere produced links that all
 * 404, which would make those rows unverifiable — and a benchmark nobody can
 * check is worth very little.
 */
function productUrl(store, platform, handle, shopPath) {
  if (platform === "woocommerce") return `https://${store.domain}/product/${handle}`;
  if (platform === "squarespace") return `https://${store.domain}/${shopPath ?? "shop"}/${handle}`;
  return `https://${store.domain}/products/${handle}`;
}

function categorise(title, fallback) {
  for (const [name, re] of CATEGORIES) if (re.test(title)) return name;
  for (const [name, re] of CATEGORIES) if (re.test(fallback)) return name;
  return "other";
}

const FD_WORDS = /freeze[\s-]?dried|freeze[\s-]?dry|freezedried|lyophilis|lyophiliz|liofiliz|gefriergetrocknet|vriesdroog|frysetørket|frystork/i;

// Things these shops sell that are not food, or not sold by weight.
const NON_FOOD = /gift\s?card|sticker|t-?shirt|hoodie|mug|tote|apparel|hat\b|sac\s|bag\b|quilt|strap|sangle|stove|r[ée]chaud|spork|utensil|bowl\s?set|cookware|subscription|donation|shipping\s?protection|sample\s?pack\s?card|e-?gift/i;

/**
 * Commodity ingredients that are food but are not freeze-dried.
 *
 * Several B2B sellers list liofilizados beside ordinary bulk stock — Gredi
 * Mexico sells corn starch, citric acid, maltodextrin and dextrose in 25 kg
 * sacks. Because that seller's whole catalogue was treated as freeze-dried,
 * corn starch at $1.53/kg entered the benchmark and became its cheapest
 * "freeze-dried" product. These are genuine prices for genuine goods; they are
 * simply answering a different question than the one this dataset asks.
 */
const NON_FD_COMMODITY = /f[ée]cula|almid[óo]n|starch\b|[áa]cido\s|citric\s?acid|maltodextrin|dextrosa|dextrose|glucosa|sacarosa|goma\s(?:xantana|guar)|xanthan|guar\s?gum|lecitina|lecithin|carbonato|bicarbonato|sorbato|benzoato|conservador|colorante|saborizante|gelatina\s?sin|agar\b|pectina|pectin\b|carrag|estabilizante|emulsificante|antiaglomerante|nitr[ai]to/i;

// ── Build ───────────────────────────────────────────────────────────────────
await mkdir(OUT, { recursive: true });

/**
 * Classification rules live in the registry, not in the cache. Re-reading them
 * here means a rule can be corrected — as it was when a B2B ingredient house
 * turned out to sell corn starch beside its liofilizados — without re-crawling
 * anything, which matters because a full crawl takes the better part of an hour
 * and hammers other people's servers.
 */
let registryFlags = new Map();
try {
  const reg = await loadRegistry(join(CACHE, "..", "vendors-registry.csv"));
  registryFlags = new Map(reg.filter(v => v.domain).map(v => [v.domain, v]));
} catch {
  console.log("No vendor registry found — using the flags stored in each cache file\n");
}

const files = (await readdir(CACHE)).filter(f => f.endsWith(".json"));
const rows = [];
const storeReport = [];

for (const file of files) {
  const cached = JSON.parse(await readFile(join(CACHE, file), "utf8"));
  const { status, currency, fetched_at, products = [] } = cached;
  // Registry wins where it knows the vendor; the cached copy is the fallback.
  const store = { ...cached.store, ...(registryFlags.get(cached.store?.domain) ?? {}) };
  if (status === "marketplace_reseller") {
    storeReport.push({
      vendor: store.name, domain: store.domain, country: store.country,
      fetch_status: "excluded_marketplace", currency: null, rows: 0, rows_with_price_per_kg: 0,
    });
    continue;
  }

  let kept = 0;
  for (const p of products) {
    const haystack = `${p.title} ${p.product_type ?? ""} ${(p.tags ?? []).join(" ")}`;
    if (NON_FOOD.test(haystack)) continue;
    // Applies whatever the store is: a bulk ingredient stays a bulk ingredient
    // even in a catalogue that is otherwise entirely freeze-dried.
    if (NON_FD_COMMODITY.test(p.title)) continue;

    const isFd = store.wholeStoreFd || FD_WORDS.test(`${haystack} ${(p.body_html ?? "").slice(0, 300)}`);
    if (!isFd) continue;

    for (const v of p.variants ?? []) {
      const price = parseFloat(v.price);
      if (!Number.isFinite(price) || price <= 0) continue;

      const w = resolveWeight(p, v);
      let perKg = w.grams ? price / (w.grams / 1000) : null;

      // A shipping-weight-derived figure outside the plausible retail band is
      // discarded rather than published. Genuine freeze-dried retail runs from
      // roughly $20/kg (bulk cans) to $600/kg (single-serve candy).
      let dropped = null;
      if (perKg !== null && w.confidence === "low" && (perKg < 20 || perKg > 600)) {
        dropped = `implausible_from_shipping_weight(${perKg.toFixed(0)})`;
        perKg = null;
      }

      const fx = TO_CAD[currency ?? ""] ?? null;
      // Re-check the band against CAD, not the store's currency: at 1.37 a USD
      // row could pass a 600 ceiling and still land at CAD 822/kg.
      if (perKg !== null && w.confidence === "low" && fx && perKg * fx > 600) {
        dropped = `implausible_from_shipping_weight_cad(${(perKg * fx).toFixed(0)})`;
        perKg = null;
      }

      rows.push({
        vendor: store.name,
        vendor_country: store.country,
        // Present only on catalogues crawled from the vendor registry, which
        // records the province or state and how the seller operates.
        vendor_region: store.zone && store.zone !== store.country ? store.zone : "",
        vendor_type: store.vendorType ?? "",
        vendor_domain: store.domain,
        product_name: p.title,
        variant: v.title === "Default Title" ? "" : (v.title ?? ""),
        category: categorise(p.title, haystack),
        product_type: p.product_type ?? "",
        net_weight_g: w.grams ?? "",
        weight_source: w.source,
        weight_confidence: w.confidence,
        price: price.toFixed(2),
        currency: currency ?? "",
        price_per_kg: perKg !== null ? perKg.toFixed(2) : "",
        price_per_kg_cad: perKg !== null && fx ? (perKg * fx).toFixed(2) : "",
        fx_rate_to_cad: fx ?? "",
        fx_date: FX_DATE,
        in_stock: v.available === true ? "yes" : "no",
        source_url: productUrl(store, cached.platform, p.handle, cached.shopPath),
        observed_at: (fetched_at ?? "").slice(0, 10),
        note: dropped ?? "",
      });
      kept++;
    }
  }

  storeReport.push({
    vendor: store.name,
    domain: store.domain,
    country: store.country,
    fetch_status: status,
    currency,
    rows: kept,
    rows_with_price_per_kg: rows.filter(r => r.vendor_domain === store.domain && r.price_per_kg).length,
  });
}

// ── Merchants without a machine-readable catalogue ──────────────────────────
// Some sellers — Supreme Freeze Dry among them — run storefronts with no public
// product feed, so their listings were read by hand into manual-observations.csv
// and are merged here. They carry the same columns and are marked so a reader
// can separate them from the automated rows.
try {
  const manualPath = join(OUT, "..", "manual-observations.csv");
  const text = await readFile(manualPath, "utf8");
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const cols = headerLine.split(",");

  const parseCsvLine = line => {
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
    return out;
  };

  let manualCount = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    const values = parseCsvLine(line);
    const r = Object.fromEntries(cols.map((c, i) => [c, values[i] ?? ""]));

    const grams = parseFloat(r.net_weight_g);
    const price = parseFloat(r.price);
    const perKg = Number.isFinite(grams) && grams > 0 && Number.isFinite(price) ? price / (grams / 1000) : null;
    const fx = TO_CAD[r.currency] ?? null;

    rows.push({
      ...r,
      collection_method: "manual",
      price: Number.isFinite(price) ? price.toFixed(2) : r.price,
      price_per_kg: perKg !== null ? perKg.toFixed(2) : "",
      price_per_kg_cad: perKg !== null && fx ? (perKg * fx).toFixed(2) : "",
    });
    manualCount++;
  }

  const manualVendors = new Set(rows.filter(r => r.collection_method === "manual").map(r => r.vendor));
  for (const v of manualVendors) {
    storeReport.push({
      vendor: v,
      domain: rows.find(r => r.vendor === v)?.vendor_domain ?? "",
      country: rows.find(r => r.vendor === v)?.vendor_country ?? "",
      fetch_status: "manual_transcription",
      currency: rows.find(r => r.vendor === v)?.currency ?? null,
      rows: rows.filter(r => r.vendor === v).length,
      rows_with_price_per_kg: rows.filter(r => r.vendor === v && r.price_per_kg).length,
    });
  }
  console.log(`Merged ${manualCount} manually transcribed rows\n`);
} catch {
  console.log("No manual-observations.csv found — skipping\n");
}

for (const r of rows) r.collection_method ??= "catalog_feed";

// ── Outputs ─────────────────────────────────────────────────────────────────
const HEADERS = [
  "vendor", "vendor_country", "vendor_region", "vendor_type", "vendor_domain",
  "product_name", "variant", "category", "product_type",
  "net_weight_g", "weight_source", "weight_confidence",
  "price", "currency", "price_per_kg", "price_per_kg_cad",
  "fx_rate_to_cad", "fx_date",
  "in_stock", "collection_method", "source_url", "observed_at", "note",
];

// Excel on Windows assumes the system codepage unless a UTF-8 byte-order mark
// is present, which turns "Québec" into "QuÃ©bec" for every accented product
// name in the file. The BOM is invisible to every other reader.
const BOM = "﻿";

const esc = v => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

await writeFile(
  join(OUT, "freeze-dried-products.csv"),
  BOM + [HEADERS.join(",")].concat(rows.map(r => HEADERS.map(h => esc(r[h])).join(","))).join("\n"),
  "utf8",
);

// Per-category summary. Median rather than mean: a handful of single-serve
// candy packs at $500/kg would drag an average somewhere no real buyer trades.
const median = xs => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

const priced = rows.filter(r => r.price_per_kg_cad && r.weight_confidence === "high");
const byCategory = {};
for (const r of priced) (byCategory[r.category] ??= []).push(parseFloat(r.price_per_kg_cad));

const summary = Object.entries(byCategory)
  .map(([category, values]) => ({
    category,
    observations: values.length,
    vendors: new Set(priced.filter(r => r.category === category).map(r => r.vendor)).size,
    median_cad_per_kg: +median(values).toFixed(2),
    min_cad_per_kg: +Math.min(...values).toFixed(2),
    max_cad_per_kg: +Math.max(...values).toFixed(2),
  }))
  .sort((a, b) => b.observations - a.observations);

const SUM_HEADERS = ["category", "observations", "vendors", "median_cad_per_kg", "min_cad_per_kg", "max_cad_per_kg"];
await writeFile(
  join(OUT, "freeze-dried-price-summary.csv"),
  BOM + [SUM_HEADERS.join(",")].concat(summary.map(r => SUM_HEADERS.map(h => esc(r[h])).join(","))).join("\n"),
  "utf8",
);

await writeFile(
  join(OUT, "dataset-metadata.json"),
  JSON.stringify({
    built_at: new Date().toISOString(),
    fx_date: FX_DATE,
    fx_rates_to_cad: TO_CAD,
    method:
      "Prices and net weights read from each merchant's own public product catalogue. " +
      "Net weight is taken from the merchant's declared net weight, variant name, product name, " +
      "or description, in that order. Shopify's shipping-weight field is used only as a last " +
      "resort and only when the implied price falls between 20 and 600 CAD/kg, because many " +
      "merchants leave that field at a placeholder value. Rows with no establishable weight keep " +
      "their price and have an empty price_per_kg. Summary figures exclude low-confidence weights.",
    stores: storeReport,
    totals: {
      stores_surveyed: storeReport.length,
      stores_with_data: storeReport.filter(s => s.rows > 0).length,
      product_rows: rows.length,
      rows_with_price_per_kg: rows.filter(r => r.price_per_kg).length,
      rows_in_summary: priced.length,
    },
  }, null, 2),
  "utf8",
);

console.log(`Stores surveyed        : ${storeReport.length}`);
console.log(`Stores yielding data   : ${storeReport.filter(s => s.rows > 0).length}`);
console.log(`Product rows           : ${rows.length}`);
console.log(`Rows with $/kg         : ${rows.filter(r => r.price_per_kg).length}`);
console.log(`Rows in summary        : ${priced.length}\n`);
console.table(summary);
