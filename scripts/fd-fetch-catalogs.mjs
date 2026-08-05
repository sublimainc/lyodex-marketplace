/**
 * Step 1 of 2 — downloads raw product catalogs and caches them to disk.
 *
 * Kept separate from parsing on purpose. Shopify rate-limits an unauthenticated
 * reader per IP across every store it hosts, so a full sweep is slow and cannot
 * be repeated casually. Caching the raw JSON means the weight-extraction rules
 * in fd-build-dataset.mjs can be corrected and re-run as many times as needed
 * without touching the network again.
 *
 *   node scripts/fd-fetch-catalogs.mjs <cache-dir>
 */

import { writeFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { STORES } from "./fd-stores.mjs";

const CACHE = process.argv[2];
if (!CACHE) throw new Error("usage: node fd-fetch-catalogs.mjs <cache-dir>");

const PAGE_SIZE = 50;
const THROTTLE_MS = 2500;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getJson(url, timeoutMs = 25000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: ctl.signal, redirect: "follow" });
    if (res.status === 429) return "RATE_LIMITED";
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") ?? "").includes("json")) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function alreadyCached(domain) {
  try {
    const raw = JSON.parse(await readFile(join(CACHE, `${domain}.json`), "utf8"));
    return raw.products?.length > 0;
  } catch {
    return false;
  }
}

await mkdir(CACHE, { recursive: true });

for (const store of STORES) {
  if (await alreadyCached(store.domain)) {
    console.log(`${store.name.padEnd(30)} cached, skipping`);
    continue;
  }

  const products = [];
  let currency = null;
  let blocked = false;

  for (let page = 1; page <= 12; page++) {
    let data = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      data = await getJson(`https://${store.domain}/products.json?limit=${PAGE_SIZE}&page=${page}`);
      if (data !== "RATE_LIMITED") break;
      await sleep([4000, 10000, 20000, 35000, 60000][attempt]);
    }
    if (data === "RATE_LIMITED") { blocked = true; break; }
    if (!data?.products?.length) break;

    products.push(...data.products);
    if (!currency) {
      const cart = await getJson(`https://${store.domain}/cart.js`);
      currency = cart?.currency ?? null;
    }
    if (data.products.length < PAGE_SIZE) break;
    await sleep(THROTTLE_MS);
  }

  // Recording *why* a store yielded nothing matters: "blocked" is a fact about
  // this run, "no_feed" is a fact about the merchant. Collapsing them would turn
  // a collection failure into a false claim about the market.
  const status = products.length ? (blocked ? "partial" : "ok") : (blocked ? "blocked" : "no_feed");

  await writeFile(
    join(CACHE, `${store.domain}.json`),
    JSON.stringify({ store, status, currency, fetched_at: new Date().toISOString(), products }, null, 1),
    "utf8",
  );

  console.log(`${store.name.padEnd(30)} ${String(products.length).padStart(4)} products  ${currency ?? "?"}  [${status}]`);
  await sleep(1200);
}

console.log(`\nCatalogs cached in ${CACHE}`);
