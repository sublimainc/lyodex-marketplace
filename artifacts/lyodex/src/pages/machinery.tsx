import { useState, useEffect, useMemo } from "react";
import { Search, Grid3X3, List, Plus, Loader2, AlertCircle, MapPin, Mail } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// Listings are only returned by the API once an admin has approved them,
// so everything rendered here has passed review. Seller contact details are
// deliberately absent from this payload — they require a signed-in request to
// GET /api/machinery/:id, so they cannot be scraped in bulk.
interface MachineryListing {
  id: number;
  title: string;
  category: string;
  condition: string;
  description: string | null;
  price: number | null;
  currency: string;
  manufacturer_name: string | null;
  model_number: string | null;
  year_manufactured: number | null;
  technical_specs: Record<string, string> | null;
  images: string[];
  created_at: string;
}

// Maps the translated dropdown positions onto the values stored in the DB.
const CATEGORY_VALUES = ["all", "freeze_dryers", "condensers", "shelving", "vacuum_pumps", "accessories", "parts"];
const COUNTRY_VALUES = ["all", "CA", "US"];
const SORT_VALUES = ["newest", "price_asc", "price_desc"];

export default function Machinery() {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const { t } = useLanguage();
  const m = t.machinery;

  const [categoryIdx, setCategoryIdx] = useState("0");
  const [regionIdx, setRegionIdx] = useState("0");
  const [sortIdx, setSortIdx] = useState("0");

  const [listings, setListings] = useState<MachineryListing[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  // Debounce the free-text search so typing doesn't fire a request per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setState("loading");

    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    const category = CATEGORY_VALUES[parseInt(categoryIdx, 10)];
    if (category && category !== "all") params.set("category", category);
    const country = COUNTRY_VALUES[parseInt(regionIdx, 10)];
    if (country && country !== "all") params.set("country", country);
    params.set("sort", SORT_VALUES[parseInt(sortIdx, 10)] ?? "newest");

    fetch(`${BASE}/api/machinery?${params}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { listings: MachineryListing[] }) => {
        if (cancelled) return;
        setListings(d.listings ?? []);
        setState("ready");
      })
      .catch(() => { if (!cancelled) setState("error"); });

    return () => { cancelled = true; };
  }, [debouncedSearch, categoryIdx, regionIdx, sortIdx]);

  const counts = useMemo(() => {
    const ca = listings.filter(l => l.technical_specs?.country === "CA").length;
    const us = listings.filter(l => l.technical_specs?.country === "US").length;
    return { ca, us };
  }, [listings]);

  const priceLabel = (l: MachineryListing) =>
    l.price === null ? m.priceOnRequest : `$${l.price.toLocaleString()} ${l.currency}`;

  return (
    <div className="flex flex-col min-h-screen">
      <section className="bg-[#0a1628] text-white py-10 px-4">
        <div className="container mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold tracking-widest uppercase text-primary mb-2">{m.tag}</div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">{m.title}</h1>
            <p className="text-gray-400 text-sm max-w-xl leading-relaxed">{m.subtitle}</p>
          </div>
          <Link href="/machinery/list">
            <Button className="shrink-0 gap-2 font-semibold">
              <Plus className="w-4 h-4" /> {m.listEquipment}
            </Button>
          </Link>
        </div>
      </section>

      <section className="border-b bg-background sticky top-14 z-30">
        <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={m.searchPlaceholder}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={categoryIdx} onValueChange={setCategoryIdx}>
            <SelectTrigger className="w-auto min-w-36 h-9 text-sm">
              <SelectValue>{m.categories[parseInt(categoryIdx)]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {m.categories.map((c, i) => <SelectItem key={i} value={String(i)}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={regionIdx} onValueChange={setRegionIdx}>
            <SelectTrigger className="w-auto min-w-40 h-9 text-sm">
              <SelectValue>{m.regions[parseInt(regionIdx)]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {m.regions.map((r, i) => <SelectItem key={i} value={String(i)}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortIdx} onValueChange={setSortIdx}>
            <SelectTrigger className="w-auto min-w-36 h-9 text-sm">
              <SelectValue>{m.sortOptions[parseInt(sortIdx)]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {m.sortOptions.map((s, i) => <SelectItem key={i} value={String(i)}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center border rounded-md overflow-hidden">
            <button
              onClick={() => setView("grid")}
              aria-label="Grid view"
              className={`p-2 transition-colors ${view === "grid" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("list")}
              aria-label="List view"
              className={`p-2 border-l transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-6 flex-1">
        <p className="text-sm text-muted-foreground mb-8">
          <span className="font-semibold text-foreground">{listings.length}</span> {m.listingsCount} &nbsp;·&nbsp;
          <span className="text-primary font-medium">{counts.ca} CA</span> &nbsp;·&nbsp;
          <span className="text-blue-500 font-medium">{counts.us} US</span>
        </p>

        {state === "loading" && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {state === "error" && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <AlertCircle className="w-9 h-9 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{m.errorTitle}</h3>
            <p className="text-muted-foreground text-sm max-w-xs">{m.errorDesc}</p>
          </div>
        )}

        {state === "ready" && listings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-muted/60 flex items-center justify-center mb-6">
              <Search className="w-9 h-9 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{m.noMatchTitle}</h3>
            <p className="text-muted-foreground text-sm max-w-xs">{m.noMatchDesc}</p>
          </div>
        )}

        {state === "ready" && listings.length > 0 && (
          <div className={view === "grid" ? "grid sm:grid-cols-2 lg:grid-cols-3 gap-5" : "flex flex-col gap-3"}>
            {listings.map(l => (
              <article
                key={l.id}
                className={`border rounded-xl bg-card overflow-hidden hover:shadow-md transition-shadow ${
                  view === "list" ? "flex items-start gap-4 p-4" : "flex flex-col"
                }`}
              >
                {view === "grid" && (
                  <div className="h-40 bg-muted flex items-center justify-center shrink-0">
                    {l.images?.[0] ? (
                      <img src={l.images[0]} alt={l.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <Grid3X3 className="w-8 h-8 text-muted-foreground/40" />
                    )}
                  </div>
                )}
                <div className={view === "grid" ? "p-4 flex flex-col gap-2 flex-1" : "flex flex-col gap-2 flex-1"}>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm leading-snug">{l.title}</h3>
                    <Badge variant="outline" className="text-[10px] shrink-0 capitalize">{l.condition}</Badge>
                  </div>
                  {(l.manufacturer_name || l.model_number) && (
                    <p className="text-xs text-muted-foreground">
                      {[l.manufacturer_name, l.model_number, l.year_manufactured].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {l.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{l.description}</p>
                  )}
                  <div className="flex items-center justify-between gap-2 mt-auto pt-2">
                    <span className="font-bold text-primary text-sm">{priceLabel(l)}</span>
                    {l.technical_specs?.country && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {l.technical_specs.city ? `${l.technical_specs.city}, ` : ""}{l.technical_specs.country}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-1">
                    <Mail className="w-3 h-3" /> {m.contactRequiresSignIn}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-auto bg-[#0a1628] text-white py-16 text-center">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="text-2xl font-bold mb-3">{m.ctaTitle}</h2>
          <p className="text-gray-400 text-sm mb-6">{m.ctaSubtitle}</p>
          <Link href="/machinery/list">
            <Button className="gap-2 font-semibold">
              <Plus className="w-4 h-4" /> {m.listEquipment}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
