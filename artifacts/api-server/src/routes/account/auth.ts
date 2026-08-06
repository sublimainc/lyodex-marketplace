import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { randomBytes } from "crypto";
import { db } from "@workspace/db";
import { usersTable, operatorsTable, adminAuditLogsTable, requestsTable } from "@workspace/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { z } from "zod/v4";
import {
  signToken,
  hashPassword,
  comparePassword,
  COOKIE_NAME,
  COOKIE_MAX_AGE,
  IS_PRODUCTION,
} from "../../lib/auth";
import { requireAuth } from "../../middleware/requireAuth";
import { logger } from "../../lib/logger";
import { sendPasswordResetEmail } from "../../lib/email";

const router: IRouter = Router();

// ─── Rate limiting ────────────────────────────────────────────────────────────
// Login: max 10 attempts per 15 minutes per IP.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
  skip: () => !IS_PRODUCTION, // disabled in dev so demos / tests are unaffected
});

// Register: max 5 new accounts per hour per IP.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many registration attempts. Please try again later." },
  skip: () => !IS_PRODUCTION,
});

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["buyer", "operator"]),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: IS_PRODUCTION,
    maxAge: COOKIE_MAX_AGE,
  };
}

router.post("/auth/register", registerLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
  }
  const { name, email, password, role } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const password_hash = await hashPassword(password);
  const [user] = await db.insert(usersTable).values({ name, email, password_hash, role }).returning();

  // Operator users get a placeholder profile so admin audit actions are always deterministic
  if (role === "operator") {
    await db.insert(operatorsTable).values({
      user_id: user.id,
      name,
      location: "TBD",
      description: null,
      capacity_kg: 0,
      price_per_kg: 0,
      certifications: [],
      turnaround_days: 0,
      rating: 0,
      review_count: 0,
      available: false,
    });
  }

  const token = signToken({ userId: user.id, email: user.email, role: user.role, name: user.name, sessionVersion: user.session_version, adminRole: user.admin_role });
  res.cookie(COOKIE_NAME, token, cookieOptions());

  return res.status(201).json({ userId: user.id, name: user.name, email: user.email, role: user.role });
});

router.post("/auth/login", loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }
  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    // Constant-time-ish response — don't reveal email existence
    return res.status(401).json({ error: "Invalid email or password" });
  }

  if (user.banned === true) {
    return res.status(403).json({ error: "Account suspended. Contact support." });
  }

  // ── Failed-login lockout check ─────────────────────────────────────────────
  if (user.locked_until && user.locked_until > new Date()) {
    const minutesLeft = Math.ceil((user.locked_until.getTime() - Date.now()) / 60_000);
    logger.warn({ email, ip: req.ip }, `Login blocked — account locked for ${minutesLeft} more minute(s)`);
    return res.status(429).json({
      error: `Account temporarily locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`,
    });
  }

  const ok = await comparePassword(password, user.password_hash);
  if (!ok) {
    // Increment failure counter; lock after MAX_FAILED_ATTEMPTS
    const newCount = (user.failed_login_count ?? 0) + 1;
    const shouldLock = newCount >= MAX_FAILED_ATTEMPTS;
    const lockedUntil = shouldLock
      ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
      : null;

    await db.update(usersTable).set({
      failed_login_count: newCount,
      locked_until: lockedUntil,
    }).where(eq(usersTable.id, user.id));

    if (shouldLock) {
      logger.warn({ email, ip: req.ip, attempts: newCount }, "Account locked after too many failed login attempts");
      return res.status(429).json({
        error: `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`,
      });
    }

    return res.status(401).json({ error: "Invalid email or password" });
  }

  // ── Success: reset failure counter ────────────────────────────────────────
  if ((user.failed_login_count ?? 0) > 0 || user.locked_until) {
    await db.update(usersTable).set({
      failed_login_count: 0,
      locked_until: null,
    }).where(eq(usersTable.id, user.id));
  }

  // ── Admin login audit log ─────────────────────────────────────────────────
  if (user.role === "admin") {
    try {
      await db.insert(adminAuditLogsTable).values({
        admin_id: user.id,
        admin_email: user.email,
        action: "admin_login",
        entity_type: null,
        entity_id: null,
        ip_address: req.ip ?? null,
        notes: `User-Agent: ${String(req.headers["user-agent"] ?? "unknown").slice(0, 200)}`,
      });
    } catch (err) {
      logger.error({ err }, "Failed to write admin login audit log");
    }
  }

  const token = signToken({ userId: user.id, email: user.email, role: user.role, name: user.name, sessionVersion: user.session_version, adminRole: user.admin_role });
  res.cookie(COOKIE_NAME, token, cookieOptions());

  return res.json({ userId: user.id, name: user.name, email: user.email, role: user.role });
});

router.post("/auth/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: "lax", secure: IS_PRODUCTION });
  return res.json({ ok: true });
});

// ─── Rate limiting for password reset ────────────────────────────────────────
const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait 15 minutes before trying again." },
  skip: () => !IS_PRODUCTION,
});

const RESET_EXPIRES_MINUTES = 30;

// POST /auth/forgot-password — generates a reset token and emails the user
router.post("/auth/forgot-password", forgotLimiter, async (req, res) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "A valid email address is required." });
  }

  const { email } = parsed.data;

  // Always return 200 to prevent email enumeration
  const [user] = await db
    .select({ id: usersTable.id, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (user) {
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + RESET_EXPIRES_MINUTES * 60_000);

    await db.update(usersTable).set({
      password_reset_token: token,
      password_reset_expires: expires,
    }).where(eq(usersTable.id, user.id));

    sendPasswordResetEmail({ email, resetToken: token, expiresInMinutes: RESET_EXPIRES_MINUTES })
      .catch(err => logger.warn({ err, email }, "Failed to send password reset email"));

    logger.info({ userId: user.id, email }, "Password reset token issued");
  } else {
    logger.info({ email }, "Password reset requested for unknown email (ignored)");
  }

  return res.json({ ok: true, message: "If that email exists in our system, a reset link has been sent." });
});

// POST /auth/reset-password — validates token and sets new password
router.post("/auth/reset-password", async (req, res) => {
  const parsed = z.object({
    token: z.string().min(1),
    password: z.string().min(8),
  }).safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "Token and a password of at least 8 characters are required." });
  }

  const { token, password } = parsed.data;

  const [user] = await db
    .select({ id: usersTable.id, email: usersTable.email, role: usersTable.role, name: usersTable.name, admin_role: usersTable.admin_role, password_reset_expires: usersTable.password_reset_expires, session_version: usersTable.session_version })
    .from(usersTable)
    .where(and(
      eq(usersTable.password_reset_token, token),
      gt(usersTable.password_reset_expires, new Date()),
    ))
    .limit(1);

  if (!user) {
    return res.status(400).json({ error: "This reset link is invalid or has expired. Please request a new one." });
  }

  const password_hash = await hashPassword(password);

  // Bump session_version to invalidate all previously issued JWTs for this account.
  const newSessionVersion = user.session_version + 1;

  await db.update(usersTable).set({
    password_hash,
    password_reset_token: null,
    password_reset_expires: null,
    failed_login_count: 0,
    locked_until: null,
    session_version: newSessionVersion,
  }).where(eq(usersTable.id, user.id));

  logger.info({ userId: user.id, email: user.email }, "Password reset successfully — all prior sessions invalidated");

  // Sign a new session so the user is immediately logged in
  const newToken = signToken({ userId: user.id, email: user.email, role: user.role, name: user.name, sessionVersion: newSessionVersion, adminRole: user.admin_role });
  res.cookie(COOKIE_NAME, newToken, cookieOptions());

  return res.json({ ok: true, role: user.role });
});

// PATCH /auth/profile — update own name/email/password (any authenticated user)
router.patch("/auth/profile", requireAuth, async (req, res) => {
  const parsed = z.object({
    name: z.string().min(1).max(100).optional(),
    email: z.string().email().optional(),
    current_password: z.string().optional(),
    new_password: z.string().min(8).optional(),
  }).safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input.", details: parsed.error.issues });
  }

  const { name, email, current_password, new_password } = parsed.data;
  const userId = req.user!.userId;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) return res.status(404).json({ error: "User not found." });

  const updates: Partial<typeof usersTable.$inferInsert> = {};

  if (name) updates.name = name;

  if (email && email !== user.email) {
    const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length > 0) return res.status(409).json({ error: "That email address is already in use." });
    updates.email = email;
  }

  if (new_password) {
    if (!current_password) return res.status(400).json({ error: "Current password is required to set a new one." });
    const ok = await comparePassword(current_password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Current password is incorrect." });
    updates.password_hash = await hashPassword(new_password);
    // Bump session_version to invalidate all prior sessions when password changes.
    updates.session_version = user.session_version + 1;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No changes to save." });
  }

  const finalEmail = (updates.email as string | undefined) ?? user.email;
  const finalName = (updates.name as string | undefined) ?? user.name;
  const finalSessionVersion = (updates.session_version as number | undefined) ?? user.session_version;

  // Cascade email change to all buyer requests so ownership stays anchored to
  // the user's current email. Without this, the old address becomes orphaned on
  // requests and a new registrant could inherit access by claiming the old email.
  if (updates.email) {
    await db.transaction(async (tx) => {
      await tx.update(usersTable).set(updates).where(eq(usersTable.id, userId));
      await tx.update(requestsTable)
        .set({ buyer_email: updates.email as string })
        .where(eq(requestsTable.buyer_email, user.email));
    });
  } else {
    await db.update(usersTable).set(updates).where(eq(usersTable.id, userId));
  }

  const newToken = signToken({ userId: user.id, email: finalEmail, role: user.role, name: finalName, sessionVersion: finalSessionVersion, adminRole: user.admin_role });
  res.cookie(COOKIE_NAME, newToken, cookieOptions());

  logger.info({ userId, updates: Object.keys(updates) }, "User profile updated");
  return res.json({ ok: true, name: finalName, email: finalEmail });
});

// Both /api/auth/me and /api/me are supported.
// Returns live data from the database so the browser always reflects the
// current account state (not a stale JWT snapshot).
router.get("/auth/me", requireAuth, async (req, res) => {
  const [user] = await db
    .select({ userId: usersTable.id, email: usersTable.email, role: usersTable.role, name: usersTable.name, admin_role: usersTable.admin_role })
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.userId))
    .limit(1);
  if (!user) return res.status(401).json({ error: "Account not found" });
  return res.json(user);
});

router.get("/me", requireAuth, async (req, res) => {
  const [user] = await db
    .select({ userId: usersTable.id, email: usersTable.email, role: usersTable.role, name: usersTable.name, admin_role: usersTable.admin_role })
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.userId))
    .limit(1);
  if (!user) return res.status(401).json({ error: "Account not found" });
  return res.json(user);
});

// GET /auth/notification-prefs — return current notification preferences
router.get("/auth/notification-prefs", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const [user] = await db
    .select({ notification_prefs: usersTable.notification_prefs })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  return res.json(user?.notification_prefs ?? {});
});

// PATCH /auth/notification-prefs — update notification preferences
router.patch("/auth/notification-prefs", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const parsed = z.record(z.string(), z.boolean()).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid preferences format." });
  }
  await db
    .update(usersTable)
    .set({ notification_prefs: parsed.data })
    .where(eq(usersTable.id, userId));
  return res.json({ ok: true });
});

export default router;
