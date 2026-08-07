import { Router, type IRouter } from "express";
import { db, operatorsTable } from "@workspace/db";
import { eq, ne } from "drizzle-orm";
import {
  CreateMyOperatorProfileBody,
  CreateOperatorBody,
  GetOperatorParams,
  GetOperatorResponse,
  ListOperatorsResponse,
  UpdateMyOperatorProfileBody,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../../middleware/requireAuth";

const router: IRouter = Router();

router.get("/operators", async (req, res): Promise<void> => {
  // Registration creates a placeholder operator row (location "TBD") so that
  // admin audit actions always have something to attach to. That row is not a
  // directory entry: it has no location, no capacity and no description, and
  // publishing it would put an empty listing beside researched companies.
  // An operator appears here once they have said where they are.
  const operators = await db
    .select()
    .from(operatorsTable)
    .where(ne(operatorsTable.location, "TBD"))
    .orderBy(operatorsTable.id);
  res.json(ListOperatorsResponse.parse(operators.map(op => ({
    ...op,
    created_at: op.created_at.toISOString(),
    certifications: op.certifications ?? [],
    verified_certifications: op.verified_certifications ?? [],
    cert_verified_at: (op.cert_verified_at as Record<string, string>) ?? {},
    source_urls: op.source_urls ?? [],
  }))));
});

router.post("/operators", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateOperatorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [op] = await db.insert(operatorsTable).values({
    ...parsed.data,
    certifications: parsed.data.certifications ?? [],
  }).returning();
  res.status(201).json(GetOperatorResponse.parse({ ...op, created_at: op.created_at.toISOString(), certifications: op.certifications ?? [] }));
});

// ── POST /operators/me ────────────────────────────────────────────────────────
// Creates a new operator profile linked to the authenticated user.
// Returns 409 if a profile already exists.

router.post("/operators/me", requireAuth, requireRole("operator", "admin"), async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  const [existing] = await db.select({ id: operatorsTable.id }).from(operatorsTable).where(eq(operatorsTable.user_id, userId)).limit(1);
  if (existing) {
    res.status(409).json({ error: "An operator profile already exists for your account" });
    return;
  }

  const parsed = CreateMyOperatorProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const {
    name, location, description, capacity_kg, price_per_kg,
    certifications, turnaround_days, available, website_url,
    country, city, food_market_focus, pharmaceutical_focus,
    contact_page_url, gps_lat, gps_lng, service_radius_km,
    contact_name, contact_email, phone,
  } = parsed.data;

  const [op] = await db.insert(operatorsTable).values({
    user_id: userId,
    name,
    location: location ?? "",
    description: description ?? null,
    capacity_kg: capacity_kg ?? 0,
    price_per_kg: price_per_kg ?? 0,
    certifications: certifications ?? [],
    turnaround_days: turnaround_days ?? 14,
    available: available ?? true,
    website_url: website_url ?? null,
    country: country ?? null,
    city: city ?? null,
    food_market_focus: food_market_focus ?? false,
    pharmaceutical_focus: pharmaceutical_focus ?? false,
    contact_page_url: contact_page_url ?? null,
    gps_lat: gps_lat ?? null,
    gps_lng: gps_lng ?? null,
    service_radius_km: service_radius_km ?? null,
    contact_name: contact_name ?? null,
    contact_email: contact_email ?? null,
    phone: phone ?? null,
  }).returning();

  res.status(201).json(GetOperatorResponse.parse({
    ...op,
    created_at: op.created_at.toISOString(),
    certifications: op.certifications ?? [],
    verified_certifications: op.verified_certifications ?? [],
    cert_verified_at: (op.cert_verified_at as Record<string, string>) ?? {},
    source_urls: op.source_urls ?? [],
  }));
});

// ── GET /operators/me ──────────────────────────────────────────────────────────
// Must be before /operators/:id to prevent "me" being treated as an ID.

router.get("/operators/me", requireAuth, requireRole("operator", "admin"), async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const [op] = await db.select().from(operatorsTable).where(eq(operatorsTable.user_id, userId)).limit(1);
  if (!op) {
    res.status(404).json({ error: "No operator profile linked to your account" });
    return;
  }
  res.json(GetOperatorResponse.parse({
    ...op,
    created_at: op.created_at.toISOString(),
    certifications: op.certifications ?? [],
    verified_certifications: op.verified_certifications ?? [],
    cert_verified_at: (op.cert_verified_at as Record<string, string>) ?? {},
    source_urls: op.source_urls ?? [],
  }));
});

// ── PUT /operators/me ─────────────────────────────────────────────────────────
// Allows operators to update their own profile.
// Admin-only fields (platform_fee_override, audit_status, verification_status,
// verified_certifications, stripe_*) are never touched by this route.

router.put("/operators/me", requireAuth, requireRole("operator", "admin"), async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  const [existing] = await db.select({ id: operatorsTable.id }).from(operatorsTable).where(eq(operatorsTable.user_id, userId)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "No operator profile linked to your account" });
    return;
  }

  const parsed = UpdateMyOperatorProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const {
    name, location, description, capacity_kg, price_per_kg,
    certifications, turnaround_days, available, website_url,
    country, city, food_market_focus, pharmaceutical_focus,
    contact_page_url, gps_lat, gps_lng, service_radius_km,
    map_status, contact_name, contact_email, phone, provider_types,
  } = parsed.data;

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (location !== undefined) updateData.location = location;
  if (description !== undefined) updateData.description = description;
  if (capacity_kg !== undefined) updateData.capacity_kg = capacity_kg;
  if (price_per_kg !== undefined) updateData.price_per_kg = price_per_kg;
  if (certifications !== undefined) updateData.certifications = certifications;
  if (turnaround_days !== undefined) updateData.turnaround_days = turnaround_days;
  if (available !== undefined) updateData.available = available;
  if (website_url !== undefined) updateData.website_url = website_url;
  if (country !== undefined) updateData.country = country;
  if (city !== undefined) updateData.city = city;
  if (food_market_focus !== undefined) updateData.food_market_focus = food_market_focus;
  if (pharmaceutical_focus !== undefined) updateData.pharmaceutical_focus = pharmaceutical_focus;
  if (contact_page_url !== undefined) updateData.contact_page_url = contact_page_url;
  if (gps_lat !== undefined) updateData.gps_lat = gps_lat;
  if (gps_lng !== undefined) updateData.gps_lng = gps_lng;
  if (service_radius_km !== undefined) updateData.service_radius_km = service_radius_km;
  if (map_status !== undefined) updateData.map_status = map_status ?? "active";
  if (contact_name !== undefined) updateData.contact_name = contact_name;
  if (contact_email !== undefined) updateData.contact_email = contact_email;
  if (phone !== undefined) updateData.phone = phone;
  if (provider_types !== undefined) updateData.provider_types = provider_types;

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "No updatable fields provided" });
    return;
  }

  const [updated] = await db
    .update(operatorsTable)
    .set(updateData)
    .where(eq(operatorsTable.user_id, userId))
    .returning();

  res.json(GetOperatorResponse.parse({
    ...updated,
    created_at: updated.created_at.toISOString(),
    certifications: updated.certifications ?? [],
    verified_certifications: updated.verified_certifications ?? [],
    cert_verified_at: (updated.cert_verified_at as Record<string, string>) ?? {},
    source_urls: updated.source_urls ?? [],
  }));
});

router.get("/operators/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetOperatorParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [op] = await db.select().from(operatorsTable).where(eq(operatorsTable.id, params.data.id));
  if (!op) {
    res.status(404).json({ error: "Operator not found" });
    return;
  }
  const parsed = GetOperatorResponse.parse({
    ...op,
    created_at: op.created_at.toISOString(),
    certifications: op.certifications ?? [],
    verified_certifications: op.verified_certifications ?? [],
    cert_verified_at: (op.cert_verified_at as Record<string, string>) ?? {},
    source_urls: op.source_urls ?? [],
  });
  res.json({ ...parsed, audit_status: op.audit_status });
});

// Public: returns just the audit status for a given operator (used on profile page)
router.get("/operators/:id/audit-status", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [op] = await db.select({ audit_status: operatorsTable.audit_status }).from(operatorsTable).where(eq(operatorsTable.id, id));
  if (!op) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ audit_status: op.audit_status });
});

export default router;
