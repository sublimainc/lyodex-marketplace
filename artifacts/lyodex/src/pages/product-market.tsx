import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/lib/i18n";
import { LockGate } from "@/components/LockGate";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import {
  Package, PackagePlus, Search, ChevronDown, ChevronUp,
  MapPin, Droplets, Clock, ShieldCheck, Star, X,
  SlidersHorizontal, AlertTriangle,
} from "lucide-react";

type FDCategory =
  | "fruits" | "vegetables" | "dairy" | "powders"
  | "mushrooms" | "herbs_spices" | "candy_snacks"
  | "proteins" | "specialty" | "other";

interface FDListing {
  id: string;
  title: string;
  titleFr: string;
  category: FDCategory;
  description: string;
  price: number;
  currency: "CAD" | "USD";
  negotiable: boolean;
  quantityAvailableKg: number;
  minOrderKg: number;
  city: string;
  region: string;
  country: "CA" | "US";
  waterActivity: number;
  shelfLifeMonths: number;
  certifications: string[];
  sellerCompany: string;
  isVerifiedSeller: boolean;
  isFeatured: boolean;
  status: string;
  createdAt: string;
}

const CATEGORIES: { key: FDCategory | "all"; color: string }[] = [
  { key: "all", color: "bg-gray-100 text-gray-700" },
  { key: "fruits", color: "bg-pink-100 text-pink-700" },
  { key: "vegetables", color: "bg-green-100 text-green-700" },
  { key: "dairy", color: "bg-blue-100 text-blue-700" },
  { key: "powders", color: "bg-amber-100 text-amber-700" },
  { key: "mushrooms", color: "bg-purple-100 text-purple-700" },
  { key: "herbs_spices", color: "bg-lime-100 text-lime-700" },
  { key: "candy_snacks", color: "bg-orange-100 text-orange-700" },
  { key: "proteins", color: "bg-red-100 text-red-700" },
  { key: "specialty", color: "bg-teal-100 text-teal-700" },
  { key: "other", color: "bg-gray-100 text-gray-600" },
];

const CERTS = ["HACCP", "GMP", "Organic", "USDA Organic", "CFIA", "FDA", "SQF", "Kosher", "Halal"];

function awBadge(aw: number) {
  if (aw <= 0.05) return "text-green-700 bg-green-50 border border-green-200";
  if (aw <= 0.15) return "text-teal-700 bg-teal-50 border border-teal-200";
  if (aw <= 0.30) return "text-amber-700 bg-amber-50 border border-amber-200";
  return "text-red-700 bg-red-50 border border-red-200";
}

function stockColor(kg: number) {
  if (kg > 200) return "text-green-600";
  if (kg > 50) return "text-amber-600";
  return "text-red-600";
}

function getCatColor(cat: FDCategory) {
  return CATEGORIES.find(c => c.key === cat)?.color ?? "bg-gray-100 text-gray-600";
}

export default function ProductMarket() {
  const { t, locale } = useLanguage();
  const pm = t.productMarket;
  const isFr = locale === "fr";
  const { marketplace_locked } = useSiteSettings();

  const [listings, setListings] = useState<FDListing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<FDCategory | "all">("all");
  const [country, setCountry] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [maxAW, setMaxAW] = useState("");
  const [selectedCerts, setSelectedCerts] = useState<string[]>([]);
  const [sort, setSort] = useState("newest");

  const catLabel = useCallback((key: FDCategory | "all") => {
    const map: Record<string, string> = {
      all: pm.filterAll,
      fruits: pm.filterFruits,
      vegetables: pm.filterVegetables,
      dairy: pm.filterDairy,
      powders: pm.filterPowders,
      mushrooms: pm.filterMushrooms,
      herbs_spices: pm.filterHerbs,
      candy_snacks: pm.filterCandy,
      proteins: pm.filterProteins,
      specialty: pm.filterSpecialty,
      other: pm.filterOther,
    };
    return map[key] ?? key;
  }, [pm]);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category !== "all") params.set("category", category);
    if (country !== "all") params.set("country", country);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (maxAW) params.set("maxAW", maxAW);
    if (selectedCerts.length > 0) params.set("certification", selectedCerts[0]);
    params.set("sort", sort);
    try {
      const res = await fetch(`/api/product-market?${params.toString()}`);
      const data = await res.json();
      setListings(data.listings ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setListings([]);
    }
    setLoading(false);
  }, [search, category, country, minPrice, maxPrice, maxAW, selectedCerts, sort]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  function clearFilters() {
    setSearch(""); setCategory("all"); setCountry("all");
    setMinPrice(""); setMaxPrice(""); setMaxAW("");
    setSelectedCerts([]); setSort("newest");
  }

  const hasActiveFilters = !!(search || category !== "all" || country !== "all" || minPrice || maxPrice || maxAW || selectedCerts.length > 0);

  return (
    <LockGate locked={marketplace_locked}>
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#f0fdf4] to-[#e0f2fe] py-14">
        <div className="container mx-auto px-4 text-center">
          <span className="inline-block text-xs font-bold tracking-widest uppercase text-[#0F6E56] mb-3">
            {pm.eyebrow}
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
            {pm.title}
          </h1>
          <p className="max-w-xl mx-auto text-gray-500 text-[1.0625rem] leading-relaxed mb-6">
            {pm.subtitle}
          </p>
          <Link
            href="/product-market/list"
            className="inline-flex items-center gap-2 bg-[#0F6E56] text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-[#0a5843] transition-colors"
          >
            <PackagePlus size={17} /> {pm.listBtn}
          </Link>
        </div>
      </section>

      {/* Filters + Listings */}
      <section className="container mx-auto px-4 py-10">
        {/* Search + sort row */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex-1 min-w-[240px] relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={pm.searchPlaceholder}
              className="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/30 bg-white"
            />
          </div>
          <select
            value={country}
            onChange={e => setCountry(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/30 min-w-[160px]"
          >
            <option value="all">{pm.filterAllCountry}</option>
            <option value="CA">{pm.filterCA}</option>
            <option value="US">{pm.filterUS}</option>
          </select>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/30 min-w-[160px]"
          >
            <option value="newest">{pm.sortNewest}</option>
            <option value="price_asc">{pm.sortPriceAsc}</option>
            <option value="price_desc">{pm.sortPriceDesc}</option>
            <option value="aw_asc">{pm.sortAWAsc}</option>
          </select>
          <button
            onClick={() => setShowMoreFilters(v => !v)}
            className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white hover:bg-gray-50 transition-colors"
          >
            <SlidersHorizontal size={15} className="text-gray-500" />
            {pm.moreFilters}
            {showMoreFilters ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap gap-2 mb-3">
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`px-3.5 py-1.5 rounded-full text-[0.8125rem] font-semibold transition-all border-2 cursor-pointer ${
                category === c.key
                  ? "bg-[#0F6E56] text-white border-[#0F6E56]"
                  : `${c.color} border-transparent`
              }`}
            >
              {catLabel(c.key)}
            </button>
          ))}
        </div>

        {/* More filters */}
        {showMoreFilters && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                {pm.priceRange} ($/kg)
              </label>
              <div className="flex gap-2">
                <input
                  value={minPrice}
                  onChange={e => setMinPrice(e.target.value)}
                  placeholder="Min"
                  type="number"
                  min={0}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/30"
                />
                <input
                  value={maxPrice}
                  onChange={e => setMaxPrice(e.target.value)}
                  placeholder="Max"
                  type="number"
                  min={0}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/30"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                {pm.maxAW}
              </label>
              <select
                value={maxAW}
                onChange={e => setMaxAW(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/30"
              >
                <option value="">Any</option>
                <option value="0.05">≤ 0.05</option>
                <option value="0.10">≤ 0.10</option>
                <option value="0.15">≤ 0.15</option>
                <option value="0.25">≤ 0.25</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                {pm.certifications}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CERTS.map(cert => (
                  <button
                    key={cert}
                    onClick={() => setSelectedCerts(prev =>
                      prev.includes(cert) ? prev.filter(c => c !== cert) : [...prev, cert]
                    )}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border cursor-pointer transition-colors ${
                      selectedCerts.includes(cert)
                        ? "bg-[#e0f2fe] border-[#0e7490] text-[#0e7490]"
                        : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
                    }`}
                  >
                    {cert}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results count + clear */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-gray-500">
            {pm.showingResults} <strong className="text-gray-800">{listings.length}</strong> {pm.of} <strong className="text-gray-800">{total}</strong> {pm.listings}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-red-500 text-sm font-semibold hover:text-red-700 transition-colors cursor-pointer"
            >
              <X size={14} /> {pm.clearFilters}
            </button>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-gray-200 h-80 animate-pulse" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20">
            <Package size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="font-bold text-lg text-gray-700 mb-1">{pm.noListings}</p>
            <p className="text-gray-400 mb-6">{pm.noListingsDesc}</p>
            <button onClick={clearFilters} className="bg-[#0F6E56] text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-[#0a5843] transition-colors">
              {pm.clearFilters}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map(listing => (
              <div
                key={listing.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden"
              >
                {/* Image placeholder */}
                <div className="h-36 bg-gradient-to-br from-[#e0f2fe] to-[#dcfce7] flex items-center justify-center relative">
                  <Package size={40} className="text-[#0F6E56] opacity-30" />
                  {listing.isFeatured && (
                    <span className="absolute top-2.5 left-2.5 bg-amber-400 text-white text-[0.7rem] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Star size={10} fill="white" /> {pm.featured}
                    </span>
                  )}
                  <span className={`absolute top-2.5 right-2.5 text-xs font-semibold px-2 py-1 rounded-full ${getCatColor(listing.category)}`}>
                    {catLabel(listing.category)}
                  </span>
                  {!listing.isVerifiedSeller && (
                    <span className="absolute bottom-2.5 left-2.5 bg-amber-50 border border-amber-300 text-amber-700 text-[0.7rem] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertTriangle size={10} /> {pm.unverifiedBadge}
                    </span>
                  )}
                  {listing.isVerifiedSeller && (
                    <span className="absolute bottom-2.5 left-2.5 bg-blue-50 border border-blue-200 text-blue-700 text-[0.7rem] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck size={10} /> {pm.verifiedSeller}
                    </span>
                  )}
                </div>

                {/* Body */}
                <div className="p-4 flex-1 flex flex-col gap-2">
                  <div>
                    <h3 className="font-bold text-[0.9375rem] text-gray-900 leading-snug mb-0.5">
                      {isFr && listing.titleFr ? listing.titleFr : listing.title}
                    </h3>
                    <p className="text-[0.8125rem] text-gray-400">{listing.sellerCompany}</p>
                  </div>
                  <p className="text-[0.8125rem] text-gray-500 flex items-center gap-1">
                    <MapPin size={13} /> {listing.city}, {listing.region} · {listing.country}
                  </p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-extrabold text-gray-900">${listing.price}</span>
                    <span className="text-[0.8125rem] text-gray-500">{listing.currency}{pm.perKg}</span>
                    {listing.negotiable && (
                      <span className="text-[0.7rem] text-[#0F6E56] font-bold bg-[#e0f2fe] px-1.5 py-0.5 rounded-full">{pm.negotiable}</span>
                    )}
                  </div>
                  <div className="flex gap-3 text-[0.8125rem]">
                    <span className="text-gray-500">{pm.minOrder}: <strong>{listing.minOrderKg}kg</strong></span>
                    <span className={stockColor(listing.quantityAvailableKg)}><strong>{listing.quantityAvailableKg}kg</strong> {pm.inStock}</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <span
                      title={pm.awTooltip}
                      className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${awBadge(listing.waterActivity)}`}
                    >
                      <Droplets size={11} />
                      AW {listing.waterActivity.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock size={11} /> {listing.shelfLifeMonths}{pm.months}
                    </span>
                  </div>
                  {listing.certifications.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {listing.certifications.slice(0, 3).map(c => (
                        <span key={c} className="text-[0.7rem] font-semibold text-[#0e7490] bg-[#e0f2fe] px-2 py-0.5 rounded-full">{c}</span>
                      ))}
                      {listing.certifications.length > 3 && (
                        <span className="text-[0.7rem] text-gray-400">+{listing.certifications.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="px-4 pb-4">
                  <Link
                    href={`/product-market/${listing.id}`}
                    className="block w-full text-center bg-[#0F6E56] text-white font-semibold text-sm py-2 rounded-lg hover:bg-[#0a5843] transition-colors"
                  >
                    {pm.viewDetails}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
    </LockGate>
  );
}
