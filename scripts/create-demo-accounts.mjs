/**
 * Create local preview accounts — one buyer, one operator — alongside the admin.
 *
 * These exist so you can walk the site as each role sees it. They are LOCAL
 * accounts: do not run this against a production database, and do not reuse
 * these passwords anywhere.
 *
 * Passwords are generated here and written to `.admin-credentials.txt`, which is
 * gitignored. They are never printed to the terminal, so they do not end up in
 * your shell history or a screen recording.
 *
 * The operator account also gets its linked `operators` row, matching what the
 * real registration endpoint does — without it the operator dashboard has
 * nothing to attach to.
 *
 * Re-running rotates the passwords and rewrites the file.
 *
 * Usage:  DATABASE_URL='postgresql://…' node scripts/create-demo-accounts.mjs
 */
import { randomInt } from "node:crypto";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import bcrypt from "bcryptjs";
import pg from "pg";

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  console.error("\n  ✗ DATABASE_URL is required.\n");
  process.exit(1);
}

if (process.env.NODE_ENV === "production") {
  console.error(
    "\n  ✗ Refusing to run with NODE_ENV=production.\n" +
      "    These are preview accounts with generated passwords; they have no place\n" +
      "    in a live database. Create real accounts through the sign-up flow instead.\n",
  );
  process.exit(1);
}

// Memorable but not guessable: two words from a small set plus four digits.
const WORDS_A = ["Lyophilise", "Sublimation", "Cryogenie", "Condenseur", "Chambre", "Etagere"];
const WORDS_B = ["Quebec", "Boreal", "Nordique", "Laurentide", "Saguenay", "Gaspesie"];
const passphrase = () =>
  `${WORDS_A[randomInt(WORDS_A.length)]}-${WORDS_B[randomInt(WORDS_B.length)]}-${randomInt(1000, 9999)}`;

const ACCOUNTS = [
  {
    label: "PRODUCTEUR (opérateur)",
    role: "operator",
    name: "Opérateur démo",
    email: "producteur@lyodex.com",
    sees: "Tableau de bord opérateur, demandes ouvertes, dépôt de soumissions, paiements",
  },
  {
    label: "CLIENT (acheteur)",
    role: "buyer",
    name: "Acheteur démo",
    email: "client@lyodex.com",
    sees: "Créer une demande, comparer les soumissions, attribuer un contrat, messagerie",
  },
];

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1")
    ? false
    : { rejectUnauthorized: false },
});

try {
  await client.connect();
  const created = [];

  for (const acct of ACCOUNTS) {
    const password = passphrase();
    const password_hash = await bcrypt.hash(password, 12);

    const { rows: existing } = await client.query(
      "select id from users where lower(email) = $1 limit 1",
      [acct.email],
    );

    let userId;
    if (existing.length > 0) {
      userId = existing[0].id;
      await client.query(
        `update users
            set password_hash = $1, role = $2, name = $3, banned = false,
                failed_login_count = 0, locked_until = null,
                session_version = session_version + 1
          where id = $4`,
        [password_hash, acct.role, acct.name, userId],
      );
      console.log(`  ↻ ${acct.email} — password rotated`);
    } else {
      const { rows } = await client.query(
        `insert into users (name, email, password_hash, role)
         values ($1, $2, $3, $4) returning id`,
        [acct.name, acct.email, password_hash, acct.role],
      );
      userId = rows[0].id;
      console.log(`  + ${acct.email} — created`);
    }

    // Mirror the registration endpoint: an operator without a linked profile
    // has an empty dashboard and cannot be audited.
    if (acct.role === "operator") {
      const { rows: profile } = await client.query(
        "select id from operators where user_id = $1 limit 1",
        [userId],
      );
      if (profile.length === 0) {
        await client.query(
          `insert into operators
             (user_id, name, location, capacity_kg, price_per_kg, certifications,
              turnaround_days, rating, review_count, available, verification_status)
           values ($1,$2,'TBD',0,0,'{}',0,0,0,false,'not_verified')`,
          [userId, acct.name],
        );
        console.log(`    └ operator profile created`);
      }
    }

    created.push({ ...acct, password });
  }

  // ── Rewrite the credentials file, preserving the admin entry ───────────────
  const FILE = ".admin-credentials.txt";
  let adminBlock = "";
  if (existsSync(FILE)) {
    const current = readFileSync(FILE, "utf8");
    const pw = current.match(/Mot de passe : (.+)/);
    if (pw) {
      adminBlock =
        "ADMIN\n" +
        "  Courriel     : admin@lyodex.com\n" +
        `  Mot de passe : ${pw[1].trim()}\n` +
        "  Role         : admin / super_admin\n" +
        "  Voit         : Panneau admin complet, saisie des observations de prix\n\n";
    }
  }

  const body =
    "LyoDex - comptes LOCAUX (http://localhost:8080)\n" +
    "==============================================\n\n" +
    "Comptes de previsualisation, base de donnees locale uniquement.\n" +
    "Ne jamais reutiliser ces mots de passe ailleurs.\n\n" +
    adminBlock +
    created
      .map(
        a =>
          `${a.label}\n` +
          `  Courriel     : ${a.email}\n` +
          `  Mot de passe : ${a.password}\n` +
          `  Role         : ${a.role}\n` +
          `  Voit         : ${a.sees}\n`,
      )
      .join("\n") +
    "\n" +
    "Connexion : http://localhost:8080/login\n\n" +
    "A FAIRE :\n" +
    "  1. Copie ces mots de passe dans ton gestionnaire de mots de passe\n" +
    "  2. Supprime ce fichier quand tu n'en as plus besoin\n\n" +
    "Ce fichier est exclu de git.\n";

  writeFileSync(FILE, body);
  console.log(`\n  ✓ ${created.length} comptes prets. Identifiants dans ${FILE}\n`);
} catch (err) {
  console.error(`\n  ✗ ${err.message}\n`);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
