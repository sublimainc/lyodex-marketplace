const BASE = import.meta.env.BASE_URL ?? "/";
const ENDPOINT = `${BASE.replace(/\/$/, "")}/api/errors/client`;

let initialized = false;

function sendError(message: string, stack?: string): void {
  const payload = {
    message: message.slice(0, 2000),
    stack: stack?.slice(0, 10000),
    url: window.location.href.slice(0, 500),
    userAgent: navigator.userAgent.slice(0, 500),
    timestamp: Date.now(),
  };

  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    navigator.sendBeacon(ENDPOINT, blob);
  } else {
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }
}

export function initErrorReporter(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  window.addEventListener("error", (event: ErrorEvent) => {
    const message = event.error instanceof Error
      ? event.error.message
      : event.message || "Unknown script error";
    const stack = event.error instanceof Error ? event.error.stack : undefined;
    sendError(message, stack);
  });

  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message = reason instanceof Error
      ? reason.message
      : typeof reason === "string"
        ? reason
        : "Unhandled promise rejection";
    const stack = reason instanceof Error ? reason.stack : undefined;
    sendError(message, stack);
  });
}

export function reportError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  sendError(message, stack);
}
