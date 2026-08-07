import { useState } from "react";
import { Link } from "wouter";
import { Search, Globe, Star, MapPin, ExternalLink, Factory, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";

interface Manufacturer {
  id: number;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  website_url: string | null;
  country: string | null;
  city: string | null;
  founded_year: number | null;
  specialties: string[];
  market_focus: string[];
  featured: boolean;
  avg_rating: number;
  review_count: number;
}

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States", CA: "Canada", CN: "China", NZ: "New Zealand",
  DE: "Germany", ES: "Spain", FR: "France", JP: "Japan", GB: "United Kingdom",
};

const MARKET_COLORS: Record<string, string> = {
  Pharmaceutical: "bg-violet-100 text-violet-800",
  Biotech: "bg-blue-100 text-blue-800",
  Food: "bg-emerald-100 text-emerald-800",
  GMP: "bg-amber-100 text-amber-800",
  Industrial: "bg-slate-100 text-slate-700",
  Research: "bg-cyan-100 text-cyan-800",
};

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex">
        {[1, 2, 3, 4, 5].map(i => (
          <Star
            key={i}
            className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
          />
        ))}
      </div>
      <span className="text-sm font-semibold">{rating > 0 ? rating.toFixed(1) : "—"}</span>
      <span className="text-xs text-muted-foreground">({count})</span>
    </div>
  );
}

function ManufacturerCard({ mfr }: { mfr: Manufacturer }) {
  const countryName = mfr.country ? (COUNTRY_NAMES[mfr.country] ?? mfr.country) : null;
  return (
    <div className="border rounded-xl bg-card hover:shadow-md transition-all group">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Factory className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-base leading-tight">{mfr.name}</h3>
                {mfr.featured && (
                  <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20">
                    Featured
                  </Badge>
                )}
              </div>
              {(mfr.city || countryName) && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <MapPin className="w-3 h-3" />
                  {[mfr.city, countryName].filter(Boolean).join(", ")}
                  {mfr.founded_year && <span className="ml-1">· est. {mfr.founded_year}</span>}
                </div>
              )}
            </div>
          </div>
          {mfr.website_url && (
            <a
              href={mfr.website_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
              title="Visit website"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        {mfr.tagline && (
          <p className="text-sm text-muted-foreground italic mb-3 leading-snug">"{mfr.tagline}"</p>
        )}

        <StarRating rating={mfr.avg_rating} count={mfr.review_count} />

        {mfr.market_focus.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {mfr.market_focus.slice(0, 4).map(f => (
              <span
                key={f}
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${MARKET_COLORS[f] ?? "bg-muted text-muted-foreground"}`}
              >
                {f}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="border-t px-5 py-3 flex items-center justify-between bg-muted/30 rounded-b-xl">
        <p className="text-xs text-muted-foreground line-clamp-1 flex-1 pr-3">
          {mfr.specialties.slice(0, 2).join(" · ")}
        </p>
        <Link href={`/manufacturers/${mfr.slug}`}>
          <Button size="sm" variant="ghost" className="text-xs h-7 gap-1 shrink-0 text-primary hover:text-primary">
            View Profile <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="border rounded-xl p-5 space-y-3">
      <div className="flex gap-3">
        <Skeleton className="w-11 h-11 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}

export default function Manufacturers() {
  const [search, setSearch] = useState("");
  const [focusFilter, setFocusFilter] = useState("All");

  const { data: manufacturers = [], isLoading } = useQuery<Manufacturer[]>({
    queryKey: ["manufacturers"],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}api/manufacturers`);
      if (!res.ok) throw new Error("Failed to load manufacturers");
      return res.json();
    },
  });

  const allFocuses = ["All", ...Array.from(new Set(manufacturers.flatMap(m => m.market_focus))).sort()];

  const filtered = manufacturers.filter(m => {
    if (focusFilter !== "All" && !m.market_focus.includes(focusFilter)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      (m.city ?? "").toLowerCase().includes(q) ||
      (m.country ?? "").toLowerCase().includes(q) ||
      m.specialties.some(s => s.toLowerCase().includes(q)) ||
      m.market_focus.some(f => f.toLowerCase().includes(q))
    );
  });

  const featured = filtered.filter(m => m.featured);
  const rest = filtered.filter(m => !m.featured);

  return (
    <div className="flex flex-col min-h-screen">
      <section className="bg-[#0a1628] text-white py-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-xs font-semibold tracking-widest uppercase text-primary mb-2">Marketplace</div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Freeze Dryer Manufacturers
          </h1>
          <p className="text-gray-400 text-sm max-w-2xl leading-relaxed mb-6">
            Browse and compare manufacturers of freeze-drying equipment — from benchtop laboratory units to full-scale industrial and pharmaceutical production systems. Rate companies and share your experience.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, country, or specialty..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/15"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b bg-background sticky top-14 z-30">
        <div className="container mx-auto max-w-5xl px-4 py-2.5 flex gap-2 overflow-x-auto scrollbar-hide">
          {allFocuses.map(f => (
            <button
              key={f}
              onClick={() => setFocusFilter(f)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                focusFilter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-4 py-8">
        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <Globe className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg mb-2">No manufacturers found</h3>
            <p className="text-muted-foreground text-sm">Try adjusting your search or filter.</p>
          </div>
        ) : (
          <>
            {featured.length > 0 && (
              <div className="mb-8">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Featured Manufacturers</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {featured.map(m => <ManufacturerCard key={m.id} mfr={m} />)}
                </div>
              </div>
            )}
            {rest.length > 0 && (
              <div>
                {featured.length > 0 && (
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">All Manufacturers</h2>
                )}
                <div className="grid md:grid-cols-2 gap-4">
                  {rest.map(m => <ManufacturerCard key={m.id} mfr={m} />)}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-6 text-center">
              Showing {filtered.length} of {manufacturers.length} manufacturers
            </p>
          </>
        )}
      </section>

      <section className="mt-auto bg-[#0a1628] text-white py-14 text-center">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="text-2xl font-bold mb-3">Are you a freeze dryer manufacturer?</h2>
          <p className="text-gray-400 text-sm mb-6">
            List your company on LyoDex to reach freeze-drying operators and buyers across North America. Free basic listing.
          </p>
          <a href="mailto:info@lyodex.com?subject=Manufacturer%20Listing%20Request">
            <Button className="gap-2 font-semibold">
              <Globe className="w-4 h-4" /> Request a Listing
            </Button>
          </a>
        </div>
      </section>
    </div>
  );
}
