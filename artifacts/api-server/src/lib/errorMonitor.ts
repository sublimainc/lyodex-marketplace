import { logger } from "./logger";

interface ErrorEvent {
  ts: number;
  message: string;
  source: "server" | "client";
  stack?: string;
}

const WINDOW_MS = 60_000;
const ALERT_THRESHOLD = 10;
const SAMPLE_LIMIT = 100;

const recentErrors: ErrorEvent[] = [];
let alertFiredAt = 0;
const ALERT_COOLDOWN_MS = 5 * 60_000;

function purgeOld(): void {
  const cutoff = Date.now() - WINDOW_MS;
  while (recentErrors.length > 0 && recentErrors[0].ts < cutoff) {
    recentErrors.shift();
  }
}

export function recordError(
  message: string,
  source: "server" | "client",
  stack?: string,
): void {
  purgeOld();

  const event: ErrorEvent = { ts: Date.now(), message, source, stack };
  recentErrors.push(event);
  if (recentErrors.length > SAMPLE_LIMIT) {
    recentErrors.shift();
  }

  const windowCount = recentErrors.filter((e) => e.source === source).length;
  const total = recentErrors.length;
  const now = Date.now();

  logger.error(
    { source, errorMessage: message, stack, windowCount, totalInWindow: total },
    "error_monitor: captured error",
  );

  // Alert threshold is based exclusively on server-side errors so that
  // unauthenticated client submissions cannot trigger false-positive alerts.
  const serverCount = recentErrors.filter((e) => e.source === "server").length;
  if (serverCount >= ALERT_THRESHOLD && now - alertFiredAt > ALERT_COOLDOWN_MS) {
    alertFiredAt = now;
    logger.error(
      {
        alert: true,
        serverErrorsInWindow: serverCount,
        thresholdPerMinute: ALERT_THRESHOLD,
        recentSamples: recentErrors
          .filter((e) => e.source === "server")
          .slice(-5)
          .map((e) => ({
            source: e.source,
            message: e.message,
          })),
      },
      "ALERT: high server error rate detected — check application health",
    );
  }
}

export function getStats(): {
  errorsLastMinute: number;
  serverErrorsLastMinute: number;
  clientErrorsLastMinute: number;
  alertThreshold: number;
} {
  purgeOld();
  const serverCount = recentErrors.filter((e) => e.source === "server").length;
  const clientCount = recentErrors.filter((e) => e.source === "client").length;
  return {
    errorsLastMinute: recentErrors.length,
    serverErrorsLastMinute: serverCount,
    clientErrorsLastMinute: clientCount,
    alertThreshold: ALERT_THRESHOLD,
  };
}
