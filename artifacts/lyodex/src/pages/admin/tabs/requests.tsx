import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ListFilter, ChevronLeft, ChevronRight, ExternalLink, XCircle, AlertTriangle, Lock } from "lucide-react";
import { AdminRequest, PAGE_SIZE, STATUS_REQUEST, Tab, api } from "../shared";

// ─── Moderation Dialog ────────────────────────────────────────────────────────

export function ModerationDialog({
  request,
  action,
  onConfirm,
  onClose,
}: {
  request: AdminRequest;
  action: "close" | "remove";
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (action === "remove" && !reason.trim()) return;
    setSubmitting(true);
    onConfirm(reason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-card border rounded-2xl shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-lg capitalize">
            {action === "close" ? "Close request" : "Remove request"}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">&times;</button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {action === "close"
            ? "Closing this request will stop operators from submitting new bids. Existing bids are preserved and the request remains visible."
            : "Removing this request hides it from the public marketplace listing and blocks new bids. The request detail page remains accessible via direct link."}
        </p>
        <div className="rounded-lg bg-muted/40 border px-4 py-3 mb-4 text-sm">
          <span className="font-medium">{request.material_type}</span>
          <span className="text-muted-foreground"> · {request.quantity_kg} kg · {request.buyer_email}</span>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5">
              Reason / note {action === "remove" && <span className="text-destructive">*</span>}
            </label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none h-20"
              placeholder={action === "remove" ? "Required — explain why this request is being removed..." : "Optional — note for the buyer..."}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required={action === "remove"}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button
              type="submit"
              size="sm"
              variant={action === "remove" ? "destructive" : "default"}
              disabled={submitting || (action === "remove" && !reason.trim())}
            >
              {submitting ? "Saving..." : action === "close" ? "Close request" : "Remove request"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Tab: Requests ────────────────────────────────────────────────────────────

export function RequestsTab() {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [working, setWorking] = useState<number | null>(null);
  const [dialog, setDialog] = useState<{ request: AdminRequest; action: "close" | "remove" } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api("/admin/requests").then(setRequests).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const doModerate = async (request: AdminRequest, action: "close" | "remove", reason: string) => {
    setWorking(request.id);
    setDialog(null);
    setError(null);
    try {
      await api(`/admin/requests/${request.id}/${action}`, "POST", { reason: reason || undefined });
      setRequests((prev) =>
        prev.map((r) =>
          r.id === request.id
            ? { ...r, status: action === "close" ? "closed" : "removed", moderation_note: reason || null }
            : r
        )
      );
    } catch (err: unknown) {
      let msg = "Action failed.";
      try { msg = JSON.parse(err instanceof Error ? err.message : String(err)).error ?? msg; } catch {}
      setError(msg);
    } finally {
      setWorking(null);
    }
  };

  const filtered = requests.filter(
    (r) =>
      !search ||
      r.material_type.toLowerCase().includes(search.toLowerCase()) ||
      r.buyer_email.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <h2 className="text-xl font-bold">All requests</h2>
        <div className="flex items-center gap-2">
          <ListFilter className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search material or buyer..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="border rounded-lg px-3 py-1.5 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-56"
          />
        </div>
      </div>

      {error && (
        <div className="mb-3 px-4 py-2 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              {["#", "Material", "Buyer", "Qty (kg)", "Deadline", "Bids", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              [1, 2, 3, 4].map((i) => (
                <tr key={i}><td colSpan={8} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
              ))
            ) : paged.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No requests found.</td></tr>
            ) : paged.map((r) => {
              const st = STATUS_REQUEST[r.status] ?? { label: r.status, variant: "outline" as const };
              const isModerated = r.status === "closed" || r.status === "removed";
              return (
                <tr key={r.id} className={`hover:bg-muted/20 transition-colors ${isModerated ? "opacity-60" : ""}`}>
                  <td className="px-4 py-3 text-muted-foreground text-xs">#{r.id}</td>
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/requests/${r.id}`} className="hover:text-primary transition-colors flex items-center gap-1">
                      {r.material_type} <ExternalLink className="w-3 h-3 opacity-40" />
                    </Link>
                    {r.moderation_note && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[160px]" title={r.moderation_note}>
                        Note: {r.moderation_note}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{r.buyer_email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.quantity_kg}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{r.deadline}</td>
                  <td className="px-4 py-3 text-center font-medium">{r.bid_count}</td>
                  <td className="px-4 py-3">
                    <Badge variant={st.variant} className="text-[10px] uppercase">{st.label}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {r.status !== "closed" && r.status !== "removed" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            disabled={working === r.id}
                            onClick={() => setDialog({ request: r, action: "close" })}
                          >
                            <Lock className="w-3 h-3" /> Close
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs gap-1"
                            disabled={working === r.id}
                            onClick={() => setDialog({ request: r, action: "remove" })}
                          >
                            <XCircle className="w-3 h-3" /> Remove
                          </Button>
                        </>
                      )}
                      {isModerated && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Moderated
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-muted-foreground">{filtered.length} request{filtered.length !== 1 ? "s" : ""}</p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" className="h-7 px-2" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">Page {safePage} of {totalPages}</span>
            <Button size="sm" variant="ghost" className="h-7 px-2" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {dialog && (
        <ModerationDialog
          request={dialog.request}
          action={dialog.action}
          onConfirm={(reason) => doModerate(dialog.request, dialog.action, reason)}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

// ─── Tab: Market Intelligence ─────────────────────────────────────────────────
