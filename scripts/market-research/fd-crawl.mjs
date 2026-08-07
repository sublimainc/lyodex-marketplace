/**
 * Crawls the vendor registry and caches each seller's catalogue.
 *
 * Handles two storefront platforms, both through endpoints the platforms
 * themselves publish for public consumption:
 *
 *   Shopify      GET /products.json           — includes variant weights
 *   WooCommerce  GET /wp-json/wc/store/v1/products — the Store API, public since WC 5.x
 *
 * Anything else is recorded as unsupported rather than guessed at. A vendor that
 * cannot be read is a gap in coverage, and saying so is the only honest option —
 * the alternative is a benchmark that looks complete because the misses are
 * invisible.
 *
 *   node scripts/market-research/fd-crawl.mjs <registry.csv> <cache-dir> [--only=domain]
 */

import { writeFile, readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { loadRegistry } from "./fd-registry.mjs";

const [REGISTRY, CACHE, ...flags] = process.argv.slice(2);
if (!REGISTRY || !CACHE) throw new Error("usage: node fd-crawl.mjs <registry.csv> <cache-dir> [--only=domain]");
const only = flags.find(f => f.startsWith("--only="))?.slice(7);
const force = flags.includes("--force");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function get(url, { json = true, timeout = 20000 } = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: json ? "application/json" : "text/html" },
      signal: ctl.signal,
      redirect: "follow",
    });
    if (res.status === 429) return { rateLimited: true };
    if (!res.ok) return { status: res.status };
    const ct = res.headers.get("content-type") ?? "";
    if (json && !ct.includes("json")) return { status: res.status, notJson: true };
    return { ok: true, body: json ? await res.json() : await res.text() };
  } catch (e) {
    return { error: e.name };
  } finally {
    clearTimeout(timer);
  }
}

// ── Shopify ─────────────────────────────────────────────────────────────────
async function crawlShopify(domain) {
  const products = [];
  let blocked = false;

  for (let page = 1; page <= 14; page++) {
    let r = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      r = await get(`https://${domain}/products.json?limit=50&page=${page}`);
      if (!r.rateLimited) break;
      await sleep([4000, 10000, 20000, 35000, 60000][attempt]);
    }
    if (r.rateLimited) { blocked = true; break; }
    if (!r.ok || !Array.isArray(r.body?.products) || r.body.products.length === 0) break;

    products.push(...r.body.products);
    if (r.body.products.length < 50) break;
    await sleep(2200);
  }

  if (!products.length) return null;

  const meta = await get(`https://${domain}/meta.json`);
  return {
    platform: "shopify",
    currency: meta.ok ? meta.body?.currency ?? null : null,
    merchant_country: meta.ok ? meta.body?.country ?? null : null,
    merchant_city: meta.ok ? meta.body?.city ?? null : null,
    blocked,
    products,
  };
}

// ── WooCommerce Store API ───────────────────────────────────────────────────
/**
 * Normalised into the Shopify shape so one parser serves both. Woo reports
 * prices in minor units with a stated precision, and puts the pack size in a
 * free-text weight field or the product name — never in a reliable grams column,
 * so the weight still has to be read from the text downstream.
 */
async function crawlWoo(domain) {
  const products = [];
  let currency = null;

  // Older WooCommerce installs expose the Store API without the version segment.
  let base = null;
  for (const p of ["wc/store/v1/products", "wc/store/products"]) {
    const probe = await get(`https://${domain}/wp-json/${p}?per_page=1`);
    if (probe.ok && Array.isArray(probe.body)) { base = p; break; }
  }
  if (!base) return null;

  for (let page = 1; page <= 14; page++) {
    const r = await get(`https://${domain}/wp-json/${base}?per_page=50&page=${page}`);
    if (!r.ok || !Array.isArray(r.body) || r.body.length === 0) break;

    for (const p of r.body) {
      const minor = p.prices?.currency_minor_unit ?? 2;
      const toMajor = v => (v === null || v === undefined || v === "" ? null : (Number(v) / 10 ** minor).toFixed(2));
      currency ??= p.prices?.currency_code ?? null;

      products.push({
        title: p.name,
        handle: p.slug,
        product_type: (p.categories ?? []).map(c => c.name).join(", "),
        tags: (p.categories ?? []).map(c => c.name),
        body_html: `${p.short_description ?? ""} ${p.description ?? ""}`,
        variants: [{
          title: p.variation || "Default Title",
          price: toMajor(p.prices?.price),
          // Woo's public Store API exposes no weight, so there is nothing to
          // mistake for one. The weight comes from the title or description.
          grams: 0,
          available: p.is_in_stock === true,
        }],
      });
    }
    if (r.body.length < 50) break;
    await sleep(1400);
  }

  return products.length ? { platform: "woocommerce", currency, blocked: false, products } : null;
}

// ── Squarespace ─────────────────────────────────────────────────────────────
/**
 * Squarespace renders any collection as JSON when `?format=json` is appended.
 * The shop lives at a path the owner chose, so the usual ones are tried in turn.
 *
 * Prices come in cents, and the pack size sits in a variant attribute — usually
 * named "Size", holding text like "1.6oz". That is exactly the kind of
 * seller-stated size the weight parser downstream can trust, so it is mapped
 * onto the variant title rather than discarded.
 */
const SQUARESPACE_PATHS = ["shop", "store", "products", "shop-all", "all-products"];

async function crawlSquarespace(domain) {
  for (const path of SQUARESPACE_PATHS) {
    const r = await get(`https://${domain}/${path}?format=json`);
    if (!r.ok || !Array.isArray(r.body?.items) || r.body.items.length === 0) continue;

    const products = r.body.items
      .filter(i => Array.isArray(i.variants) && i.variants.length)
      .map(i => ({
        title: i.title,
        handle: i.urlId ?? "",
        product_type: (i.categories ?? []).join(", "),
        tags: i.tags ?? [],
        body_html: `${i.excerpt ?? ""} ${i.body ?? ""}`,
        variants: i.variants.map(v => ({
          title: Object.values(v.attributes ?? {}).join(" / ") || "Default Title",
          price: v.price != null ? (Number(v.price) / 100).toFixed(2) : null,
          grams: 0,
          available: v.unlimited === true || Number(v.qtyInStock) > 0,
        })),
      }));

    if (products.length) {
      return {
        platform: "squarespace",
        // Squarespace's collection JSON does not name the currency; it is read
        // from the site's own website settings block when present.
        currency: r.body.website?.storeSettings?.currencyCode ?? r.body.websiteSettings?.storeSettings?.currencyCode ?? null,
        blocked: false,
        shopPath: path,
        products,
      };
    }
    await sleep(700);
  }
  return null;
}

// ── Platform detection ──────────────────────────────────────────────────────
async function detect(domain) {
  const shopify = await get(`https://${domain}/products.json?limit=1`);
  if (shopify.ok && Array.isArray(shopify.body?.products)) return "shopify";
  if (shopify.rateLimited) return "shopify";

  for (const p of ["wc/store/v1/products", "wc/store/products"]) {
    const woo = await get(`https://${domain}/wp-json/${p}?per_page=1`);
    if (woo.ok && Array.isArray(woo.body)) return "woocommerce";
  }

  const sq = await get(`https://${domain}/?format=json`);
  if (sq.ok && (sq.body?.website?.siteId || sq.body?.collection)) return "squarespace";

  return null;
}

// ── Run ─────────────────────────────────────────────────────────────────────
await mkdir(CACHE, { recursive: true });
const registry = await loadRegistry(REGISTRY);

const targets = registry.filter(v => v.domain && (!only || v.domain === only));
console.log(`${targets.length} vendors in registry, ${targets.filter(v => v.skip).length} skipped as marketplaces\n`);

for (const v of targets) {
  const file = join(CACHE, `${v.domain}.json`);

  if (v.skip) {
    await writeFile(file, JSON.stringify({ store: v, status: v.skip, products: [] }, null, 1), "utf8");
    console.log(`${v.name.padEnd(32)} — exclu (revendeur multi-marques)`);
    continue;
  }

  if (!force) {
    try {
      const existing = JSON.parse(await readFile(file, "utf8"));
      if (existing.products?.length) {
        console.log(`${v.name.padEnd(32)} en cache (${existing.products.length})`);
        continue;
      }
    } catch { /* not cached yet */ }
  }

  const platform = await detect(v.domain);
  let result = null;
  if (platform === "shopify") result = await crawlShopify(v.domain);
  else if (platform === "woocommerce") result = await crawlWoo(v.domain);
  else if (platform === "squarespace") result = await crawlSquarespace(v.domain);

  const status = result
    ? (result.blocked ? "partial" : "ok")
    : (platform ? "empty" : "unsupported_platform");

  await writeFile(
    file,
    JSON.stringify({
      store: v,
      status,
      platform: platform ?? null,
      currency: result?.currency ?? null,
      merchant_country: result?.merchant_country ?? null,
      merchant_city: result?.merchant_city ?? null,
      shopPath: result?.shopPath ?? null,
      fetched_at: new Date().toISOString(),
      products: result?.products ?? [],
    }, null, 1),
    "utf8",
  );

  const n = result?.products?.length ?? 0;
  console.log(`${v.name.padEnd(32)} ${String(n).padStart(4)} produits  ${(result?.currency ?? "?").padEnd(4)} [${platform ?? "plateforme inconnue"}]`);
  await sleep(1100);
}

console.log(`\nCatalogues en cache dans ${CACHE}`);
