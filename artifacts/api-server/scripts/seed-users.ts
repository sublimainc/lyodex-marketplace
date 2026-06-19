/**
 * Seed demo users: buyer@lyodex.ca, operator@lyodex.ca, admin@lyodex.ca — password: demo123
 * Safe to re-run (skips existing emails).
 */
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const DEMO_USERS = [
  { name: "Demo Buyer", email: "buyer@lyodex.ca", role: "buyer" },
  { name: "Demo Operator", email: "operator@lyodex.ca", role: "operator" },
  { name: "LyoDex Admin", email: "admin@lyodex.ca", role: "admin" },
];

async function seed() {
  const hash = await bcrypt.hash("demo123", 12);
  for (const u of DEMO_USERS) {
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, u.email)).limit(1);
    if (existing.length > 0) {
      console.log(`✓ ${u.email} already exists`);
      continue;
    }
    await db.insert(usersTable).values({ ...u, password_hash: hash, banned: false });
    console.log(`✓ Created ${u.role}: ${u.email}`);
  }
  console.log("Done.");
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
