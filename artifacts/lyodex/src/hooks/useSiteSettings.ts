import { useQuery } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface SiteSettings {
  marketplace_locked: boolean;
  market_intelligence_locked: boolean;
  blog_locked: boolean;
}

async function fetchSiteSettings(): Promise<SiteSettings> {
  const res = await fetch(`${BASE}/api/site-settings`);
  if (!res.ok) return { marketplace_locked: false, market_intelligence_locked: false, blog_locked: false };
  return res.json();
}

export function useSiteSettings() {
  const { data } = useQuery({
    queryKey: ["site-settings"],
    queryFn: fetchSiteSettings,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
  return data ?? { marketplace_locked: false, market_intelligence_locked: false, blog_locked: false };
}
