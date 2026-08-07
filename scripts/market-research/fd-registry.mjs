/**
 * Reads the vendor registry and turns it into crawl targets.
 *
 * The registry (data/market-research/vendors-registry.csv) is the canonical list
 * of sellers. It is hand-curated and verified, so nothing here invents a vendor —
 * this module only normalises the domain and decides what is worth crawling.
 *
 * Marketplaces are excluded deliberately, for two separate reasons:
 *
 *   1. Their terms prohibit automated extraction and they block it in practice.
 *   2. More importantly for the data itself, they resell other brands. Counting
 *      Mountain House at REI and again at mountainhouse.com would weight one
 *      producer twice and quietly skew every median in the benchmark.
 *
 * They stay in the registry as distribution channels worth knowing about; they
 * are simply not price observations about distinct producers.
 */

import { readFile } from "node:fs/promises";

const MARKETPLACE_TYPES = /marketplace|detaillant outdoor|detailant outdoor/i;

const MARKETPLACE_DOMAINS = new Set([
  "canadiantire.ca", "walmart.ca", "walmart.com", "rei.com", "chewy.com",
  "petco.com", "mercadolibre.com.mx", "listado.mercadolibre.com.mx", "amazon.com", "amazon.ca",
]);

export function hostFromUrl(url) {
  try {
    return new URL(url.trim()).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Splits a "a; b; c" registry cell into tidy tokens. */
function splitList(s) {
  return (s ?? "").split(/;/).map(x => x.trim()).filter(Boolean);
}

const COUNTRY_CODE = { Canada: "CA", "Etats-Unis": "US", Mexique: "MX" };

export async function loadRegistry(path) {
  const text = await readFile(path, "utf8");
  const lines = text.replace(/^﻿/, "").trim().split(/\r?\n/);
  const cols = lines[0].split(",");

  const parse = line => {
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
    return Object.fromEntries(cols.map((c, i) => [c, (out[i] ?? "").trim()]));
  };

  return lines.slice(1).filter(l => l.trim()).map(line => {
    const r = parse(line);
    const domain = hostFromUrl(r.site_web);
    const isMarketplace = MARKETPLACE_TYPES.test(r.type_vendeur) || (domain && MARKETPLACE_DOMAINS.has(domain));

    return {
      name: r.vendeur,
      domain,
      url: r.site_web,
      country: COUNTRY_CODE[r.pays] ?? r.pays,
      zone: r.zone,
      vendorType: r.type_vendeur,
      categoriesDeclared: splitList(r.categories_observees),
      notes: r.notes,
      /**
       * A seller whose whole catalogue is freeze-dried does not need the words in
       * each product title — most write "Strawberries", not "Freeze Dried
       * Strawberries". Two kinds of seller are the exception and must name the
       * process for a product to count:
       *
       *   Specialist retailers — an emergency-prep shop stocks canned goods,
       *   water filters and stoves alongside.
       *
       *   B2B ingredient houses — Gredi Mexico lists liofilizados beside corn
       *   starch, sorbitol, wheat gluten and defatted soy flour in 25 kg sacks.
       *   Counting those put soy flour at $2.59/kg into the benchmark as its
       *   cheapest "freeze-dried" product.
       */
      wholeStoreFd: !/detaillant|detailant|b2b|ingredient/i.test(r.type_vendeur),
      skip: isMarketplace ? "marketplace_reseller" : null,
    };
  });
}
