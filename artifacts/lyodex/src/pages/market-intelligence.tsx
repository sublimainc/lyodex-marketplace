import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Lock, Info, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useLanguage } from "@/lib/i18n";
import { LockGate } from "@/components/LockGate";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const CATEGORY_DATA = [
  { name: "Fruits",          volume: "4,200 kg/mo", avg: 8.9,  min: 6.5, max: 14,  strictMin: 4.80, wetPrice: 1.2 },
  { name: "Vegetables",      volume: "6,100 kg/mo", avg: 6.2,  min: 4.8, max: 9.5, strictMin: 3.60, wetPrice: 0.95 },
  { name: "Nutraceuticals",  volume: "1,800 kg/mo", avg: 32.5, min: 18,  max: 65,  strictMin: 12.0, wetPrice: 4.80 },
  { name: "Pet Food",        volume: "2,400 kg/mo", avg: 22,   min: 14,  max: 38,  strictMin: 8.50, wetPrice: 3.20 },
  { name: "Pharmaceutical",  volume: "320 kg/mo",   avg: 87.5, min: 45,  max: 180, strictMin: 28.0, wetPrice: 11.50 },
  { name: "Probiotics",      volume: "580 kg/mo",   avg: 48,   min: 35,  max: 75,  strictMin: 22.0, wetPrice: 7.80 },
];

const AREA_DATA = [
  { area: "Quebec",          region: "CA", operators: 12, avgPrice: 8.8,  strictMin: 5.20, wetPrice: 1.10, demand: 78 },
  { area: "Ontario",         region: "CA", operators: 7,  avgPrice: 9.2,  strictMin: 5.80, wetPrice: 1.18, demand: 82 },
  { area: "British Columbia",region: "CA", operators: 5,  avgPrice: 10.4, strictMin: 6.40, wetPrice: 1.30, demand: 64 },
  { area: "Alberta",         region: "CA", operators: 2,  avgPrice: 11.2, strictMin: 6.80, wetPrice: 1.42, demand: 41 },
  { area: "Manitoba",        region: "CA", operators: 1,  avgPrice: 10.8, strictMin: 6.60, wetPrice: 1.35, demand: 28 },
  { area: "Northeast US",    region: "US", operators: 4,  avgPrice: 11.5, strictMin: 7.20, wetPrice: 1.48, demand: 71 },
  { area: "Midwest US",      region: "US", operators: 3,  avgPrice: 10.9, strictMin: 6.90, wetPrice: 1.38, demand: 59 },
  { area: "Western US",      region: "US", operators: 6,  avgPrice: 12.4, strictMin: 7.80, wetPrice: 1.55, demand: 66 },
  { area: "France / Benelux",region: "EU", operators: 5,  avgPrice: 11.2, strictMin: 6.50, wetPrice: 1.40, demand: 55 },
  { area: "Germany / DACH",  region: "EU", operators: 4,  avgPrice: 13.5, strictMin: 8.20, wetPrice: 1.68, demand: 62 },
];

const CERT_DATA = [
  { name: "HACCP",    pct: 68 },
  { name: "GMP",      pct: 34 },
  { name: "EU GMP",   pct: 22 },
  { name: "Organic",  pct: 28 },
  { name: "SQF L2",   pct: 14 },
  { name: "Kosher",   pct: 8 },
  { name: "Halal",    pct: 5 },
];

const MONTHS = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];
const FOOD_PRICES = [8.8, 9.1, 9.0, 9.2, 9.35, 9.4];
const VOLUME_DATA = [18500, 15200, 21000, 19800, 22100, 18500];
const RFQ_DATA = [22, 18, 25, 28, 31, 34];

const maxVol = Math.max(...VOLUME_DATA);
const maxRfq = Math.max(...RFQ_DATA);

function MiniBar({ values, max, color = "bg-primary", months }: { values: number[]; max: number; color?: string; months: readonly string[] }) {
  return (
    <div className="flex items-end gap-1 h-20">
      {values.map((v, i) => (
        <div key={i} className="flex flex-col items-center flex-1 gap-1">
          <div className={`${color} rounded-sm w-full transition-all`} style={{ height: `${(v / max) * 100}%`, minHeight: 4 }} />
          <span className="text-[9px] text-muted-foreground">{months[i]}</span>
        </div>
      ))}
    </div>
  );
}

function PriceLine({ values }: { values: number[] }) {
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;
  const w = 100 / (values.length - 1);
  const points = values.map((v, i) => `${i * w},${100 - ((v - minV) / range) * 80}`).join(" ");
  return (
    <div className="h-20 w-full">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <polyline points={points} fill="none" stroke="#0F6E56" strokeWidth="3" strokeLinejoin="round" />
        {values.map((v, i) => (
          <circle key={i} cx={i * w} cy={100 - ((v - minV) / range) * 80} r="3" fill="#0F6E56" />
        ))}
      </svg>
    </div>
  );
}

const REGION_COLORS: Record<string, string> = { CA: "bg-sky-100 text-sky-700", US: "bg-violet-100 text-violet-700", EU: "bg-emerald-100 text-emerald-700" };

export default function MarketIntelligence() {
  const { t } = useLanguage();
  const mi = t.marketIntelligence;
  const { market_intelligence_locked } = useSiteSettings();

  const [liveStats, setLiveStats] = useState<{ total_bids: number; total_requests: number } | null>(null);
  useEffect(() => {
    const base = (import.meta as { env: { BASE_URL: string } }).env.BASE_URL.replace(/\/$/, "");
    fetch(`${base}/api/market/insights`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { total_bids: number; total_requests: number } | null) => { if (d) setLiveStats(d); })
      .catch(() => {});
  }, []);

  return (
    <LockGate locked={market_intelligence_locked}>
    <div className="flex flex-col min-h-screen bg-background">
      <section className="border-b py-10 px-4">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold tracking-tight mb-1">{mi.title}</h1>
          <p className="text-muted-foreground text-sm mb-1">{mi.subtitle}</p>
          <p className="text-muted-foreground text-xs mb-4">{mi.subtitleDetail}</p>
          <div className="inline-flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 max-w-2xl mb-4">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              <strong>Benchmark data — not verified transaction prices.</strong>{" "}
              These figures are illustrative estimates based on publicly available industry information, operator-published rate cards, and submitted RFQ ranges. They are not audited financial data.{" "}
              <a href="/trust" className="underline hover:text-amber-900 font-medium">See methodology.</a>
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Last updated May 2025 — benchmarks are reviewed quarterly</p>
          {liveStats && (
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="flex items-center gap-2.5 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2">
                <Activity className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <div className="text-xl font-bold text-primary">{liveStats.total_requests.toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground">RFQs on platform</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2">
                <Activity className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <div className="text-xl font-bold text-primary">{liveStats.total_bids.toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground">Operator bids submitted</div>
                </div>
              </div>
              <div className="self-center text-[10px] text-muted-foreground italic ml-1">Live platform counts — updated in real time</div>
            </div>
          )}
        </div>
      </section>

      <section className="container mx-auto px-4 py-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {mi.kpis.map((kpi, i) => (
            <Card key={i}>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground mb-2">{kpi.label}</p>
                <div className="text-3xl font-bold mb-1">{kpi.value}</div>
                <div className={`flex items-center gap-1 text-xs font-semibold ${kpi.up ? "text-emerald-600" : "text-red-500"}`}>
                  {kpi.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {kpi.delta}
                  <span className="text-muted-foreground font-normal ml-1">{kpi.sub}</span>
                </div>
                {kpi.note && (
                  <div className="mt-2 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 font-medium">
                    {mi.floor} {kpi.note}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{mi.priceTrendTitle}</CardTitle>
              <p className="text-xs text-muted-foreground">{mi.priceTrendSubtitle}</p>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary mb-3">$9.40 <span className="text-xs text-muted-foreground font-normal">{mi.priceTrendCurrent}</span></div>
              <PriceLine values={FOOD_PRICES} />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                {mi.months.map((m, i) => <span key={i}>{m}</span>)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{mi.volumeTitle}</CardTitle>
              <p className="text-xs text-muted-foreground">{mi.volumeSubtitle}</p>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-3">18.5k <span className="text-xs text-muted-foreground font-normal">{mi.volumeThisMonth}</span></div>
              <MiniBar values={VOLUME_DATA} max={maxVol} months={mi.months} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{mi.rfqTitle}</CardTitle>
              <p className="text-xs text-muted-foreground">{mi.rfqSubtitle}</p>
            </CardHeader>
            <CardContent>
              <div className="text-emerald-600 text-xs font-bold mb-3">{mi.rfqGrowth}</div>
              <MiniBar values={RFQ_DATA} max={maxRfq} color="bg-emerald-500" months={mi.months} />
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">{mi.categoryTableTitle}</CardTitle>
              <p className="text-xs text-muted-foreground">{mi.categoryTableSubtitle}</p>
            </CardHeader>
            <CardContent>
              <div className="text-[10px] text-muted-foreground flex items-center gap-1 mb-3">
                <Info className="w-3 h-3" /> {mi.strictMinNote}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left font-medium text-muted-foreground pb-2 pr-3">{mi.colCategory}</th>
                      <th className="text-right font-medium text-muted-foreground pb-2 px-2">{mi.colStrictMin}</th>
                      <th className="text-right font-medium text-muted-foreground pb-2 px-2">{mi.colAvg}</th>
                      <th className="text-right font-medium text-muted-foreground pb-2 px-2">{mi.colMax}</th>
                      <th className="text-right font-medium text-muted-foreground pb-2 pl-2">{mi.colWet}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {CATEGORY_DATA.map((cat, i) => (
                      <tr key={cat.name}>
                        <td className="py-2 pr-3 font-medium">{mi.categoryNames[i]}</td>
                        <td className="py-2 px-2 text-right">
                          <span className="text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">${cat.strictMin}</span>
                        </td>
                        <td className="py-2 px-2 text-right text-primary font-semibold">${cat.avg}</td>
                        <td className="py-2 px-2 text-right text-muted-foreground">${cat.max}</td>
                        <td className="py-2 pl-2 text-right text-muted-foreground">${cat.wetPrice}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">{mi.areaTableTitle}</CardTitle>
                <p className="text-xs text-muted-foreground">{mi.areaTableSubtitle}</p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left font-medium text-muted-foreground pb-2 pr-2">{mi.colArea}</th>
                        <th className="text-right font-medium text-muted-foreground pb-2 px-1">{mi.colOps}</th>
                        <th className="text-right font-medium text-muted-foreground pb-2 px-1">{mi.colFloor}</th>
                        <th className="text-right font-medium text-muted-foreground pb-2 px-1">{mi.colAvg}</th>
                        <th className="text-right font-medium text-muted-foreground pb-2 px-1">{mi.colWet}</th>
                        <th className="text-right font-medium text-muted-foreground pb-2 pl-1">{mi.colDemand}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {AREA_DATA.map(row => (
                        <tr key={row.area}>
                          <td className="py-1.5 pr-2 font-medium flex items-center gap-1.5">
                            <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${REGION_COLORS[row.region]}`}>{row.region}</span>
                            {row.area}
                          </td>
                          <td className="py-1.5 px-1 text-right text-muted-foreground">{row.operators}</td>
                          <td className="py-1.5 px-1 text-right">
                            <span className="text-amber-700 font-semibold">${row.strictMin}</span>
                          </td>
                          <td className="py-1.5 px-1 text-right text-primary font-semibold">${row.avgPrice}</td>
                          <td className="py-1.5 px-1 text-right text-muted-foreground">${row.wetPrice}</td>
                          <td className="py-1.5 pl-1 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${row.demand}%` }} />
                              </div>
                              <span className="text-muted-foreground">{row.demand}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">{mi.certTitle}</CardTitle>
                <p className="text-xs text-muted-foreground">{mi.certSubtitle}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2.5">
                  {CERT_DATA.map(cert => (
                    <div key={cert.name} className="flex items-center gap-3 text-sm">
                      <span className="w-14 text-xs font-medium shrink-0">{cert.name}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary/70 rounded-full" style={{ width: `${cert.pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right">{cert.pct}%</span>
                    </div>
                  ))}
                </div>
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
                <p className="text-xs text-muted-foreground">
                  {mi.advancedDesc}
                </p>
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

        <p className="text-xs text-muted-foreground mt-6 text-center">
          {mi.disclaimer}
        </p>
      </section>
    </div>
    </LockGate>
  );
}
