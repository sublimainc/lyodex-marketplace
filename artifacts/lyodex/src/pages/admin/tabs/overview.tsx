import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FileText, CheckSquare, DollarSign, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Overview, Tab, fmt } from "../shared";

// ─── Tab: Overview ────────────────────────────────────────────────────────────

export function OverviewTab({ overview, loading }: { overview: Overview | null; loading: boolean }) {
  // The rate is set by PLATFORM_FEE_PERCENT on the server, not baked into this
  // file — the label read "(9%)" while the platform was charging nothing.
  const { platform_fee_percent: feePercent } = useSiteSettings();
  const kpis = [
    { label: "Total users", value: overview?.total_users, icon: Users },
    { label: "Active requests", value: overview?.active_requests, icon: FileText },
    { label: "Completed contracts", value: overview?.completed_contracts, icon: CheckSquare },
    { label: feePercent > 0 ? `Platform revenue (${feePercent}%)` : "Platform revenue (fees waived)", value: overview ? fmt(overview.total_platform_revenue) : undefined, icon: DollarSign },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold mb-5">Platform overview</h2>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{k.label}</CardTitle>
              <k.icon className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-20" /> : (
                <div className="text-2xl font-bold">{k.value ?? "—"}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Live activity feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="w-4 h-4 text-primary" /> Live activity feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (overview?.activity ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No activity yet.</div>
          ) : (
            <div className="space-y-4">
              {(overview?.activity ?? []).map((item) => (
                <div key={item.id} className="flex gap-3 items-start">
                  <div className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{item.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── User Profile Dialog ──────────────────────────────────────────────────────
