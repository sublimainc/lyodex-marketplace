import { Link } from "wouter";
import { ShieldCheck, Database, Search, AlertCircle, Mail, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const VERIFICATION_LEVELS = [
  {
    status: "Verified",
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
    icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />,
    description:
      "The company has been confirmed from at least two independent public sources (official website, government registry, trade directory, or recognized industry association). Basic details — name, country, city, website, and category — have been cross-checked and a source URL is on file.",
  },
  {
    status: "Partially Verified",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    icon: <AlertCircle className="w-4 h-4 text-amber-600" />,
    description:
      "The company's name and country are confirmed from a public source, but one or more fields (address, contact, certifications, or service scope) could not be independently verified. The listing is published with only confirmed fields displayed.",
  },
  {
    status: "Not Verified",
    color: "bg-slate-100 text-slate-700 border-slate-200",
    icon: <Database className="w-4 h-4 text-slate-500" />,
    description:
      "The entry was submitted by a user or imported from an unverified directory. No independent public-source confirmation has been completed yet. These listings are clearly labelled and should be treated with appropriate caution.",
  },
];

const ACCEPTED_SOURCES = [
  { category: "Official company websites", example: "Corporate 'About', 'Contact', or 'Services' pages" },
  { category: "Government business registries", example: "Corporations Canada, SEC EDGAR, Companies House (UK), Handelsregister (DE)" },
  { category: "Certification body databases", example: "CFIA, NSF, SQF Institute, Organic certifier public registries" },
  { category: "Recognized trade associations", example: "IFTPS, IFT, BRC Global Standards, GFSI member bodies" },
  { category: "Official export / trade directories", example: "Industry Canada, USDA AMS, EU Food Safety Authority publications" },
  { category: "Company-published annual reports", example: "Publicly available PDF or web annual reports" },
  { category: "Credible B2B directories with original research", example: "Kompass, Europages — only where information matches the company's own website" },
];

const WHAT_WE_DO_NOT_DO = [
  "Invent or guess contact information (email, phone, address)",
  "Claim production capacity unless a company has publicly disclosed it",
  "List certifications without a verifiable public source",
  "Present AI-generated text as verified market data",
  "Accept unverified user submissions without a review queue",
  "Scrape personal emails — only clearly public business contact addresses are used",
];

export default function Trust() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <section className="border-b py-10 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="w-8 h-8 text-primary shrink-0" />
            <h1 className="text-3xl font-bold tracking-tight">Trust &amp; Data Methodology</h1>
          </div>
          <p className="text-muted-foreground">
            LyoDex is built on a single principle: <strong>every fact we publish must be verifiable from a credible public source</strong>.
            This page explains exactly how we collect, verify, and display information about operators, ingredient sellers, and machinery suppliers.
          </p>
        </div>
      </section>

      <div className="container mx-auto max-w-3xl px-4 py-10 space-y-10">

        {/* Verification levels */}
        <section>
          <h2 className="text-xl font-semibold mb-1">Verification levels</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Every company listing on LyoDex carries one of three verification statuses. The status is shown on each profile card and updated whenever a new review is performed.
          </p>
          <div className="space-y-4">
            {VERIFICATION_LEVELS.map((v) => (
              <Card key={v.status} className="border">
                <CardContent className="pt-5 pb-4 flex gap-4 items-start">
                  <div className="mt-0.5 shrink-0">{v.icon}</div>
                  <div>
                    <Badge className={`border text-xs mb-2 ${v.color}`}>{v.status}</Badge>
                    <p className="text-sm text-muted-foreground">{v.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Accepted sources */}
        <section>
          <h2 className="text-xl font-semibold mb-1">Accepted sources</h2>
          <p className="text-sm text-muted-foreground mb-5">
            We only use information that can be traced to one of these source categories. Every verified record has at least one source URL stored internally.
          </p>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left font-medium text-muted-foreground px-4 py-2.5">Source type</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-2.5 hidden sm:table-cell">Example</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ACCEPTED_SOURCES.map((s) => (
                  <tr key={s.category} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-medium">{s.category}</td>
                    <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">{s.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* What we don't do */}
        <section>
          <h2 className="text-xl font-semibold mb-1">What we do not do</h2>
          <p className="text-sm text-muted-foreground mb-5">
            To protect companies and buyers from misinformation, we apply strict prohibitions.
          </p>
          <ul className="space-y-2">
            {WHAT_WE_DO_NOT_DO.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <span className="text-destructive font-bold mt-0.5 shrink-0">✕</span>
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Market intelligence */}
        <section>
          <h2 className="text-xl font-semibold mb-1">Market intelligence</h2>
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-5 pb-4">
              <p className="text-sm text-amber-900 font-medium mb-1">Benchmark data — not verified transaction prices</p>
              <p className="text-sm text-amber-800">
                The pricing benchmarks and volume indicators on the Market Intelligence page are <strong>illustrative estimates</strong> based on publicly available industry reports, operator-published rate cards, and aggregated RFQ data submitted by LyoDex users. They are not audited financial data. Ranges are wide by design to reflect real market variability. Always negotiate directly with operators for accurate project pricing.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Why data may be missing */}
        <section>
          <h2 className="text-xl font-semibold mb-1">Why some data may be missing</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Production capacity</strong> — Most operators do not publish throughput figures publicly. Where capacity is not publicly disclosed, we write "Not publicly disclosed" rather than estimate.
            </p>
            <p>
              <strong className="text-foreground">Certifications</strong> — We only list certifications that appear in a public certification-body registry or on the company's own website. Claimed certifications that have not been cross-checked with the issuing body are labelled as "claimed, not independently verified."
            </p>
            <p>
              <strong className="text-foreground">Contact information</strong> — We do not display email addresses that are not clearly published as business-contact addresses. If only a contact form is available, we link to the company's contact page.
            </p>
            <p>
              <strong className="text-foreground">Pricing</strong> — Freeze-drying pricing depends heavily on product type, batch size, moisture content, and contract terms. Any price shown is a benchmark range, not a quote.
            </p>
          </div>
        </section>

        {/* Claim / correction CTA */}
        <section>
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" />
                Is your company listed? Submit a correction.
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                If you are the owner or representative of a listed company and wish to claim your profile, correct inaccurate information, or request removal, contact us with your company name, your role, and the specific data that needs updating. We will verify your identity and update the listing within 5 business days.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="mailto:support@lyodex.com?subject=Profile%20Correction%20Request"
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  <Mail className="w-4 h-4" />
                  support@lyodex.com
                </a>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  Create an operator account
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Last updated */}
        <p className="text-xs text-muted-foreground text-center border-t pt-6">
          This methodology page was last updated May 2025. LyoDex reserves the right to update verification standards as the platform grows.
        </p>
      </div>
    </div>
  );
}
