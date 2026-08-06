import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  requestsTable,
  bidsTable,
  operatorsTable,
  operatorListingsTable,
  operatorProductsTable,
  requestMessagesTable,
  messageReadsTable,
  buyerNotificationsTable,
  usersTable,
  listingNotificationsTable,
  pendingUploadsTable,
} from "@workspace/db/schema";
import { eq, sql, desc, and, inArray } from "drizzle-orm";
import { requireAuth, requireRole } from "../../middleware/requireAuth";
import { ObjectStorageService } from "../../lib/objectStorage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

// ─── Buyer Dashboard ─────────────────────────────────────────────────────────

router.get("/dashboard/buyer", requireAuth, requireRole("buyer"), async (req, res) => {
  const email = req.user!.email;

  // Buyer's requests + bid count
  const requests = await db
    .select()
    .from(requestsTable)
    .where(eq(requestsTable.buyer_email, email))
    .orderBy(desc(requestsTable.created_at));

  // Bids and messages on those requests
  const reqIds = requests.map((r) => r.id);
  let bids: typeof bidsTable.$inferSelect[] = [];
  let messageCounts: Record<number, number> = {};

  if (reqIds.length > 0) {
    bids = await db
      .select()
      .from(bidsTable)
      .where(inArray(bidsTable.request_id, reqIds))
      .orderBy(desc(bidsTable.created_at));

    // Fetch buyer's read cursors for their requests
    const readCursors = await db
      .select({
        request_id: messageReadsTable.request_id,
        last_read_at: messageReadsTable.last_read_at,
      })
      .from(messageReadsTable)
      .where(
        and(
          eq(messageReadsTable.user_id, req.user!.userId),
          inArray(messageReadsTable.request_id, reqIds)
        )
      );

    const cursorByRequest: Record<number, Date> = {};
    for (const c of readCursors) {
      cursorByRequest[c.request_id] = c.last_read_at;
    }

    // Count unread messages per request:
    // - messages not sent by the buyer themselves (sender_role != 'buyer')
    // - posted after the buyer's last_read_at cursor (or all if never read)
    const allMessages = await db
      .select({
        request_id: requestMessagesTable.request_id,
        sender_role: requestMessagesTable.sender_role,
        created_at: requestMessagesTable.created_at,
      })
      .from(requestMessagesTable)
      .where(inArray(requestMessagesTable.request_id, reqIds));

    for (const msg of allMessages) {
      if (msg.sender_role === "buyer") continue;
      const cursor = cursorByRequest[msg.request_id];
      if (!cursor || msg.created_at > cursor) {
        messageCounts[msg.request_id] = (messageCounts[msg.request_id] ?? 0) + 1;
      }
    }
  }

  // Group bids by request_id
  const bidsByRequest: Record<number, typeof bidsTable.$inferSelect[]> = {};
  for (const bid of bids) {
    if (!bidsByRequest[bid.request_id]) bidsByRequest[bid.request_id] = [];
    bidsByRequest[bid.request_id].push(bid);
  }

  const totalBidsReceived = bids.length;
  const activeRequests = requests.filter((r) => r.status !== "completed").length;
  const completedRequests = requests.filter((r) => r.status === "completed").length;

  // Total spend: sum of (budget_per_kg * quantity_kg) across all buyer requests
  const totalSpend = requests.reduce(
    (s, r) => s + (r.budget_per_kg ?? 0) * r.quantity_kg,
    0
  );

  return res.json({
    requests: requests.map((r) => ({
      ...r,
      created_at: r.created_at.toISOString(),
      unread_message_count: messageCounts[r.id] ?? 0,
      bids: (bidsByRequest[r.id] ?? []).map((b) => ({
        ...b,
        created_at: b.created_at.toISOString(),
      })),
    })),
    stats: {
      total_requests: requests.length,
      active_requests: activeRequests,
      completed_requests: completedRequests,
      total_bids_received: totalBidsReceived,
      total_spend: Number(totalSpend.toFixed(2)),
    },
  });
});

// ─── Operator Dashboard ───────────────────────────────────────────────────────

router.get("/dashboard/operator", requireAuth, requireRole("operator", "admin"), async (req, res) => {
  const userId = req.user!.userId;
  const { material, budget_min, budget_max } = req.query as {
    material?: string;
    budget_min?: string;
    budget_max?: string;
  };

  // Only show genuinely open (pending) requests to operators — never closed/removed/completed.
  const conditions = [eq(requestsTable.status, "pending")];
  if (material) {
    conditions.push(sql`lower(${requestsTable.material_type}) like ${`%${material.toLowerCase()}%`}`);
  }
  if (budget_min) {
    conditions.push(sql`${requestsTable.budget_per_kg} >= ${Number(budget_min)}`);
  }
  if (budget_max) {
    conditions.push(sql`${requestsTable.budget_per_kg} <= ${Number(budget_max)}`);
  }

  const openRequests = await db
    .select()
    .from(requestsTable)
    .where(and(...conditions))
    .orderBy(desc(requestsTable.created_at))
    .limit(50);

  // This operator's bid history (matched by user_id as operator_id), joined with request for quantity_kg
  const myBidsRaw = await db
    .select({
      id: bidsTable.id,
      request_id: bidsTable.request_id,
      operator_id: bidsTable.operator_id,
      operator_name: bidsTable.operator_name,
      price_per_kg: bidsTable.price_per_kg,
      turnaround_days: bidsTable.turnaround_days,
      notes: bidsTable.notes,
      status: bidsTable.status,
      fee_status: bidsTable.fee_status,
      stripe_session_id: bidsTable.stripe_session_id,
      escrow_status: bidsTable.escrow_status,
      escrow_amount_cents: bidsTable.escrow_amount_cents,
      created_at: bidsTable.created_at,
      quantity_kg: requestsTable.quantity_kg,
    })
    .from(bidsTable)
    .leftJoin(requestsTable, eq(bidsTable.request_id, requestsTable.id))
    .where(eq(bidsTable.operator_id, userId))
    .orderBy(desc(bidsTable.created_at))
    .limit(50);

  const myBids = myBidsRaw;

  const wonBids = myBids.filter((b) => b.status === "accepted");
  const lostBids = myBids.filter((b) => b.status === "rejected");

  const [operatorRow] = await db
    .select({ id: operatorsTable.id, audit_status: operatorsTable.audit_status })
    .from(operatorsTable)
    .where(eq(operatorsTable.user_id, userId))
    .limit(1);

  return res.json({
    open_requests: openRequests.map((r) => ({
      id: r.id,
      material_type: r.material_type,
      quantity_kg: r.quantity_kg,
      target_moisture: r.target_moisture,
      budget_per_kg: r.budget_per_kg,
      deadline: r.deadline,
      status: r.status,
      bid_count: r.bid_count,
      created_at: r.created_at.toISOString(),
      // buyer_email, special_requirements, moderation_note, moderated_by are intentionally omitted
    })),
    my_bids: myBids.map((b) => ({
      ...b,
      created_at: b.created_at.toISOString(),
    })),
    stats: {
      total_bids: myBids.length,
      won_bids: wonBids.length,
      lost_bids: lostBids.length,
      pending_bids: myBids.filter((b) => b.status === "pending").length,
    },
    operator: operatorRow ? { id: operatorRow.id, audit_status: operatorRow.audit_status } : null,
  });
});

// ─── Operator Listings (Capacity) ─────────────────────────────────────────────

router.get("/operator/listings", requireAuth, requireRole("operator", "admin"), async (req, res) => {
  const userId = req.user!.userId;
  const listings = await db
    .select()
    .from(operatorListingsTable)
    .where(eq(operatorListingsTable.user_id, userId))
    .orderBy(desc(operatorListingsTable.created_at));
  return res.json(listings.map((l) => ({ ...l, created_at: l.created_at.toISOString(), updated_at: l.updated_at.toISOString() })));
});

router.post("/operator/listings", requireAuth, requireRole("operator", "admin"), async (req, res) => {
  const userId = req.user!.userId;
  const { equipment_type, capacity_kg, certifications, price_per_kg_min, price_per_kg_max, turnaround_days, available, notes } = req.body;
  if (!equipment_type || !capacity_kg || !price_per_kg_min || !price_per_kg_max || !turnaround_days) {
    return res.status(400).json({ error: "Missing required fields: equipment_type, capacity_kg, price_per_kg_min, price_per_kg_max, turnaround_days" });
  }
  const capKg = Number(capacity_kg);
  const pMin = Number(price_per_kg_min);
  const pMax = Number(price_per_kg_max);
  const td = Number(turnaround_days);
  if (isNaN(capKg) || capKg <= 0 || isNaN(pMin) || pMin <= 0 || isNaN(pMax) || pMax <= 0 || pMax < pMin || isNaN(td) || td <= 0) {
    return res.status(400).json({ error: "Numeric fields must be positive; price_per_kg_max must be >= price_per_kg_min" });
  }
  const [listing] = await db
    .insert(operatorListingsTable)
    .values({
      user_id: userId,
      operator_id: userId, // canonical: user_id and operator_id are the same identity in auth model
      equipment_type,
      capacity_kg: capKg,
      certifications: Array.isArray(certifications) ? certifications : [],
      price_per_kg_min: pMin,
      price_per_kg_max: pMax,
      turnaround_days: td,
      available: available !== false,
      notes: notes ?? null,
    })
    .returning();
  return res.status(201).json({ ...listing, created_at: listing.created_at.toISOString(), updated_at: listing.updated_at.toISOString() });
});

router.put("/operator/listings/:id", requireAuth, requireRole("operator", "admin"), async (req, res) => {
  const userId = req.user!.userId;
  const id = Number(req.params.id);
  const { equipment_type, capacity_kg, certifications, price_per_kg_min, price_per_kg_max, turnaround_days, available, notes } = req.body;

  // Check current approval_status so we can reset it if the listing was rejected
  const [existing] = await db
    .select({ approval_status: operatorListingsTable.approval_status })
    .from(operatorListingsTable)
    .where(and(eq(operatorListingsTable.id, id), eq(operatorListingsTable.user_id, userId)))
    .limit(1);
  if (!existing) return res.status(404).json({ error: "Listing not found" });

  const resubmit = existing.approval_status === "rejected";

  const [listing] = await db
    .update(operatorListingsTable)
    .set({
      equipment_type,
      capacity_kg: capacity_kg !== undefined ? Number(capacity_kg) : undefined,
      certifications,
      price_per_kg_min: price_per_kg_min !== undefined ? Number(price_per_kg_min) : undefined,
      price_per_kg_max: price_per_kg_max !== undefined ? Number(price_per_kg_max) : undefined,
      turnaround_days: turnaround_days !== undefined ? Number(turnaround_days) : undefined,
      available,
      notes,
      updated_at: new Date(),
      ...(resubmit ? { approval_status: "pending", approval_reason: null } : {}),
    })
    .where(and(eq(operatorListingsTable.id, id), eq(operatorListingsTable.user_id, userId)))
    .returning();
  if (!listing) return res.status(404).json({ error: "Listing not found" });
  return res.json({ ...listing, created_at: listing.created_at.toISOString(), updated_at: listing.updated_at.toISOString() });
});

router.delete("/operator/listings/:id", requireAuth, requireRole("operator", "admin"), async (req, res) => {
  const userId = req.user!.userId;
  const id = Number(req.params.id);
  await db
    .delete(operatorListingsTable)
    .where(and(eq(operatorListingsTable.id, id), eq(operatorListingsTable.user_id, userId)));
  return res.json({ ok: true });
});

// ─── Operator Products (Finished Goods) ───────────────────────────────────────

router.get("/operator/products", requireAuth, requireRole("operator", "admin"), async (req, res) => {
  const userId = req.user!.userId;
  const products = await db
    .select()
    .from(operatorProductsTable)
    .where(eq(operatorProductsTable.user_id, userId))
    .orderBy(desc(operatorProductsTable.created_at));
  return res.json(products.map((p) => ({ ...p, created_at: p.created_at.toISOString(), updated_at: p.updated_at.toISOString() })));
});

router.post("/operator/products", requireAuth, requireRole("operator", "admin"), async (req, res) => {
  const userId = req.user!.userId;
  const operatorName = req.user!.name;
  const { name, material_type, weight_kg, moisture_pct, price_per_unit, moq, available, description, contact_email } = req.body;
  if (!name || !material_type || !weight_kg || !price_per_unit) {
    return res.status(400).json({ error: "Missing required fields: name, material_type, weight_kg, price_per_unit" });
  }
  const wKg = Number(weight_kg);
  const pUnit = Number(price_per_unit);
  const moqN = moq !== undefined ? Number(moq) : 1;
  const moistN = moisture_pct !== undefined ? Number(moisture_pct) : null;
  if (isNaN(wKg) || wKg <= 0 || isNaN(pUnit) || pUnit <= 0 || isNaN(moqN) || moqN < 1) {
    return res.status(400).json({ error: "weight_kg and price_per_unit must be positive; moq must be >= 1" });
  }
  if (moistN !== null && (isNaN(moistN) || moistN < 0 || moistN > 100)) {
    return res.status(400).json({ error: "moisture_pct must be between 0 and 100" });
  }
  const [product] = await db
    .insert(operatorProductsTable)
    .values({
      user_id: userId,
      operator_name: operatorName,
      name,
      material_type,
      weight_kg: wKg,
      moisture_pct: moistN,
      price_per_unit: pUnit,
      moq: moqN,
      available: available !== false,
      description: description ?? null,
      contact_email: contact_email ?? req.user!.email,
    })
    .returning();
  return res.status(201).json({ ...product, created_at: product.created_at.toISOString(), updated_at: product.updated_at.toISOString() });
});

router.put("/operator/products/:id", requireAuth, requireRole("operator", "admin"), async (req, res) => {
  const userId = req.user!.userId;
  const id = Number(req.params.id);
  const { name, material_type, weight_kg, moisture_pct, price_per_unit, moq, available, description, contact_email } = req.body;

  // Check current approval_status so we can reset it if the product was rejected
  const [existing] = await db
    .select({ approval_status: operatorProductsTable.approval_status })
    .from(operatorProductsTable)
    .where(and(eq(operatorProductsTable.id, id), eq(operatorProductsTable.user_id, userId)))
    .limit(1);
  if (!existing) return res.status(404).json({ error: "Product not found" });

  const resubmit = existing.approval_status === "rejected";

  const [product] = await db
    .update(operatorProductsTable)
    .set({
      name,
      material_type,
      weight_kg: weight_kg !== undefined ? Number(weight_kg) : undefined,
      moisture_pct: moisture_pct !== undefined ? Number(moisture_pct) : undefined,
      price_per_unit: price_per_unit !== undefined ? Number(price_per_unit) : undefined,
      moq: moq !== undefined ? Number(moq) : undefined,
      available,
      description,
      contact_email,
      updated_at: new Date(),
      ...(resubmit ? { approval_status: "pending", approval_reason: null } : {}),
    })
    .where(and(eq(operatorProductsTable.id, id), eq(operatorProductsTable.user_id, userId)))
    .returning();
  if (!product) return res.status(404).json({ error: "Product not found" });
  return res.json({ ...product, created_at: product.created_at.toISOString(), updated_at: product.updated_at.toISOString() });
});

router.delete("/operator/products/:id", requireAuth, requireRole("operator", "admin"), async (req, res) => {
  const userId = req.user!.userId;
  const id = Number(req.params.id);
  await db
    .delete(operatorProductsTable)
    .where(and(eq(operatorProductsTable.id, id), eq(operatorProductsTable.user_id, userId)));
  return res.json({ ok: true });
});

// ─── Operator Cert Documents ──────────────────────────────────────────────────

// GET /api/operator/profile — return the operator record (certifications + cert_documents)
router.get("/operator/profile", requireAuth, requireRole("operator", "admin"), async (req, res) => {
  const userId = req.user!.userId;
  const [op] = await db
    .select({
      id: operatorsTable.id,
      name: operatorsTable.name,
      certifications: operatorsTable.certifications,
      verified_certifications: operatorsTable.verified_certifications,
      cert_documents: operatorsTable.cert_documents,
    })
    .from(operatorsTable)
    .where(eq(operatorsTable.user_id, userId))
    .limit(1);
  if (!op) return res.status(404).json({ error: "Operator profile not found" });
  return res.json({ ...op, cert_documents: op.cert_documents ?? {} });
});

// PATCH /api/operator/cert-documents — set objectPath for a single cert (or clear it)
// Body: { cert: string, objectPath: string | null }
router.patch("/operator/cert-documents", requireAuth, requireRole("operator", "admin"), async (req, res) => {
  const userId = req.user!.userId;
  const { cert, objectPath } = req.body as { cert?: string; objectPath?: string | null };
  if (typeof cert !== "string" || !cert.trim()) {
    return res.status(400).json({ error: "cert is required" });
  }

  const [op] = await db
    .select({ id: operatorsTable.id, cert_documents: operatorsTable.cert_documents })
    .from(operatorsTable)
    .where(eq(operatorsTable.user_id, userId))
    .limit(1);
  if (!op) return res.status(404).json({ error: "Operator profile not found" });

  const current: Record<string, string> = (op.cert_documents as Record<string, string>) ?? {};
  let updated: Record<string, string>;
  if (objectPath) {
    if (typeof objectPath !== "string" || !objectPath.startsWith("/objects/uploads/")) {
      return res.status(422).json({ error: "Invalid object path" });
    }

    const [pending] = await db
      .select({ id: pendingUploadsTable.id })
      .from(pendingUploadsTable)
      .where(
        and(
          eq(pendingUploadsTable.user_id, userId),
          eq(pendingUploadsTable.object_path, objectPath),
          eq(pendingUploadsTable.consumed, false),
        ),
      )
      .limit(1);

    if (!pending) {
      return res.status(422).json({ error: "Invalid object path" });
    }

    await db
      .update(pendingUploadsTable)
      .set({ consumed: true })
      .where(eq(pendingUploadsTable.id, pending.id));

    updated = { ...current, [cert]: objectPath };
  } else {
    const { [cert]: removedPath, ...rest } = current;
    updated = rest;

    if (removedPath && removedPath.startsWith("/objects/uploads/")) {
      try {
        await objectStorageService.deleteObjectEntity(removedPath);
        await db
          .update(operatorsTable)
          .set({ upload_count: sql`GREATEST(${operatorsTable.upload_count} - 1, 0)` })
          .where(eq(operatorsTable.id, op.id));
      } catch (err) {
        req.log.warn({ err, objectPath: removedPath }, "Failed to delete cert object from storage");
      }
    }
  }

  const [result] = await db
    .update(operatorsTable)
    .set({ cert_documents: updated })
    .where(eq(operatorsTable.id, op.id))
    .returning({ cert_documents: operatorsTable.cert_documents });

  return res.json({ ok: true, cert_documents: result?.cert_documents ?? {} });
});

// ─── Operator Jobs (job tracking for won bids) ───────────────────────────────

router.get("/operator/jobs", requireAuth, requireRole("operator", "admin"), async (req, res) => {
  const userId = req.user!.userId;

  const jobs = await db
    .select({
      // bid fields
      bid_id: bidsTable.id,
      request_id: bidsTable.request_id,
      price_per_kg: bidsTable.price_per_kg,
      turnaround_days: bidsTable.turnaround_days,
      escrow_status: bidsTable.escrow_status,
      escrow_amount_cents: bidsTable.escrow_amount_cents,
      bid_created_at: bidsTable.created_at,
      job_status: bidsTable.job_status,
      job_status_note: bidsTable.job_status_note,
      materials_received_at: bidsTable.materials_received_at,
      processing_start_date: bidsTable.processing_start_date,
      job_status_updated_at: bidsTable.job_status_updated_at,
      // request fields
      material_type: requestsTable.material_type,
      quantity_kg: requestsTable.quantity_kg,
      deadline: requestsTable.deadline,
      buyer_email: requestsTable.buyer_email,
      special_requirements: requestsTable.special_requirements,
    })
    .from(bidsTable)
    .innerJoin(requestsTable, eq(bidsTable.request_id, requestsTable.id))
    .where(and(eq(bidsTable.operator_id, userId), eq(bidsTable.status, "accepted")))
    .orderBy(desc(bidsTable.created_at));

  res.json(jobs.map(j => ({
    ...j,
    bid_created_at: j.bid_created_at.toISOString(),
    materials_received_at: j.materials_received_at?.toISOString() ?? null,
    job_status_updated_at: j.job_status_updated_at?.toISOString() ?? null,
  })));
});

// PATCH /bids/:id/job-status — operator updates job status / logs materials / reports issue
// Body: { job_status, job_status_note?, processing_start_date? }
router.patch("/bids/:id/job-status", requireAuth, requireRole("operator", "admin"), async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const bidId = parseInt(String(req.params.id), 10);
  if (isNaN(bidId)) { res.status(400).json({ error: "Invalid bid id" }); return; }

  const { job_status, job_status_note, processing_start_date } = req.body as {
    job_status: string;
    job_status_note?: string;
    processing_start_date?: string;
  };

  const validStatuses = ["pending_materials", "materials_received", "in_process", "done", "issue"];
  if (!validStatuses.includes(job_status)) {
    res.status(400).json({ error: "Invalid job_status" }); return;
  }

  // Verify ownership and that escrow has been funded
  const [bid] = await db
    .select({
      id: bidsTable.id,
      request_id: bidsTable.request_id,
      operator_name: bidsTable.operator_name,
      price_per_kg: bidsTable.price_per_kg,
      escrow_status: bidsTable.escrow_status,
      quantity_kg: requestsTable.quantity_kg,
      buyer_email: requestsTable.buyer_email,
      material_type: requestsTable.material_type,
    })
    .from(bidsTable)
    .innerJoin(requestsTable, eq(bidsTable.request_id, requestsTable.id))
    .where(and(eq(bidsTable.id, bidId), eq(bidsTable.operator_id, userId), eq(bidsTable.status, "accepted")))
    .limit(1);

  if (!bid) { res.status(404).json({ error: "Job not found or not yours" }); return; }

  // Escrow must be authorized (buyer has paid into escrow) before the operator
  // can advance job status. This prevents operators from treating an accepted-but-
  // unfunded contract as a live job.
  if (bid.escrow_status !== "authorized" && bid.escrow_status !== "captured") {
    res.status(402).json({
      error: "Escrow payment has not been authorized for this contract. The buyer must complete the escrow checkout before job status can be updated.",
    });
    return;
  }

  const now = new Date();
  const updatePayload: Record<string, unknown> = {
    job_status,
    job_status_note: job_status_note ?? null,
    job_status_updated_at: now,
  };
  if (job_status === "materials_received") {
    updatePayload.materials_received_at = now;
    if (processing_start_date) updatePayload.processing_start_date = processing_start_date;
  }

  await db.update(bidsTable).set(updatePayload).where(eq(bidsTable.id, bidId));

  // ── Compose message to buyer ──────────────────────────────────────────────
  const msgMap: Record<string, string> = {
    materials_received: processing_start_date
      ? `Your raw materials have been received by ${bid.operator_name}. Processing is scheduled to begin on ${processing_start_date}. We will update you when processing starts.`
      : `Your raw materials have been received by ${bid.operator_name}. We will notify you when processing starts.`,
    in_process: `Your freeze-drying batch (${bid.material_type}, ${bid.quantity_kg} kg) is now in process at ${bid.operator_name}. We'll notify you when it's ready for shipment.`,
    done: `Your batch has been fully processed and is ready. ${bid.operator_name} will arrange delivery/shipping. Please confirm receipt once you have your materials.`,
    issue: `${bid.operator_name} has reported an issue with your order: "${job_status_note ?? "No details provided"}". Please check your messages and contact the operator to resolve this.`,
    pending_materials: `${bid.operator_name} is awaiting your raw materials. Please ship as soon as possible.`,
  };

  const msgBody = msgMap[job_status] ?? `Job status updated to: ${job_status}`;

  // Post system message to request thread
  await db.insert(requestMessagesTable).values({
    request_id: bid.request_id,
    user_id: userId,
    sender_name: bid.operator_name,
    sender_role: "operator",
    body: `[Job Update] ${msgBody}`,
  });

  // Create buyer notification
  const [buyerUser] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, bid.buyer_email))
    .limit(1);

  if (buyerUser) {
    await db.insert(buyerNotificationsTable).values({
      buyer_user_id: buyerUser.id,
      request_id: bid.request_id,
      bid_id: bidId,
      message: msgBody,
      read: false,
    });
  }

  res.json({ ok: true, job_status, bid_id: bidId });
});

// ─── Marketplace Products (public) ───────────────────────────────────────────

// PATCH /operator/certifications — let operators manage their own claimed certifications
router.patch("/operator/certifications", requireAuth, requireRole("operator", "admin"), async (req, res) => {
  const userId = req.user!.userId;
  const { certifications } = req.body as { certifications: unknown };

  if (!Array.isArray(certifications) || certifications.some((c) => typeof c !== "string")) {
    return res.status(400).json({ error: "certifications must be an array of strings." });
  }

  const CERT_OPTIONS = ["GMP", "HACCP", "FDA", "ISO", "Organic", "Kosher", "Halal"];
  const valid = (certifications as string[]).filter((c) => CERT_OPTIONS.includes(c));

  const [op] = await db
    .select({ id: operatorsTable.id, verified_certifications: operatorsTable.verified_certifications })
    .from(operatorsTable)
    .where(eq(operatorsTable.user_id, userId))
    .limit(1);

  if (!op) return res.status(404).json({ error: "Operator profile not found." });

  const updatedVerified = (op.verified_certifications ?? []).filter((vc) => valid.includes(vc));

  await db
    .update(operatorsTable)
    .set({ certifications: valid, verified_certifications: updatedVerified })
    .where(eq(operatorsTable.id, op.id));

  return res.json({ ok: true, certifications: valid, verified_certifications: updatedVerified });
});

// GET /api/listing-notifications/me — operator reads their own approval/rejection notifications
router.get("/listing-notifications/me", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const notifications = await db
    .select()
    .from(listingNotificationsTable)
    .where(eq(listingNotificationsTable.user_id, userId))
    .orderBy(desc(listingNotificationsTable.created_at))
    .limit(50);
  return res.json(notifications);
});

// PATCH /api/listing-notifications/me/:id/read — mark a notification as read
router.patch("/listing-notifications/me/:id/read", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const notifId = parseInt(String(req.params.id), 10);
  const [notif] = await db.select().from(listingNotificationsTable).where(eq(listingNotificationsTable.id, notifId)).limit(1);
  if (!notif || notif.user_id !== userId) return res.status(404).json({ error: "Not found" });
  await db.update(listingNotificationsTable).set({ read: true }).where(eq(listingNotificationsTable.id, notifId));
  return res.json({ ok: true });
});

router.get("/marketplace/products", async (req, res) => {
  const { material } = req.query as { material?: string };
  let query = db
    .select()
    .from(operatorProductsTable)
    .where(and(eq(operatorProductsTable.available, true), eq(operatorProductsTable.approval_status, "approved")))
    .orderBy(desc(operatorProductsTable.created_at))
    .$dynamic();

  if (material && material !== "all") {
    query = query.where(and(
      eq(operatorProductsTable.available, true),
      eq(operatorProductsTable.approval_status, "approved"),
      eq(operatorProductsTable.material_type, material)
    ));
  }

  const products = await query.limit(100);
  return res.json(products.map((p) => ({ ...p, created_at: p.created_at.toISOString(), updated_at: p.updated_at.toISOString() })));
});

export default router;
