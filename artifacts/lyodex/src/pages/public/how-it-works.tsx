import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, FileText, Search, ShieldCheck, CheckCircle2, Star, BarChart3, Users, Zap, Clock, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

const BUYER_ICONS = [FileText, Search, BarChart3, ShieldCheck, CheckCircle2];
const OPERATOR_ICONS = [Users, Zap, DollarSign, Clock, CheckCircle2];
const TRUST_ICONS = [ShieldCheck, Star, BarChart3, FileText];

export default function HowItWorks() {
  const [role, setRole] = useState<"buyer" | "operator">("buyer");
  const { t } = useLanguage();
  const hiw = t.howItWorks;

  const steps = role === "buyer"
    ? hiw.buyerSteps.map((s, i) => ({ ...s, icon: BUYER_ICONS[i] }))
    : hiw.operatorSteps.map((s, i) => ({ ...s, icon: OPERATOR_ICONS[i] }));

  return (
    <div className="flex flex-col">
      <section className="bg-[#0a1628] text-white py-20 md:py-28">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <div className="inline-block text-xs font-semibold tracking-widest uppercase text-primary mb-4 border border-primary/40 rounded-full px-3 py-1">
            {hiw.heroTag}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            {hiw.heroTitle}
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed mb-10">
            {hiw.heroSubtitle}
          </p>
          <div className="inline-flex items-center rounded-full bg-white/10 p-1 gap-1">
            <button
              onClick={() => setRole("buyer")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${role === "buyer" ? "bg-primary text-white shadow" : "text-gray-300 hover:text-white"}`}
            >
              {hiw.iAmBuyer}
            </button>
            <button
              onClick={() => setRole("operator")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${role === "operator" ? "bg-primary text-white shadow" : "text-gray-300 hover:text-white"}`}
            >
              {hiw.iAmOperator}
            </button>
          </div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <div>
            {steps.map((step, i) => (
              <div key={`${role}-${i}`} className="flex gap-6 md:gap-10">
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center z-10">
                    <step.icon className="w-5 h-5 text-primary" />
                  </div>
                  {i < steps.length - 1 && (
                    <div className="w-px flex-1 min-h-8 bg-primary/20 mt-2 mb-0" />
                  )}
                </div>
                <div className="pb-10 pt-1.5 flex-1 min-w-0">
                  <div className="text-xs font-bold text-primary/60 tracking-widest mb-1">{step.num}</div>
                  <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-4 justify-center">
            {role === "buyer" ? (
              <>
                <Link href="/request">
                  <Button size="lg" className="font-semibold gap-2">
                    {hiw.submitFreeRequest} <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/operators">
                  <Button size="lg" variant="outline">{hiw.browseOperators}</Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/request">
                  <Button size="lg" className="font-semibold gap-2">
                    {hiw.joinAsOperator} <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button size="lg" variant="outline">{hiw.viewPricingPlans}</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30 border-y">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight mb-3">{hiw.trustTitle}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {hiw.trustSubtitle}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {hiw.trustItems.map((item, i) => {
              const Icon = TRUST_ICONS[i];
              return (
                <div key={i} className="p-6 rounded-xl border bg-background shadow-sm">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#0a1628] text-white">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">{hiw.ctaTitle}</h2>
          <p className="text-gray-400 mb-8">
            {hiw.ctaSubtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/request">
              <Button size="lg" className="font-semibold gap-2">
                {hiw.freeRequest} <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/market-intelligence">
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 hover:text-white bg-transparent">
                {hiw.viewMarketData}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
