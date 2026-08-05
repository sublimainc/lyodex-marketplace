/**
 * Fills in each cached store's currency and registered country from /meta.json.
 *
 * The catalogue fetcher probed /cart.js, which Shopify serves as
 * "text/javascript" — the content-type guard rejected it and every store came
 * back with an unknown currency. /meta.json returns proper JSON and carries the
 * merchant's own currency and country, which beats inferring either from the
 * domain: several Canadian and European stores price in USD.
 *
 *   node scripts/fd-fill-currency.mjs <cache-dir>
 */

import { readFile, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const CACHE = process.argv[2];
if (!CACHE) throw new Error("usage: node fd-fill-currency.mjs <cache-dir>");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const sleep = ms => new Promise(r => setTimeout(r, ms));

for (const file of (await readdir(CACHE)).filter(f => f.endsWith(".json"))) {
  const path = join(CACHE, file);
  const cached = JSON.parse(await readFile(path, "utf8"));
  if (cached.currency || !cached.products?.length) continue;

  const domain = cached.store.domain;
  try {
    const res = await fetch(`https://${domain}/meta.json`, { headers: { "User-Agent": UA } });
    if (res.ok) {
      const meta = await res.json();
      cached.currency = meta.currency ?? null;
      cached.merchant_country = meta.country ?? null;
      cached.merchant_city = meta.city ?? null;
      await writeFile(path, JSON.stringify(cached, null, 1), "utf8");
      console.log(`${domain.padEnd(34)} ${meta.currency ?? "?"}  ${meta.country ?? ""} ${meta.city ?? ""}`);
    } else {
      console.log(`${domain.padEnd(34)} meta.json ${res.status}`);
    }
  } catch (e) {
    console.log(`${domain.padEnd(34)} error: ${e.message}`);
  }
  await sleep(900);
}
