import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useListOperators } from "@workspace/api-client-react";
import { MapPin, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useLanguage } from "@/lib/i18n";

type Region = "all" | "ca" | "us" | "eu";

const CA_PROVINCES = ["ON", "QC", "BC", "AB", "MB", "SK", "NS", "NB", "Canada"];
const EU_COUNTRIES = ["France", "Germany", "Switzerland", "Netherlands", "Belgium", "Italy", "Spain", "Sweden", "Denmark", "UK", "Poland", "Austria"];

const EU_OPERATORS = [
  { id: 101, name: "LyoLab France", location: "Lyon, France", lat: 45.75, lng: 4.83, price_per_kg: 11.2, capacity_kg: 600, rating: 4.7, review_count: 12, available: true, certifications: ["HACCP", "EU GMP"] },
  { id: 102, name: "BioFreeze GmbH", location: "Munich, Germany", lat: 48.14, lng: 11.58, price_per_kg: 13.5, capacity_kg: 450, rating: 4.8, review_count: 9, available: true, certifications: ["EU GMP", "ISO 13485"] },
  { id: 103, name: "CrioMed AG", location: "Basel, Switzerland", lat: 47.56, lng: 7.59, price_per_kg: 18.9, capacity_kg: 200, rating: 4.9, review_count: 22, available: false, certifications: ["GMP", "ISO", "FDA"] },
  { id: 104, name: "FrioPharma NL", location: "Rotterdam, Netherlands", lat: 51.92, lng: 4.48, price_per_kg: 12.1, capacity_kg: 800, rating: 4.5, review_count: 7, available: true, certifications: ["EU GMP", "HACCP"] },
  { id: 105, name: "ItalFreeze SRL", location: "Turin, Italy", lat: 45.07, lng: 7.69, price_per_kg: 10.8, capacity_kg: 700, rating: 4.3, review_count: 5, available: true, certifications: ["HACCP", "EU GMP", "Organic"] },
];

const DB_COORDS: Record<number, { lat: number; lng: number }> = {
  1: { lat: 44.48, lng: -73.21 },
  2: { lat: 43.59, lng: -79.64 },
  3: { lat: 49.28, lng: -123.12 },
  4: { lat: 49.90, lng: -97.14 },
  5: { lat: 44.65, lng: -63.57 },
  6: { lat: 42.36, lng: -71.06 },
  7: { lat: 41.50, lng: -81.69 },
  8: { lat: 45.42, lng: -75.69 },
};

export default function OperatorMap() {
  const { data: dbOperators, isLoading } = useListOperators();
  const [region, setRegion] = useState<Region>("all");
  const [search, setSearch] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const { t } = useLanguage();
  const om = t.operatorMap;

  useEffect(() => { setMapReady(true); }, []);

  const isCanada = (loc: string) => CA_PROVINCES.some(p => loc.includes(p));
  const isEU = (loc: string) => EU_COUNTRIES.some(c => loc.includes(c));

  const dbMapped = (dbOperators ?? []).map(op => ({
    ...op,
    lat: DB_COORDS[op.id]?.lat ?? 43 + (op.id * 3.7) % 8,
    lng: DB_COORDS[op.id]?.lng ?? -80 + (op.id * 4.1) % 20,
    region: isCanada(op.location) ? "ca" : "us",
  }));

  const euMapped = EU_OPERATORS.map(op => ({ ...op, region: "eu" as const }));
  const allOperators = [...dbMapped, ...euMapped];

  const filtered = allOperators.filter(op => {
    const matchRegion = region === "all" || op.region === region;
    const matchSearch = !search ||
      op.name.toLowerCase().includes(search.toLowerCase()) ||
      op.location.toLowerCase().includes(search.toLowerCase());
    return matchRegion && matchSearch;
  });

  const caCount = dbMapped.filter(o => o.region === "ca").length;
  const usCount = dbMapped.filter(o => o.region === "us").length;
  const euCount = euMapped.length;

  const REGION_TABS: [Region, string][] = [
    ["all", om.regionAll],
    ["ca", `CA ${caCount}`],
    ["us", `US ${usCount}`],
    ["eu", `EU ${euCount}`],
  ];

  const center: [number, number] = region === "eu" ? [48, 10] : region === "ca" ? [56, -96] : region === "us" ? [38, -97] : [30, -30];
  const zoom = region === "all" ? 2 : region === "eu" ? 5 : 4;

  return (
    <div className="flex flex-col min-h-screen">
      <section className="bg-background border-b py-6 px-4">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold tracking-tight mb-1">
            {om.title}
          </h1>
          <p className="text-muted-foreground text-sm mb-4">
            {(dbOperators?.length ?? 0) + euCount} {om.verifiedOperators} &nbsp;·&nbsp;
            <span className="text-primary font-medium">{caCount} {om.inCanada}</span> &nbsp;·&nbsp;
            <span className="text-blue-500 font-medium">{usCount} {om.inUS}</span> &nbsp;·&nbsp;
            <span className="text-emerald-600 font-medium">{euCount} {om.inEurope}</span>
          </p>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={om.searchPlaceholder}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <div className="flex rounded-md border overflow-hidden text-sm font-medium">
              {REGION_TABS.map(([code, label], i) => (
                <button
                  key={code}
                  onClick={() => setRegion(code)}
                  className={`px-3 py-1.5 transition-colors ${region === code ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"} ${i > 0 ? "border-l" : ""}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 ml-auto flex-wrap">
              {[om.availableNowFilter, "GMP", "EU GMP", "Organic"].map(tag => (
                <button key={tag} className="text-xs border rounded-full px-3 py-1.5 hover:border-primary hover:text-primary transition-colors text-muted-foreground">
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="flex-1">
        <div className="flex h-[calc(100vh-13rem)]">
          <div className="flex-1 hidden md:block relative">
            {mapReady && (
              <MapContainer
                key={`${region}-${center.join(",")}-${zoom}`}
                center={center}
                zoom={zoom}
                style={{ height: "100%", width: "100%" }}
                zoomControl={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {filtered.map(op => (
                  <CircleMarker
                    key={op.id}
                    center={[op.lat, op.lng]}
                    radius={8}
                    pathOptions={{
                      color: "white",
                      fillColor: op.available ? "#10b981" : "#ef4444",
                      fillOpacity: 0.9,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div className="text-sm min-w-[160px]">
                        <div className="font-bold mb-1">{op.name}</div>
                        <div className="text-gray-600 mb-1 flex items-center gap-1">
                          <span>{op.location}</span>
                        </div>
                        <div className="text-green-700 font-semibold">${op.price_per_kg}/kg</div>
                        <div className="text-gray-500">{op.capacity_kg} {om.kgPerMonth}</div>
                        <div className={`mt-1 text-xs font-semibold ${op.available ? "text-emerald-600" : "text-red-500"}`}>
                          {op.available ? om.available : om.booked}
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            )}
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-lg p-3 text-xs border shadow-sm space-y-1.5 z-[1000]">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> {om.available}</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> {om.booked}</div>
              <div className="flex items-center gap-2 text-muted-foreground text-[10px]">{om.legendNote}</div>
            </div>
          </div>

          <div className="w-full md:w-80 lg:w-96 overflow-y-auto border-l bg-background">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                {om.noOperators}
              </div>
            ) : (
              filtered.map(op => {
                const abbr = op.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                const isEuOp = op.id > 100;
                return (
                  <div key={op.id} className="flex items-center gap-3 p-4 border-b hover:bg-muted/40 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                      {abbr}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-sm truncate">{op.name}</span>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${op.available ? "bg-emerald-500" : "bg-red-400"}`} />
                        {isEuOp && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1 py-0.5 rounded">EU</span>}
                      </div>
                      <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" /> {op.location}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="text-primary font-semibold">${op.price_per_kg}/kg</span>
                        <span>{op.capacity_kg} {om.kgPerMonth}</span>
                        <span className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />{op.rating}</span>
                      </div>
                    </div>
                    {!isEuOp && (
                      <Link href={`/operators/${op.id}`}>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </Link>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      <section className="bg-[#0a1628] text-white py-8 text-center">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 max-w-3xl">
          <div className="text-left">
            <h3 className="font-bold text-lg">{om.ctaTitle}</h3>
            <p className="text-gray-400 text-sm">{om.ctaSubtitle}</p>
          </div>
          <Link href="/request">
            <Button className="gap-2 font-semibold shrink-0">
              {om.joinAsOperator} <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
