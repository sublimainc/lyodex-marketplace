import { Link } from "wouter";
import { CalendarRange, Info, HelpCircle, Mail, ShoppingCart, Factory } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { PageMotif } from "@/components/PageMotif";

/**
 * Operator-reported demand seasonality.
 *
 * This page is deliberately NOT the market-intelligence page. That one publishes
 * aggregates computed from platform activity; this one publishes what operators
 * told us about their own year. Mixing the two would let sourced opinion pass
 * as measured fact, so they live apart and each says plainly which it is.
 *
 * January–April is `unknown` on purpose. No operator has characterized those
 * months for us, and a guess dressed as data is exactly what this codebase is
 * meant to stop shipping. The gap is rendered as a gap — it also happens to be
 * the clearest invitation to contribute on the page.
 */

type Level = "peak" | "slowing" | "low" | "unknown";

const YEAR: Level[] = [
  "unknown",  // January
  "unknown",  // February
  "unknown",  // March
  "unknown",  // April
  "peak",     // May
  "peak",     // June
  "peak",     // July
  "peak",     // August
  "slowing",  // September
  "slowing",  // October
  "slowing",  // November
  "low",      // December
];

// Height is the visual encoding; unknown is drawn short and hatched rather than
// at zero, so "we don't know" never reads as "there is no demand".
const LEVEL_STYLE: Record<Level, { bar: string; height: string; badge: string }> = {
  peak:    { bar: "bg-primary",            height: "h-full",  badge: "bg-primary/10 text-primary border-primary/30" },
  slowing: { bar: "bg-amber-400",          height: "h-3/5",   badge: "bg-amber-50 text-amber-700 border-amber-200" },
  low:     { bar: "bg-slate-300",          height: "h-1/4",   badge: "bg-slate-100 text-slate-600 border-slate-200" },
  unknown: { bar: "bg-muted border border-dashed border-muted-foreground/40", height: "h-1/6", badge: "bg-muted text-muted-foreground border-dashed" },
};

const CONTACT_EMAIL = "info@lyodex.com";

export default function Seasonality() {
  const { t, locale } = useLanguage();
  const s = t.seasonality;

  const levelLabel: Record<Level, string> = {
    peak: s.levelPeak,
    slowing: s.levelSlowing,
    low: s.levelLow,
    unknown: s.levelUnknown,
  };

  const mailto =
    `mailto:${CONTACT_EMAIL}` +
    `?subject=${encodeURIComponent("LyoDex — seasonality data")}` +
    `&body=${encodeURIComponent(
      "Region:\nProduct grade (food / GMP):\nMonths of peak demand:\nMonths of low demand:\nAnything else worth noting:\n",
    )}`;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <section className="border-b py-10 px-4 relative overflow-hidden">
        <PageMotif kind="cycle" />
        <div className="container mx-auto">
          <div className="flex items-center gap-2 text-primary mb-2">
            <CalendarRange className="w-5 h-5" />
            <span className="text-xs font-semibold tracking-widest uppercase">LyoDex</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">{s.title}</h1>
          <p className="text-muted-foreground mb-5">{s.subtitle}</p>

          {/* Provenance is stated before any figure, not in a footnote. */}
          <div className="flex items-start gap-2.5 bg-muted/50 border rounded-lg px-4 py-3 max-w-3xl">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
            <div className="text-sm">
              <p className="font-medium mb-1">{s.sourceLabel}</p>
              <p className="text-muted-foreground text-[13px] leading-relaxed">{s.sourceBody}</p>
              <p className="text-muted-foreground text-xs mt-2">
                {s.contributedBy} · {s.lastReviewed}{" "}
                {new Date().toLocaleDateString(locale === "fr" ? "fr-CA" : locale === "es" ? "es" : "en-CA", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8 flex-1">
        {/* ── Year chart ── */}
        <Card className="mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">{s.chartTitle}</CardTitle>
            <p className="text-xs text-muted-foreground">{s.chartNote}</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1.5 h-40 mb-3">
              {YEAR.map((level, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className={`w-full rounded-t ${LEVEL_STYLE[level].bar} ${LEVEL_STYLE[level].height}`}
                      title={`${s.monthsShort[i]} — ${levelLabel[level]}`}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{s.monthsShort[i]}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {(["peak", "slowing", "low", "unknown"] as Level[]).map(level => (
                <span
                  key={level}
                  className={`text-[11px] font-medium px-2 py-0.5 rounded border ${LEVEL_STYLE[level].badge}`}
                >
                  {levelLabel[level]}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── The documented gap, stated rather than hidden ── */}
        <Card className="mb-8 border-dashed">
          <CardContent className="pt-5 pb-4 flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm mb-1">{s.gapTitle}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.gapBody}</p>
            </div>
          </CardContent>
        </Card>

        {/* ── What it means, per side of the market ── */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-primary" />
                {s.forBuyersTitle}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {s.forBuyers.map((item, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex gap-2">
                    <span className="text-primary mt-0.5">·</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Factory className="w-4 h-4 text-primary" />
                {s.forOperatorsTitle}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {s.forOperators.map((item, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex gap-2">
                    <span className="text-primary mt-0.5">·</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* ── Observed price reference — sourced, not computed ── */}
        <Card className="mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">{s.priceTitle}</CardTitle>
            <p className="text-xs text-muted-foreground">{s.priceSubtitle}</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-medium text-muted-foreground pb-2">{s.priceTierHeader}</th>
                    <th className="text-right font-medium text-muted-foreground pb-2">{s.priceValueHeader}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="py-2.5">{s.priceTierLarge}</td>
                    <td className="py-2.5 text-right font-semibold text-primary tabular-nums">$6.00 / kg CAD</td>
                  </tr>
                  <tr>
                    <td className="py-2.5">{s.priceTierSmall}</td>
                    <td className="py-2.5 text-right font-semibold text-primary tabular-nums">$8.00 / kg CAD</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{s.priceNote}</p>
          </CardContent>
        </Card>

        {/* ── Contribute — this page is also a collection instrument ── */}
        <Card className="border-primary/20 bg-muted/20">
          <CardContent className="pt-6 flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div>
              <p className="font-semibold text-sm mb-1">{s.contributeTitle}</p>
              <p className="text-sm text-muted-foreground max-w-xl">{s.contributeBody}</p>
            </div>
            <a href={mailto} className="shrink-0">
              <Button className="gap-2">
                <Mail className="w-4 h-4" />
                {s.contributeCta}
              </Button>
            </a>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground mt-6 text-center">
          <Link href="/market-intelligence" className="underline hover:text-foreground">
            {t.marketIntelligence.title}
          </Link>{" "}
          · <Link href="/trust" className="underline hover:text-foreground">{t.marketIntelligence.methodologyLink}</Link>
        </p>
      </section>
    </div>
  );
}
