/**
 * Create or promote a LyoDex admin account.
 *
 * The password is never written to disk, never passed as a CLI argument (which
 * would land in your shell history), and never stored anywhere but as a bcrypt
 * hash in the database.
 *
 * Usage:
 *
 *   # Generate a strong password first:
 *   node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))"
 *
 *   # Then, on the machine that can reach the database:
 *   DATABASE_URL='postgresql://…' \
 *   ADMIN_EMAIL='admin@lyodex.com' \
 *   ADMIN_PASSWORD='<the generated password>' \
 *   node scripts/admin/create-admin.mjs
 *
 * Store the password in a password manager. If the account already exists this
 * resets its password and bumps session_version, logging out every existing
 * session for that user.
 */
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import pg from "pg";

const { DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;

function fail(msg) {
  console.error(`\n  ✗ ${msg}\n`);
  process.exit(1);
}

if (!DATABASE_URL) fail("DATABASE_URL is required.");
if (!ADMIN_EMAIL || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ADMIN_EMAIL)) {
  fail("ADMIN_EMAIL is required and must be a valid email address.");
}
if (!ADMIN_PASSWORD) {
  fail(
    "ADMIN_PASSWORD is required.\n    Generate one with:\n" +
      "    node -e \"console.log(require('crypto').randomBytes(18).toString('base64url'))\"",
  );
}

// ── Password strength ───────────────────────────────────────────────────────
// This account can move money, read government ID uploads, and alter every
// record on the platform. A weak password here is not a minor risk.
const pw = ADMIN_PASSWORD;
const problems = [];
if (pw.length < 12) problems.push("at least 12 characters (16+ recommended)");
if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw)) problems.push("both upper and lower case letters");
if (!/[0-9]/.test(pw)) problems.push("at least one digit");
if (/^\d+$/.test(pw)) problems.push("more than just digits — numeric PINs are brute-forced in seconds");

const COMMON = new Set(["password", "admin", "lyodex", "changeme", "letmein", "qwerty", "123456"]);
if (COMMON.has(pw.toLowerCase())) problems.push("not be a common password");

if (problems.length > 0) {
  fail(
    "ADMIN_PASSWORD is too weak. It must have:\n" +
      problems.map(p => `      - ${p}`).join("\n") +
      "\n\n    Generate a strong one with:\n" +
      "    node -e \"console.log(require('crypto').randomBytes(18).toString('base64url'))\"",
  );
}

const client = new pg.Client({
  connectionString: DATABASE_URL,
  // Managed Postgres providers terminate plaintext connections; most also use
  // certificates this client will not have in its trust store.
  ssl: DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1")
    ? false
    : { rejectUnauthorized: false },
});

try {
  await client.connect();

  const password_hash = await bcrypt.hash(pw, 12);
  const email = ADMIN_EMAIL.toLowerCase().trim();
  const name = ADMIN_NAME?.trim() || "Administrator";

  const { rows: existing } = await client.query(
    "select id, role, admin_role from users where lower(email) = $1 limit 1",
    [email],
  );

  if (existing.length > 0) {
    const user = existing[0];
    await client.query(
      `update users
          set password_hash = $1,
              role = 'admin',
              admin_role = 'super_admin',
              banned = false,
              failed_login_count = 0,
              locked_until = null,
              -- Invalidates every JWT previously issued for this account.
              session_version = session_version + 1
        where id = $2`,
      [password_hash, user.id],
    );
    console.log(
      `\n  ✓ Updated existing user #${user.id} (${email})\n` +
        `    role: ${user.role} → admin\n` +
        `    admin_role: ${user.admin_role ?? "null"} → super_admin\n` +
        `    All previous sessions for this account were invalidated.\n`,
    );
  } else {
    const { rows } = await client.query(
      `insert into users (name, email, password_hash, role, admin_role)
       values ($1, $2, $3, 'admin', 'super_admin')
       returning id`,
      [name, email, password_hash],
    );
    console.log(
      `\n  ✓ Created admin user #${rows[0].id} (${email}) with admin_role = super_admin\n`,
    );
  }

  console.log("    Store the password in a password manager — it is not recoverable.\n");
} catch (err) {
  fail(`Failed: ${err.message}`);
} finally {
  await client.end().catch(() => {});
}
