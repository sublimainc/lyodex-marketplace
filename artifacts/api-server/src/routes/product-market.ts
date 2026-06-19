import { Router } from "express";
import { db, bidsTable, requestsTable } from "@workspace/db";
import { priceDataPointsTable, operatorProductsTable } from "@workspace/db/schema";
import { count, sql, eq, gte, and, desc } from "drizzle-orm";

const router = Router();

export type FDCategory =
  | "fruits" | "vegetables" | "dairy" | "powders"
  | "mushrooms" | "herbs_spices" | "candy_snacks"
  | "proteins" | "specialty" | "other";

export interface MicrobiologyTests {
  tpc: string;
  coliform: string;
  ecoli: string;
  salmonella: string;
  listeria: string;
  yeastMold: string;
  lab: string;
  testedAt: string;
}

export interface FDListing {
  id: string;
  title: string;
  titleFr: string;
  category: FDCategory;
  description: string;
  descriptionFr: string;
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
  microbiologyTests: MicrobiologyTests;
  certifications: string[];
  origin: string;
  packagingType: string;
  harvestDate: string;
  images: string[];
  sellerName: string;
  sellerCompany: string;
  sellerEmail: string;
  sellerPhone: string;
  isVerifiedSeller: boolean;
  isFeatured: boolean;
  status: "active" | "sold" | "pending";
  viewCount: number;
  createdAt: string;
}

const MOCK_LISTINGS: FDListing[] = [
  {
    id: "fdl-001",
    title: "Freeze-Dried Strawberry Powder",
    titleFr: "Poudre de fraise lyophilisée",
    category: "fruits",
    description: "Premium freeze-dried strawberry powder made from 100% Québec-grown strawberries. No additives, no fillers. Perfect for nutraceuticals, smoothie mixes, and food manufacturing. Batch tested and certified organic.",
    descriptionFr: "Poudre de fraise lyophilisée premium à base de fraises 100% québécoises. Sans additifs, sans charges. Idéale pour les nutraceutiques, mélanges smoothies et la fabrication alimentaire.",
    price: 28,
    currency: "CAD",
    negotiable: true,
    quantityAvailableKg: 350,
    minOrderKg: 5,
    city: "Saint-Hyacinthe",
    region: "QC",
    country: "CA",
    waterActivity: 0.08,
    shelfLifeMonths: 36,
    microbiologyTests: { tpc: "<500 CFU/g", coliform: "<10 CFU/g", ecoli: "Absent/25g", salmonella: "Absent/25g", listeria: "Absent/25g", yeastMold: "<50 CFU/g", lab: "Laboratoire A2C, Montréal", testedAt: "2025-11-15" },
    certifications: ["Organic", "HACCP", "CFIA"],
    origin: "Québec, Canada",
    packagingType: "25kg kraft bags with inner poly liner",
    harvestDate: "2025-10-01",
    images: [],
    sellerName: "Marie-Claude Tremblay",
    sellerCompany: "Lyophilisation Laurentides Inc.",
    sellerEmail: "mc@lyo-laurentides.ca",
    sellerPhone: "+1 (450) 555-0182",
    isVerifiedSeller: true,
    isFeatured: true,
    status: "active",
    viewCount: 142,
    createdAt: "2025-12-01T09:00:00Z",
  },
  {
    id: "fdl-002",
    title: "Lime Powder (Freeze-Dried)",
    titleFr: "Poudre de lime lyophilisée",
    category: "powders",
    description: "Concentrated freeze-dried lime powder with intense citrus flavor. Processed in Ontario from imported Mexican limes. Ideal for beverage manufacturing, seasoning blends, and confectionery applications. Moisture <2%.",
    descriptionFr: "Poudre de lime lyophilisée concentrée avec saveur citronnée intense. Transformée en Ontario à partir de limes mexicaines importées. Idéale pour les boissons, mélanges d'assaisonnement et confiserie.",
    price: 42,
    currency: "CAD",
    negotiable: false,
    quantityAvailableKg: 180,
    minOrderKg: 10,
    city: "Mississauga",
    region: "ON",
    country: "CA",
    waterActivity: 0.05,
    shelfLifeMonths: 48,
    microbiologyTests: { tpc: "<200 CFU/g", coliform: "<10 CFU/g", ecoli: "Absent/25g", salmonella: "Absent/25g", listeria: "Absent/25g", yeastMold: "<20 CFU/g", lab: "SGS Canada, Mississauga", testedAt: "2025-10-20" },
    certifications: ["HACCP", "CFIA"],
    origin: "Mexico (processed in Ontario, Canada)",
    packagingType: "20kg aluminum-lined kraft bags",
    harvestDate: "2025-09-15",
    images: [],
    sellerName: "Raj Patel",
    sellerCompany: "Great Lakes Freeze-Dry Co.",
    sellerEmail: "raj@greatlakesfd.com",
    sellerPhone: "+1 (905) 555-0241",
    isVerifiedSeller: false,
    isFeatured: false,
    status: "active",
    viewCount: 78,
    createdAt: "2025-12-05T14:00:00Z",
  },
  {
    id: "fdl-003",
    title: "Freeze-Dried Yogurt Powder",
    titleFr: "Poudre de yogourt lyophilisée",
    category: "dairy",
    description: "Plain freeze-dried yogurt powder from BC dairy farms. Retains active probiotic cultures (Lactobacillus bulgaricus, Streptococcus thermophilus). GMP certified. Excellent for supplement capsules, sports nutrition, and infant formula applications.",
    descriptionFr: "Poudre de yogourt lyophilisé nature issue de fermes laitières de CB. Conserve les cultures probiotiques actives. Certifié BPF. Excellent pour les suppléments, nutrition sportive et formules infantiles.",
    price: 35,
    currency: "CAD",
    negotiable: true,
    quantityAvailableKg: 220,
    minOrderKg: 5,
    city: "Abbotsford",
    region: "BC",
    country: "CA",
    waterActivity: 0.11,
    shelfLifeMonths: 24,
    microbiologyTests: { tpc: "<1000 CFU/g", coliform: "<10 CFU/g", ecoli: "Absent/25g", salmonella: "Absent/25g", listeria: "Absent/25g", yeastMold: "<100 CFU/g", lab: "Pacific Food Laboratories, Surrey BC", testedAt: "2025-11-01" },
    certifications: ["HACCP", "GMP", "CFIA"],
    origin: "Fraser Valley dairy farms, BC",
    packagingType: "15kg food-grade sealed pails",
    harvestDate: "2025-10-20",
    images: [],
    sellerName: "Diane Vachon",
    sellerCompany: "Pacific Cryo Foods Ltd.",
    sellerEmail: "d.vachon@pacificcryo.ca",
    sellerPhone: "+1 (604) 555-0317",
    isVerifiedSeller: true,
    isFeatured: false,
    status: "active",
    viewCount: 95,
    createdAt: "2025-12-08T10:30:00Z",
  },
  {
    id: "fdl-004",
    title: "Shiitake Mushroom Powder",
    titleFr: "Poudre de champignon shiitake",
    category: "mushrooms",
    description: "100% organic shiitake mushroom powder grown and freeze-dried in Ontario. Rich in beta-glucans and umami compounds. Suitable for functional food, nutraceuticals, and premium culinary applications. Full traceability from farm to bag.",
    descriptionFr: "Poudre de shiitake 100% bio cultivé et lyophilisé en Ontario. Riche en bêta-glucanes et composés umami. Adapté aux aliments fonctionnels, nutraceutiques et applications culinaires premium.",
    price: 85,
    currency: "CAD",
    negotiable: true,
    quantityAvailableKg: 95,
    minOrderKg: 2,
    city: "Guelph",
    region: "ON",
    country: "CA",
    waterActivity: 0.06,
    shelfLifeMonths: 36,
    microbiologyTests: { tpc: "<300 CFU/g", coliform: "Absent/g", ecoli: "Absent/25g", salmonella: "Absent/25g", listeria: "Absent/25g", yeastMold: "<50 CFU/g", lab: "A&L Canada Laboratories, London ON", testedAt: "2025-11-10" },
    certifications: ["Organic", "HACCP", "CFIA"],
    origin: "Ontario, Canada (locally grown)",
    packagingType: "10kg kraft bags with oxygen absorber",
    harvestDate: "2025-10-05",
    images: [],
    sellerName: "Tomás Nguyen",
    sellerCompany: "OntarioGrow Myco Inc.",
    sellerEmail: "tomas@ontariomyco.ca",
    sellerPhone: "+1 (519) 555-0488",
    isVerifiedSeller: true,
    isFeatured: true,
    status: "active",
    viewCount: 211,
    createdAt: "2025-11-28T08:00:00Z",
  },
  {
    id: "fdl-005",
    title: "Freeze-Dried Apple Slices (Bulk)",
    titleFr: "Tranches de pomme lyophilisées (vrac)",
    category: "fruits",
    description: "Crispy freeze-dried Gala apple slices from the Okanagan Valley. No sugar added, no sulfites. Uniform 5mm slices, bright color, full flavor retention. Ideal for trail mix manufacturers, cereal brands, and food service distributors.",
    descriptionFr: "Tranches de pomme Gala lyophilisées croquantes de la vallée de l'Okanagan. Sans sucre ajouté, sans sulfites. Tranches uniformes de 5mm, couleur vive, saveur complète. Idéal pour mélanges trail, céréales et distribution alimentaire.",
    price: 22,
    currency: "CAD",
    negotiable: false,
    quantityAvailableKg: 500,
    minOrderKg: 10,
    city: "Lethbridge",
    region: "AB",
    country: "CA",
    waterActivity: 0.09,
    shelfLifeMonths: 30,
    microbiologyTests: { tpc: "<800 CFU/g", coliform: "<10 CFU/g", ecoli: "Absent/25g", salmonella: "Absent/25g", listeria: "Absent/25g", yeastMold: "<100 CFU/g", lab: "Maxxam Analytics, Edmonton AB", testedAt: "2025-10-30" },
    certifications: ["HACCP", "CFIA"],
    origin: "Okanagan Valley, BC — Gala variety",
    packagingType: "25kg corrugated bulk boxes with poly bag insert",
    harvestDate: "2025-09-25",
    images: [],
    sellerName: "Brett Callahan",
    sellerCompany: "Prairie Freeze Corp.",
    sellerEmail: "brett@prairiefreeze.ca",
    sellerPhone: "+1 (403) 555-0555",
    isVerifiedSeller: false,
    isFeatured: false,
    status: "active",
    viewCount: 63,
    createdAt: "2025-12-10T11:00:00Z",
  },
  {
    id: "fdl-006",
    title: "Freeze-Dried Candy Mix",
    titleFr: "Mélange de bonbons lyophilisés",
    category: "candy_snacks",
    description: "Freeze-dried assorted candy (skittle-style, sour gummy, and hard candy varieties). Processed in Quebec from US-sourced candy. Each candy puffs up to 3× original size with intensified flavor. Very popular for novelty food retail and online food brands. Bulk only.",
    descriptionFr: "Mélange de bonbons lyophilisés (type skittles, gummies sucrés-acides et bonbons durs). Transformé au Québec. Chaque bonbon gonfle jusqu'à 3× sa taille avec saveur intensifiée. Très populaire pour marques alimentaires en ligne. En vrac uniquement.",
    price: 55,
    currency: "CAD",
    negotiable: true,
    quantityAvailableKg: 120,
    minOrderKg: 5,
    city: "Laval",
    region: "QC",
    country: "CA",
    waterActivity: 0.12,
    shelfLifeMonths: 18,
    microbiologyTests: { tpc: "<2000 CFU/g", coliform: "<100 CFU/g", ecoli: "Absent/25g", salmonella: "Absent/25g", listeria: "Absent/25g", yeastMold: "<200 CFU/g", lab: "Laboratoire A2C, Montréal", testedAt: "2025-11-20" },
    certifications: ["HACCP"],
    origin: "USA candy, processed in Québec, Canada",
    packagingType: "10kg resealable mylar bulk bags",
    harvestDate: "2025-11-01",
    images: [],
    sellerName: "Félix Boisvert",
    sellerCompany: "Cryo Candy QC",
    sellerEmail: "felix@cryocandy.ca",
    sellerPhone: "+1 (514) 555-0662",
    isVerifiedSeller: false,
    isFeatured: false,
    status: "active",
    viewCount: 187,
    createdAt: "2025-12-02T16:00:00Z",
  },
  {
    id: "fdl-007",
    title: "Organic Spinach Powder",
    titleFr: "Poudre d'épinards biologiques",
    category: "vegetables",
    description: "Ultra-fine organic spinach powder from Ontario farms. Vibrant green color retained through rapid freeze-drying. High in iron, folate, and chlorophyll. GMP and organic certified. Used widely in green supplements, protein powders, and functional beverages.",
    descriptionFr: "Poudre d'épinards bio ultra-fine de fermes ontariennes. Couleur verte vive retenue par lyophilisation rapide. Riche en fer, folate et chlorophylle. Certifié BPF et bio. Utilisée dans les suppléments verts, poudres protéinées et boissons fonctionnelles.",
    price: 18,
    currency: "CAD",
    negotiable: false,
    quantityAvailableKg: 400,
    minOrderKg: 20,
    city: "Hamilton",
    region: "ON",
    country: "CA",
    waterActivity: 0.04,
    shelfLifeMonths: 48,
    microbiologyTests: { tpc: "<100 CFU/g", coliform: "Absent/g", ecoli: "Absent/25g", salmonella: "Absent/25g", listeria: "Absent/25g", yeastMold: "<10 CFU/g", lab: "SGS Canada, Guelph", testedAt: "2025-10-25" },
    certifications: ["Organic", "HACCP", "GMP", "CFIA"],
    origin: "Ontario, Canada — certified organic farms",
    packagingType: "25kg sealed HDPE drums",
    harvestDate: "2025-09-10",
    images: [],
    sellerName: "Amara Osei",
    sellerCompany: "Ontario BioNutrients Inc.",
    sellerEmail: "amara@ontariobionut.ca",
    sellerPhone: "+1 (905) 555-0791",
    isVerifiedSeller: true,
    isFeatured: true,
    status: "active",
    viewCount: 304,
    createdAt: "2025-11-25T07:00:00Z",
  },
  {
    id: "fdl-008",
    title: "Whey Protein Isolate — Freeze-Dried",
    titleFr: "Isolat de protéines de lactosérum lyophilisé",
    category: "proteins",
    description: "Canadian-sourced whey protein isolate (WPI 90%) processed through freeze-drying for maximum bioavailability. No heat treatment — enzymes and peptides preserved. GMP certified. Suitable for sports nutrition, clinical nutrition, and pharmaceutical-adjacent applications.",
    descriptionFr: "Isolat de protéines de lactosérum (WPI 90%) d'origine canadienne traité par lyophilisation pour une biodisponibilité maximale. Sans traitement thermique — enzymes et peptides préservés. Certifié BPF.",
    price: 48,
    currency: "CAD",
    negotiable: true,
    quantityAvailableKg: 300,
    minOrderKg: 25,
    city: "Winnipeg",
    region: "MB",
    country: "CA",
    waterActivity: 0.07,
    shelfLifeMonths: 36,
    microbiologyTests: { tpc: "<500 CFU/g", coliform: "<10 CFU/g", ecoli: "Absent/25g", salmonella: "Absent/25g", listeria: "Absent/25g", yeastMold: "<50 CFU/g", lab: "Bureau Veritas, Winnipeg MB", testedAt: "2025-11-05" },
    certifications: ["HACCP", "GMP", "CFIA"],
    origin: "Canadian dairy — Manitoba & Saskatchewan",
    packagingType: "25kg PE-lined kraft bags",
    harvestDate: "2025-10-10",
    images: [],
    sellerName: "Chris Melnyk",
    sellerCompany: "Prairie Protein Solutions Ltd.",
    sellerEmail: "chris@prairieprotein.ca",
    sellerPhone: "+1 (204) 555-0863",
    isVerifiedSeller: true,
    isFeatured: false,
    status: "active",
    viewCount: 88,
    createdAt: "2025-12-03T12:00:00Z",
  },
  {
    id: "fdl-009",
    title: "Organic Blueberry Powder (US)",
    titleFr: "Poudre de bleuet biologique (É.-U.)",
    category: "fruits",
    description: "USDA Organic freeze-dried blueberry powder from Washington State. Highbush variety, peak-season harvest. Deep purple color, intense berry flavor. No fillers, no maltodextrin. FDA registered facility. Popular with superfood brands and premium supplements.",
    descriptionFr: "Poudre de bleuet lyophilisé USDA Biologique de l'État de Washington. Variété highbush, récolte de saison. Couleur pourpre intense, saveur de baie. Sans charges ni maltodextrine. Établissement enregistré FDA.",
    price: 65,
    currency: "USD",
    negotiable: false,
    quantityAvailableKg: 75,
    minOrderKg: 5,
    city: "Bellingham",
    region: "WA",
    country: "US",
    waterActivity: 0.06,
    shelfLifeMonths: 36,
    microbiologyTests: { tpc: "<300 CFU/g", coliform: "<10 CFU/g", ecoli: "Absent/25g", salmonella: "Absent/25g", listeria: "Absent/25g", yeastMold: "<30 CFU/g", lab: "Eurofins, Seattle WA", testedAt: "2025-11-12" },
    certifications: ["USDA Organic", "HACCP", "FDA"],
    origin: "Washington State, USA — highbush variety",
    packagingType: "10kg kraft bags with moisture barrier",
    harvestDate: "2025-08-20",
    images: [],
    sellerName: "Karen Walsh",
    sellerCompany: "Cascade Cryo Foods LLC",
    sellerEmail: "karen@cascadecryo.com",
    sellerPhone: "+1 (360) 555-0944",
    isVerifiedSeller: true,
    isFeatured: false,
    status: "active",
    viewCount: 52,
    createdAt: "2025-12-07T15:00:00Z",
  },
];

router.get("/product-market", async (req, res): Promise<void> => {
  const { id, search, category, country, minPrice, maxPrice, maxAW, certification, sort } = req.query as Record<string, string>;

  // Fetch approved DB submissions and convert to FDListing shape
  const dbRows = await db
    .select()
    .from(operatorProductsTable)
    .where(and(eq(operatorProductsTable.approval_status, "approved"), eq(operatorProductsTable.available, true)))
    .orderBy(desc(operatorProductsTable.created_at));

  const dbListings: FDListing[] = dbRows.map(r => ({
    id: `db-${r.id}`,
    title: r.name,
    titleFr: r.name,
    category: (r.material_type as FDCategory) ?? "other",
    description: r.description ?? "",
    descriptionFr: r.description ?? "",
    price: r.price_per_unit,
    currency: "CAD",
    negotiable: false,
    quantityAvailableKg: r.weight_kg,
    minOrderKg: r.moq,
    city: "",
    region: "",
    country: "CA",
    waterActivity: r.moisture_pct ?? 0.1,
    shelfLifeMonths: 24,
    microbiologyTests: { tpc: "", coliform: "", ecoli: "", salmonella: "", listeria: "", yeastMold: "", lab: "", testedAt: "" },
    certifications: [],
    origin: "",
    packagingType: "",
    harvestDate: "",
    images: [],
    sellerName: "",
    sellerCompany: r.operator_name,
    sellerEmail: r.contact_email,
    sellerPhone: "",
    isVerifiedSeller: false,
    isFeatured: false,
    status: "active",
    viewCount: 0,
    createdAt: r.created_at.toISOString(),
  }));

  if (id) {
    const listing = [...MOCK_LISTINGS, ...dbListings].find(l => l.id === id);
    if (!listing) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ listing });
    return;
  }

  let results = [...MOCK_LISTINGS, ...dbListings];

  if (search) {
    const q = search.toLowerCase();
    results = results.filter(l =>
      l.title.toLowerCase().includes(q) ||
      l.description.toLowerCase().includes(q) ||
      l.category.includes(q) ||
      l.sellerCompany.toLowerCase().includes(q)
    );
  }
  if (category && category !== "all") results = results.filter(l => l.category === category);
  if (country && country !== "all") results = results.filter(l => l.country === country);
  const min = parseFloat(minPrice || "0");
  const max = parseFloat(maxPrice || "99999");
  results = results.filter(l => l.price >= min && l.price <= max);
  if (maxAW) results = results.filter(l => l.waterActivity <= parseFloat(maxAW));
  if (certification) results = results.filter(l => l.certifications.some(c => c.toLowerCase().includes(certification.toLowerCase())));

  const sortBy = sort || "newest";
  if (sortBy === "newest") results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  else if (sortBy === "price_asc") results.sort((a, b) => a.price - b.price);
  else if (sortBy === "price_desc") results.sort((a, b) => b.price - a.price);
  else if (sortBy === "aw_asc") results.sort((a, b) => a.waterActivity - b.waterActivity);

  results.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));

  res.json({ listings: results, total: results.length });
});

// ─── GET /market/insights ─────────────────────────────────────────────────────
// Public aggregated & anonymised market intelligence data.
// Category benchmarks only appear when ≥ 3 independent observations exist.
router.get("/market/insights", async (_req, res) => {
  try {
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

    const [[{ total_bids }], [{ total_requests }], categoryRows, bidTrend, rfqTrend] = await Promise.all([
      db.select({ total_bids: count() }).from(bidsTable),
      db.select({ total_requests: count() }).from(requestsTable),
      db.select({
          category:     priceDataPointsTable.category,
          cnt:          count(),
          avg_price:    sql<number>`round(avg(${priceDataPointsTable.quoted_price})::numeric, 2)`,
          min_price:    sql<number>`round(min(${priceDataPointsTable.quoted_price})::numeric, 2)`,
          max_price:    sql<number>`round(max(${priceDataPointsTable.quoted_price})::numeric, 2)`,
          median_price: sql<number>`round(percentile_cont(0.5) within group (order by ${priceDataPointsTable.quoted_price})::numeric, 2)`,
        })
        .from(priceDataPointsTable)
        .where(eq(priceDataPointsTable.included_in_market_intelligence, true))
        .groupBy(priceDataPointsTable.category)
        .having(sql`count(*) >= 3`),
      db.select({ month: sql<string>`to_char(${bidsTable.created_at}, 'YYYY-MM')`, cnt: count() })
        .from(bidsTable)
        .where(gte(bidsTable.created_at, sixMonthsAgo))
        .groupBy(sql`to_char(${bidsTable.created_at}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${bidsTable.created_at}, 'YYYY-MM')`),
      db.select({ month: sql<string>`to_char(${requestsTable.created_at}, 'YYYY-MM')`, cnt: count() })
        .from(requestsTable)
        .where(gte(requestsTable.created_at, sixMonthsAgo))
        .groupBy(sql`to_char(${requestsTable.created_at}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${requestsTable.created_at}, 'YYYY-MM')`),
    ]);

    return res.json({
      total_bids:    Number(total_bids),
      total_requests: Number(total_requests),
      category_benchmarks: categoryRows.map(r => ({
        category:     r.category,
        count:        Number(r.cnt),
        avg_price:    Number(r.avg_price),
        min_price:    Number(r.min_price),
        max_price:    Number(r.max_price),
        median_price: Number(r.median_price),
      })),
      bid_trend: bidTrend.map(r => ({ month: r.month, count: Number(r.cnt) })),
      rfq_trend: rfqTrend.map(r => ({ month: r.month, count: Number(r.cnt) })),
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch market insights" });
  }
});

router.post("/product-market", async (req, res): Promise<void> => {
  try {
    const body = req.body as Partial<FDListing>;
    const [inserted] = await db.insert(operatorProductsTable).values({
      user_id: null,
      operator_name: body.sellerCompany ?? "",
      name: body.title ?? "Untitled",
      material_type: body.category ?? "other",
      weight_kg: body.quantityAvailableKg ?? 0,
      moisture_pct: body.waterActivity ?? null,
      price_per_unit: body.price ?? 0,
      moq: Math.round(body.minOrderKg ?? 1),
      available: true,
      description: body.description ?? "",
      contact_email: body.sellerEmail ?? "",
      approval_status: "pending",
    }).returning();
    res.status(201).json({ listing: { ...inserted, id: `db-${inserted.id}` }, success: true });
  } catch {
    res.status(400).json({ error: "Invalid request body" });
  }
});

export default router;
