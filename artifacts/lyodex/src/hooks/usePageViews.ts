import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/**
 * Records a page view on every route change.
 *
 * `POST /api/events` and the `platform_events` table already existed, but
 * nothing ever called the endpoint — so the admin panel had no traffic data at
 * all, and there was no way to tell whether advertising was working.
 *
 * What is deliberately NOT collected:
 *   - no cookie, no localStorage identifier, no cross-site tracking
 *   - the session id lives in sessionStorage, so it dies with the browser tab
 *     and cannot follow anyone between visits
 *   - the server hashes the IP rather than storing it
 *
 * That keeps this on the right side of PIPEDA and GDPR without a consent
 * banner: it measures traffic, it does not build a profile of a person.
 */

// One id per tab, gone when the tab closes.
function sessionId(): string {
  const KEY = "lyodex_sid";
  try {
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // Private browsing can throw on storage access — degrade to an ephemeral id.
    return "no-storage";
  }
}

export function usePageViews() {
  const [location] = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    // React StrictMode double-invokes effects in development; without this the
    // same view is counted twice.
    if (lastPath.current === location) return;
    lastPath.current = location;

    // Hostname only, never the full referring URL — a search-results URL carries
    // the query the visitor typed. The key is omitted rather than sent as null:
    // the server's metadata schema accepts strings, numbers and booleans, so a
    // null would fail validation and the view would be lost.
    let referrer: string | undefined;
    try {
      const host = document.referrer ? new URL(document.referrer).hostname : "";
      if (host && host !== window.location.hostname) referrer = host;
    } catch {
      // Malformed referrer — record the view without it.
    }

    const body = JSON.stringify({
      session_id: sessionId(),
      event_type: "page_view",
      entity_type: "page",
      // Path only — query strings can carry search terms or tokens.
      metadata: referrer ? { path: location, referrer } : { path: location },
    });

    // keepalive lets the request survive the navigation that triggered it.
    fetch(`${BASE}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Sends the session cookie when there is one, so a signed-in visit is
      // attributed to the account. Anonymous visits are still recorded — the
      // server accepts "page_view" without a session precisely so that traffic
      // arriving from advertising is counted.
      credentials: "include",
      body,
      keepalive: true,
    }).catch(() => {
      // Analytics must never interfere with browsing. Failures are dropped.
    });
  }, [location]);
}
