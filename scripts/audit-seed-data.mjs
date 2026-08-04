/**
 * Report what is actually in the production database, and flag anything that
 * looks like seed/demo data rather than real activity.
 *
 * READ-ONLY. This script never modifies anything. It prints a report and, at
 * the end, the exact SQL you would run to purge — for you to review and run
 * yourself, deliberately.
 *
 * Why this matters: market intelligence now computes published price averages
 * from real rows in `bids` and `price_data_points`. If seeded bids are still in
 * the database, the pipeline is honest but its inputs are not — and the site
 * will publish invented prices with a straight face.
 *
 * Usage:
 *   DATABASE_URL='postgresql://…' node scripts/audit-seed-data.mjs
 */
import pg from "pg";

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  console.error("\n  ✗ DATABASE_URL is required.\n");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1")
    ? false
    : { rejectUnauthorized: false },
});

const q = async (sql, params = []) => (await client.query(sql, params)).rows;
const line = (s = "") => console.log(s);

try {
  await client.connect();

  line("\n══ LyoDex — database contents ══════════════════════════════════\n");

  // ── Volume overview ───────────────────────────────────────────────────────
  const counts = await q(`
    select 'users' t, count(*)::int n from users
    union all select 'operators', count(*)::int from operators
    union all select 'requests', count(*)::int from requests
    union all select 'bids', count(*)::int from bids
    union all select 'price_data_points', count(*)::int from price_data_points
    union all select 'activity', count(*)::int from activity
    order by 1`);
  for (const r of counts) line(`  ${r.t.padEnd(20)} ${String(r.n).padStart(6)}`);

  // ── What market intelligence would publish right now ──────────────────────
  line("\n── What the public market-intelligence page would publish ──────\n");

  const published = await q(`
    select r.material_type as category,
           count(b.id)::int                        as bids,
           count(distinct b.operator_id)::int      as operators,
           round(avg(b.price_per_kg)::numeric, 2)  as avg_price
      from bids b
      join requests r on r.id = b.request_id
     group by r.material_type
     order by count(b.id) desc`);

  if (published.length === 0) {
    line("  (nothing — no bids in the database)");
  } else {
    line("  category              bids  operators  avg $/kg   published?");
    for (const r of published) {
      // Mirrors MIN_COHORT = 3 distinct operators in marketAggregation.ts
      const shown = r.operators >= 3 ? "YES — public" : "withheld";
      line(
        `  ${String(r.category).padEnd(20)} ${String(r.bids).padStart(4)} ` +
        `${String(r.operators).padStart(10)} ${String(r.avg_price).padStart(9)}   ${shown}`,
      );
    }
    line("\n  Any row marked \"YES — public\" is a number real visitors will see.");
    line("  If the underlying bids are seeded, that number is fabricated.");
  }

  // ── Awarded-contract prices ───────────────────────────────────────────────
  const awarded = await q(`
    select count(*)::int n,
           count(*) filter (where accepted)::int accepted_n
      from price_data_points`);
  line(`\n  price_data_points: ${awarded[0].n} total, ${awarded[0].accepted_n} marked as awarded contracts`);
  if (awarded[0].accepted_n > 0) {
    const paid = await q(`
      select count(*)::int n
        from price_data_points p
        join bids b on b.id = p.bid_id
       where p.accepted and b.escrow_status = 'none'`);
    if (paid[0].n > 0) {
      line(`  ⚠ ${paid[0].n} of them have NO escrow payment recorded — these predate the`);
      line(`    fix that only marks a price as awarded once escrow is actually funded.`);
    }
  }

  // ── Seed-data heuristics ──────────────────────────────────────────────────
  line("\n── Likely seed/demo rows ───────────────────────────────────────\n");

  const suspectOps = await q(`
    select id, name, contact_email, country, created_at::date
      from operators
     where user_id is null
        or contact_email is null
        or contact_email ilike '%example.%'
        or contact_email ilike '%test%'
     order by id`);

  const suspectReqs = await q(`
    select id, material_type, buyer_email, created_at::date
      from requests
     where buyer_email ilike '%example.%'
        or buyer_email ilike '%test%'
        or buyer_email ilike '%lyodex.%'
     order by id`);

  const orphanBids = await q(`
    select count(*)::int n
      from bids b
      left join users u on u.id = b.operator_id
     where u.id is null`);

  if (suspectOps.length) {
    line(`  Operators with no linked user account or a placeholder email (${suspectOps.length}):`);
    for (const o of suspectOps) {
      line(`    #${o.id}  ${String(o.name).slice(0, 34).padEnd(34)} ${o.contact_email ?? "(no email)"}`);
    }
    line("    → Some of these may be REAL companies you added by hand for the");
    line("      directory. Do not delete without checking each one.");
  } else {
    line("  No operators look seeded.");
  }

  if (suspectReqs.length) {
    line(`\n  Requests from placeholder buyer emails (${suspectReqs.length}):`);
    for (const r of suspectReqs) line(`    #${r.id}  ${r.material_type} — ${r.buyer_email}`);
  } else {
    line("\n  No requests look seeded.");
  }

  if (orphanBids[0].n > 0) {
    line(`\n  ${orphanBids[0].n} bid(s) whose operator_id matches no user account —`);
    line("  these cannot have been submitted through the app.");
  }

  // ── Suggested purge ───────────────────────────────────────────────────────
  const seedReqIds = suspectReqs.map(r => r.id);
  if (seedReqIds.length > 0 || orphanBids[0].n > 0) {
    line("\n── Suggested purge — REVIEW BEFORE RUNNING ─────────────────────\n");
    line("  Back up first:  pg_dump \"$DATABASE_URL\" > backup-$(date +%F).sql\n");
    line("  begin;");
    if (seedReqIds.length > 0) {
      const ids = seedReqIds.join(", ");
      line(`    delete from price_data_points where request_id in (${ids});`);
      line(`    delete from bids               where request_id in (${ids});`);
      line(`    delete from request_messages   where request_id in (${ids});`);
      line(`    delete from requests           where id         in (${ids});`);
    }
    if (orphanBids[0].n > 0) {
      line("    delete from price_data_points where bid_id in (");
      line("      select b.id from bids b left join users u on u.id = b.operator_id where u.id is null);");
      line("    delete from bids b using (select b2.id from bids b2");
      line("      left join users u on u.id = b2.operator_id where u.id is null) x where b.id = x.id;");
    }
    line("  -- Inspect the row counts above, then:");
    line("  rollback;  -- change to: commit;");
    line("");
    line("  Operators are deliberately excluded: several are real companies.");
    line("  Deactivate rather than delete:  update operators set available = false where id = …;");
  } else {
    line("\n  Nothing obviously seeded to purge.");
  }

  line("\n════════════════════════════════════════════════════════════════\n");
} catch (err) {
  console.error(`\n  ✗ ${err.message}\n`);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
