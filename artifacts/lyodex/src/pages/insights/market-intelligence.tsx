import { useState, useEffect } from "react";
import { Lock, Info, Activity, AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useLanguage } from "@/lib/i18n";
import { LockGate } from "@/components/LockGate";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { PageMotif } from "@/components/PageMotif";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Shapes returned by GET /api/market/analytics ─────────────────────────────
// Mirrors PublicMarketSnapshot in artifacts/api-server/src/lib/marketAggregation.ts.
// Every value is computed from live platform data; nulls mean "withheld because
// fewer than min_cohort observations exist", not "zero".

interface CategoryStat {
  category: string;
  avg_quoted_price: number | null;
  avg_accepted_price: number | null;
  min_price: number | null;
  max_price: number | null;
  quote_count: number;
  accepted_count: number;
  acceptance_rate: number | null;
  total_volume_kg: number;
  avg_lead_time_days: number | null;
}

interface RegionStat {
  country: string;
  operator_count: number;
  available_count: number;
  avg_price_per_kg: number | null;
  avg_turnaround_days: number | null;
}

interface CertStat {
  certification: string;
  operator_count: number;
  pct_of_operators: number;
  verified_count: number;
}

interface TrendPoint {
  month: string;
  rfq_count: number;
  bid_count: number;
  avg_bid_price: number | null;
}

interface MarketSnapshot {
  category_stats: CategoryStat[];
  regions: RegionStat[];
  certifications: CertStat[];
  monthly_trends: TrendPoint[];
  platform: {
    total_requests: number;
    total_quotes: number;
    total_operators: number;
    available_operators: number;
    accepted_contracts: number;
    platform_acceptance_rate: number | null;
    avg_turnaround_days: number | null;
    avg_quoted_price: number | null;
  };
  min_cohort: number;
  privacy_notice: string;
  generated_at: string;
}

// ─── Chart primitives ─────────────────────────────────────────────────────────

function monthLabel(ym: string, locale: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(locale, { month: "short", timeZone: "UTC" });
}

function MiniBar({ points, valueOf, color = "bg-primary", locale }: {
  points: TrendPoint[];
  valueOf: (p: TrendPoint) => number;
  color?: string;
  locale: string;
}) {
  const max = Math.max(...points.map(valueOf), 1);
  return (
    <div className="flex items-end gap-1 h-20">
      {points.map((p, i) => {
        const v = valueOf(p);
        return (
          <div key={i} className="flex flex-col items-center flex-1 gap-1">
            <div
              className={`${color} rounded-sm w-full transition-all`}
              style={{ height: `${(v / max) * 100}%`, minHeight: v > 0 ? 4 : 1 }}
              title={`${p.month}: ${v}`}
            />
            <span className="text-[9px] text-muted-foreground">{monthLabel(p.month, locale)}</span>
          </div>
        );
      })}
    </div>
  );
}

function PriceLine({ points }: { points: TrendPoint[] }) {
  // Only months with a published average are plotted — withheld months leave a gap
  // rather than being interpolated, so the chart never invents a data point.
  const plotted = points
    .map((p, i) => ({ i, v: p.avg_bid_price }))
    .filter((p): p is { i: number; v: number } => p.v !== null);

  if (plotted.length < 2) return null;

  const values = plotted.map(p => p.v);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;
  const w = 100 / Math.max(points.length - 1, 1);
  const coords = plotted.map(p => `${p.i * w},${100 - ((p.v - minV) / range) * 80}`).join(" ");

  return (
    <div className="h-20 w-full">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <polyline points={coords} fill="none" stroke="#0F6E56" strokeWidth="3" strokeLinejoin="round" />
        {plotted.map(p => (
          <circle key={p.i} cx={p.i * w} cy={100 - ((p.v - minV) / range) * 80} r="3" fill="#0F6E56" />
        ))}
      </svg>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarketIntelligence() {
  const { t, locale: lang } = useLanguage();
  const mi = t.marketIntelligence;
  const { market_intelligence_locked } = useSiteSettings();
  const locale = lang === "fr" ? "fr-CA" : lang === "es" ? "es" : "en-CA";

  const [data, setData] = useState<MarketSnapshot | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch(`${BASE}/api/market/analytics`, { credentials: "include" })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: MarketSnapshot) => {
        if (cancelled) return;
        setData(d);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => { cancelled = true; };
  }, []);

  const money = (v: number | null) => (v === null ? mi.insufficientShort : `$${v.toFixed(2)}`);

  return (
    <LockGate locked={market_intelligence_locked}>
      <div className="flex flex-col min-h-screen bg-background">
        <section className="border-b py-10 px-4 relative overflow-hidden">
        <PageMotif kind="grid" />
          <div className="container mx-auto">
            <h1 className="text-3xl font-bold tracking-tight mb-1">{mi.title}</h1>
            <p className="text-muted-foreground text-sm mb-1">{mi.subtitle}</p>
            <p className="text-muted-foreground text-xs mb-4 max-w-3xl">{mi.subtitleDetail}</p>

            <div className="inline-flex items-start gap-2 bg-muted/50 border rounded-lg px-3 py-2 text-xs text-muted-foreground max-w-2xl mb-4">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                {data ? mi.minCohortNote.replace("{n}", String(data.min_cohort)) : mi.minCohortNote.replace("{n}", "3")}{" "}
                <a href="/trust" className="underline hover:text-foreground font-medium">{mi.methodologyLink}</a>
              </span>
            </div>

            {data && (
              <p className="text-xs text-muted-foreground">
                {mi.updated}{" "}
                {new Date(data.generated_at).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
              </p>
            )}
          </div>
        </section>

        {state === "loading" && (
          <div className="flex-1 flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{mi.loading}</p>
          </div>
        )}

        {state === "error" && (
          <div className="flex-1 flex flex-col items-center justify-center py-24 gap-3 px-4 text-center">
            <AlertCircle className="w-8 h-8 text-muted-foreground" />
            <h2 className="font-semibold">{mi.errorTitle}</h2>
            <p className="text-sm text-muted-foreground max-w-sm">{mi.errorDesc}</p>
          </div>
        )}

        {state === "ready" && data && (
          <section className="container mx-auto px-4 py-8">
            {/* ── KPIs — all four are direct platform counts, never estimates ── */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
              <Card>
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs text-muted-foreground mb-2">{mi.kpiOperators}</p>
                  <div className="text-3xl font-bold mb-1">{data.platform.total_operators}</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-emerald-600">{data.platform.available_operators}</span> {mi.kpiOperatorsSub}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs text-muted-foreground mb-2">{mi.kpiAvgPrice}</p>
                  {data.platform.avg_quoted_price !== null ? (
                    <>
                      <div className="text-3xl font-bold mb-1">${data.platform.avg_quoted_price.toFixed(2)}</div>
                      <p className="text-xs text-muted-foreground">{mi.kpiAvgPriceSub}</p>
                    </>
                  ) : (
                    <>
                      <div className="text-xl font-semibold text-muted-foreground mb-1">{mi.insufficientShort}</div>
                      <p className="text-xs text-muted-foreground">{mi.insufficient}</p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs text-muted-foreground mb-2">{mi.kpiRfqs}</p>
                  <div className="text-3xl font-bold mb-1">{data.platform.total_requests}</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{data.platform.total_quotes}</span> {mi.kpiRfqsSub}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs text-muted-foreground mb-2">{mi.kpiTurnaround}</p>
                  {data.platform.avg_turnaround_days !== null ? (
                    <>
                      <div className="text-3xl font-bold mb-1">{data.platform.avg_turnaround_days}</div>
                      <p className="text-xs text-muted-foreground">{mi.kpiTurnaroundSub}</p>
                    </>
                  ) : (
                    <>
                      <div className="text-xl font-semibold text-muted-foreground mb-1">{mi.insufficientShort}</div>
                      <p className="text-xs text-muted-foreground">{mi.insufficient}</p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── Monthly trends ── */}
            <div className="grid md:grid-cols-3 gap-6 mb-10">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">{mi.priceTrendTitle}</CardTitle>
                  <p className="text-xs text-muted-foreground">{mi.priceTrendSubtitle}</p>
                </CardHeader>
                <CardContent>
                  {data.monthly_trends.some(p => p.avg_bid_price !== null) ? (
                    <>
                      <div className="text-2xl font-bold text-primary mb-3">
                        {money([...data.monthly_trends].reverse().find(p => p.avg_bid_price !== null)?.avg_bid_price ?? null)}
                      </div>
                      <PriceLine points={data.monthly_trends} />
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                        {data.monthly_trends.map(p => <span key={p.month}>{monthLabel(p.month, locale)}</span>)}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground py-6">{mi.insufficient}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">{mi.volumeTitle}</CardTitle>
                  <p className="text-xs text-muted-foreground">{mi.volumeSubtitle}</p>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-3">
                    {data.monthly_trends.reduce((s, p) => s + p.bid_count, 0)}
                  </div>
                  <MiniBar points={data.monthly_trends} valueOf={p => p.bid_count} locale={locale} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">{mi.rfqTitle}</CardTitle>
                  <p className="text-xs text-muted-foreground">{mi.rfqSubtitle}</p>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-3">
                    {data.monthly_trends.reduce((s, p) => s + p.rfq_count, 0)}
                  </div>
                  <MiniBar points={data.monthly_trends} valueOf={p => p.rfq_count} color="bg-emerald-500" locale={locale} />
                </CardContent>
              </Card>
            </div>

            {/* ── Category + region/cert tables ── */}
            <div className="grid md:grid-cols-2 gap-6 mb-10">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">{mi.categoryTableTitle}</CardTitle>
                  <p className="text-xs text-muted-foreground">{mi.categoryTableSubtitle}</p>
                </CardHeader>
                <CardContent>
                  {data.category_stats.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left font-medium text-muted-foreground pb-2 pr-3">{mi.colCategory}</th>
                            <th className="text-right font-medium text-muted-foreground pb-2 px-2">{mi.colQuotes}</th>
                            <th className="text-right font-medium text-muted-foreground pb-2 px-2">{mi.colMin}</th>
                            <th className="text-right font-medium text-muted-foreground pb-2 px-2">{mi.colAvg}</th>
                            <th className="text-right font-medium text-muted-foreground pb-2 px-2">{mi.colMax}</th>
                            <th className="text-right font-medium text-muted-foreground pb-2 pl-2">{mi.colAccepted}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {data.category_stats.map(cat => (
                            <tr key={cat.category}>
                              <td className="py-2 pr-3 font-medium capitalize">{cat.category}</td>
                              <td className="py-2 px-2 text-right text-muted-foreground tabular-nums">{cat.quote_count}</td>
                              <td className="py-2 px-2 text-right text-muted-foreground tabular-nums">{money(cat.min_price)}</td>
                              <td className="py-2 px-2 text-right text-primary font-semibold tabular-nums">{money(cat.avg_quoted_price)}</td>
                              <td className="py-2 px-2 text-right text-muted-foreground tabular-nums">{money(cat.max_price)}</td>
                              <td className="py-2 pl-2 text-right text-muted-foreground tabular-nums">{cat.accepted_count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-sm font-medium mb-1">{mi.noDataTitle}</p>
                      <p className="text-xs text-muted-foreground max-w-xs mx-auto">{mi.noDataDesc}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">{mi.areaTableTitle}</CardTitle>
                    <p className="text-xs text-muted-foreground">{mi.areaTableSubtitle}</p>
                  </CardHeader>
                  <CardContent>
                    {data.regions.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left font-medium text-muted-foreground pb-2 pr-2">{mi.colArea}</th>
                              <th className="text-right font-medium text-muted-foreground pb-2 px-1">{mi.colOps}</th>
                              <th className="text-right font-medium text-muted-foreground pb-2 px-1">{mi.colAvailable}</th>
                              <th className="text-right font-medium text-muted-foreground pb-2 px-1">{mi.colAvg}</th>
                              <th className="text-right font-medium text-muted-foreground pb-2 pl-1">{mi.colTurnaround}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {data.regions.map(row => (
                              <tr key={row.country}>
                                <td className="py-1.5 pr-2 font-medium">{row.country}</td>
                                <td className="py-1.5 px-1 text-right text-muted-foreground tabular-nums">{row.operator_count}</td>
                                <td className="py-1.5 px-1 text-right text-emerald-600 font-medium tabular-nums">{row.available_count}</td>
                                <td className="py-1.5 px-1 text-right text-primary font-semibold tabular-nums">{money(row.avg_price_per_kg)}</td>
                                <td className="py-1.5 pl-1 text-right text-muted-foreground tabular-nums">
                                  {row.avg_turnaround_days === null ? mi.insufficientShort : `${row.avg_turnaround_days}d`}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground py-4">{mi.noDataTitle}</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">{mi.certTitle}</CardTitle>
                    <p className="text-xs text-muted-foreground">{mi.certSubtitle}</p>
                  </CardHeader>
                  <CardContent>
                    {data.certifications.length > 0 ? (
                      <div className="space-y-2.5">
                        {data.certifications.map(cert => (
                          <div key={cert.certification} className="flex items-center gap-3 text-sm">
                            <span className="w-20 text-xs font-medium shrink-0 truncate" title={cert.certification}>
                              {cert.certification}
                            </span>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary/70 rounded-full" style={{ width: `${cert.pct_of_operators}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
                              {cert.pct_of_operators}%
                            </span>
                            {cert.verified_count > 0 && (
                              <span
                                className="flex items-center gap-0.5 text-[10px] text-emerald-600 font-medium shrink-0"
                                title={`${cert.verified_count} ${mi.colVerified}`}
                              >
                                <ShieldCheck className="w-3 h-3" />
                                {cert.verified_count}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground py-4">{mi.noDataTitle}</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card className="border-primary/20 bg-muted/20">
              <CardContent className="pt-6 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold mb-1">{mi.advancedTitle}</p>
                    <p className="text-xs text-muted-foreground">{mi.advancedDesc}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {mi.advancedBadges.map(item => (
                        <Badge key={item} variant="outline" className="text-xs text-muted-foreground">{item}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <Link href="/pricing">
                  <Button className="shrink-0">{mi.upgradeToUnlock}</Button>
                </Link>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground mt-6 text-center max-w-3xl mx-auto flex items-start justify-center gap-2">
              <Activity className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{mi.disclaimer}</span>
            </p>
          </section>
        )}
      </div>
    </LockGate>
  );
}
