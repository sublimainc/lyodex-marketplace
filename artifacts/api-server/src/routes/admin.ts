import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, operatorsTable, requestsTable, bidsTable, activityTable, requestMessagesTable, systemAlertsTable, adminAuditLogsTable, disputesTable, priceDataPointsTable, operatorListingsTable, operatorProductsTable, listingNotificationsTable, manufacturersTable, machineryListingsTable, insertMachineryListingSchema, reportSnapshotsTable, siteSettingsTable } from "@workspace/db/schema";
import { eq, desc, count, sql, gte, lte, and, isNull, ilike, or, inArray, type SQL } from "drizzle-orm";
import { sendDisputeResolvedEmail, sendListingApprovedEmail, sendListingRejectedEmail } from "../lib/email";
import { requireAuth, requireRole, requireAdminCapability } from "../middleware/requireAuth";
import { logger } from "../lib/logger";
import { historicalFeeRate } from "../lib/fees";
import { z } from "zod/v4";

const router: IRouter = Router();
// Guard stacks by capability. `adminOnly` remains the read-level baseline that
// every admin sub-role satisfies; the others narrow access to admins whose
// sub-role carries that capability. An admin with a null sub-role keeps full
// access (see lib/adminPermissions.ts) so pre-existing accounts are unaffected.
const adminOnly = [requireAuth, requireRole("admin"), requireAdminCapability("read")];
const adminModerate = [requireAuth, requireRole("admin"), requireAdminCapability("moderate")];
const adminFinance = [requireAuth, requireRole("admin"), requireAdminCapability("finance")];
const adminManage = [requireAuth, requireRole("admin"), requireAdminCapability("manage_admins")];

// ─── Admin Zod validation schemas ────────────────────────────────────────────

const adminOperatorCreateSchema = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
  description: z.string().nullish(),
  capacity_kg: z.coerce.number().default(0),
  price_per_kg: z.coerce.number().default(0),
  turnaround_days: z.coerce.number().int().default(14),
  certifications: z.array(z.string()).default([]),
  available: z.boolean().default(true),
  country: z.string().nullish(),
  city: z.string().nullish(),
  website_url: z.string().nullish(),
  contact_page_url: z.string().nullish(),
  role: z.string().default("operator"),
  food_market_focus: z.boolean().default(false),
  pharmaceutical_focus: z.boolean().default(false),
  platform_fee_override: z.string().nullish(),
  gps_lat: z.coerce.number().nullish(),
  gps_lng: z.coerce.number().nullish(),
  service_radius_km: z.coerce.number().int().nullish(),
  map_status: z.string().default("active"),
  contact_name: z.string().nullish(),
  contact_email: z.string().nullish(),
  phone: z.string().nullish(),
});

const adminManufacturerCreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  tagline: z.string().nullish(),
  description: z.string().nullish(),
  website_url: z.string().nullish(),
  logo_url: z.string().nullish(),
  country: z.string().nullish(),
  city: z.string().nullish(),
  founded_year: z.coerce.number().int().nullish(),
  specialties: z.array(z.string()).default([]),
  market_focus: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
  production_capabilities: z.string().nullish(),
  contact_name: z.string().nullish(),
  contact_email: z.string().nullish(),
  phone: z.string().nullish(),
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
});

const adminMapEntryCreateSchema = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
  city: z.string().nullish(),
  country: z.string().nullish(),
  gps_lat: z.coerce.number().nullish(),
  gps_lng: z.coerce.number().nullish(),
  service_radius_km: z.coerce.number().int().nullish(),
  map_status: z.string().default("active"),
  contact_name: z.string().nullish(),
  contact_email: z.string().nullish(),
  phone: z.string().nullish(),
});

// — Update schemas (all fields optional, no defaults — avoids clobbering unchanged fields)
const adminOperatorUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  capacity_kg: z.coerce.number().optional(),
  price_per_kg: z.coerce.number().optional(),
  turnaround_days: z.coerce.number().int().optional(),
  certifications: z.array(z.string()).optional(),
  available: z.boolean().optional(),
  country: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  website_url: z.string().nullable().optional(),
  contact_page_url: z.string().nullable().optional(),
  role: z.string().optional(),
  food_market_focus: z.boolean().optional(),
  pharmaceutical_focus: z.boolean().optional(),
  platform_fee_override: z.string().nullable().optional(),
  gps_lat: z.coerce.number().nullable().optional(),
  gps_lng: z.coerce.number().nullable().optional(),
  service_radius_km: z.coerce.number().int().nullable().optional(),
  map_status: z.string().optional(),
  contact_name: z.string().nullable().optional(),
  contact_email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  audit_status: z.string().optional(),
  verification_status: z.string().optional(),
});

const adminManufacturerUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().optional(),
  tagline: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  website_url: z.string().nullable().optional(),
  logo_url: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  founded_year: z.coerce.number().int().nullable().optional(),
  specialties: z.array(z.string()).optional(),
  market_focus: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  production_capabilities: z.string().nullable().optional(),
  contact_name: z.string().nullable().optional(),
  contact_email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
});

const adminMachineryUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  category: z.string().optional(),
  listing_status: z.string().optional(),
  condition: z.string().optional(),
  description: z.string().nullable().optional(),
  price: z.coerce.number().nullable().optional(),
  currency: z.string().optional(),
  manufacturer_name: z.string().nullable().optional(),
  model_number: z.string().nullable().optional(),
  year_manufactured: z.coerce.number().int().nullable().optional(),
  technical_specs: z.record(z.string(), z.string()).optional(),
  images: z.array(z.string()).optional(),
  contact_name: z.string().nullable().optional(),
  contact_email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  operator_id: z.coerce.number().int().nullable().optional(),
});

// — Capacity + product listing schemas
const adminCapacityListingCreateSchema = z.object({
  listing_type: z.literal("capacity"),
  user_id: z.coerce.number().int(),
  operator_id: z.coerce.number().int().nullish(),
  equipment_type: z.string().min(1),
  capacity_kg: z.coerce.number().default(0),
  certifications: z.array(z.string()).default([]),
  price_per_kg_min: z.coerce.number().default(0),
  price_per_kg_max: z.coerce.number().default(0),
  turnaround_days: z.coerce.number().int().default(14),
  available: z.boolean().default(true),
  notes: z.string().nullish(),
  approval_status: z.string().default("approved"),
});

const adminProductListingCreateSchema = z.object({
  listing_type: z.literal("product"),
  operator_name: z.string().default(""),
  name: z.string().min(1),
  material_type: z.string().default("other"),
  weight_kg: z.coerce.number().default(1),
  moisture_pct: z.coerce.number().nullish(),
  price_per_unit: z.coerce.number().default(0),
  moq: z.coerce.number().int().default(1),
  available: z.boolean().default(true),
  description: z.string().nullish(),
  contact_email: z.string().default(""),
  approval_status: z.string().default("approved"),
  user_id: z.coerce.number().int().nullish(),
});

const adminListingCreateSchema = z.discriminatedUnion("listing_type", [
  adminCapacityListingCreateSchema,
  adminProductListingCreateSchema,
]);

const adminCapacityListingUpdateSchema = z.object({
  equipment_type: z.string().min(1).optional(),
  capacity_kg: z.coerce.number().optional(),
  certifications: z.array(z.string()).optional(),
  price_per_kg_min: z.coerce.number().optional(),
  price_per_kg_max: z.coerce.number().optional(),
  turnaround_days: z.coerce.number().int().optional(),
  available: z.boolean().optional(),
  notes: z.string().nullable().optional(),
  approval_status: z.string().optional(),
});

const adminProductListingUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  operator_name: z.string().optional(),
  material_type: z.string().optional(),
  weight_kg: z.coerce.number().optional(),
  moisture_pct: z.coerce.number().nullable().optional(),
  price_per_unit: z.coerce.number().optional(),
  moq: z.coerce.number().int().optional(),
  available: z.boolean().optional(),
  description: z.string().nullable().optional(),
  contact_email: z.string().optional(),
  approval_status: z.string().optional(),
});

// ─── Helper: get per-admin notification cleared timestamp from DB ─────────────
async function getCleared(userId: number): Promise<Date> {
  const [row] = await db
    .select({ notifications_cleared_at: usersTable.notifications_cleared_at })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  return row?.notifications_cleared_at ?? new Date(0);
}

// ─── Helper: write admin audit log (non-blocking — errors are logged, not thrown) ─
async function logAdminAction(
  adminId: number,
  adminEmail: string,
  action: string,
  entityType?: string,
  entityId?: number,
  ipAddress?: string,
  notes?: string
): Promise<void> {
  try {
    await db.insert(adminAuditLogsTable).values({
      admin_id: adminId,
      admin_email: adminEmail,
      action,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
      ip_address: ipAddress ?? null,
      notes: notes ?? null,
    });
  } catch (err) {
    logger.error({ err }, "Failed to write admin audit log");
  }
}

// ─── GET /api/admin/overview ──────────────────────────────────────────────────
router.get("/admin/overview", ...adminOnly, async (_req, res) => {
  const [userCount] = await db.select({ count: count() }).from(usersTable);
  const [activeReqs] = await db
    .select({ count: count() })
    .from(requestsTable)
    .where(eq(requestsTable.status, "pending"));
  const [completedContracts] = await db
    .select({ count: count() })
    .from(bidsTable)
    .where(eq(bidsTable.status, "accepted"));

  const revenueRows = await db
    .select({ price_per_kg: bidsTable.price_per_kg, quantity_kg: requestsTable.quantity_kg, platform_fee_rate: bidsTable.platform_fee_rate })
    .from(bidsTable)
    .leftJoin(requestsTable, eq(bidsTable.request_id, requestsTable.id))
    .where(eq(bidsTable.status, "accepted"));

  const total_revenue = revenueRows.reduce(
    (acc, r) => acc + (r.price_per_kg ?? 0) * (r.quantity_kg ?? 0) * historicalFeeRate(r.platform_fee_rate),
    0
  );

  const activity = await db
    .select()
    .from(activityTable)
    .orderBy(desc(activityTable.timestamp))
    .limit(15);

  return res.json({
    total_users: userCount.count,
    active_requests: activeReqs.count,
    completed_contracts: completedContracts.count,
    total_platform_revenue: +total_revenue.toFixed(2),
    activity: activity.map((a) => ({ ...a, timestamp: a.timestamp.toISOString() })),
  });
});

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
router.get("/admin/users", ...adminOnly, async (_req, res) => {
  const users = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      admin_role: usersTable.admin_role,
      banned: usersTable.banned,
      failed_login_count: usersTable.failed_login_count,
      locked_until: usersTable.locked_until,
      created_at: usersTable.created_at,
    })
    .from(usersTable)
    .orderBy(desc(usersTable.created_at));
  return res.json(users);
});

// ─── PATCH /api/admin/users/:id/admin-role ────────────────────────────────────
// Set or clear the admin sub-role for any admin user.
// Valid values: super_admin | support_admin | finance_admin | data_analyst | ad_manager | null
const VALID_ADMIN_ROLES = ["super_admin", "support_admin", "finance_admin", "data_analyst", "ad_manager"];

router.patch("/admin/users/:id/admin-role", ...adminManage, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const { admin_role } = req.body as { admin_role: string | null };
  // `null` is deliberately NOT accepted. A null sub-role resolves to full
  // super_admin access for backwards compatibility with admin rows that predate
  // this column, so "clearing" a role would silently *promote* the user — the
  // opposite of what the caller intends and of what the audit log would record.
  // To reduce someone's access, assign the narrower role explicitly.
  if (!admin_role || !VALID_ADMIN_ROLES.includes(admin_role)) {
    return res.status(400).json({
      error: `Invalid admin_role. Must be one of: ${VALID_ADMIN_ROLES.join(", ")}. ` +
        `Clearing the role is not allowed — it would grant full access. Assign "data_analyst" for read-only.`,
    });
  }

  // Self-demotion lockout guard: only super_admin holds `manage_admins`, so an
  // admin narrowing their own sub-role could strip the platform of anyone able
  // to grant it back. Changing your own role must go through another admin.
  if (id === req.user!.userId && admin_role !== "super_admin") {
    return res.status(400).json({
      error: "You cannot change your own admin role. Ask another super_admin to do it.",
    });
  }

  const [user] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.role !== "admin") return res.status(400).json({ error: "Admin roles can only be assigned to admin users" });

  await db.update(usersTable).set({ admin_role }).where(eq(usersTable.id, id));
  void logAdminAction(req.user!.userId, req.user!.email, "set_admin_role", "user", id, req.ip,
    `Assigned role: ${admin_role}`);
  return res.json({ ok: true, admin_role });
});

// ─── POST /api/admin/users/:id/unlock ────────────────────────────────────────
// Manually clear a lockout so the user can log in again.
router.post("/admin/users/:id/unlock", ...adminModerate, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  await db.update(usersTable).set({ failed_login_count: 0, locked_until: null }).where(eq(usersTable.id, id));
  void logAdminAction(req.user!.userId, req.user!.email, "unlock_user", "user", id, req.ip);
  return res.json({ ok: true });
});

// ─── POST /api/admin/users/:id/ban ───────────────────────────────────────────
router.post("/admin/users/:id/ban", ...adminModerate, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  // Bump session_version so any existing JWTs for this account are immediately
  // rejected by requireAuth — the ban takes effect on the very next request.
  await db.update(usersTable).set({ banned: true, session_version: sql`${usersTable.session_version} + 1` }).where(eq(usersTable.id, id));
  void logAdminAction(req.user!.userId, req.user!.email, "ban_user", "user", id, req.ip);
  return res.json({ ok: true });
});

// ─── POST /api/admin/users/:id/unban ─────────────────────────────────────────
router.post("/admin/users/:id/unban", ...adminModerate, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  await db.update(usersTable).set({ banned: false }).where(eq(usersTable.id, id));
  void logAdminAction(req.user!.userId, req.user!.email, "unban_user", "user", id, req.ip);
  return res.json({ ok: true });
});

// ─── POST /api/admin/users/:id/trigger-audit ─────────────────────────────────
// For operator-role users: resolves their linked operator record via user_id FK
router.post("/admin/users/:id/trigger-audit", ...adminModerate, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (user.role !== "operator") return res.status(400).json({ error: "User is not an operator" });

  const [op] = await db
    .select({ id: operatorsTable.id })
    .from(operatorsTable)
    .where(eq(operatorsTable.user_id, id))
    .limit(1);

  if (!op) {
    return res.status(404).json({
      error: "No operator profile is linked to this user account. Use the Operators tab to trigger the audit directly, or link the account first (Task: Connect operator accounts to their profiles).",
    });
  }

  await db
    .update(operatorsTable)
    .set({ audit_status: "pending", audit_triggered_at: new Date() })
    .where(eq(operatorsTable.id, op.id));

  void logAdminAction(req.user!.userId, req.user!.email, "trigger_operator_audit", "operator", op.id, req.ip);
  return res.json({ ok: true, operator_id: op.id });
});

// ─── GET /api/admin/operators ─────────────────────────────────────────────────
router.get("/admin/operators", ...adminOnly, async (_req, res) => {
  const operators = await db
    .select()
    .from(operatorsTable)
    .orderBy(desc(operatorsTable.created_at));
  return res.json(operators.map((o) => ({
    ...o,
    cert_documents: o.cert_documents ?? {},
    created_at: o.created_at.toISOString(),
    audit_triggered_at: o.audit_triggered_at?.toISOString() ?? null,
    platform_fee_override: o.platform_fee_override ?? null,
  })));
});

// ─── POST /api/admin/operators/:id/audit ─────────────────────────────────────
router.post("/admin/operators/:id/audit", ...adminModerate, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  await db
    .update(operatorsTable)
    .set({ audit_status: "pending", audit_triggered_at: new Date() })
    .where(eq(operatorsTable.id, id));
  void logAdminAction(req.user!.userId, req.user!.email, "trigger_operator_audit", "operator", id, req.ip);
  return res.json({ ok: true });
});

// ─── PATCH /api/admin/operators/:id/certifications ───────────────────────────
// Toggles a single cert's verified status and logs the action.
router.patch("/admin/operators/:id/certifications", ...adminModerate, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const { cert, verified } = req.body as { cert?: string; verified?: boolean };
  if (typeof cert !== "string" || !cert.trim()) return res.status(400).json({ error: "cert is required" });
  if (typeof verified !== "boolean") return res.status(400).json({ error: "verified must be a boolean" });

  const [op] = await db
    .select({ verified_certifications: operatorsTable.verified_certifications, cert_verified_at: operatorsTable.cert_verified_at })
    .from(operatorsTable)
    .where(eq(operatorsTable.id, id))
    .limit(1);

  if (!op) return res.status(404).json({ error: "Operator not found" });

  const current: string[] = op.verified_certifications ?? [];
  const currentTimestamps: Record<string, string> = (op.cert_verified_at as Record<string, string>) ?? {};
  let updated: string[];
  let updatedTimestamps: Record<string, string>;
  if (verified) {
    updated = current.includes(cert) ? current : [...current, cert];
    updatedTimestamps = { ...currentTimestamps, [cert]: new Date().toISOString() };
  } else {
    updated = current.filter((c) => c !== cert);
    updatedTimestamps = { ...currentTimestamps };
    delete updatedTimestamps[cert];
  }

  const [result] = await db
    .update(operatorsTable)
    .set({ verified_certifications: updated, cert_verified_at: updatedTimestamps })
    .where(eq(operatorsTable.id, id))
    .returning();

  if (!result) return res.status(404).json({ error: "Operator not found" });

  void logAdminAction(
    req.user!.userId,
    req.user!.email,
    verified ? "verify_operator_cert" : "unverify_operator_cert",
    "operator",
    id,
    req.ip,
    cert
  );

  return res.json({ ...result, created_at: result.created_at.toISOString() });
});

// ─── POST /api/admin/operators/:id/audited ───────────────────────────────────
router.post("/admin/operators/:id/audited", ...adminModerate, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  await db
    .update(operatorsTable)
    .set({ audit_status: "audited" })
    .where(eq(operatorsTable.id, id));
  void logAdminAction(req.user!.userId, req.user!.email, "mark_operator_audited", "operator", id, req.ip);
  return res.json({ ok: true });
});

// ─── POST /api/admin/operators ────────────────────────────────────────────────
router.post("/admin/operators", ...adminModerate, async (req, res) => {
  const parsed = adminOperatorCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;

  const [op] = await db.insert(operatorsTable).values({
    name: d.name,
    location: d.location,
    description: d.description ?? null,
    capacity_kg: d.capacity_kg,
    price_per_kg: d.price_per_kg,
    turnaround_days: d.turnaround_days,
    certifications: d.certifications,
    available: d.available,
    country: d.country ?? null,
    city: d.city ?? null,
    website_url: d.website_url ?? null,
    contact_page_url: d.contact_page_url ?? null,
    role: d.role,
    food_market_focus: d.food_market_focus,
    pharmaceutical_focus: d.pharmaceutical_focus,
    platform_fee_override: d.platform_fee_override ?? null,
    gps_lat: d.gps_lat ?? null,
    gps_lng: d.gps_lng ?? null,
    service_radius_km: d.service_radius_km ?? null,
    map_status: d.map_status,
    contact_name: d.contact_name ?? null,
    contact_email: d.contact_email ?? null,
    phone: d.phone ?? null,
  }).returning();

  void logAdminAction(req.user!.userId, req.user!.email, "create_operator", "operator", op.id, req.ip);
  return res.status(201).json({ ...op, created_at: op.created_at.toISOString() });
});

// ─── PUT /api/admin/operators/:id ─────────────────────────────────────────────
router.put("/admin/operators/:id", ...adminModerate, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = adminOperatorUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const updates = parsed.data as Record<string, unknown>;
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Nothing to update" });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [updated] = await db.update(operatorsTable).set(updates as any).where(eq(operatorsTable.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "Operator not found" });

  void logAdminAction(req.user!.userId, req.user!.email, "update_operator", "operator", id, req.ip);
  return res.json({ ...updated, created_at: updated.created_at.toISOString() });
});

// ─── DELETE /api/admin/operators/:id ──────────────────────────────────────────
router.delete("/admin/operators/:id", ...adminModerate, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [deleted] = await db.delete(operatorsTable).where(eq(operatorsTable.id, id)).returning({ id: operatorsTable.id });
  if (!deleted) return res.status(404).json({ error: "Operator not found" });

  void logAdminAction(req.user!.userId, req.user!.email, "delete_operator", "operator", id, req.ip);
  return res.json({ ok: true });
});

// ─── GET /api/admin/manufacturers ─────────────────────────────────────────────
router.get("/admin/manufacturers", ...adminOnly, async (req, res) => {
  const { search, status } = req.query as Record<string, string | undefined>;
  const conditions = [];
  if (search) conditions.push(ilike(manufacturersTable.name, `%${search}%`));
  if (status === "active") conditions.push(eq(manufacturersTable.active, true));
  if (status === "inactive") conditions.push(eq(manufacturersTable.active, false));

  const rows = await db.select().from(manufacturersTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(manufacturersTable.created_at))
    .limit(500);
  return res.json(rows.map(r => ({ ...r, created_at: r.created_at.toISOString() })));
});

// ─── POST /api/admin/manufacturers ────────────────────────────────────────────
router.post("/admin/manufacturers", ...adminModerate, async (req, res) => {
  const parsed = adminManufacturerCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;

  const slug = d.slug ?? d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const [mfr] = await db.insert(manufacturersTable).values({
    name: d.name,
    slug,
    tagline: d.tagline ?? null,
    description: d.description ?? null,
    website_url: d.website_url ?? null,
    logo_url: d.logo_url ?? null,
    country: d.country ?? null,
    city: d.city ?? null,
    founded_year: d.founded_year ?? null,
    specialties: d.specialties,
    market_focus: d.market_focus,
    certifications: d.certifications,
    production_capabilities: d.production_capabilities ?? null,
    contact_name: d.contact_name ?? null,
    contact_email: d.contact_email ?? null,
    phone: d.phone ?? null,
    active: d.active,
    featured: d.featured,
  }).returning();

  void logAdminAction(req.user!.userId, req.user!.email, "create_manufacturer", "manufacturer", mfr.id, req.ip);
  return res.status(201).json({ ...mfr, created_at: mfr.created_at.toISOString() });
});

// ─── PUT /api/admin/manufacturers/:id ─────────────────────────────────────────
router.put("/admin/manufacturers/:id", ...adminModerate, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = adminManufacturerUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const updates = parsed.data as Record<string, unknown>;
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Nothing to update" });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [updated] = await db.update(manufacturersTable).set(updates as any).where(eq(manufacturersTable.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "Manufacturer not found" });

  void logAdminAction(req.user!.userId, req.user!.email, "update_manufacturer", "manufacturer", id, req.ip);
  return res.json({ ...updated, created_at: updated.created_at.toISOString() });
});

// ─── DELETE /api/admin/manufacturers/:id ──────────────────────────────────────
router.delete("/admin/manufacturers/:id", ...adminModerate, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [deleted] = await db.delete(manufacturersTable).where(eq(manufacturersTable.id, id)).returning({ id: manufacturersTable.id });
  if (!deleted) return res.status(404).json({ error: "Manufacturer not found" });

  void logAdminAction(req.user!.userId, req.user!.email, "delete_manufacturer", "manufacturer", id, req.ip);
  return res.json({ ok: true });
});

// ─── POST /api/admin/listings ─────────────────────────────────────────────────
// Creates a capacity listing (listing_type=capacity) or product listing (listing_type=product)
router.post("/admin/listings", ...adminModerate, async (req, res) => {
  const parsed = adminListingCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;

  if (d.listing_type === "product") {
    const [row] = await db.insert(operatorProductsTable).values({
      operator_name: d.operator_name,
      name: d.name,
      material_type: d.material_type,
      weight_kg: d.weight_kg,
      moisture_pct: d.moisture_pct ?? null,
      price_per_unit: d.price_per_unit,
      moq: d.moq,
      available: d.available,
      description: d.description ?? null,
      contact_email: d.contact_email,
      approval_status: d.approval_status,
      user_id: d.user_id ?? null,
    }).returning();
    void logAdminAction(req.user!.userId, req.user!.email, "create_listing", "product_listing", row.id, req.ip);
    return res.status(201).json({ ...row, listing_type: "product", created_at: row.created_at.toISOString(), updated_at: row.updated_at.toISOString() });
  } else {
    const [row] = await db.insert(operatorListingsTable).values({
      user_id: d.user_id,
      operator_id: d.operator_id ?? null,
      equipment_type: d.equipment_type,
      capacity_kg: d.capacity_kg,
      certifications: d.certifications,
      price_per_kg_min: d.price_per_kg_min,
      price_per_kg_max: d.price_per_kg_max,
      turnaround_days: d.turnaround_days,
      available: d.available,
      notes: d.notes ?? null,
      approval_status: d.approval_status,
    }).returning();
    void logAdminAction(req.user!.userId, req.user!.email, "create_listing", "capacity_listing", row.id, req.ip);
    return res.status(201).json({ ...row, listing_type: "capacity", created_at: row.created_at.toISOString(), updated_at: row.updated_at.toISOString() });
  }
});

// ─── PUT /api/admin/listings/:id ──────────────────────────────────────────────
router.put("/admin/listings/:id", ...adminModerate, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const listingType = String((req.body as Record<string, unknown>).listing_type ?? "capacity");

  if (listingType === "product") {
    const parsed = adminProductListingUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const fieldUpdates = parsed.data as Record<string, unknown>;
    if (Object.keys(fieldUpdates).length === 0) return res.status(400).json({ error: "Nothing to update" });
    const updates = { ...fieldUpdates, updated_at: new Date() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [updated] = await db.update(operatorProductsTable).set(updates as any).where(eq(operatorProductsTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Product listing not found" });
    void logAdminAction(req.user!.userId, req.user!.email, "update_listing", "product_listing", id, req.ip);
    return res.json({ ...updated, listing_type: "product", created_at: updated.created_at.toISOString(), updated_at: updated.updated_at.toISOString() });
  } else {
    const parsed = adminCapacityListingUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const fieldUpdates = parsed.data as Record<string, unknown>;
    if (Object.keys(fieldUpdates).length === 0) return res.status(400).json({ error: "Nothing to update" });
    const updates = { ...fieldUpdates, updated_at: new Date() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [updated] = await db.update(operatorListingsTable).set(updates as any).where(eq(operatorListingsTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Capacity listing not found" });
    void logAdminAction(req.user!.userId, req.user!.email, "update_listing", "capacity_listing", id, req.ip);
    return res.json({ ...updated, listing_type: "capacity", created_at: updated.created_at.toISOString(), updated_at: updated.updated_at.toISOString() });
  }
});

// ─── DELETE /api/admin/listings/:id ───────────────────────────────────────────
router.delete("/admin/listings/:id", ...adminModerate, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const listingType = String(req.query.listing_type ?? "capacity");

  if (listingType === "product") {
    const [deleted] = await db.delete(operatorProductsTable).where(eq(operatorProductsTable.id, id)).returning({ id: operatorProductsTable.id });
    if (!deleted) return res.status(404).json({ error: "Product listing not found" });
    void logAdminAction(req.user!.userId, req.user!.email, "delete_listing", "product_listing", id, req.ip);
  } else {
    const [deleted] = await db.delete(operatorListingsTable).where(eq(operatorListingsTable.id, id)).returning({ id: operatorListingsTable.id });
    if (!deleted) return res.status(404).json({ error: "Capacity listing not found" });
    void logAdminAction(req.user!.userId, req.user!.email, "delete_listing", "capacity_listing", id, req.ip);
  }
  return res.json({ ok: true });
});

// ─── GET /api/admin/map-entries ───────────────────────────────────────────────
router.get("/admin/map-entries", ...adminOnly, async (req, res) => {
  const { search, status } = req.query as Record<string, string | undefined>;
  const conditions = [];
  if (search) conditions.push(or(ilike(operatorsTable.name, `%${search}%`), ilike(operatorsTable.location, `%${search}%`)));
  if (status) conditions.push(eq(operatorsTable.map_status, status));

  const rows = await db.select({
    id: operatorsTable.id,
    name: operatorsTable.name,
    location: operatorsTable.location,
    city: operatorsTable.city,
    country: operatorsTable.country,
    gps_lat: operatorsTable.gps_lat,
    gps_lng: operatorsTable.gps_lng,
    service_radius_km: operatorsTable.service_radius_km,
    map_status: operatorsTable.map_status,
    contact_name: operatorsTable.contact_name,
    contact_email: operatorsTable.contact_email,
    phone: operatorsTable.phone,
    available: operatorsTable.available,
    certifications: operatorsTable.certifications,
    created_at: operatorsTable.created_at,
  }).from(operatorsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(operatorsTable.created_at))
    .limit(500);

  return res.json(rows.map(r => ({ ...r, created_at: r.created_at.toISOString() })));
});

// ─── POST /api/admin/map-entries ──────────────────────────────────────────────
router.post("/admin/map-entries", ...adminModerate, async (req, res) => {
  const parsed = adminMapEntryCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;

  const [op] = await db.insert(operatorsTable).values({
    name: d.name,
    location: d.location,
    capacity_kg: 0,
    price_per_kg: 0,
    turnaround_days: 14,
    city: d.city ?? null,
    country: d.country ?? null,
    gps_lat: d.gps_lat ?? null,
    gps_lng: d.gps_lng ?? null,
    service_radius_km: d.service_radius_km ?? null,
    map_status: d.map_status,
    contact_name: d.contact_name ?? null,
    contact_email: d.contact_email ?? null,
    phone: d.phone ?? null,
  }).returning();

  void logAdminAction(req.user!.userId, req.user!.email, "create_map_entry", "operator", op.id, req.ip);
  return res.status(201).json({ ...op, created_at: op.created_at.toISOString() });
});

// ─── GET /api/admin/machinery ─────────────────────────────────────────────────
router.get("/admin/machinery", ...adminOnly, async (req, res) => {
  const { search, status, category } = req.query as Record<string, string | undefined>;
  const conditions = [];
  if (search) conditions.push(or(ilike(machineryListingsTable.title, `%${search}%`), ilike(machineryListingsTable.manufacturer_name, `%${search}%`)));
  if (status) conditions.push(eq(machineryListingsTable.listing_status, status));
  if (category) conditions.push(eq(machineryListingsTable.category, category));

  const rows = await db.select().from(machineryListingsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(machineryListingsTable.created_at))
    .limit(500);
  return res.json(rows.map(r => ({ ...r, created_at: r.created_at.toISOString(), updated_at: r.updated_at.toISOString() })));
});

// ─── POST /api/admin/machinery ────────────────────────────────────────────────
router.post("/admin/machinery", ...adminModerate, async (req, res) => {
  const parsed = insertMachineryListingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const [row] = await db.insert(machineryListingsTable).values(parsed.data).returning();
  void logAdminAction(req.user!.userId, req.user!.email, "create_machinery_listing", "machinery_listing", row.id, req.ip);
  return res.status(201).json({ ...row, created_at: row.created_at.toISOString(), updated_at: row.updated_at.toISOString() });
});

// ─── PUT /api/admin/machinery/:id ─────────────────────────────────────────────
router.put("/admin/machinery/:id", ...adminModerate, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = adminMachineryUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const fieldUpdates = parsed.data as Record<string, unknown>;
  if (Object.keys(fieldUpdates).length === 0) return res.status(400).json({ error: "Nothing to update" });
  const updates = { ...fieldUpdates, updated_at: new Date() };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [updated] = await db.update(machineryListingsTable).set(updates as any).where(eq(machineryListingsTable.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "Machinery listing not found" });

  void logAdminAction(req.user!.userId, req.user!.email, "update_machinery_listing", "machinery_listing", id, req.ip);
  return res.json({ ...updated, created_at: updated.created_at.toISOString(), updated_at: updated.updated_at.toISOString() });
});

// ─── DELETE /api/admin/machinery/:id ──────────────────────────────────────────
router.delete("/admin/machinery/:id", ...adminModerate, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [deleted] = await db.delete(machineryListingsTable).where(eq(machineryListingsTable.id, id)).returning({ id: machineryListingsTable.id });
  if (!deleted) return res.status(404).json({ error: "Machinery listing not found" });

  void logAdminAction(req.user!.userId, req.user!.email, "delete_machinery_listing", "machinery_listing", id, req.ip);
  return res.json({ ok: true });
});

// ─── GET /api/admin/requests ─────────────────────────────────────────────────
router.get("/admin/requests", ...adminOnly, async (_req, res) => {
  const rows = await db
    .select({
      id: requestsTable.id,
      material_type: requestsTable.material_type,
      quantity_kg: requestsTable.quantity_kg,
      deadline: requestsTable.deadline,
      budget_per_kg: requestsTable.budget_per_kg,
      status: requestsTable.status,
      buyer_email: requestsTable.buyer_email,
      bid_count: requestsTable.bid_count,
      created_at: requestsTable.created_at,
      moderation_note: requestsTable.moderation_note,
      moderated_by: requestsTable.moderated_by,
    })
    .from(requestsTable)
    .orderBy(desc(requestsTable.created_at))
    .limit(500);
  return res.json(rows);
});

// ─── POST /api/admin/requests/:id/close ──────────────────────────────────────
router.post("/admin/requests/:id/close", ...adminModerate, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const { reason } = req.body as { reason?: string };
  const adminName = req.user!.userId.toString();
  const note = reason?.trim() || null;

  const [updated] = await db
    .update(requestsTable)
    .set({
      status: "closed",
      moderation_note: note,
      moderated_by: adminName,
    })
    .where(eq(requestsTable.id, id))
    .returning({ id: requestsTable.id });

  if (!updated) return res.status(404).json({ error: "Request not found" });
  void logAdminAction(req.user!.userId, req.user!.email, "close_request", "request", id, req.ip, note ?? undefined);
  return res.json({ ok: true });
});

// ─── POST /api/admin/requests/:id/remove ─────────────────────────────────────
router.post("/admin/requests/:id/remove", ...adminModerate, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const { reason } = req.body as { reason?: string };
  const note = reason?.trim() || null;
  if (!note) return res.status(400).json({ error: "A reason is required when removing a request" });

  const adminName = req.user!.userId.toString();

  const [updated] = await db
    .update(requestsTable)
    .set({
      status: "removed",
      moderation_note: note,
      moderated_by: adminName,
    })
    .where(eq(requestsTable.id, id))
    .returning({ id: requestsTable.id });

  if (!updated) return res.status(404).json({ error: "Request not found" });
  void logAdminAction(req.user!.userId, req.user!.email, "remove_request", "request", id, req.ip, note);
  return res.json({ ok: true });
});

// ─── GET /api/admin/transactions ─────────────────────────────────────────────
// Returns completed (accepted) contracts only
router.get("/admin/transactions", ...adminFinance, async (_req, res) => {
  const rows = await db
    .select({
      bid_id: bidsTable.id,
      request_id: bidsTable.request_id,
      operator_name: bidsTable.operator_name,
      price_per_kg: bidsTable.price_per_kg,
      platform_fee_rate: bidsTable.platform_fee_rate,
      turnaround_days: bidsTable.turnaround_days,
      status: bidsTable.status,
      fee_status: bidsTable.fee_status,
      escrow_status: bidsTable.escrow_status,
      escrow_amount_cents: bidsTable.escrow_amount_cents,
      created_at: bidsTable.created_at,
      material_type: requestsTable.material_type,
      quantity_kg: requestsTable.quantity_kg,
      buyer_email: requestsTable.buyer_email,
    })
    .from(bidsTable)
    .leftJoin(requestsTable, eq(bidsTable.request_id, requestsTable.id))
    .where(eq(bidsTable.status, "accepted"))
    .orderBy(desc(bidsTable.created_at))
    .limit(500);

  const transactions = rows.map((r) => {
    const contract_value = (r.price_per_kg ?? 0) * (r.quantity_kg ?? 0);
    return {
      ...r,
      contract_value,
      fee_amount: +(contract_value * historicalFeeRate(r.platform_fee_rate)).toFixed(2),
    };
  });

  return res.json(transactions);
});

// ─── GET /api/admin/insights ──────────────────────────────────────────────────
router.get("/admin/insights", ...adminOnly, async (_req, res) => {
  const [userCount] = await db.select({ count: count() }).from(usersTable);
  const [requestCount] = await db.select({ count: count() }).from(requestsTable);
  const [bidCount] = await db.select({ count: count() }).from(bidsTable);
  const [completedBids] = await db
    .select({ count: count() })
    .from(bidsTable)
    .where(eq(bidsTable.status, "accepted"));

  const materialRows = await db
    .select({ material_type: requestsTable.material_type, cnt: count() })
    .from(requestsTable)
    .groupBy(requestsTable.material_type)
    .orderBy(desc(count()))
    .limit(8);

  const requestsByMonth = await db
    .select({
      month: sql<string>`to_char(created_at, 'YYYY-MM')`,
      cnt: count(),
    })
    .from(requestsTable)
    .groupBy(sql`to_char(created_at, 'YYYY-MM')`)
    .orderBy(sql`to_char(created_at, 'YYYY-MM')`);

  // Revenue by month (accepted bids only)
  const revenueRows = await db
    .select({
      price_per_kg: bidsTable.price_per_kg,
      platform_fee_rate: bidsTable.platform_fee_rate,
      quantity_kg: requestsTable.quantity_kg,
      month: sql<string>`to_char(${bidsTable.created_at}, 'YYYY-MM')`,
    })
    .from(bidsTable)
    .leftJoin(requestsTable, eq(bidsTable.request_id, requestsTable.id))
    .where(eq(bidsTable.status, "accepted"));

  const revenueByMonth: Record<string, number> = {};
  for (const r of revenueRows) {
    const key = r.month ?? "unknown";
    const fee = (r.price_per_kg ?? 0) * (r.quantity_kg ?? 0) * historicalFeeRate(r.platform_fee_rate);
    revenueByMonth[key] = (revenueByMonth[key] ?? 0) + fee;
  }
  const totalRevenue = Object.values(revenueByMonth).reduce((a, b) => a + b, 0);

  // Bids per request distribution
  const bidsPerRequestRows = await db
    .select({ request_id: bidsTable.request_id, cnt: count() })
    .from(bidsTable)
    .groupBy(bidsTable.request_id);

  const bidsPerRequestBuckets: Record<string, number> = {};
  for (const r of bidsPerRequestRows) {
    const n = Number(r.cnt);
    const bucket = n <= 5 ? `${n}` : "6+";
    bidsPerRequestBuckets[bucket] = (bidsPerRequestBuckets[bucket] ?? 0) + 1;
  }
  const bids_per_request = ["1","2","3","4","5","6+"].map((k) => ({
    bids: k,
    requests: bidsPerRequestBuckets[k] ?? 0,
  }));

  // Operator win rates (accepted / total bids per operator, top 8)
  const allBidsByOperator = await db
    .select({ operator_name: bidsTable.operator_name, status: bidsTable.status, cnt: count() })
    .from(bidsTable)
    .groupBy(bidsTable.operator_name, bidsTable.status);

  const opStats: Record<string, { total: number; won: number }> = {};
  for (const r of allBidsByOperator) {
    if (!opStats[r.operator_name]) opStats[r.operator_name] = { total: 0, won: 0 };
    opStats[r.operator_name].total += Number(r.cnt);
    if (r.status === "accepted") opStats[r.operator_name].won += Number(r.cnt);
  }
  const operator_win_rates = Object.entries(opStats)
    .filter(([, s]) => s.total > 0)
    .map(([name, s]) => ({ name: name.replace(" Freeze Dry", "").replace(" Solutions", ""), win_rate: +(s.won / s.total * 100).toFixed(0) }))
    .sort((a, b) => b.win_rate - a.win_rate)
    .slice(0, 8);

  return res.json({
    total_users: userCount.count,
    total_requests: requestCount.count,
    total_bids: bidCount.count,
    completed_contracts: completedBids.count,
    total_platform_revenue: +totalRevenue.toFixed(2),
    top_materials: materialRows.map((r) => ({ name: r.material_type, value: Number(r.cnt) })),
    requests_by_month: requestsByMonth.map((r) => ({ month: r.month, value: Number(r.cnt) })),
    revenue_by_month: Object.entries(revenueByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({ month, value: +value.toFixed(2) })),
    bids_per_request,
    operator_win_rates,
  });
});

// ─── GET /api/admin/notifications ────────────────────────────────────────────
// Returns new buyer requests + new operator registrations since last clear
router.get("/admin/notifications", ...adminOnly, async (req, res) => {
  const userId = req.user!.userId;
  const since = await getCleared(userId);

  const newOperators = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, created_at: usersTable.created_at })
    .from(usersTable)
    .where(eq(usersTable.role, "operator"))
    .orderBy(desc(usersTable.created_at))
    .limit(20);

  const sinceFiltered = newOperators.filter((u) => new Date(u.created_at) > since);

  const newRequests = await db
    .select({ id: requestsTable.id, material_type: requestsTable.material_type, buyer_email: requestsTable.buyer_email, created_at: requestsTable.created_at })
    .from(requestsTable)
    .where(gte(requestsTable.created_at, since))
    .orderBy(desc(requestsTable.created_at))
    .limit(20);

  const notifications = [
    ...sinceFiltered.map((u) => ({
      id: `user-${u.id}`,
      type: "new_operator" as const,
      label: `New operator registered: ${u.name}`,
      created_at: u.created_at,
    })),
    ...newRequests.map((r) => ({
      id: `req-${r.id}`,
      type: "new_request" as const,
      label: `New buyer request: ${r.material_type}`,
      created_at: r.created_at,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return res.json({ count: notifications.length, notifications });
});

// ─── POST /api/admin/notifications/clear ─────────────────────────────────────
router.post("/admin/notifications/clear", ...adminModerate, async (req, res) => {
  const userId = req.user!.userId;
  await db
    .update(usersTable)
    .set({ notifications_cleared_at: new Date() })
    .where(eq(usersTable.id, userId));
  return res.json({ ok: true });
});

// ─── GET /api/admin/messages ──────────────────────────────────────────────────
// Returns all request messages across the platform, newest first
router.get("/admin/messages", ...adminOnly, async (_req, res) => {
  const messages = await db
    .select()
    .from(requestMessagesTable)
    .orderBy(desc(requestMessagesTable.created_at))
    .limit(500);
  return res.json(messages.map(m => ({ ...m, created_at: m.created_at.toISOString() })));
});

// ─── GET /api/admin/system-alerts ─────────────────────────────────────────────
// Returns active (not dismissed) system alerts, newest first
router.get("/admin/system-alerts", ...adminOnly, async (_req, res) => {
  const alerts = await db
    .select()
    .from(systemAlertsTable)
    .where(isNull(systemAlertsTable.dismissed_at))
    .orderBy(desc(systemAlertsTable.created_at));
  return res.json(alerts.map((a) => ({
    ...a,
    created_at: a.created_at.toISOString(),
    dismissed_at: a.dismissed_at ? a.dismissed_at.toISOString() : null,
  })));
});

// ─── POST /api/admin/system-alerts/:id/dismiss ────────────────────────────────
router.post("/admin/system-alerts/:id/dismiss", ...adminModerate, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [updated] = await db
    .update(systemAlertsTable)
    .set({ dismissed_at: new Date() })
    .where(eq(systemAlertsTable.id, id))
    .returning({ id: systemAlertsTable.id });
  if (!updated) return res.status(404).json({ error: "Alert not found" });
  return res.json({ ok: true });
});

// ─── GET /api/admin/disputes ──────────────────────────────────────────────────
router.get("/admin/disputes", ...adminOnly, async (_req, res) => {
  const disputes = await db
    .select()
    .from(disputesTable)
    .orderBy(desc(disputesTable.created_at))
    .limit(200);
  return res.json(disputes.map(d => ({
    ...d,
    created_at: d.created_at.toISOString(),
    resolved_at: d.resolved_at ? d.resolved_at.toISOString() : null,
  })));
});

// ─── PATCH /api/admin/disputes/:id ────────────────────────────────────────────
router.patch("/admin/disputes/:id", ...adminFinance, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const { status, admin_decision } = req.body as { status?: string; admin_decision?: string };
  const validStatuses = ["open", "under_review", "resolved", "dismissed"];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const updates: Record<string, unknown> = {};
  if (status) updates["status"] = status;
  if (admin_decision !== undefined) updates["admin_decision"] = admin_decision;
  if (status === "resolved" || status === "dismissed") {
    updates["resolved_at"] = new Date();
  }

  const [updated] = await db
    .update(disputesTable)
    .set(updates as Parameters<typeof db.update>[0] extends never ? never : any)
    .where(eq(disputesTable.id, id))
    .returning({ id: disputesTable.id });

  if (!updated) return res.status(404).json({ error: "Dispute not found" });

  void logAdminAction(
    req.user!.userId, req.user!.email,
    `dispute_${status ?? "updated"}`, "dispute", id, req.ip,
    admin_decision
  );

  // Email buyer when dispute is resolved or dismissed — non-blocking
  if (status === "resolved" || status === "dismissed") {
    const [full] = await db
      .select({ opened_by_email: disputesTable.opened_by_email, request_id: disputesTable.request_id })
      .from(disputesTable)
      .where(eq(disputesTable.id, id))
      .limit(1);
    if (full?.opened_by_email) {
      sendDisputeResolvedEmail({
        disputeId: id,
        requestId: full.request_id,
        buyerEmail: full.opened_by_email,
        status,
        decision: admin_decision ?? null,
      }).catch(err => logger.warn({ err, disputeId: id }, "Failed to send dispute resolved email"));
    }
  }

  return res.json({ ok: true });
});

// ─── GET /api/admin/price-data ────────────────────────────────────────────────
// Paginated list of market intelligence price observations with optional filters.
router.get("/admin/price-data", ...adminOnly, async (req, res) => {
  const page  = Math.max(1, parseInt(String(req.query.page  ?? "1"),  10) || 1);
  const limit = Math.min(100, parseInt(String(req.query.limit ?? "50"), 10) || 50);
  const { category, status, date_from, date_to, included_only } = req.query as Record<string, string | undefined>;

  const conditions = [];
  if (category)      conditions.push(eq(priceDataPointsTable.category,    category));
  if (status)        conditions.push(eq(priceDataPointsTable.quote_status, status));
  if (date_from)     conditions.push(gte(priceDataPointsTable.created_at, new Date(date_from)));
  if (date_to)       conditions.push(lte(priceDataPointsTable.created_at, new Date(date_to)));
  if (included_only === "true") conditions.push(eq(priceDataPointsTable.included_in_market_intelligence, true));

  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(priceDataPointsTable)
      .where(where)
      .orderBy(desc(priceDataPointsTable.created_at))
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ total: count() }).from(priceDataPointsTable).where(where),
  ]);

  return res.json({
    data: rows.map(r => ({
      ...r,
      certifications: r.certifications ?? [],
      created_at: r.created_at.toISOString(),
      updated_at: r.updated_at.toISOString(),
    })),
    total: Number(total),
    page,
    limit,
  });
});

// ─── GET /api/admin/price-data/export ─────────────────────────────────────────
// Download all price observations as CSV.
router.get("/admin/price-data/export", ...adminOnly, async (_req, res) => {
  const rows = await db.select().from(priceDataPointsTable)
    .orderBy(desc(priceDataPointsTable.created_at))
    .limit(10000);

  const esc = (v: unknown): string => {
    // Neutralize CSV / spreadsheet formula injection: if the value begins with a
    // formula-trigger character recognised by Excel, LibreOffice, and Google Sheets
    // (=, +, -, @), prepend a single-quote so the application treats the cell as
    // plain text rather than evaluating it as a formula.
    let s = String(v ?? "");
    if (s.length > 0 && (s[0] === "=" || s[0] === "+" || s[0] === "-" || s[0] === "@")) {
      s = "'" + s;
    }
    return (s.includes(",") || s.includes('"') || s.includes("\n")) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const HEADERS = [
    "id","bid_id","request_id","operator_name","category","product_format",
    "quoted_price","currency","moq","setup_fee","certifications","payment_terms",
    "lead_time_days","quote_status","accepted","confidence_level","anonymized",
    "included_in_market_intelligence","admin_notes","created_at",
  ];

  const lines = [HEADERS.join(",")];
  for (const r of rows) {
    lines.push([
      r.id, r.bid_id, r.request_id,
      esc(r.operator_name), esc(r.category), esc(r.product_format),
      r.quoted_price, esc(r.currency), r.moq ?? "", r.setup_fee ?? "",
      esc((r.certifications ?? []).join(";")), esc(r.payment_terms),
      r.lead_time_days ?? "", esc(r.quote_status), r.accepted,
      esc(r.confidence_level), r.anonymized, r.included_in_market_intelligence,
      esc(r.admin_notes), r.created_at.toISOString(),
    ].join(","));
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="lyodex-price-data-${new Date().toISOString().slice(0,10)}.csv"`);
  return res.send(lines.join("\n"));
});

// ─── PATCH /api/admin/price-data/:id ──────────────────────────────────────────
// Admin can update confidence level, inclusion flag, or add internal notes.
router.patch("/admin/price-data/:id", ...adminModerate, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { return res.status(400).json({ error: "Invalid id" }); }

  const { confidence_level, included_in_market_intelligence, admin_notes } = req.body;
  const update: Record<string, unknown> = { updated_at: new Date() };
  if (["high","medium","low"].includes(confidence_level)) update.confidence_level = confidence_level;
  if (typeof included_in_market_intelligence === "boolean") update.included_in_market_intelligence = included_in_market_intelligence;
  if (typeof admin_notes === "string") update.admin_notes = admin_notes;

  if (Object.keys(update).length === 1) return res.status(400).json({ error: "Nothing to update" });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.update(priceDataPointsTable).set(update as any).where(eq(priceDataPointsTable.id, id));
  return res.json({ ok: true });
});

// ─── GET /api/admin/audit-logs ────────────────────────────────────────────────
router.get("/admin/audit-logs", ...adminOnly, async (req, res) => {
  const limit = Math.min(parseInt(String(req.query.limit ?? "100"), 10) || 100, 500);
  const logs = await db
    .select()
    .from(adminAuditLogsTable)
    .orderBy(desc(adminAuditLogsTable.created_at))
    .limit(limit);
  return res.json(logs.map(l => ({ ...l, created_at: l.created_at.toISOString() })));
});

// ─── Listing Approval ─────────────────────────────────────────────────────────

// GET /api/admin/listings — all pending capacity + product listings
router.get("/admin/listings", ...adminOnly, async (_req, res) => {
  const [capacityListings, productListings] = await Promise.all([
    db.select().from(operatorListingsTable).orderBy(desc(operatorListingsTable.created_at)).limit(500),
    db.select().from(operatorProductsTable).orderBy(desc(operatorProductsTable.created_at)).limit(500),
  ]);

  return res.json({
    capacity: capacityListings.map((l) => ({
      ...l,
      created_at: l.created_at.toISOString(),
      updated_at: l.updated_at.toISOString(),
    })),
    products: productListings.map((p) => ({
      ...p,
      created_at: p.created_at.toISOString(),
      updated_at: p.updated_at.toISOString(),
    })),
  });
});

// PATCH /api/admin/listings/capacity/:id/approve
router.patch("/admin/listings/capacity/:id/approve", ...adminModerate, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [listing] = await db
    .update(operatorListingsTable)
    .set({ approval_status: "approved", approval_reason: null, updated_at: new Date() })
    .where(eq(operatorListingsTable.id, id))
    .returning();
  if (!listing) return res.status(404).json({ error: "Listing not found" });

  await db.insert(listingNotificationsTable).values({
    user_id: listing.user_id,
    listing_type: "capacity",
    listing_id: id,
    message: `Your capacity listing (${listing.equipment_type}) has been approved and is now visible to buyers.`,
    read: false,
  });

  const [operatorUser] = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, listing.user_id))
    .limit(1);
  if (operatorUser?.email) {
    void sendListingApprovedEmail({
      operatorEmail: operatorUser.email,
      listingType: "capacity",
      listingLabel: listing.equipment_type,
    });
  }

  void logAdminAction(req.user!.userId, req.user!.email, "approve_listing", "capacity_listing", id, req.ip);
  return res.json({ ok: true });
});

// PATCH /api/admin/listings/capacity/:id/reject
router.patch("/admin/listings/capacity/:id/reject", ...adminModerate, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const { reason } = req.body as { reason?: string };
  if (!reason?.trim()) return res.status(400).json({ error: "A rejection reason is required" });

  const [listing] = await db
    .update(operatorListingsTable)
    .set({ approval_status: "rejected", approval_reason: reason.trim(), updated_at: new Date() })
    .where(eq(operatorListingsTable.id, id))
    .returning();
  if (!listing) return res.status(404).json({ error: "Listing not found" });

  await db.insert(listingNotificationsTable).values({
    user_id: listing.user_id,
    listing_type: "capacity",
    listing_id: id,
    message: `Your capacity listing (${listing.equipment_type}) was not approved. Reason: ${reason.trim()}`,
    read: false,
  });

  const [operatorUser] = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, listing.user_id))
    .limit(1);
  if (operatorUser?.email) {
    void sendListingRejectedEmail({
      operatorEmail: operatorUser.email,
      listingType: "capacity",
      listingLabel: listing.equipment_type,
      reason: reason.trim(),
    });
  }

  void logAdminAction(req.user!.userId, req.user!.email, "reject_listing", "capacity_listing", id, req.ip, reason.trim());
  return res.json({ ok: true });
});

// PATCH /api/admin/listings/product/:id/approve
router.patch("/admin/listings/product/:id/approve", ...adminModerate, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [product] = await db
    .update(operatorProductsTable)
    .set({ approval_status: "approved", approval_reason: null, updated_at: new Date() })
    .where(eq(operatorProductsTable.id, id))
    .returning();
  if (!product) return res.status(404).json({ error: "Product not found" });

  if (product.user_id != null) {
    await db.insert(listingNotificationsTable).values({
      user_id: product.user_id,
      listing_type: "product",
      listing_id: id,
      message: `Your product listing (${product.name}) has been approved and is now visible in the shop.`,
      read: false,
    });

    const [operatorUser] = await db
      .select({ email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, product.user_id))
      .limit(1);
    if (operatorUser?.email) {
      void sendListingApprovedEmail({
        operatorEmail: operatorUser.email,
        listingType: "product",
        listingLabel: product.name,
      });
    }
  }

  void logAdminAction(req.user!.userId, req.user!.email, "approve_listing", "product_listing", id, req.ip);
  return res.json({ ok: true });
});

// PATCH /api/admin/listings/product/:id/reject
router.patch("/admin/listings/product/:id/reject", ...adminModerate, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const { reason } = req.body as { reason?: string };
  if (!reason?.trim()) return res.status(400).json({ error: "A rejection reason is required" });

  const [product] = await db
    .update(operatorProductsTable)
    .set({ approval_status: "rejected", approval_reason: reason.trim(), updated_at: new Date() })
    .where(eq(operatorProductsTable.id, id))
    .returning();
  if (!product) return res.status(404).json({ error: "Product not found" });

  if (product.user_id != null) {
    await db.insert(listingNotificationsTable).values({
      user_id: product.user_id,
      listing_type: "product",
      listing_id: id,
      message: `Your product listing (${product.name}) was not approved. Reason: ${reason.trim()}`,
      read: false,
    });

    const [operatorUser] = await db
      .select({ email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, product.user_id))
      .limit(1);
    if (operatorUser?.email) {
      void sendListingRejectedEmail({
        operatorEmail: operatorUser.email,
        listingType: "product",
        listingLabel: product.name,
        reason: reason.trim(),
      });
    }
  }

  void logAdminAction(req.user!.userId, req.user!.email, "reject_listing", "product_listing", id, req.ip, reason.trim());
  return res.json({ ok: true });
});

// GET /api/admin/listing-notifications/:userId — unread notifications for a user
router.get("/admin/listing-notifications", ...adminOnly, async (_req, res) => {
  const notifications = await db
    .select()
    .from(listingNotificationsTable)
    .orderBy(desc(listingNotificationsTable.created_at))
    .limit(200);
  return res.json(notifications.map((n) => ({ ...n, created_at: n.created_at.toISOString() })));
});

// ─── GET /api/admin/market-intelligence ──────────────────────────────────────
// Returns live aggregated MI metrics from platform data, plus any admin overrides
// stored in the priceDataPointsTable admin_notes + a dedicated overrides JSON
// we keep in site_settings under key "mi_overrides".
router.get("/admin/market-intelligence", ...adminOnly, async (req, res) => {
  const { date_from, date_to, category, region } = req.query as Record<string, string | undefined>;

  // Pre-resolve region to operator names if provided
  let regionOpNames: string[] | null = null;
  if (region) {
    const matchingOps = await db
      .select({ name: operatorsTable.name })
      .from(operatorsTable)
      .where(ilike(operatorsTable.country, `%${region}%`));
    regionOpNames = matchingOps.map((o) => o.name);
  }

  const bidConds: SQL[] = [];
  if (date_from) bidConds.push(gte(bidsTable.created_at, new Date(date_from)));
  if (date_to)   bidConds.push(lte(bidsTable.created_at, new Date(date_to)));
  if (regionOpNames !== null) {
    if (regionOpNames.length > 0) bidConds.push(inArray(bidsTable.operator_name, regionOpNames));
    else bidConds.push(sql`false`);
  }

  // Keep dateFilter alias for backward compat with existing queries below
  const dateFilter = bidConds;

  // ── avg price by category from price data points ──
  const priceConditions = [];
  if (category) priceConditions.push(eq(priceDataPointsTable.category, category));
  if (date_from) priceConditions.push(gte(priceDataPointsTable.created_at, new Date(date_from)));
  if (date_to)   priceConditions.push(lte(priceDataPointsTable.created_at, new Date(date_to)));
  priceConditions.push(eq(priceDataPointsTable.included_in_market_intelligence, true));

  const [
    avgPriceRows,
    materialRows,
    requestsByMonthRows,
    bidsByMonthRows,
    acceptedBidRows,
    allBidsByOperator,
    capacityListingCounts,
    productListingCounts,
  ] = await Promise.all([
    db
      .select({
        category: priceDataPointsTable.category,
        avg_price: sql<number>`avg(${priceDataPointsTable.quoted_price})`,
        cnt: count(),
      })
      .from(priceDataPointsTable)
      .where(priceConditions.length ? and(...priceConditions) : undefined)
      .groupBy(priceDataPointsTable.category)
      .orderBy(desc(count())),

    db
      .select({ material_type: requestsTable.material_type, cnt: count() })
      .from(requestsTable)
      .where(
        (() => {
          const c = [];
          if (date_from) c.push(gte(requestsTable.created_at, new Date(date_from)));
          if (date_to) c.push(lte(requestsTable.created_at, new Date(date_to)));
          return c.length ? and(...c) : undefined;
        })()
      )
      .groupBy(requestsTable.material_type)
      .orderBy(desc(count()))
      .limit(10),

    db
      .select({
        month: sql<string>`to_char(created_at, 'YYYY-MM')`,
        cnt: count(),
      })
      .from(requestsTable)
      .where(
        (() => {
          const c = [];
          if (date_from) c.push(gte(requestsTable.created_at, new Date(date_from)));
          if (date_to) c.push(lte(requestsTable.created_at, new Date(date_to)));
          return c.length ? and(...c) : undefined;
        })()
      )
      .groupBy(sql`to_char(created_at, 'YYYY-MM')`)
      .orderBy(sql`to_char(created_at, 'YYYY-MM')`),

    db
      .select({
        month: sql<string>`to_char(${bidsTable.created_at}, 'YYYY-MM')`,
        cnt: count(),
      })
      .from(bidsTable)
      .where(dateFilter.length ? and(...dateFilter) : undefined)
      .groupBy(sql`to_char(${bidsTable.created_at}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${bidsTable.created_at}, 'YYYY-MM')`),

    db
      .select({
        price_per_kg: bidsTable.price_per_kg,
        platform_fee_rate: bidsTable.platform_fee_rate,
        quantity_kg: requestsTable.quantity_kg,
        month: sql<string>`to_char(${bidsTable.created_at}, 'YYYY-MM')`,
      })
      .from(bidsTable)
      .leftJoin(requestsTable, eq(bidsTable.request_id, requestsTable.id))
      .where(and(eq(bidsTable.status, "accepted"), ...(dateFilter.length ? dateFilter : []))),

    db
      .select({ operator_name: bidsTable.operator_name, status: bidsTable.status, cnt: count() })
      .from(bidsTable)
      .where(dateFilter.length ? and(...dateFilter) : undefined)
      .groupBy(bidsTable.operator_name, bidsTable.status),

    db
      .select({
        total: count(),
        approved: sql<number>`count(*) filter (where approval_status = 'approved')`,
      })
      .from(operatorListingsTable),

    db
      .select({
        total: count(),
        approved: sql<number>`count(*) filter (where approval_status = 'approved')`,
      })
      .from(operatorProductsTable),
  ]);

  // ── Additional MI queries (demand by region, manufacturer activity, machinery demand) ──
  const [demandByRegionRows, operatorSupplyRows, manufacturerActivityRows, machineryDemandRows] = await Promise.all([
    // Bid demand by operator country — demand-side regional view
    db
      .select({ country: operatorsTable.country, cnt: count(bidsTable.id) })
      .from(bidsTable)
      .innerJoin(operatorsTable, eq(bidsTable.operator_name, operatorsTable.name))
      .where(
        (() => {
          const c: SQL[] = [sql`${operatorsTable.country} is not null`];
          if (dateFilter.length) c.push(...dateFilter);
          return and(...c);
        })()
      )
      .groupBy(operatorsTable.country)
      .orderBy(desc(count(bidsTable.id)))
      .limit(10),

    // Operator supply by country
    db
      .select({ country: operatorsTable.country, cnt: count() })
      .from(operatorsTable)
      .where(sql`${operatorsTable.country} is not null`)
      .groupBy(operatorsTable.country)
      .orderBy(desc(count()))
      .limit(10),

    // Top manufacturers by review count + rating
    db
      .select({
        name: manufacturersTable.name,
        country: manufacturersTable.country,
        avg_rating: manufacturersTable.avg_rating,
        review_count: manufacturersTable.review_count,
      })
      .from(manufacturersTable)
      .where(eq(manufacturersTable.active, true))
      .orderBy(desc(manufacturersTable.review_count))
      .limit(10),

    // Machinery/parts demand by category
    db
      .select({
        category: machineryListingsTable.category,
        cnt: count(),
        avg_price: sql<number>`avg(${machineryListingsTable.price}) filter (where ${machineryListingsTable.price} is not null)`,
        active_listings: sql<number>`count(*) filter (where ${machineryListingsTable.listing_status} = 'active')`,
        pending_listings: sql<number>`count(*) filter (where ${machineryListingsTable.listing_status} = 'pending')`,
      })
      .from(machineryListingsTable)
      .groupBy(machineryListingsTable.category)
      .orderBy(desc(count()))
      .limit(10),
  ]);

  // ── revenue by month ──
  const revenueByMonth: Record<string, number> = {};
  let totalContractValue = 0;
  let totalQuantityKg = 0;
  for (const r of acceptedBidRows) {
    const key = r.month ?? "unknown";
    const val = (r.price_per_kg ?? 0) * (r.quantity_kg ?? 0);
    const fee = val * historicalFeeRate(r.platform_fee_rate);
    revenueByMonth[key] = (revenueByMonth[key] ?? 0) + fee;
    totalContractValue += val;
    totalQuantityKg += r.quantity_kg ?? 0;
  }
  const totalContracts = acceptedBidRows.length;
  const platformFees = Object.values(revenueByMonth).reduce((a, b) => a + b, 0);

  // ── operator win rates ──
  const opStats: Record<string, { total: number; won: number }> = {};
  for (const r of allBidsByOperator) {
    if (!opStats[r.operator_name]) opStats[r.operator_name] = { total: 0, won: 0 };
    opStats[r.operator_name].total += Number(r.cnt);
    if (r.status === "accepted") opStats[r.operator_name].won += Number(r.cnt);
  }
  const operator_win_rates = Object.entries(opStats)
    .filter(([, s]) => s.total > 0)
    .map(([name, s]) => ({
      name: name.replace(" Freeze Dry", "").replace(" Solutions", ""),
      win_rate: +(s.won / s.total * 100).toFixed(0),
      total_bids: s.total,
      won_bids: s.won,
    }))
    .sort((a, b) => b.win_rate - a.win_rate)
    .slice(0, 10);

  // ── load admin overrides from site_settings ──
  const [overrideSetting] = await db
    .select({ value: siteSettingsTable.value })
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, "mi_overrides"))
    .limit(1);
  const overrides: Record<string, number> = overrideSetting?.value
    ? (JSON.parse(String(overrideSetting.value)) as Record<string, number>)
    : {};

  // ── Apply admin overrides to all numeric response fields ──
  const ov = overrides;
  return res.json({
    avg_price_by_category: avgPriceRows.map((r) => ({
      category: r.category,
      avg_price: +(ov[`avg_price.${r.category}`] ?? Number(r.avg_price)).toFixed(2),
      count: Number(r.cnt),
    })),
    top_materials: materialRows.map((r) => ({ name: r.material_type, value: Number(r.cnt) })),
    demand_by_region: demandByRegionRows.map((r) => ({ region: r.country ?? "Unknown", count: Number(r.cnt) })),
    requests_by_region: operatorSupplyRows.map((r) => ({ region: r.country ?? "Unknown", count: Number(r.cnt) })),
    operator_win_rates,
    bids_by_month: bidsByMonthRows.map((r) => ({ month: r.month, value: Number(r.cnt) })),
    requests_by_month: requestsByMonthRows.map((r) => ({ month: r.month, value: Number(r.cnt) })),
    revenue_by_month: Object.entries(revenueByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({ month, value: +value.toFixed(2) })),
    listing_performance: {
      total_capacity_listings: ov["listing_performance.total_capacity_listings"] ?? Number(capacityListingCounts[0]?.total ?? 0),
      total_product_listings: ov["listing_performance.total_product_listings"] ?? Number(productListingCounts[0]?.total ?? 0),
      approved_capacity: ov["listing_performance.approved_capacity"] ?? Number(capacityListingCounts[0]?.approved ?? 0),
      approved_products: ov["listing_performance.approved_products"] ?? Number(productListingCounts[0]?.approved ?? 0),
    },
    sales_volume: {
      total_contracts: ov["sales_volume.total_contracts"] ?? totalContracts,
      total_quantity_kg: +(ov["sales_volume.total_quantity_kg"] ?? totalQuantityKg).toFixed(2),
      total_contract_value: +(ov["sales_volume.total_contract_value"] ?? totalContractValue).toFixed(2),
      platform_fees: +(ov["sales_volume.platform_fees"] ?? platformFees).toFixed(2),
    },
    manufacturer_activity: {
      top_manufacturers: manufacturerActivityRows.map((r) => ({
        name: r.name,
        country: r.country ?? "Unknown",
        avg_rating: +(ov[`manufacturer_activity.${r.name}.avg_rating`] ?? r.avg_rating ?? 0).toFixed(1),
        review_count: ov[`manufacturer_activity.${r.name}.review_count`] ?? r.review_count ?? 0,
      })),
      total_active: ov["manufacturer_activity.total_active"] ?? manufacturerActivityRows.length,
    },
    machinery_demand: machineryDemandRows.map((r) => ({
      category: r.category,
      total_listings: ov[`machinery_demand.${r.category}.total_listings`] ?? Number(r.cnt),
      avg_price: r.avg_price != null
        ? +(ov[`machinery_demand.${r.category}.avg_price`] ?? Number(r.avg_price)).toFixed(2)
        : null,
      active_listings: Number(r.active_listings),
      pending_listings: Number(r.pending_listings),
    })),
    overrides,
  });
});

// ─── PATCH /api/admin/market-intelligence/override ────────────────────────────
// Persists a manual admin correction to site_settings under key "mi_overrides".
router.patch("/admin/market-intelligence/override", ...adminModerate, async (req, res) => {
  const { key, value, note } = req.body as { key?: string; value?: unknown; note?: string };
  if (!key || typeof key !== "string") return res.status(400).json({ error: "key is required" });
  if (typeof value !== "number") return res.status(400).json({ error: "value must be a number" });


  const [existing] = await db
    .select({ value: siteSettingsTable.value })
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, "mi_overrides"))
    .limit(1);

  const current: Record<string, number> = existing?.value
    ? (JSON.parse(String(existing.value)) as Record<string, number>)
    : {};

  current[key] = value;

  await db
    .insert(siteSettingsTable)
    .values({ key: "mi_overrides", value: JSON.stringify(current) })
    .onConflictDoUpdate({ target: siteSettingsTable.key, set: { value: JSON.stringify(current) } });

  void logAdminAction(
    req.user!.userId, req.user!.email,
    "mi_override", "market_intelligence", undefined, req.ip,
    note ?? `Set ${key} = ${value}`
  );

  return res.json({ ok: true, key, value });
});

// ─── GET /api/admin/scheduled-report-settings ────────────────────────────────
router.get("/admin/scheduled-report-settings", ...adminOnly, async (_req, res) => {
  const rows = await db
    .select({ key: siteSettingsTable.key, value: siteSettingsTable.value })
    .from(siteSettingsTable)
    .where(
      sql`${siteSettingsTable.key} in ('scheduled_reports_enabled', 'scheduled_reports_cadence')`,
    );

  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;

  return res.json({
    enabled: map["scheduled_reports_enabled"] === "true",
    cadence: (map["scheduled_reports_cadence"] as "weekly" | "monthly") ?? "weekly",
  });
});

// ─── PATCH /api/admin/scheduled-report-settings ───────────────────────────────
router.patch("/admin/scheduled-report-settings", ...adminModerate, async (req, res) => {
  const schema = z.object({
    enabled: z.boolean().optional(),
    cadence: z.enum(["weekly", "monthly"]).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { enabled, cadence } = parsed.data;

  if (enabled !== undefined) {
    await db
      .insert(siteSettingsTable)
      .values({ key: "scheduled_reports_enabled", value: String(enabled) })
      .onConflictDoUpdate({
        target: siteSettingsTable.key,
        set: { value: String(enabled), updated_at: new Date() },
      });
  }

  if (cadence !== undefined) {
    await db
      .insert(siteSettingsTable)
      .values({ key: "scheduled_reports_cadence", value: cadence })
      .onConflictDoUpdate({
        target: siteSettingsTable.key,
        set: { value: cadence, updated_at: new Date() },
      });
  }

  void logAdminAction(
    req.user!.userId, req.user!.email,
    "update_scheduled_report_settings", "site_settings", undefined, req.ip,
    `enabled=${enabled ?? "unchanged"}, cadence=${cadence ?? "unchanged"}`,
  );

  return res.json({ ok: true, enabled, cadence });
});

// ─── POST /api/admin/reports/generate ────────────────────────────────────────
// Builds a report data snapshot from platform data and persists it.
router.post("/admin/reports/generate", ...adminModerate, async (req, res) => {
  const generateSchema = z.object({
    type: z.enum(["weekly", "monthly", "custom"]).default("custom"),
    date_range_start: z.string().min(1),
    date_range_end: z.string().min(1),
    title: z.string().optional(),
    filters: z.object({
      category: z.string().optional(),
      operator: z.string().optional(),
      region: z.string().optional(),
      listing_type: z.string().optional(),
      manufacturer: z.string().optional(),
      product_type: z.string().optional(),
    }).optional(),
  });

  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { type, date_range_start, date_range_end, title, filters } = parsed.data;
  const start = new Date(date_range_start);
  const end = new Date(date_range_end);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ error: "Invalid date range" });
  }
  if (start > end) {
    return res.status(400).json({ error: "date_range_start must be before date_range_end" });
  }

  // ── resolve region filter to a list of matching operator names (pre-query) ──
  let regionOpNames: string[] | null = null;
  if (filters?.region) {
    const matchingOps = await db
      .select({ name: operatorsTable.name })
      .from(operatorsTable)
      .where(ilike(operatorsTable.country, `%${filters.region}%`));
    regionOpNames = matchingOps.map((o) => o.name);
  }

  // ── Build query conditions ──
  const bidConds: SQL[] = [
    gte(bidsTable.created_at, start),
    lte(bidsTable.created_at, end),
  ];
  if (filters?.operator) bidConds.push(ilike(bidsTable.operator_name, `%${filters.operator}%`));
  if (regionOpNames !== null) {
    if (regionOpNames.length > 0) bidConds.push(inArray(bidsTable.operator_name, regionOpNames));
    else bidConds.push(sql`false`);
  }

  const reqConds: SQL[] = [
    gte(requestsTable.created_at, start),
    lte(requestsTable.created_at, end),
  ];
  if (filters?.product_type) reqConds.push(ilike(requestsTable.material_type, `%${filters.product_type}%`));

  const priceConditions: SQL[] = [
    gte(priceDataPointsTable.created_at, start),
    lte(priceDataPointsTable.created_at, end),
    eq(priceDataPointsTable.included_in_market_intelligence, true),
  ];
  if (filters?.category) priceConditions.push(eq(priceDataPointsTable.category, filters.category));

  // Manufacturer filter — applied to operator-linked bid data (operator name reflects the manufacturing company)
  if (filters?.manufacturer) bidConds.push(ilike(bidsTable.operator_name, `%${filters.manufacturer}%`));

  const [
    avgPriceRows,
    materialRows,
    requestsByMonthRows,
    bidsByMonthRows,
    acceptedBidRows,
    allBidsByOp,
    capacityListingCounts,
    productListingCounts,
  ] = await Promise.all([
    db
      .select({
        category: priceDataPointsTable.category,
        avg_price: sql<number>`avg(${priceDataPointsTable.quoted_price})`,
        cnt: count(),
      })
      .from(priceDataPointsTable)
      .where(and(...priceConditions))
      .groupBy(priceDataPointsTable.category)
      .orderBy(desc(count())),

    db
      .select({ material_type: requestsTable.material_type, cnt: count() })
      .from(requestsTable)
      .where(and(...reqConds))
      .groupBy(requestsTable.material_type)
      .orderBy(desc(count()))
      .limit(10),

    db
      .select({
        month: sql<string>`to_char(created_at, 'YYYY-MM')`,
        cnt: count(),
      })
      .from(requestsTable)
      .where(and(...reqConds))
      .groupBy(sql`to_char(created_at, 'YYYY-MM')`)
      .orderBy(sql`to_char(created_at, 'YYYY-MM')`),

    db
      .select({
        month: sql<string>`to_char(${bidsTable.created_at}, 'YYYY-MM')`,
        cnt: count(),
      })
      .from(bidsTable)
      .where(and(...bidConds))
      .groupBy(sql`to_char(${bidsTable.created_at}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${bidsTable.created_at}, 'YYYY-MM')`),

    db
      .select({
        price_per_kg: bidsTable.price_per_kg,
        platform_fee_rate: bidsTable.platform_fee_rate,
        quantity_kg: requestsTable.quantity_kg,
        month: sql<string>`to_char(${bidsTable.created_at}, 'YYYY-MM')`,
        operator_name: bidsTable.operator_name,
      })
      .from(bidsTable)
      .leftJoin(requestsTable, eq(bidsTable.request_id, requestsTable.id))
      .where(and(eq(bidsTable.status, "accepted"), ...bidConds)),

    db
      .select({ operator_name: bidsTable.operator_name, status: bidsTable.status, cnt: count() })
      .from(bidsTable)
      .where(and(...bidConds))
      .groupBy(bidsTable.operator_name, bidsTable.status),

    db.select({
      total: count(),
      approved: sql<number>`count(*) filter (where approval_status = 'approved')`,
    }).from(operatorListingsTable),

    db.select({
      total: count(),
      approved: sql<number>`count(*) filter (where approval_status = 'approved')`,
    }).from(operatorProductsTable),
  ]);

  const revenueByMonth: Record<string, number> = {};
  let totalContractValue = 0;
  let totalQtyKg = 0;
  for (const r of acceptedBidRows) {
    const key = r.month ?? "unknown";
    const val = (r.price_per_kg ?? 0) * (r.quantity_kg ?? 0);
    revenueByMonth[key] = (revenueByMonth[key] ?? 0) + val * historicalFeeRate(r.platform_fee_rate);
    totalContractValue += val;
    totalQtyKg += r.quantity_kg ?? 0;
  }

  const opStats: Record<string, { total: number; won: number }> = {};
  for (const r of allBidsByOp) {
    if (!opStats[r.operator_name]) opStats[r.operator_name] = { total: 0, won: 0 };
    opStats[r.operator_name].total += Number(r.cnt);
    if (r.status === "accepted") opStats[r.operator_name].won += Number(r.cnt);
  }

  const data_json = {
    avg_price_by_category: avgPriceRows.map((r) => ({
      category: r.category,
      avg_price: +(Number(r.avg_price)).toFixed(2),
      count: Number(r.cnt),
    })),
    top_materials: materialRows.map((r) => ({ name: r.material_type, value: Number(r.cnt) })),
    requests_by_month: requestsByMonthRows.map((r) => ({ month: r.month, value: Number(r.cnt) })),
    bids_by_month: bidsByMonthRows.map((r) => ({ month: r.month, value: Number(r.cnt) })),
    revenue_by_month: Object.entries(revenueByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({ month, value: +value.toFixed(2) })),
    operator_win_rates: Object.entries(opStats)
      .filter(([, s]) => s.total > 0)
      .map(([name, s]) => ({
        name: name.replace(" Freeze Dry", "").replace(" Solutions", ""),
        win_rate: +(s.won / s.total * 100).toFixed(0),
        total_bids: s.total,
        won_bids: s.won,
      }))
      .sort((a, b) => b.win_rate - a.win_rate)
      .slice(0, 10),
    sales_volume: {
      total_contracts: acceptedBidRows.length,
      total_quantity_kg: +totalQtyKg.toFixed(2),
      total_contract_value: +totalContractValue.toFixed(2),
      platform_fees: +Object.values(revenueByMonth).reduce((a, b) => a + b, 0).toFixed(2),
    },
    listing_performance: (() => {
      const showCapacity = filters?.listing_type !== "product";
      const showProduct = filters?.listing_type !== "capacity";
      return {
        total_capacity_listings: showCapacity ? Number(capacityListingCounts[0]?.total ?? 0) : 0,
        total_product_listings: showProduct ? Number(productListingCounts[0]?.total ?? 0) : 0,
        approved_capacity: showCapacity ? Number(capacityListingCounts[0]?.approved ?? 0) : 0,
        approved_products: showProduct ? Number(productListingCounts[0]?.approved ?? 0) : 0,
      };
    })(),
    summary: `Report covers ${date_range_start} to ${date_range_end}. ${acceptedBidRows.length} contracts completed. ${materialRows.length} material categories active.`,
  };

  const reportTitle = title ?? `${type.charAt(0).toUpperCase() + type.slice(1)} Report — ${date_range_start} to ${date_range_end}`;

  const [snapshot] = await db
    .insert(reportSnapshotsTable)
    .values({
      type,
      date_range_start: start,
      date_range_end: end,
      filters_json: filters ?? {},
      generated_by: req.user!.userId,
      generated_by_email: req.user!.email,
      title: reportTitle,
      data_json,
    })
    .returning();

  void logAdminAction(
    req.user!.userId, req.user!.email,
    "generate_report", "report", snapshot.id, req.ip,
    reportTitle
  );

  return res.status(201).json({
    ...snapshot,
    date_range_start: snapshot.date_range_start.toISOString(),
    date_range_end: snapshot.date_range_end.toISOString(),
    generated_at: snapshot.generated_at.toISOString(),
  });
});

// ─── GET /api/admin/reports ───────────────────────────────────────────────────
router.get("/admin/reports", ...adminOnly, async (_req, res) => {
  const reports = await db
    .select({
      id: reportSnapshotsTable.id,
      type: reportSnapshotsTable.type,
      title: reportSnapshotsTable.title,
      date_range_start: reportSnapshotsTable.date_range_start,
      date_range_end: reportSnapshotsTable.date_range_end,
      filters_json: reportSnapshotsTable.filters_json,
      generated_at: reportSnapshotsTable.generated_at,
      generated_by: reportSnapshotsTable.generated_by,
      generated_by_email: reportSnapshotsTable.generated_by_email,
    })
    .from(reportSnapshotsTable)
    .orderBy(desc(reportSnapshotsTable.generated_at))
    .limit(200);

  return res.json(reports.map((r) => ({
    ...r,
    date_range_start: r.date_range_start.toISOString(),
    date_range_end: r.date_range_end.toISOString(),
    generated_at: r.generated_at.toISOString(),
  })));
});

// ─── GET /api/admin/reports/:id ───────────────────────────────────────────────
router.get("/admin/reports/:id", ...adminOnly, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [report] = await db
    .select()
    .from(reportSnapshotsTable)
    .where(eq(reportSnapshotsTable.id, id))
    .limit(1);

  if (!report) return res.status(404).json({ error: "Report not found" });

  return res.json({
    ...report,
    date_range_start: report.date_range_start.toISOString(),
    date_range_end: report.date_range_end.toISOString(),
    generated_at: report.generated_at.toISOString(),
  });
});

// ─── DELETE /api/admin/reports/:id ────────────────────────────────────────────
router.delete("/admin/reports/:id", ...adminModerate, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [deleted] = await db
    .delete(reportSnapshotsTable)
    .where(eq(reportSnapshotsTable.id, id))
    .returning({ id: reportSnapshotsTable.id });

  if (!deleted) return res.status(404).json({ error: "Report not found" });

  void logAdminAction(req.user!.userId, req.user!.email, "delete_report", "report", id, req.ip);
  return res.json({ ok: true });
});

export default router;
