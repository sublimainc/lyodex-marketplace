import { useQuery } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface SiteSettings {
  marketplace_locked: boolean;
  market_intelligence_locked: boolean;
  blog_locked: boolean;
  /**
   * Platform commission actually configured on the server — 0 during the launch
   * period, 9 once commission is switched on. Copy that quotes a rate must read
   * it from here: a hardcoded "9%" would advertise a price the server does not
   * charge, which is the same class of problem as fabricated market figures.
   */
  platform_fee_percent: number;
}

// Used until the request resolves, and if it fails. The fee defaults to 0 so a
// failed fetch can never advertise a charge that may not apply.
const FALLBACK: SiteSettings = {
  marketplace_locked: false,
  market_intelligence_locked: false,
  blog_locked: false,
  platform_fee_percent: 0,
};

async function fetchSiteSettings(): Promise<SiteSettings> {
  const res = await fetch(`${BASE}/api/site-settings`);
  if (!res.ok) return FALLBACK;
  const data = (await res.json()) as Partial<SiteSettings>;
  return { ...FALLBACK, ...data };
}

export function useSiteSettings() {
  const { data } = useQuery({
    queryKey: ["site-settings"],
    queryFn: fetchSiteSettings,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
  return data ?? FALLBACK;
}

/**
 * The configured fee formatted for display — "9%", or "9 %" in French, which
 * uses a non-breaking space before the percent sign.
 */
export function useFeeLabel(locale?: string): string {
  const { platform_fee_percent } = useSiteSettings();
  return locale === "fr" ? `${platform_fee_percent} %` : `${platform_fee_percent}%`;
}
