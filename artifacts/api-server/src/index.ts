import { runMigrations } from "stripe-replit-sync";
import { getStripeSync, getUncachableStripeClient } from "./stripeClient";
import app from "./app";
import { logger } from "./lib/logger";
import { recordError } from "./lib/errorMonitor";
import { syncStripeWebhook } from "./lib/syncStripeWebhook";
import { syncStripeConnectWebhook } from "./lib/syncStripeConnectWebhook";
import { startWebhookHealthMonitor } from "./lib/webhookHealthMonitor";
import { checkSchema } from "./lib/schemaCheck";
import { startReportScheduler } from "./lib/reportScheduler";

process.on("uncaughtException", (err: Error) => {
  recordError(err.message, "server", err.stack);
  logger.fatal({ err }, "uncaughtException — process will exit");
  process.exit(1);
});

process.on("unhandledRejection", (reason: unknown) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  recordError(message, "server", stack);
  logger.error({ reason }, "unhandledRejection — promise rejected without a handler");
});

const rawPort = process.env["PORT"];
if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.warn("DATABASE_URL not set — skipping Stripe initialization");
    return;
  }

  try {
    logger.info("Initializing Stripe schema…");
    await runMigrations({ databaseUrl });
    logger.info("Stripe schema ready — checkout and product routes active");
  } catch (err) {
    logger.error({ err }, "Stripe schema migration failed — server will still start");
  }

  try {
    const stripe = await getUncachableStripeClient();
    await syncStripeWebhook(stripe);
    await syncStripeConnectWebhook(stripe);
  } catch (err) {
    logger.warn({ err }, "Stripe webhook sync: could not obtain Stripe client — skipping");
  }
}

await initStripe();
await checkSchema();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});

startWebhookHealthMonitor();
startReportScheduler();
