import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET environment variable is required in production. " +
        "Set it to a random 32+ character string in the Replit Secrets panel.",
    );
  }

  // Development only: auto-generate a per-process secret with a loud warning.
  // Tokens will be invalidated on each server restart — set JWT_SECRET to avoid this.
  const generated = require("crypto").randomBytes(48).toString("hex");
  console.warn(
    "[AUTH] JWT_SECRET not set — using a per-process generated secret (dev only).\n" +
      "       Set JWT_SECRET in the Replit Secrets panel for stable tokens across restarts.",
  );
  return generated;
}

// Resolved once at startup
const JWT_SECRET = getJwtSecret();

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const COOKIE_NAME = "lyodex_token";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
  name: string;
  sessionVersion: number;
  /**
   * Admin sub-role at the time the token was issued.
   *
   * Carried for convenience only — requireAuth re-reads this column from the
   * database on every request and overwrites it, so a demotion takes effect
   * immediately instead of waiting out the 7-day token lifetime. Never
   * authorize from the token copy alone.
   */
  adminRole?: string | null;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export { COOKIE_NAME, COOKIE_MAX_AGE, IS_PRODUCTION };
