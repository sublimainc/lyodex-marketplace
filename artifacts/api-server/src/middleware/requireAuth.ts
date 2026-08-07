import type { Request, Response, NextFunction } from "express";
import { verifyToken, COOKIE_NAME, type JwtPayload } from "../lib/auth";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { hasCapability, type AdminCapability } from "../lib/adminPermissions";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    res.status(401).json({ error: "Unauthenticated" });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }

  // Validate the session against the live database on every request.
  // This closes the revocation gap: bans, lockouts, and password resets take
  // effect immediately rather than waiting for JWT expiry.
  const [dbUser] = await db
    .select({
      banned: usersTable.banned,
      locked_until: usersTable.locked_until,
      session_version: usersTable.session_version,
      role: usersTable.role,
      admin_role: usersTable.admin_role,
    })
    .from(usersTable)
    .where(eq(usersTable.id, payload.userId))
    .limit(1);

  if (!dbUser) {
    res.status(401).json({ error: "Account not found" });
    return;
  }
  if (dbUser.banned) {
    res.status(403).json({ error: "Account suspended. Contact support." });
    return;
  }
  if (dbUser.locked_until && dbUser.locked_until > new Date()) {
    res.status(403).json({ error: "Account temporarily locked. Please try again later." });
    return;
  }
  if (dbUser.session_version !== payload.sessionVersion) {
    res.status(401).json({ error: "Session expired. Please log in again." });
    return;
  }

  // The database is the authority on privilege, not the token. A role change or
  // sub-role demotion therefore applies on the very next request rather than
  // after the token expires.
  req.user = { ...payload, role: dbUser.role, adminRole: dbUser.admin_role };
  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    const payload = verifyToken(token);
    if (payload) req.user = payload;
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthenticated" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

/**
 * Gate an admin route on a specific capability.
 *
 * Must be mounted after `requireAuth` and `requireRole("admin")` so that
 * `req.user.adminRole` is populated from the database.
 */
export function requireAdminCapability(capability: AdminCapability) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthenticated" });
      return;
    }
    if (req.user.role !== "admin") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (!hasCapability(req.user.adminRole, capability)) {
      res.status(403).json({
        error: `Your admin role does not permit this action (requires: ${capability})`,
      });
      return;
    }
    next();
  };
}
