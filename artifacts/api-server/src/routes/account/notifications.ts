import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { buyerNotificationsTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../../middleware/requireAuth";

const router: IRouter = Router();

// ─── GET /api/buyer/notifications ────────────────────────────────────────────
// Returns the 30 most recent notifications for the authenticated buyer,
// ordered newest first. Includes both read and unread so the dropdown can
// show history; the client uses the `read` flag for badge counts.
router.get("/buyer/notifications", requireAuth, requireRole("buyer", "admin"), async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  const rows = await db
    .select()
    .from(buyerNotificationsTable)
    .where(eq(buyerNotificationsTable.buyer_user_id, userId))
    .orderBy(desc(buyerNotificationsTable.created_at))
    .limit(30);

  res.json(rows.map(n => ({
    ...n,
    created_at: n.created_at.toISOString(),
  })));
});

// ─── POST /api/buyer/notifications/:id/read ──────────────────────────────────
// Marks a single notification as read. Returns 404 if the notification does
// not belong to the authenticated user (prevents cross-user reads).
router.post("/buyer/notifications/:id/read", requireAuth, requireRole("buyer", "admin"), async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid notification id" });
    return;
  }

  const userId = req.user!.userId;

  const [updated] = await db
    .update(buyerNotificationsTable)
    .set({ read: true })
    .where(and(
      eq(buyerNotificationsTable.id, id),
      eq(buyerNotificationsTable.buyer_user_id, userId),
    ))
    .returning({ id: buyerNotificationsTable.id });

  if (!updated) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }

  res.json({ ok: true });
});

// ─── POST /api/buyer/notifications/clear ─────────────────────────────────────
// Marks all of the authenticated buyer's notifications as read.
router.post("/buyer/notifications/clear", requireAuth, requireRole("buyer", "admin"), async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  await db
    .update(buyerNotificationsTable)
    .set({ read: true })
    .where(eq(buyerNotificationsTable.buyer_user_id, userId));

  res.json({ ok: true });
});

export default router;
