import { Link } from "wouter";
import { ArrowRight, Box, BarChart3, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

const STEP_ICONS = [Box, BarChart3, ShieldCheck];

export default function Home() {
  const { t } = useLanguage();
  const h = t.home;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-[#0a1628] text-white py-28 md:py-36 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158')] bg-cover bg-center opacity-5" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0a1628]/95 to-primary/20" />

        <div className="container relative z-10 mx-auto px-4">
          <div className="max-w-3xl">
            <div className="inline-block text-xs font-semibold tracking-widest uppercase text-primary mb-6 border border-primary/40 rounded-full px-3 py-1">
              Canada & United States
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
              {h.heroTitle}
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl leading-relaxed">
              {h.heroSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/request" data-testid="hero-cta-submit">
                <Button size="lg" className="w-full sm:w-auto font-semibold gap-2">
                  {h.submitRequest} <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/operators" data-testid="hero-cta-browse">
                <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white">
                  {h.browseOperators}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-14 bg-muted/30 border-y">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {h.stats.map((stat, i) => (
              <div key={i}>
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">{h.workflowTitle}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{h.workflowSubtitle}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {h.steps.map((step, i) => {
              const Icon = STEP_ICONS[i];
              return (
                <div key={i} className="p-8 border rounded-xl bg-card text-card-foreground shadow-sm hover:shadow-md hover:border-primary/30 transition-all">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-10">
            <Link href="/how-it-works">
              <Button variant="outline" className="gap-2">
                See the full process <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Market Intelligence teaser */}
      <section className="py-20 bg-muted/20 border-y">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1">
              <div className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Market Intelligence</div>
              <h2 className="text-3xl font-bold tracking-tight mb-4">Real pricing benchmarks, updated daily</h2>
              <p className="text-muted-foreground leading-relaxed mb-6 max-w-lg">
                Access live pricing data for food-grade and pharma-grade lyophilization across North America. Benchmark bids before you submit them.
              </p>
              <Link href="/market-intelligence">
                <Button variant="outline" className="gap-2">
                  View market data <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-4">
              {[
                { label: "Avg. food-grade price", value: "$9.40/kg", sub: "+4.2% vs last month" },
                { label: "Avg. GMP-grade price", value: "$28.20/kg", sub: "+2% vs last month" },
                { label: "Active operators", value: "22", sub: "7 available now" },
                { label: "Avg. response time", value: "38h", sub: "−8% vs 3 months ago" },
              ].map((kpi, i) => (
                <div key={i} className="p-5 rounded-xl border bg-background shadow-sm">
                  <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
                  <div className="text-2xl font-bold text-primary mb-1">{kpi.value}</div>
                  <p className="text-xs text-emerald-600 font-medium">{kpi.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[#0a1628] text-white">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">Ready to source or fill capacity?</h2>
          <p className="text-gray-400 mb-8">
            Submit a request in under 3 minutes. No account required to browse operators.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/request">
              <Button size="lg" className="font-semibold gap-2">
                Free request <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 hover:text-white bg-transparent">
                View pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
