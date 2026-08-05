/**
 * Renders the market-intelligence figures as a page written for a visitor.
 *
 * The explorer answers "show me every row". This answers the questions someone
 * actually arrives with: what is a normal price, am I out of line, does packing
 * bigger sizes pay. Those need interpretation, not a table — so the findings are
 * stated in prose and the numbers sit underneath them as evidence.
 *
 *   node scripts/fd-build-intelligence-page.mjs <intelligence-dir> <output.html>
 */

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const [DIR, OUT] = process.argv.slice(2);
if (!DIR || !OUT) throw new Error("usage: node fd-build-intelligence-page.mjs <intelligence-dir> <output.html>");

const D = JSON.parse(await readFile(join(DIR, "market-intelligence.json"), "utf8"));

const n0 = v => v === null || v === undefined ? "—" : Math.round(v).toLocaleString("fr-CA");
const n2 = v => v === null || v === undefined ? "—" : v.toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// A category whose mean sits far above its median is being pulled by a handful
// of expensive listings. Saying so beside the number is more useful than hiding
// the mean, and more honest than presenting it as "the" price.
const skewNote = c => {
  if (c.mean_vs_median_pct === null) return "";
  if (c.mean_vs_median_pct >= 50) return `<span class="flag flag-high" title="La moyenne dépasse la médiane de ${c.mean_vs_median_pct} % — quelques produits chers tirent la moyenne">très asymétrique</span>`;
  if (c.mean_vs_median_pct >= 20) return `<span class="flag flag-mid" title="La moyenne dépasse la médiane de ${c.mean_vs_median_pct} %">asymétrique</span>`;
  return "";
};

const thinNote = c => c.n < 15
  ? `<span class="flag flag-thin" title="Seulement ${c.n} observations — à lire comme un ordre de grandeur">peu de données</span>`
  : "";

const v = D.volume_effect;
const fv = D.fruit_volume_effect;

// Bar geometry for the volume chart, scaled to the dearest band.
const maxSizeMedian = Math.max(...D.by_size.map(b => b.median));

const html = `<title>Prix des produits lyophilisés — repères de marché</title>
<style>
  :root {
    --ground:#F6F7F5; --surface:#FFFFFF; --ink:#141A17; --muted:#5F6B64; --faint:#8B958F;
    --line:#DDE3DE; --line-strong:#C4CDC7; --accent:#0F6E56; --accent-soft:#E3EFEA;
    --warn:#A8760F; --warn-soft:#FBF3E3;
    --shadow:0 1px 2px rgba(20,26,23,.05), 0 8px 24px -12px rgba(20,26,23,.12);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --ground:#101512; --surface:#171E1A; --ink:#E8EDE9; --muted:#9AA69F; --faint:#6E7A73;
      --line:#262F29; --line-strong:#384339; --accent:#4FBF9B; --accent-soft:#16302A;
      --warn:#D9A441; --warn-soft:#2A2113;
      --shadow:0 1px 2px rgba(0,0,0,.4), 0 8px 24px -12px rgba(0,0,0,.6);
    }
  }
  :root[data-theme="dark"] {
    --ground:#101512; --surface:#171E1A; --ink:#E8EDE9; --muted:#9AA69F; --faint:#6E7A73;
    --line:#262F29; --line-strong:#384339; --accent:#4FBF9B; --accent-soft:#16302A;
    --warn:#D9A441; --warn-soft:#2A2113;
    --shadow:0 1px 2px rgba(0,0,0,.4), 0 8px 24px -12px rgba(0,0,0,.6);
  }
  :root[data-theme="light"] {
    --ground:#F6F7F5; --surface:#FFFFFF; --ink:#141A17; --muted:#5F6B64; --faint:#8B958F;
    --line:#DDE3DE; --line-strong:#C4CDC7; --accent:#0F6E56; --accent-soft:#E3EFEA;
    --warn:#A8760F; --warn-soft:#FBF3E3;
    --shadow:0 1px 2px rgba(20,26,23,.05), 0 8px 24px -12px rgba(20,26,23,.12);
  }

  * { box-sizing: border-box; }
  body {
    margin:0; background:var(--ground); color:var(--ink);
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size:16px; line-height:1.6; -webkit-font-smoothing:antialiased;
  }
  .wrap { max-width:1080px; margin:0 auto; padding:0 22px 80px; }

  .eyebrow { font-size:.6875rem; font-weight:650; letter-spacing:.14em; text-transform:uppercase; color:var(--accent); margin:0 0 10px; }
  h1 { font-family: ui-serif, Georgia, "Times New Roman", serif; font-size:clamp(2rem,4.4vw,2.9rem);
       font-weight:600; letter-spacing:-.024em; line-height:1.06; margin:0 0 14px; text-wrap:balance; }
  h2 { font-family: ui-serif, Georgia, "Times New Roman", serif; font-size:1.5rem; font-weight:600;
       letter-spacing:-.018em; margin:0 0 6px; text-wrap:balance; }
  h3 { font-size:.9375rem; font-weight:650; margin:0 0 6px; }
  p { margin:0 0 14px; }
  .lede { font-size:1.125rem; color:var(--muted); max-width:64ch; }
  .measure { max-width:68ch; }
  header.top { padding:48px 0 30px; border-bottom:1px solid var(--line); }
  section { padding-top:44px; }
  .sub { color:var(--muted); font-size:.9375rem; margin:0 0 20px; max-width:68ch; }

  /* ── Headline figure ── */
  .headline { display:flex; flex-wrap:wrap; gap:26px; align-items:flex-end;
              background:var(--surface); border:1px solid var(--line); border-radius:12px;
              padding:24px 26px; box-shadow:var(--shadow); margin-top:24px; }
  .big { font-family: ui-monospace,"Cascadia Mono","Segoe UI Mono",monospace;
         font-size:3.1rem; font-weight:600; color:var(--accent); line-height:1;
         letter-spacing:-.03em; font-variant-numeric:tabular-nums; }
  .big small { font-size:.9rem; font-weight:500; color:var(--faint); letter-spacing:.02em; }
  .headline dl { display:flex; gap:26px; margin:0; flex-wrap:wrap; }
  .headline dt { font-size:.6875rem; letter-spacing:.08em; text-transform:uppercase; color:var(--faint); margin-bottom:2px; }
  .headline dd { margin:0; font-family: ui-monospace,"Cascadia Mono",monospace; font-size:1.25rem;
                 font-weight:600; font-variant-numeric:tabular-nums; }

  /* ── Tables ── */
  .tablewrap { overflow-x:auto; border:1px solid var(--line); border-radius:12px; background:var(--surface); box-shadow:var(--shadow); }
  table { border-collapse:collapse; width:100%; font-size:.875rem; }
  th { text-align:left; font-size:.6875rem; letter-spacing:.07em; text-transform:uppercase;
       color:var(--faint); font-weight:650; padding:11px 13px; white-space:nowrap;
       border-bottom:1px solid var(--line-strong); }
  th.n, td.n { text-align:right; }
  td { padding:10px 13px; border-bottom:1px solid var(--line); vertical-align:top; }
  tbody tr:last-child td { border-bottom:0; }
  tbody tr:hover { background:var(--accent-soft); }
  td.n { font-family: ui-monospace,"Cascadia Mono",monospace; font-variant-numeric:tabular-nums; white-space:nowrap; }
  .med { font-weight:700; color:var(--accent); font-size:.9375rem; }
  .name { font-weight:600; }

  .flag { display:inline-block; font-size:.625rem; font-weight:650; text-transform:uppercase;
          letter-spacing:.04em; padding:1px 6px; border-radius:999px; margin-left:6px; white-space:nowrap;
          border:1px solid; cursor:help; }
  .flag-high { color:var(--warn); background:var(--warn-soft); border-color:var(--warn); }
  .flag-mid  { color:var(--muted); background:var(--ground); border-color:var(--line-strong); }
  .flag-thin { color:var(--faint); background:transparent; border-color:var(--line-strong); border-style:dashed; }

  /* ── Volume chart ── */
  .chart { background:var(--surface); border:1px solid var(--line); border-radius:12px;
           padding:24px 26px 20px; box-shadow:var(--shadow); }
  .bars { display:flex; align-items:flex-end; gap:14px; height:230px; margin-bottom:14px; }
  .barcol { flex:1; display:flex; flex-direction:column; justify-content:flex-end; height:100%; gap:8px; text-align:center; }
  .bar { width:100%; background:var(--accent); border-radius:6px 6px 0 0; position:relative; min-height:3px; }
  .bar.trough { background:var(--accent); box-shadow:0 0 0 3px var(--accent-soft); }
  .bar.rebound { background:var(--warn); }
  .barval { font-family: ui-monospace,"Cascadia Mono",monospace; font-size:.8125rem; font-weight:650;
            font-variant-numeric:tabular-nums; }
  .barlab { font-size:.75rem; color:var(--muted); line-height:1.3; }
  .barlab b { display:block; color:var(--ink); font-weight:600; font-size:.8125rem; }
  .barn { font-size:.6875rem; color:var(--faint); }

  /* ── Findings ── */
  .finding { background:var(--surface); border:1px solid var(--line); border-left:3px solid var(--accent);
             border-radius:10px; padding:18px 22px; margin-bottom:14px; box-shadow:var(--shadow); }
  .finding.caution { border-left-color:var(--warn); }
  .finding p:last-child { margin-bottom:0; }
  .finding .measure { max-width:70ch; }

  .note { background:var(--ground); border:1px solid var(--line); border-radius:10px;
          padding:16px 20px; font-size:.875rem; color:var(--muted); }
  .note strong { color:var(--ink); }

  footer { margin-top:52px; padding-top:22px; border-top:1px solid var(--line);
           color:var(--muted); font-size:.8125rem; max-width:74ch; }

  @media (max-width:640px) {
    .bars { height:180px; gap:7px; }
    .barlab { font-size:.625rem; }
    .big { font-size:2.4rem; }
  }
  @media (prefers-reduced-motion: reduce) { * { transition:none !important; } }
</style>

<div class="wrap">
  <header class="top">
    <p class="eyebrow">LyoDex · repères de marché</p>
    <h1>Ce que se vendent les produits lyophilisés</h1>
    <p class="lede">
      Relevé des catalogues publics de ${D.coverage.vendors_with_data} marchands dans
      ${D.coverage.countries} pays. Chaque prix et chaque poids vient de la fiche du marchand
      lui-même, à la date du ${D.observed_at}.
    </p>

    <div class="headline">
      <div>
        <div class="big">${n0(D.overall.median)} <small>$ CA / kg</small></div>
        <p style="margin:8px 0 0;font-size:.8125rem;color:var(--muted)">
          Prix médian, toutes catégories
        </p>
      </div>
      <dl>
        <div><dt>La moitié se situe entre</dt><dd>${n0(D.overall.p25)} – ${n0(D.overall.p75)} $</dd></div>
        <div><dt>Moyenne</dt><dd>${n0(D.overall.mean)} $</dd></div>
        <div><dt>Le moins cher</dt><dd>${n0(D.overall.min)} $</dd></div>
        <div><dt>Le plus cher</dt><dd>${n0(D.overall.max)} $</dd></div>
        <div><dt>Observations</dt><dd>${D.overall.n.toLocaleString("fr-CA")}</dd></div>
      </dl>
    </div>
  </header>

  <section>
    <h2>Trois choses que ces chiffres disent</h2>
    <p class="sub">Et une qu'ils ne disent pas.</p>

    <div class="finding">
      <h3>Le gros format cesse de payer vers 150 g</h3>
      <p class="measure">
        Le prix au kilo chute de <strong>${n0(v.smallest_median)} $</strong> pour les portions
        de moins de 50 g à <strong>${n0(v.cheapest_median)} $</strong> pour la tranche
        ${v.cheapest_band.toLowerCase()} — une baisse de ${v.drop_to_cheapest_pct} %. Puis la courbe
        s'arrête de descendre : au-delà, le prix au kilo remonte même légèrement
        (${n0(v.largest_median)} $ pour les formats de plus de 2 kg).
      </p>
      <p class="measure">
        Le même calcul sur les fruits seuls, où les produits sont comparables entre eux, donne
        la même forme : ${n0(fv.smallest_median)} $ → ${n0(fv.cheapest_median)} $ (−${fv.drop_to_cheapest_pct} %),
        puis ${n0(fv.largest_median)} $. Ce n'est donc pas un artefact de mélange de produits.
      </p>
    </div>

    <div class="finding">
      <h3>Aucun écart de prix notable entre le Canada et les États-Unis</h3>
      <p class="measure">
        ${D.by_country.map(c => `${c.label} : <strong>${n0(c.median)} $/kg</strong> (${c.n} observations, ${c.vendors} marchands)`).join(" · ")}.
        L'écart entre les deux médianes est inférieur à 2 %, ce qui est du bruit à cette taille
        d'échantillon. Un producteur canadien n'a pas de désavantage de prix affiché face au marché
        américain.
      </p>
    </div>

    <div class="finding caution">
      <h3>La moyenne trompe dans plusieurs catégories</h3>
      <p class="measure">
        En légumes, la moyenne dépasse la médiane de 74 %; en œufs, de 88 %. Quelques produits
        de niche très chers tirent la moyenne vers le haut alors que la majorité des produits se
        vendent bien moins cher. <strong>Fiez-vous à la médiane</strong>, et à l'intervalle du
        premier au troisième quartile, qui décrit où se situe la moitié centrale du marché.
      </p>
    </div>

    <div class="note measure">
      <strong>Ce que ces chiffres ne disent pas :</strong> ce sont des prix de <em>produits finis
      vendus au détail</em>. Ils ne constituent pas un tarif de lyophilisation à façon. Un
      producteur qui fait sécher la matière d'un client vend un service, dont le prix se négocie
      au volume, à la difficulté du cycle et à l'exigence de certification — pas au prix de détail
      du sachet qui en sortira.
    </div>
  </section>

  <section>
    <h2>Prix au kilo selon le format</h2>
    <p class="sub">
      Médiane en dollars canadiens. La barre en creux marque le format le plus avantageux;
      la barre ambrée signale que la courbe remonte au lieu de continuer à baisser.
    </p>
    <div class="chart">
      <div class="bars">
        ${D.by_size.map(b => {
          const isTrough = b.median === v.cheapest_median;
          const isRebound = b.band === D.by_size[D.by_size.length - 1].band && !v.monotonic;
          const cls = isTrough ? "bar trough" : isRebound ? "bar rebound" : "bar";
          return `<div class="barcol">
            <div class="barval">${n0(b.median)} $</div>
            <div class="${cls}" style="height:${((b.median / maxSizeMedian) * 100).toFixed(1)}%"></div>
            <div class="barlab"><b>${b.label}</b>${b.note}</div>
            <div class="barn">${b.n} obs. · ${b.vendors} marchands</div>
          </div>`;
        }).join("")}
      </div>
    </div>
  </section>

  <section>
    <h2>Prix au kilo par catégorie</h2>
    <p class="sub">
      Toutes les valeurs en dollars canadiens par kilogramme. Une catégorie n'apparaît que si au
      moins trois marchands distincts la soutiennent.
    </p>
    <div class="tablewrap">
      <table>
        <thead>
          <tr>
            <th>Catégorie</th>
            <th class="n">Obs.</th>
            <th class="n">Marchands</th>
            <th class="n">Le moins cher</th>
            <th class="n">1<sup>er</sup> quartile</th>
            <th class="n">Médiane</th>
            <th class="n">Moyenne</th>
            <th class="n">3<sup>e</sup> quartile</th>
            <th class="n">Le plus cher</th>
          </tr>
        </thead>
        <tbody>
          ${D.by_category.map(c => `<tr>
            <td><span class="name">${c.label}</span>${skewNote(c)}${thinNote(c)}</td>
            <td class="n">${c.n}</td>
            <td class="n">${c.vendors}</td>
            <td class="n">${n2(c.min)}</td>
            <td class="n">${n2(c.p25)}</td>
            <td class="n med">${n2(c.median)}</td>
            <td class="n">${n2(c.mean)}</td>
            <td class="n">${n2(c.p75)}</td>
            <td class="n">${n2(c.max)}</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>
  </section>

  <section>
    <h2>Fruits, par format</h2>
    <p class="sub">
      La catégorie la mieux documentée, détaillée par taille d'emballage. Une médiane unique pour
      « les fruits » masquerait un écart du simple au double entre un sachet-collation et un
      grand format.
    </p>
    <div class="tablewrap">
      <table>
        <thead>
          <tr>
            <th>Format</th>
            <th class="n">Obs.</th>
            <th class="n">Marchands</th>
            <th class="n">1<sup>er</sup> quartile</th>
            <th class="n">Médiane</th>
            <th class="n">Moyenne</th>
            <th class="n">3<sup>e</sup> quartile</th>
          </tr>
        </thead>
        <tbody>
          ${D.fruit_by_size.map(b => `<tr>
            <td><span class="name">${b.label}</span></td>
            <td class="n">${b.n}</td>
            <td class="n">${b.vendors}</td>
            <td class="n">${n2(b.p25)}</td>
            <td class="n med">${n2(b.median)}</td>
            <td class="n">${n2(b.mean)}</td>
            <td class="n">${n2(b.p75)}</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>
  </section>

  <footer>
    <p>
      <strong>Méthode.</strong> ${D.method}
    </p>
    <p>
      ${D.coverage.total_rows.toLocaleString("fr-CA")} lignes ont été relevées;
      ${D.coverage.rows_used.toLocaleString("fr-CA")} servent aux chiffres ci-dessus. L'écart tient
      aux marchands qui ne publient pas le poids net de leurs produits : sans poids, aucun prix au
      kilo ne peut être calculé, et une estimation aurait été une invention. Taux de change du
      ${D.fx_date}. Relevé du ${D.observed_at}.
    </p>
  </footer>
</div>`;

await writeFile(OUT, html, "utf8");
console.log(`Page écrite : ${OUT} (${(html.length / 1024).toFixed(0)} ko)`);
