import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight, CheckCircle2, ChevronDown, ChevronUp,
  FileText, Handshake, Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

const STEP_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-amber-100 text-amber-700",
  "bg-primary/10 text-primary",
];
const STEP_ICONS = [FileText, Handshake, CheckCircle2, Percent];

function FeeCalculator() {
  const [value, setValue] = useState("5000");
  const { t } = useLanguage();
  const p = t.pricing;

  const num = parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
  const fee = num * 0.09;
  const net = num - fee;

  const fmt = (n: number) =>
    n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

  return (
    <div className="bg-card border rounded-2xl p-6 sm:p-8 max-w-lg w-full mx-auto shadow-sm">
      <h3 className="font-bold text-lg mb-1">{p.calcTitle}</h3>
      <p className="text-sm text-muted-foreground mb-5">{p.calcDesc}</p>

      <div className="mb-5">
        <label className="block text-sm font-medium mb-1.5">{p.contractValue}</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
          <input
            type="number"
            min="0"
            step="500"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full border rounded-xl pl-8 pr-4 py-3 text-xl font-semibold bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">{p.lyoDexFee}</div>
          <div className="text-2xl font-bold text-destructive">{fmt(fee)}</div>
        </div>
        <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">{p.operatorNetPayout}</div>
          <div className="text-2xl font-bold text-primary">{fmt(net)}</div>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-4">
        {p.buyersPay}
      </p>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between py-4 text-left gap-4 hover:text-primary transition-colors"
      >
        <span className="font-medium text-sm">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />}
      </button>
      {open && (
        <p className="pb-4 text-sm text-muted-foreground leading-relaxed">{a}</p>
      )}
    </div>
  );
}

export default function Pricing() {
  const { t } = useLanguage();
  const p = t.pricing;

  return (
    <div className="flex flex-col">

      {/* Hero */}
      <section className="bg-[#0a1628] text-white py-20 md:py-28 text-center">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-primary/20 text-primary border border-primary/30 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 uppercase tracking-widest">
            <Percent className="w-3.5 h-3.5" /> {p.heroTag}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 leading-tight">
            {p.heroTitle}
          </h1>
          <p className="text-gray-400 text-lg mb-8">
            {p.heroSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/request">
              <Button size="lg" className="font-semibold gap-2">
                {p.postRequestFree} <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/operators">
              <Button size="lg" variant="outline" className="font-semibold border-white/20 text-white hover:bg-white/10 hover:text-white">
                {p.browseOperators}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-2">{p.feeWorksTitle}</h2>
            <p className="text-muted-foreground">{p.feeWorksSubtitle}</p>
          </div>

          <div className="grid sm:grid-cols-4 gap-0 relative">
            {p.feeSteps.map((s, i) => {
              const Icon = STEP_ICONS[i];
              return (
                <div key={i} className="flex flex-col items-center text-center px-4 relative">
                  {i < 3 && (
                    <div className="hidden sm:block absolute top-8 left-[60%] w-[80%] border-t-2 border-dashed border-border z-0" />
                  )}
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 relative z-10 ${STEP_COLORS[i]}`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <div className="text-xs font-bold tracking-widest text-muted-foreground mb-1">{p.stepLabel} {s.step}</div>
                  <div className="font-semibold text-sm mb-1">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Calculator */}
      <section className="py-16 bg-muted/30 border-y">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">{p.calcSectionTitle}</h2>
            <p className="text-muted-foreground">{p.calcSectionSubtitle}</p>
          </div>
          <FeeCalculator />
        </div>
      </section>

      {/* Buyers free + operator summary */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">{p.buyersFreeTitle}</h2>
            <p className="text-muted-foreground">
              {p.buyersFreeSubtitle}
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 mb-12">
            {p.buyerStats.map((item) => (
              <div key={item.label} className="p-6 rounded-2xl border bg-card text-center">
                <div className="text-3xl font-bold text-primary mb-1">{item.value}</div>
                <div className="font-semibold text-sm mb-1">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why pay-per-deal comparison */}
      <section className="py-16 bg-muted/30 border-y">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">{p.whyTitle}</h2>
            <p className="text-muted-foreground">{p.whySubtitle}</p>
          </div>
          <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="grid grid-cols-3 bg-muted/50 border-b text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <div className="px-5 py-3">{p.tableHeaders[0]}</div>
              <div className="px-5 py-3 text-center border-x">{p.tableHeaders[1]}</div>
              <div className="px-5 py-3 text-center">{p.tableHeaders[2]}</div>
            </div>
            {p.tableRows.map(([label, ours, theirs], i) => (
              <div key={i} className={`grid grid-cols-3 border-b last:border-b-0 text-sm ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                <div className="px-5 py-3.5 font-medium text-muted-foreground">{label}</div>
                <div className="px-5 py-3.5 text-center border-x">
                  <span className="text-primary font-semibold">{ours}</span>
                </div>
                <div className="px-5 py-3.5 text-center text-muted-foreground">{theirs}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">{p.faqTitle}</h2>
            <p className="text-muted-foreground">{p.faqSubtitle}</p>
          </div>
          <div className="rounded-2xl border bg-card divide-y-0 px-6">
            {p.faqItems.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#0a1628] text-white text-center">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">{p.ctaTitle}</h2>
          <p className="text-gray-400 mb-8">{p.ctaSubtitle}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/request">
              <Button size="lg" className="font-semibold gap-2">
                {p.postRequestFree} <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/operators">
              <Button size="lg" variant="outline" className="font-semibold border-white/20 text-white hover:bg-white/10 hover:text-white">
                {p.iAmOperator}
              </Button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
