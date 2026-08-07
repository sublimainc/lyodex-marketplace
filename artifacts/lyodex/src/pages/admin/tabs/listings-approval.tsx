import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XOctagon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AdminListing, ListingsApiResponse, Tab, api } from "../shared";

export function flattenListings(data: ListingsApiResponse): AdminListing[] {
  const cap: AdminListing[] = (data.capacity ?? []).map((l) => ({
    id: l.id,
    type: "capacity" as const,
    operator_name: l.operator_name ?? "Unknown",
    title: l.equipment_type,
    approval_status: l.approval_status,
    approval_reason: l.approval_reason,
    created_at: l.created_at,
    updated_at: l.updated_at,
  }));
  const prod: AdminListing[] = (data.products ?? []).map((p) => ({
    id: p.id,
    type: "product" as const,
    operator_name: p.operator_name ?? "Unknown",
    title: p.name,
    approval_status: p.approval_status,
    approval_reason: p.approval_reason,
    created_at: p.created_at,
    updated_at: p.updated_at,
  }));
  return [...cap, ...prod].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export function isResubmission(listing: AdminListing): boolean {
  const created = new Date(listing.created_at).getTime();
  const updated = new Date(listing.updated_at).getTime();
  return listing.approval_status === "pending" && updated - created > 30_000;
}

export function ListingsApprovalTab() {
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [actionId, setActionId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = () => {
    setLoading(true);
    api("/admin/listings")
      .then((data: ListingsApiResponse) => setListings(flattenListings(data)))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const approve = async (listing: AdminListing) => {
    setActionId(listing.id);
    try {
      await api(`/admin/listings/${listing.type}/${listing.id}/approve`, "PATCH");
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setActionId(null);
    }
  };

  const reject = async (listing: AdminListing) => {
    setActionId(listing.id);
    try {
      await api(`/admin/listings/${listing.type}/${listing.id}/reject`, "PATCH", { reason: rejectReason });
      setRejectId(null);
      setRejectReason("");
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setActionId(null);
    }
  };

  const filtered = listings.filter(l => filter === "all" || l.approval_status === filter);

  const statusBadge = (status: string) => {
    if (status === "approved") return <Badge className="text-[10px] bg-green-100 text-green-700">Approved</Badge>;
    if (status === "rejected") return <Badge className="text-[10px] bg-red-100 text-red-700">Rejected</Badge>;
    return <Badge className="text-[10px] bg-yellow-100 text-yellow-700">Pending</Badge>;
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold mb-1">Listings Approval</h2>
        <p className="text-sm text-muted-foreground">Review and approve operator capacity and product listings.</p>
      </div>
      <div className="flex gap-2">
        {(["all", "pending", "approved", "rejected"] as const).map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">{f}</Button>
        ))}
      </div>
      {loading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No {filter === "all" ? "" : filter} listings.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(listing => (
            <Card key={`${listing.type}-${listing.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-medium text-sm">{listing.title}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">{listing.type}</Badge>
                      {statusBadge(listing.approval_status)}
                      {isResubmission(listing) && (
                        <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700 bg-amber-50">Resubmission</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {listing.operator_name} · {isResubmission(listing) ? "Resubmitted " : "Submitted "}{formatDistanceToNow(new Date(listing.updated_at), { addSuffix: true })}
                    </p>
                    {listing.approval_reason && <p className="text-xs text-destructive mt-1">Prev. rejection: {listing.approval_reason}</p>}
                  </div>
                  {listing.approval_status !== "approved" && listing.approval_status !== "rejected" ? (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="default" className="gap-1 bg-green-600 hover:bg-green-700" disabled={actionId === listing.id} onClick={() => approve(listing)}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 text-destructive border-destructive hover:bg-destructive/10" disabled={actionId === listing.id} onClick={() => setRejectId(listing.id)}>
                        <XOctagon className="w-3.5 h-3.5" /> Reject
                      </Button>
                    </div>
                  ) : listing.approval_status === "approved" ? (
                    <Button size="sm" variant="outline" className="gap-1 text-destructive border-destructive hover:bg-destructive/10 shrink-0" disabled={actionId === listing.id} onClick={() => setRejectId(listing.id)}>
                      <XOctagon className="w-3.5 h-3.5" /> Reject
                    </Button>
                  ) : (
                    <Button size="sm" variant="default" className="gap-1 bg-green-600 hover:bg-green-700 shrink-0" disabled={actionId === listing.id} onClick={() => approve(listing)}>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                    </Button>
                  )}
                </div>
                {rejectId === listing.id && (
                  <div className="mt-3 flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-xs font-medium">Rejection reason <span className="text-destructive">*</span></label>
                      <input className="w-full mt-1 border rounded px-3 py-1.5 text-sm" value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="e.g. Missing certifications, incomplete information" />
                    </div>
                    <Button size="sm" variant="destructive" disabled={actionId === listing.id || !rejectReason.trim()} onClick={() => reject(listing)}>
                      {actionId === listing.id ? "…" : "Confirm"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setRejectId(null); setRejectReason(""); }}>Cancel</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Admin Layout + Page ──────────────────────────────────────────────────────

// ─── Tab: Reports ─────────────────────────────────────────────────────────────
