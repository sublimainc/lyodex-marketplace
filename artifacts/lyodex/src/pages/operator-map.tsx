import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useListOperators } from "@workspace/api-client-react";
import { MapPin, ArrowRight, Info, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useLanguage } from "@/lib/i18n";
import { PageMotif } from "@/components/PageMotif";

/**
 * Operator map.
 *
 * Everything here comes from the operators table. Two things this page used to
 * do and no longer does:
 *
 *   1. It concatenated five invented European companies ("LyoLab France",
 *      "BioFreeze GmbH", …) with real database rows, complete with fabricated
 *      prices, capacities and star ratings.
 *   2. For any operator without a hardcoded coordinate it computed a position
 *      arithmetically — `43 + (id * 3.7) % 8`. A real company was therefore
 *      pinned to a place it has nothing to do with.
 *
 * Markers now come from `gps_lat` / `gps_lng` on the record. An operator with
 * no coordinates is listed but not placed, which is the honest handling: we
 * know they exist, we do not know precisely where.
 */

type Region = "all" | "ca" | "us" | "eu";

const EU_COUNTRIES = ["France", "Germany", "Switzerland", "Netherlands", "Belgium", "Italy", "Spain", "Sweden", "Denmark", "UK", "Poland", "Austria", "Ireland", "Portugal"];

export default function OperatorMap() {
  const { data: operators, isLoading } = useListOperators();
  const [region, setRegion] = useState<Region>("all");
  const [search, setSearch] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const { t } = useLanguage();
  const om = t.operatorMap;

  useEffect(() => { setMapReady(true); }, []);

  const regionOf = (op: { country?: string | null; location: string }): Region => {
    const country = (op.country ?? "").trim();
    if (country === "CA" || country === "Canada") return "ca";
    if (country === "US" || country === "USA" || country === "United States") return "us";
    if (EU_COUNTRIES.some(c => country.includes(c) || op.location.includes(c))) return "eu";
    // Fall back to the free-text location rather than guessing.
    return op.location.includes("Canada") ? "ca" : op.location.includes("USA") ? "us" : "all";
  };

  const all = (operators ?? []).map(op => ({ ...op, region: regionOf(op) }));

  const filtered = all.filter(op => {
    const matchRegion = region === "all" || op.region === region;
    const matchSearch = !search ||
      op.name.toLowerCase().includes(search.toLowerCase()) ||
      op.location.toLowerCase().includes(search.toLowerCase());
    return matchRegion && matchSearch;
  });

  // Only operators with real coordinates can be drawn.
  const mappable = filtered.filter(
    (op): op is typeof op & { gps_lat: number; gps_lng: number } =>
      typeof op.gps_lat === "number" && typeof op.gps_lng === "number",
  );
  const unplaced = filtered.length - mappable.length;

  const count = (r: Region) => all.filter(o => o.region === r).length;

  const REGION_TABS: [Region, string][] = [
    ["all", om.regionAll],
    ["ca", `CA ${count("ca")}`],
    ["us", `US ${count("us")}`],
    ["eu", `EU ${count("eu")}`],
  ];

  const center: [number, number] =
    region === "eu" ? [48, 10] : region === "ca" ? [56, -96] : region === "us" ? [38, -97] : [45, -40];
  const zoom = region === "all" ? 2 : region === "eu" ? 4 : 3;

  // Price and capacity are optional facts. A directory entry built from public
  // sources usually has neither, and rendering "$0/kg" would state a price the
  // company never quoted.
  const priceLabel = (v?: number | null) =>
    v && v > 0 ? `$${v}/kg` : om.priceNotDisclosed;
  const capacityLabel = (v?: number | null) =>
    v && v > 0 ? `${v} ${om.kgPerMonth}` : null;

  return (
    <div className="flex flex-col min-h-screen">
      <section className="bg-background border-b py-6 px-4 relative overflow-hidden">
        <PageMotif kind="chamber" />
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold tracking-tight mb-1">{om.title}</h1>
          <p className="text-muted-foreground text-sm mb-3">
            {all.length} {om.operatorsListed} &nbsp;·&nbsp;
            <span className="text-primary font-medium">{count("ca")} {om.inCanada}</span> &nbsp;·&nbsp;
            <span className="text-blue-500 font-medium">{count("us")} {om.inUS}</span> &nbsp;·&nbsp;
            <span className="text-emerald-600 font-medium">{count("eu")} {om.inEurope}</span>
          </p>

          <div className="inline-flex items-start gap-2 bg-muted/50 border rounded-lg px-3 py-2 text-xs text-muted-foreground max-w-3xl mb-4">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{om.sourceNote}</span>
          </div>

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
          </div>
        </div>
      </section>

      <section className="flex-1">
        <div className="flex h-[calc(100vh-15rem)]">
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
                {mappable.map(op => (
                  <CircleMarker
                    key={op.id}
                    center={[op.gps_lat, op.gps_lng]}
                    radius={8}
                    pathOptions={{ color: "white", fillColor: "#0F6E56", fillOpacity: 0.9, weight: 2 }}
                  >
                    <Popup>
                      <div className="text-sm min-w-[170px]">
                        <div className="font-bold mb-1">{op.name}</div>
                        <div className="text-gray-600 mb-1">{op.location}</div>
                        <div className="text-green-700 font-semibold">{priceLabel(op.price_per_kg)}</div>
                        {capacityLabel(op.capacity_kg) && (
                          <div className="text-gray-500">{capacityLabel(op.capacity_kg)}</div>
                        )}
                        {op.website_url && (
                          <a
                            href={op.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline text-xs mt-1 inline-block"
                          >
                            {om.visitWebsite}
                          </a>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            )}
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-lg p-3 text-xs border shadow-sm space-y-1.5 z-[1000] max-w-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary inline-block" /> {om.operatorsListed}
              </div>
              {unplaced > 0 && (
                <div className="text-muted-foreground text-[10px]">
                  {unplaced} {om.notPlaced}
                </div>
              )}
              <div className="text-muted-foreground text-[10px]">{om.legendNote}</div>
            </div>
          </div>

          <div className="w-full md:w-80 lg:w-96 overflow-y-auto border-l bg-background">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">{om.noOperators}</div>
            ) : (
              filtered.map(op => {
                const abbr = op.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <div key={op.id} className="flex items-center gap-3 p-4 border-b hover:bg-muted/40 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                      {abbr}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-sm truncate">{op.name}</span>
                        {op.verification_status === "verified" && (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" /> {op.location}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className={op.price_per_kg && op.price_per_kg > 0 ? "text-primary font-semibold" : ""}>
                          {priceLabel(op.price_per_kg)}
                        </span>
                        {capacityLabel(op.capacity_kg) && <span>{capacityLabel(op.capacity_kg)}</span>}
                      </div>
                    </div>
                    <Link href={`/operators/${op.id}`}>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </Link>
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
          <Link href="/register">
            <Button className="gap-2 font-semibold shrink-0">
              {om.joinAsOperator} <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
