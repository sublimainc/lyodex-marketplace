import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle, X, Info, ExternalLink, Download, RefreshCw, ShieldCheck, Search,
} from "lucide-react";

/**
 * Retail price benchmark — the admin's window onto product_benchmarks.
 *
 * The table was populated by a crawl of 67 sellers' public catalogues, but a
 * crawl can pick up a seller's test product, a placeholder price, or a listing
 * whose net weight we read wrong. So nothing reaches the public side until
 * someone here decides it should: every row lands unpublished and this screen is
 * where that decision gets made.
 *
 * The screen is deliberately blunt about how much each row is worth. A price per
 * kilo is only as good as the net weight behind it, and sellers publish weights
 * inconsistently — the confidence column is the first thing to look at, not a
 * footnote.
 */

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function api(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try { message = (JSON.parse(text) as { error?: string }).error ?? text; } catch { /* raw */ }
    throw new Error(message || `Request failed (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

interface Benchmark {
  id: number;
  vendor_name: string;
  vendor_domain: string;
  vendor_country: string;
  vendor_region: string | null;
  vendor_type: string | null;
  product_name: string;
  variant: string;
  category: string;
  net_weight_g: number | null;
  weight_source: string;
  weight_confidence: string;
  price: number;
  currency: string;
  price_per_kg: number | null;
  price_per_kg_cad: number | null;
  in_stock: boolean | null;
  source_url: string;
  observed_at: string;
  included_in_public: boolean;
}

interface Summary {
  totals: {
    rows: number; vendors: number; countries: number;
    with_price_per_kg: number; high_confidence: number; published: number;
    last_observed: string | null;
  };
  by_category: {
    category: string; rows: number; vendors: number; published: number;
    median: number | null; p25: number | null; p75: number | null;
    min: number | null; max: number | null;
  }[];
  by_vendor: {
    vendor_name: string; vendor_domain: string; vendor_country: string;
    vendor_region: string | null; currency: string;
    rows: number; priced: number; median: number | null;
  }[];
  notice: string;
}

const CAT_LABEL: Record<string, string> = {
  fruit: "Fruits", vegetable: "Légumes", meat: "Viandes", seafood: "Fruits de mer",
  candy: "Confiseries", meal: "Repas", dairy: "Produits laitiers", yogurt: "Yogourt",
  egg: "Œufs", powder: "Poudres", beverage: "Boissons", ice_cream: "Crème glacée",
  herb_spice: "Herbes et épices", pet: "Animaux", other: "Autres",
};
const catLabel = (c: string) => CAT_LABEL[c] ?? c;

const CONF_LABEL: Record<string, string> = {
  high: "Annoncé par le marchand",
  medium: "Lot déduit",
  low: "Poids d'expédition",
  none: "Aucun poids publié",
};

const CONF_STYLE: Record<string, string> = {
  high: "bg-primary/10 text-primary border-primary/30",
  medium: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  low: "bg-muted text-muted-foreground border-dashed",
  none: "bg-muted text-muted-foreground border-dashed",
};

const fmt = (n: number | null | undefined, d = 2) =>
  n === null || n === undefined ? "—" : n.toLocaleString("fr-CA", { minimumFractionDigits: d, maximumFractionDigits: d });

function ErrorNote({ error, onDismiss }: { error: string | null; onDismiss: () => void }) {
  if (!error) return null;
  return (
    <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-3 py-2 text-sm mb-4">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <span className="flex-1">{error}</span>
      <button onClick={onDismiss} className="shrink-0 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}

const selectCls =
  "h-9 px-2.5 rounded-md border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

export function BenchmarksTab() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<Benchmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState<number | null>(null);

  const [category, setCategory] = useState("");
  const [confidence, setConfidence] = useState("high");
  const [published, setPublished] = useState("");
  const [q, setQ] = useState("");

  const loadSummary = useCallback(() => {
    api("/admin/benchmarks/summary")
      .then(setSummary)
      .catch(e => setError((e as Error).message));
  }, []);

  const loadRows = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "400" });
    if (category) params.set("category", category);
    if (confidence) params.set("confidence", confidence);
    if (published) params.set("published", published);
    if (q.trim()) params.set("q", q.trim());

    api(`/admin/benchmarks?${params}`)
      .then(d => { setRows(d); setError(null); })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [category, confidence, published, q]);

  useEffect(loadSummary, [loadSummary]);
  useEffect(() => {
    // Debounced so typing in the search box does not fire a request per keystroke.
    const t = setTimeout(loadRows, 300);
    return () => clearTimeout(t);
  }, [loadRows]);

  const togglePublish = async (row: Benchmark) => {
    setWorking(row.id);
    setError(null);
    try {
      await api(`/admin/benchmarks/${row.id}`, "PATCH", { included_in_public: !row.included_in_public });
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, included_in_public: !r.included_in_public } : r));
      loadSummary();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(null);
    }
  };

  // Built from what is already on screen — no new route, and nothing leaves the
  // page that this admin cannot already see.
  const exportCsv = () => {
    const headers = [
      "vendor_name", "vendor_country", "product_name", "variant", "category",
      "net_weight_g", "weight_confidence", "price", "currency", "price_per_kg_cad",
      "included_in_public", "source_url", "observed_at",
    ] as const;
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = "﻿" + [headers.join(",")]
      .concat(rows.map(r => headers.map(h => esc(r[h as keyof Benchmark])).join(",")))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `lyodex-benchmark-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const t = summary?.totals;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold">Référence de prix produits</h2>
          <p className="text-sm text-muted-foreground">
            {t ? `${t.rows.toLocaleString("fr-CA")} lignes · ${t.vendors} marchands · ${t.countries} pays` : "Chargement…"}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => { loadSummary(); loadRows(); }} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Rafraîchir
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={!rows.length} className="gap-2">
            <Download className="w-4 h-4" /> CSV
          </Button>
        </div>
      </div>

      <ErrorNote error={error} onDismiss={() => setError(null)} />

      {/* ── Totals ── */}
      {t && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Lignes", value: t.rows.toLocaleString("fr-CA") },
            { label: "Avec un prix au kilo", value: t.with_price_per_kg.toLocaleString("fr-CA") },
            { label: "Poids annoncé", value: t.high_confidence.toLocaleString("fr-CA") },
            { label: "Publiées", value: t.published.toLocaleString("fr-CA") },
          ].map(k => (
            <Card key={k.label}>
              <CardContent className="pt-5">
                <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
                <p className="text-2xl font-bold tabular-nums">{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2.5 bg-muted/50 border rounded-lg px-4 py-3 mb-5 text-sm max-w-4xl">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
        <p className="text-muted-foreground text-[13px] leading-relaxed">
          Prix de détail relevés dans les catalogues publics des marchands. Ce sont des prix de
          <strong className="text-foreground"> produits finis</strong>, pas un tarif de lyophilisation
          à façon. Rien n'est publié tant que vous ne l'activez pas ligne par ligne, et une catégorie
          reste masquée publiquement tant que moins de trois marchands distincts la soutiennent.
        </p>
      </div>

      {/* ── Category medians ── */}
      {summary && summary.by_category.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Médiane par catégorie</CardTitle>
            <p className="text-xs text-muted-foreground">
              En CAD/kg, calculée uniquement sur les lignes dont le marchand annonce lui-même le poids.
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left font-medium pb-2">Catégorie</th>
                  <th className="text-right font-medium pb-2">Lignes</th>
                  <th className="text-right font-medium pb-2">Marchands</th>
                  <th className="text-right font-medium pb-2">1<sup>er</sup> quartile</th>
                  <th className="text-right font-medium pb-2">Médiane</th>
                  <th className="text-right font-medium pb-2">3<sup>e</sup> quartile</th>
                  <th className="text-right font-medium pb-2">Publiées</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {summary.by_category.map(c => (
                  <tr key={c.category} className="hover:bg-muted/20">
                    <td className="py-2 font-medium">{catLabel(c.category)}</td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">{c.rows}</td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">{c.vendors}</td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">{fmt(c.p25)}</td>
                    <td className="py-2 text-right tabular-nums font-semibold text-primary">{fmt(c.median)}</td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">{fmt(c.p75)}</td>
                    <td className="py-2 text-right tabular-nums">
                      {c.published > 0
                        ? <span className="text-primary font-medium">{c.published}</span>
                        : <span className="text-muted-foreground">0</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className={`${selectCls} pl-8 w-64`}
            placeholder="Produit ou marchand…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
        <select className={selectCls} value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">Toutes les catégories</option>
          {summary?.by_category.map(c => (
            <option key={c.category} value={c.category}>{catLabel(c.category)}</option>
          ))}
        </select>
        <select className={selectCls} value={confidence} onChange={e => setConfidence(e.target.value)}>
          <option value="high">Poids annoncé par le marchand</option>
          <option value="medium">Lot déduit</option>
          <option value="low">Poids d'expédition</option>
          <option value="none">Aucun poids publié</option>
          <option value="">Toutes fiabilités</option>
        </select>
        <select className={selectCls} value={published} onChange={e => setPublished(e.target.value)}>
          <option value="">Publiées et non publiées</option>
          <option value="true">Publiées seulement</option>
          <option value="false">Non publiées seulement</option>
        </select>
        <span className="text-sm text-muted-foreground ml-auto tabular-nums">
          {loading ? "…" : `${rows.length} ligne${rows.length > 1 ? "s" : ""}`}
          {rows.length === 400 && " (limite atteinte)"}
        </span>
      </div>

      {/* ── Rows ── */}
      {loading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center border rounded-lg">
          Aucune ligne ne correspond à ces filtres.
        </p>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-3 py-2">Produit</th>
                <th className="text-left font-medium px-3 py-2">Marchand</th>
                <th className="text-left font-medium px-3 py-2">Catégorie</th>
                <th className="text-right font-medium px-3 py-2">Poids</th>
                <th className="text-right font-medium px-3 py-2">Prix</th>
                <th className="text-right font-medium px-3 py-2">CAD/kg</th>
                <th className="text-left font-medium px-3 py-2">Fiabilité</th>
                <th className="text-center font-medium px-3 py-2">Public</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-muted/20">
                  <td className="px-3 py-2.5">
                    <span className="font-medium">{r.product_name}</span>
                    {r.variant && <span className="text-muted-foreground text-xs"> · {r.variant}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    <a
                      href={r.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary inline-flex items-center gap-1"
                    >
                      {r.vendor_name} <ExternalLink className="w-3 h-3" />
                    </a>
                    <span className="block text-muted-foreground">
                      {r.vendor_region ? `${r.vendor_region}, ` : ""}{r.vendor_country}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{catLabel(r.category)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground text-xs">
                    {r.net_weight_g ? `${r.net_weight_g.toLocaleString("fr-CA")} g` : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">
                    {fmt(r.price)} {r.currency}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold">
                    {r.price_per_kg_cad !== null
                      ? <span className="text-primary">{fmt(r.price_per_kg_cad)}</span>
                      : <span className="text-muted-foreground font-normal text-xs italic">poids inconnu</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${CONF_STYLE[r.weight_confidence] ?? ""}`}>
                      {CONF_LABEL[r.weight_confidence] ?? r.weight_confidence}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <button
                      onClick={() => togglePublish(r)}
                      disabled={working === r.id || r.price_per_kg_cad === null}
                      title={
                        r.price_per_kg_cad === null
                          ? "Sans prix au kilo, cette ligne n'apporte rien au comparatif public"
                          : r.included_in_public ? "Publiée — cliquer pour retirer" : "Privée — cliquer pour publier"
                      }
                      className={`text-xs px-2 py-0.5 rounded border font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        r.included_in_public
                          ? "bg-primary/10 text-primary border-primary/30"
                          : "bg-muted text-muted-foreground border-dashed hover:bg-muted/70"
                      }`}
                    >
                      {r.included_in_public ? "Publiée" : "Privée"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Vendor roll-up ── */}
      {summary && summary.by_vendor.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" /> Marchands relevés
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              La médiane n'apparaît que pour les marchands qui publient des poids nets.
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left font-medium pb-2">Marchand</th>
                  <th className="text-left font-medium pb-2">Pays</th>
                  <th className="text-left font-medium pb-2">Devise</th>
                  <th className="text-right font-medium pb-2">Lignes</th>
                  <th className="text-right font-medium pb-2">Exploitables</th>
                  <th className="text-right font-medium pb-2">Médiane CAD/kg</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {summary.by_vendor.map(v => (
                  <tr key={v.vendor_domain} className="hover:bg-muted/20">
                    <td className="py-2 font-medium">{v.vendor_name}</td>
                    <td className="py-2 text-xs text-muted-foreground">
                      {v.vendor_region ? `${v.vendor_region}, ` : ""}{v.vendor_country}
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">{v.currency}</td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">{v.rows}</td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">{v.priced}</td>
                    <td className="py-2 text-right tabular-nums font-medium">
                      {v.median !== null
                        ? fmt(v.median)
                        : <Badge variant="secondary" className="text-[10px]">aucun poids publié</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {summary && (
        <p className="text-xs text-muted-foreground mt-5 max-w-3xl leading-relaxed">{summary.notice}</p>
      )}
    </div>
  );
}
