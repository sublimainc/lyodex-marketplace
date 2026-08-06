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
    const listing = dbListings.find(l => l.id === id);
    if (!listing) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ listing });
    return;
  }

  let results = [...dbListings];

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
