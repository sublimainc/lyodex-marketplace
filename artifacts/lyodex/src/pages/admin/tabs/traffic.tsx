/**
 * Site traffic. Reads platform_events, which the front end writes on every
 * route change. Visits are browser-tab sessions, not people — see the notice
 * the endpoint returns.
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Users, Eye, Globe, Info } from "lucide-react";
import { adminApi, ErrorNote } from "../shared";

interface TrafficReport {
  period_days: number;
  totals: { page_views: number; visits: number; signed_in_users: number };
  by_day: { day: string; views: number; visits: number }[];
  by_path: { path: string; views: number; visits: number }[];
  by_referrer: { referrer: string; visits: number }[];
  actions: { event_type: string; count: number }[];
  notice: string;
}

export function TrafficTab() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<TrafficReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    adminApi(`/admin/traffic?days=${days}`)
      .then(d => { setData(d); setError(null); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [days]);

  const peak = Math.max(1, ...(data?.by_day ?? []).map(d => d.views));
  const empty = !loading && data && data.totals.page_views === 0;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold">Site traffic</h2>
          <p className="text-sm text-muted-foreground">Page views recorded on the platform</p>
        </div>
        <div className="flex rounded-md border overflow-hidden text-sm font-medium">
          {[7, 30, 90, 365].map((d, i) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 transition-colors ${days === d ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"} ${i > 0 ? "border-l" : ""}`}
            >
              {d === 365 ? "1 yr" : `${d}d`}
            </button>
          ))}
        </div>
      </div>

      <ErrorNote error={error} onDismiss={() => setError(null)} />

      {loading ? (
        <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : !data ? null : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: "Page views", value: data.totals.page_views, icon: Eye },
              { label: "Visits", value: data.totals.visits, icon: Users },
              { label: "Signed-in visitors", value: data.totals.signed_in_users, icon: Users },
            ].map(k => (
              <Card key={k.label}>
                <CardContent className="pt-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
                    <p className="text-2xl font-bold tabular-nums">{k.value.toLocaleString("en-CA")}</p>
                  </div>
                  <k.icon className="w-8 h-8 text-primary/20" />
                </CardContent>
              </Card>
            ))}
          </div>

          {empty && (
            <div className="flex items-start gap-2.5 bg-muted/50 border rounded-lg px-4 py-3 mb-6 text-sm">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
              <div>
                <p className="font-medium mb-0.5">No traffic recorded yet</p>
                <p className="text-muted-foreground text-[13px]">
                  Views are counted from the moment a visitor loads a page. If this stays at zero after
                  people have visited, check that the site is being served from this API — the counter
                  posts to <code className="text-xs">/api/events</code>.
                </p>
              </div>
            </div>
          )}

          {/* Daily trend */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Views per day
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.by_day.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Nothing to plot yet.</p>
              ) : (
                <div className="flex items-end gap-0.5 h-40">
                  {data.by_day.map(d => (
                    <div key={d.day} className="flex-1 flex flex-col justify-end h-full group relative">
                      <div
                        className="w-full bg-primary/80 hover:bg-primary rounded-t transition-colors min-h-[2px]"
                        style={{ height: `${(d.views / peak) * 100}%` }}
                      />
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-foreground text-background text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                        {d.day} · {d.views} views
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Top pages */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Most visited pages</CardTitle>
              </CardHeader>
              <CardContent>
                {data.by_path.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No pages recorded.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="text-left font-medium pb-2">Path</th>
                        <th className="text-right font-medium pb-2">Views</th>
                        <th className="text-right font-medium pb-2">Visits</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.by_path.slice(0, 15).map(p => (
                        <tr key={p.path}>
                          <td className="py-2 font-mono text-xs truncate max-w-[200px]">{p.path}</td>
                          <td className="py-2 text-right tabular-nums font-medium">{p.views}</td>
                          <td className="py-2 text-right tabular-nums text-muted-foreground">{p.visits}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            {/* Referrers */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" /> Where visitors came from
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.by_referrer.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No referrers recorded.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="text-left font-medium pb-2">Source</th>
                        <th className="text-right font-medium pb-2">Visits</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.by_referrer.map(r => (
                        <tr key={r.referrer}>
                          <td className="py-2 truncate max-w-[220px]">{r.referrer}</td>
                          <td className="py-2 text-right tabular-nums font-medium">{r.visits}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>

          {data.actions.length > 0 && (
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Actions taken on the platform</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {data.actions.map(a => (
                  <Badge key={a.event_type} variant="secondary" className="text-xs">
                    {a.event_type.replace(/_/g, " ")} · <span className="font-bold ml-1">{a.count}</span>
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">{data.notice}</p>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Market observations
// ═══════════════════════════════════════════════════════════════════════════
