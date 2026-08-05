/**
 * Renders the price dataset as a single self-contained HTML page.
 *
 * The CSV is the archival format, but three thousand rows in a spreadsheet is a
 * poor way to answer "what does freeze-dried fruit actually sell for". This page
 * carries the same rows with the filtering already built in — and it opens in a
 * browser, which matters because .csv has no file association on the machine
 * this was built for.
 *
 *   node scripts/fd-build-explorer.mjs <data-dir> <output.html>
 */

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const [DATA, OUT] = process.argv.slice(2);
if (!DATA || !OUT) throw new Error("usage: node fd-build-explorer.mjs <data-dir> <output.html>");

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

const rows = parseCsv(await readFile(join(DATA, "freeze-dried-products.csv"), "utf8"));
const meta = JSON.parse(await readFile(join(DATA, "dataset-metadata.json"), "utf8"));

// Dictionary-encode the repeating columns; at three thousand rows the vendor and
// category strings alone would be most of the payload.
const vendors = [...new Set(rows.map(r => r.vendor))].sort();
const cats = [...new Set(rows.map(r => r.category))].sort();
const currs = [...new Set(rows.map(r => r.currency))].sort();
const CONF = ["high", "medium", "low", "none"];

const vendorMeta = Object.fromEntries(
  vendors.map(v => {
    const r = rows.find(x => x.vendor === v);
    return [v, { country: r.vendor_country, domain: r.vendor_domain }];
  }),
);

const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };

const packed = rows.map(r => [
  vendors.indexOf(r.vendor),
  r.product_name,
  r.variant,
  cats.indexOf(r.category),
  num(r.net_weight_g),
  Math.max(0, CONF.indexOf(r.weight_confidence)),
  num(r.price),
  currs.indexOf(r.currency),
  num(r.price_per_kg_cad),
  r.in_stock === "yes" ? 1 : 0,
  r.source_url,
]);

const payload = {
  vendors,
  vendorMeta: vendors.map(v => vendorMeta[v]),
  cats,
  currs,
  rows: packed,
  meta: {
    built: meta.built_at.slice(0, 10),
    fxDate: meta.fx_date,
    fx: meta.fx_rates_to_cad,
    surveyed: meta.totals.stores_surveyed,
    withData: meta.totals.stores_with_data,
  },
};

const CAT_LABEL = {
  fruit: "Fruits", vegetable: "Légumes", meat: "Viandes", candy: "Confiseries",
  meal: "Repas", dairy: "Produits laitiers", yogurt: "Yogourt", egg: "Œufs",
  powder: "Poudres", beverage: "Boissons", ice_cream: "Crème glacée",
  herb_spice: "Herbes et épices", pet: "Animaux", other: "Autres",
};

const html = `<title>Prix des produits lyophilisés — relevé mondial</title>
<style>
  /* Palette drawn from the material itself: freeze-dried fruit is saturated
     pigment sitting on a chalky, porous, matte surface. The ground carries a
     faint green bias so it reads as chosen rather than defaulted, and the accent
     is LyoDex's own green rather than a new colour invented for this page. */
  :root {
    --ground:      #F6F7F5;
    --surface:     #FFFFFF;
    --ink:         #141A17;
    --muted:       #5F6B64;
    --faint:       #8B958F;
    --line:        #DDE3DE;
    --line-strong: #C4CDC7;
    --accent:      #0F6E56;
    --accent-soft: #E3EFEA;
    --conf-high:   #0F6E56;
    --conf-med:    #A8760F;
    --conf-low:    #99A19B;
    --shadow:      0 1px 2px rgba(20,26,23,.05), 0 8px 24px -12px rgba(20,26,23,.12);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --ground:      #101512;
      --surface:     #171E1A;
      --ink:         #E8EDE9;
      --muted:       #9AA69F;
      --faint:       #6E7A73;
      --line:        #262F29;
      --line-strong: #384339;
      --accent:      #4FBF9B;
      --accent-soft: #16302A;
      --conf-high:   #4FBF9B;
      --conf-med:    #D9A441;
      --conf-low:    #6E7A73;
      --shadow:      0 1px 2px rgba(0,0,0,.4), 0 8px 24px -12px rgba(0,0,0,.6);
    }
  }
  /* The viewer's own toggle must win over the OS preference in both directions. */
  :root[data-theme="dark"] {
    --ground:#101512; --surface:#171E1A; --ink:#E8EDE9; --muted:#9AA69F;
    --faint:#6E7A73; --line:#262F29; --line-strong:#384339; --accent:#4FBF9B;
    --accent-soft:#16302A; --conf-high:#4FBF9B; --conf-med:#D9A441; --conf-low:#6E7A73;
    --shadow:0 1px 2px rgba(0,0,0,.4), 0 8px 24px -12px rgba(0,0,0,.6);
  }
  :root[data-theme="light"] {
    --ground:#F6F7F5; --surface:#FFFFFF; --ink:#141A17; --muted:#5F6B64;
    --faint:#8B958F; --line:#DDE3DE; --line-strong:#C4CDC7; --accent:#0F6E56;
    --accent-soft:#E3EFEA; --conf-high:#0F6E56; --conf-med:#A8760F; --conf-low:#99A19B;
    --shadow:0 1px 2px rgba(20,26,23,.05), 0 8px 24px -12px rgba(20,26,23,.12);
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    background: var(--ground);
    color: var(--ink);
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 15px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  .wrap { max-width: 1240px; margin: 0 auto; padding: 0 20px 72px; }

  /* ── Masthead ── */
  header.top { padding: 44px 0 28px; border-bottom: 1px solid var(--line); }
  .eyebrow {
    font-size: .6875rem; font-weight: 650; letter-spacing: .14em;
    text-transform: uppercase; color: var(--accent); margin: 0 0 10px;
  }
  h1 {
    font-family: ui-serif, Georgia, "Times New Roman", serif;
    font-size: clamp(1.9rem, 4vw, 2.7rem);
    font-weight: 600; letter-spacing: -.022em; line-height: 1.08;
    margin: 0 0 12px; text-wrap: balance;
  }
  .lede { max-width: 62ch; color: var(--muted); margin: 0 0 22px; font-size: 1.0625rem; }

  .facts { display: flex; flex-wrap: wrap; gap: 0; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; background: var(--surface); }
  .fact { flex: 1 1 150px; padding: 14px 18px; border-right: 1px solid var(--line); }
  .fact:last-child { border-right: 0; }
  .fact dt { font-size: .6875rem; letter-spacing: .08em; text-transform: uppercase; color: var(--faint); margin: 0 0 3px; }
  .fact dd { margin: 0; font-size: 1.35rem; font-weight: 600; font-variant-numeric: tabular-nums; font-family: ui-monospace, "Cascadia Mono", "Segoe UI Mono", monospace; }

  /* ── Category summary ── */
  section { padding-top: 34px; }
  h2 {
    font-family: ui-serif, Georgia, "Times New Roman", serif;
    font-size: 1.3rem; font-weight: 600; letter-spacing: -.015em; margin: 0 0 4px;
  }
  .sub { color: var(--muted); font-size: .875rem; margin: 0 0 18px; max-width: 66ch; }

  .cats { display: grid; grid-template-columns: repeat(auto-fill, minmax(238px, 1fr)); gap: 12px; }
  .cat {
    background: var(--surface); border: 1px solid var(--line); border-radius: 10px;
    padding: 14px 16px 16px; box-shadow: var(--shadow);
  }
  .cat-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 2px; }
  .cat-name { font-weight: 600; font-size: .9375rem; }
  .cat-n { font-size: .75rem; color: var(--faint); font-variant-numeric: tabular-nums; }
  .cat-med {
    font-family: ui-monospace, "Cascadia Mono", "Segoe UI Mono", monospace;
    font-size: 1.45rem; font-weight: 600; color: var(--accent);
    font-variant-numeric: tabular-nums; letter-spacing: -.02em;
  }
  .cat-med small { font-size: .6875rem; font-weight: 500; color: var(--faint); letter-spacing: .04em; }
  /* Range strip: the median's position inside min–max, so a category with a long
     tail reads differently from a tight one at a glance. */
  .range { margin-top: 10px; height: 4px; background: var(--line); border-radius: 2px; position: relative; }
  .range i { position: absolute; top: -3px; width: 2px; height: 10px; background: var(--accent); border-radius: 1px; }
  .range-lab { display: flex; justify-content: space-between; font-size: .6875rem; color: var(--faint); margin-top: 5px; font-variant-numeric: tabular-nums; }

  /* ── Controls ── */
  .controls {
    position: sticky; top: 0; z-index: 20; background: var(--ground);
    padding: 16px 0 12px; border-bottom: 1px solid var(--line); margin-top: 34px;
  }
  .ctl-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
  input[type="search"], select {
    font: inherit; font-size: .875rem; color: var(--ink); background: var(--surface);
    border: 1px solid var(--line-strong); border-radius: 8px; padding: 7px 11px;
  }
  input[type="search"] { min-width: 230px; flex: 1 1 230px; }
  input[type="search"]:focus-visible, select:focus-visible, button:focus-visible {
    outline: 2px solid var(--accent); outline-offset: 2px;
  }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .chip {
    font: inherit; font-size: .8125rem; cursor: pointer;
    background: var(--surface); color: var(--muted);
    border: 1px solid var(--line-strong); border-radius: 999px; padding: 4px 11px;
  }
  .chip[aria-pressed="true"] { background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 550; }
  .count { font-size: .8125rem; color: var(--muted); margin-left: auto; font-variant-numeric: tabular-nums; }

  /* ── Table ── */
  .tablewrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); margin-top: 16px; }
  table { border-collapse: collapse; width: 100%; font-size: .875rem; }
  thead th {
    position: sticky; top: 0; background: var(--surface); z-index: 5;
    text-align: left; font-size: .6875rem; letter-spacing: .07em; text-transform: uppercase;
    color: var(--faint); font-weight: 650; padding: 10px 12px; white-space: nowrap;
    border-bottom: 1px solid var(--line-strong); cursor: pointer; user-select: none;
  }
  thead th.n { text-align: right; }
  thead th[aria-sort]:not([aria-sort="none"]) { color: var(--accent); }
  thead th .arrow { opacity: .55; font-size: .625rem; }
  tbody tr { border-bottom: 1px solid var(--line); }
  tbody tr:last-child { border-bottom: 0; }
  tbody tr:hover { background: var(--accent-soft); }
  td { padding: 9px 12px; vertical-align: top; }
  td.n { text-align: right; font-family: ui-monospace, "Cascadia Mono", "Segoe UI Mono", monospace; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .prod { font-weight: 550; }
  .var { color: var(--faint); font-size: .8125rem; }
  .vend a { color: inherit; text-decoration: none; border-bottom: 1px solid var(--line-strong); }
  .vend a:hover { color: var(--accent); border-color: var(--accent); }
  .vend small { display: block; color: var(--faint); font-size: .75rem; }
  .ppk { font-weight: 650; color: var(--accent); font-size: .9375rem; }
  /* A missing price per kilo is shown as an absence, never as zero. */
  .none { color: var(--faint); font-style: italic; font-family: system-ui, sans-serif; font-size: .8125rem; }

  /* Confidence reads as a stripe as well as a word, so the weak rows are
     visible while scanning rather than only on inspection. */
  td.conf { border-left: 3px solid transparent; padding-left: 12px; }
  .c0 { border-left-color: var(--conf-high) !important; }
  .c1 { border-left-color: var(--conf-med) !important; }
  .c2 { border-left-color: var(--conf-low) !important; }
  .c3 { border-left-color: transparent !important; }
  .badge { font-size: .6875rem; font-weight: 600; letter-spacing: .03em; text-transform: uppercase; }
  .b0 { color: var(--conf-high); }
  .b1 { color: var(--conf-med); }
  .b2 { color: var(--conf-low); }
  .b3 { color: var(--faint); font-weight: 500; text-transform: none; font-style: italic; }

  .more { display: block; width: 100%; margin-top: 14px; font: inherit; font-size: .875rem;
    background: var(--surface); border: 1px solid var(--line-strong); border-radius: 8px;
    padding: 10px; cursor: pointer; color: var(--muted); }
  .more:hover { border-color: var(--accent); color: var(--accent); }
  .empty { padding: 44px 20px; text-align: center; color: var(--muted); }

  footer { margin-top: 42px; padding-top: 20px; border-top: 1px solid var(--line); color: var(--muted); font-size: .8125rem; max-width: 74ch; }
  footer p { margin: 0 0 10px; }
  footer strong { color: var(--ink); font-weight: 600; }

  @media (max-width: 620px) {
    .fact { flex-basis: 50%; border-bottom: 1px solid var(--line); }
    .hide-s { display: none; }
  }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>

<div class="wrap">
  <header class="top">
    <p class="eyebrow">LyoDex · relevé de marché</p>
    <h1>Ce que les produits lyophilisés se vendent, au kilo</h1>
    <p class="lede">
      Prix relevés dans les catalogues publics de marchands en Amérique du Nord, en Europe
      et en Océanie. Chaque prix et chaque poids vient de la fiche du marchand lui-même.
      Rien n'est estimé&nbsp;: quand le poids net n'est pas publié, la ligne garde son prix
      et n'a pas de prix au kilo.
    </p>
    <dl class="facts" id="facts"></dl>
  </header>

  <section>
    <h2>Médiane par catégorie</h2>
    <p class="sub">
      En dollars canadiens par kilogramme. Médiane et non moyenne&nbsp;: quelques sachets
      de bonbons à portion unique suffiraient à tirer une moyenne là où personne n'achète.
      Seules les lignes où le marchand annonce lui-même le poids sont comptées.
    </p>
    <div class="cats" id="cats"></div>
  </section>

  <div class="controls">
    <div class="ctl-row">
      <input type="search" id="q" placeholder="Chercher un produit ou un marchand…" aria-label="Chercher">
      <select id="conf" aria-label="Fiabilité du poids">
        <option value="0">Poids annoncé par le marchand</option>
        <option value="1">Inclure les lots déduits</option>
        <option value="9">Toutes les lignes</option>
      </select>
      <select id="sort" aria-label="Trier">
        <option value="ppk-asc">Prix au kilo, croissant</option>
        <option value="ppk-desc">Prix au kilo, décroissant</option>
        <option value="prod">Nom du produit</option>
        <option value="vend">Marchand</option>
      </select>
      <span class="count" id="count"></span>
    </div>
    <div class="chips" id="chips"></div>
  </div>

  <div class="tablewrap">
    <table>
      <thead>
        <tr>
          <th>Produit</th>
          <th class="hide-s">Marchand</th>
          <th>Catégorie</th>
          <th class="n">Poids net</th>
          <th class="n">Prix</th>
          <th class="n">CAD / kg</th>
          <th class="hide-s">Poids établi par</th>
        </tr>
      </thead>
      <tbody id="body"></tbody>
    </table>
  </div>
  <button class="more" id="more" hidden></button>

  <footer>
    <p>
      <strong>Comment lire la colonne « poids établi par ».</strong> Le prix était la partie
      facile&nbsp;; le poids était toute la difficulté. Shopify publie un champ de poids sur
      chaque variante, mais c'est un poids d'expédition&nbsp;: un marchand québécois y inscrit
      5&nbsp;g aussi bien pour un chili lyophilisé que pour un sac anti-ours à 69&nbsp;$. Les
      lignes qui reposent sur ce champ sont marquées <em>faible</em> et exclues de toutes les
      médianes ci-dessus.
    </p>
    <p>
      Les prix en devises étrangères sont convertis en dollars canadiens aux taux du
      <span id="fxdate"></span>. Les prix de détail ne se comparent pas directement à un
      tarif de lyophilisation à façon, qui est un prix de service.
    </p>
  </footer>
</div>

<script>
const D = ${JSON.stringify(payload)};
const CAT_LABEL = ${JSON.stringify(CAT_LABEL)};
const CONF_LABEL = ["annoncé par le marchand", "lot déduit", "poids d'expédition", "non publié"];
const CONF_SHORT = ["Annoncé", "Déduit", "Expédition", "Non publié"];

const V=0, NAME=1, VAR=2, CAT=3, G=4, CONF=5, PRICE=6, CUR=7, PPK=8, STOCK=9, URL=10;

const nf = n => n.toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf0 = n => n.toLocaleString("fr-CA", { maximumFractionDigits: 0 });
const catLabel = i => CAT_LABEL[D.cats[i]] ?? D.cats[i];

// ── Facts ──
const withPpk = D.rows.filter(r => r[PPK] !== null).length;
const noWeight = D.rows.filter(r => r[G] === null).length;
document.getElementById("facts").innerHTML = [
  ["Marchands relevés", D.meta.withData],
  ["Boutiques sondées", D.meta.surveyed],
  ["Lignes produit", nf0(D.rows.length)],
  ["Avec un prix au kilo", nf0(withPpk)],
  ["Sans poids publié", nf0(noWeight)],
].map(([k, v]) => \`<div class="fact"><dt>\${k}</dt><dd>\${v}</dd></div>\`).join("");
document.getElementById("fxdate").textContent = D.meta.fxDate;

// ── Category medians (high-confidence weights only) ──
const median = xs => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const byCat = new Map();
for (const r of D.rows) {
  if (r[PPK] === null || r[CONF] !== 0) continue;
  if (!byCat.has(r[CAT])) byCat.set(r[CAT], []);
  byCat.get(r[CAT]).push(r[PPK]);
}
const catStats = [...byCat.entries()]
  .map(([c, xs]) => ({ c, n: xs.length, med: median(xs), min: Math.min(...xs), max: Math.max(...xs) }))
  .sort((a, b) => b.n - a.n);

document.getElementById("cats").innerHTML = catStats.map(s => {
  const pos = s.max > s.min ? ((s.med - s.min) / (s.max - s.min)) * 100 : 50;
  return \`<div class="cat">
    <div class="cat-head"><span class="cat-name">\${catLabel(s.c)}</span><span class="cat-n">\${s.n} obs.</span></div>
    <div class="cat-med">\${nf(s.med)} <small>CAD/kg</small></div>
    <div class="range"><i style="left:calc(\${pos.toFixed(1)}% - 1px)"></i></div>
    <div class="range-lab"><span>\${nf0(s.min)}</span><span>\${nf0(s.max)}</span></div>
  </div>\`;
}).join("");

// ── Filters ──
let activeCats = new Set();
let shown = 200;

const chips = document.getElementById("chips");
chips.innerHTML = D.cats
  .map((c, i) => ({ c, i, n: D.rows.filter(r => r[CAT] === i).length }))
  .sort((a, b) => b.n - a.n)
  .map(({ i }) => \`<button class="chip" aria-pressed="false" data-cat="\${i}">\${catLabel(i)}</button>\`)
  .join("");

chips.addEventListener("click", e => {
  const b = e.target.closest(".chip");
  if (!b) return;
  const i = +b.dataset.cat;
  if (activeCats.has(i)) activeCats.delete(i); else activeCats.add(i);
  b.setAttribute("aria-pressed", activeCats.has(i));
  shown = 200;
  render();
});

for (const id of ["q", "conf", "sort"]) {
  document.getElementById(id).addEventListener("input", () => { shown = 200; render(); });
}
document.getElementById("more").addEventListener("click", () => { shown += 400; render(); });

function render() {
  const q = document.getElementById("q").value.trim().toLowerCase();
  const maxConf = +document.getElementById("conf").value;
  const sort = document.getElementById("sort").value;

  let out = D.rows.filter(r => {
    if (r[CONF] > maxConf) return false;
    if (activeCats.size && !activeCats.has(r[CAT])) return false;
    if (q) {
      const hay = (r[NAME] + " " + r[VAR] + " " + D.vendors[r[V]]).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const cmp = {
    // Rows without a price per kilo sort last in both directions rather than
    // being treated as zero, which would put them at the top of "cheapest".
    "ppk-asc":  (a, b) => (a[PPK] ?? Infinity) - (b[PPK] ?? Infinity),
    "ppk-desc": (a, b) => (b[PPK] ?? -Infinity) - (a[PPK] ?? -Infinity),
    "prod":     (a, b) => a[NAME].localeCompare(b[NAME], "fr"),
    "vend":     (a, b) => D.vendors[a[V]].localeCompare(D.vendors[b[V]], "fr") || a[NAME].localeCompare(b[NAME], "fr"),
  }[sort];
  out.sort(cmp);

  document.getElementById("count").textContent =
    out.length === D.rows.length ? \`\${nf0(out.length)} lignes\` : \`\${nf0(out.length)} sur \${nf0(D.rows.length)} lignes\`;

  const slice = out.slice(0, shown);
  document.getElementById("body").innerHTML = slice.length === 0
    ? \`<tr><td colspan="7" class="empty">Aucune ligne ne correspond à ces filtres.</td></tr>\`
    : slice.map(r => {
      const vm = D.vendorMeta[r[V]];
      return \`<tr>
        <td class="conf c\${r[CONF]}">
          <span class="prod">\${esc(r[NAME])}</span>
          \${r[VAR] ? \`<span class="var"> · \${esc(r[VAR])}</span>\` : ""}
        </td>
        <td class="hide-s vend">
          <a href="\${esc(r[URL])}" target="_blank" rel="noopener noreferrer">\${esc(D.vendors[r[V]])}</a>
          <small>\${vm.country}</small>
        </td>
        <td>\${catLabel(r[CAT])}</td>
        <td class="n">\${r[G] !== null ? nf0(r[G]) + " g" : '<span class="none">—</span>'}</td>
        <td class="n">\${nf(r[PRICE])} \${D.currs[r[CUR]]}</td>
        <td class="n">\${r[PPK] !== null ? \`<span class="ppk">\${nf(r[PPK])}</span>\` : '<span class="none">poids inconnu</span>'}</td>
        <td class="hide-s"><span class="badge b\${r[CONF]}">\${CONF_SHORT[r[CONF]]}</span></td>
      </tr>\`;
    }).join("");

  const more = document.getElementById("more");
  more.hidden = out.length <= shown;
  more.textContent = \`Afficher \${nf0(Math.min(400, out.length - shown))} lignes de plus — \${nf0(out.length - shown)} restantes\`;
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

render();
</script>`;

await writeFile(OUT, html, "utf8");
console.log(`Explorer written to ${OUT} (${(html.length / 1024).toFixed(0)} kB, ${rows.length} rows)`);
