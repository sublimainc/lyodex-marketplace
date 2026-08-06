import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Scale, Save } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AdminDispute, DISPUTE_STATUS_COLORS, Tab, api } from "../shared";

export function DisputesTab() {
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [decidingId, setDecidingId] = useState<number | null>(null);
  const [decisionText, setDecisionText] = useState("");
  const [decisionStatus, setDecisionStatus] = useState("resolved");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api("/admin/disputes")
      .then(setDisputes)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const submitDecision = async (id: number) => {
    setSaving(true);
    try {
      await api(`/admin/disputes/${id}`, "PATCH", {
        status: decisionStatus,
        admin_decision: decisionText.trim() || undefined,
      });
      setDisputes(prev => prev.map(d =>
        d.id === id
          ? { ...d, status: decisionStatus, admin_decision: decisionText.trim() || d.admin_decision }
          : d
      ));
      setDecidingId(null);
      setDecisionText("");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
        <Scale className="w-5 h-5 text-primary" /> Disputes
      </h2>
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : disputes.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">No disputes filed.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {disputes.map(d => (
            <Card key={d.id}>
              <CardContent className="pt-5 pb-4">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">Dispute #{d.id}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${DISPUTE_STATUS_COLORS[d.status] ?? "bg-muted text-muted-foreground"}`}>
                      {d.status.replace("_", " ")}
                    </span>
                    <span className="text-xs text-muted-foreground">Request #{d.request_id} / Quote #{d.bid_id}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-1">Filed by: <span className="font-medium text-foreground">{d.opened_by_email}</span></p>
                <p className="text-sm mb-2"><span className="font-medium">Reason:</span> {d.reason}</p>
                {d.evidence && <p className="text-xs text-muted-foreground mb-2 italic">Evidence: {d.evidence}</p>}
                {d.admin_decision && (
                  <div className="text-xs bg-emerald-50 border border-emerald-200 rounded px-3 py-2 mb-2">
                    <span className="font-semibold text-emerald-800">Admin decision:</span> {d.admin_decision}
                  </div>
                )}
                {d.status === "open" || d.status === "under_review" ? (
                  decidingId === d.id ? (
                    <div className="mt-3 space-y-2 border-t pt-3">
                      <div className="flex gap-2">
                        {["under_review", "resolved", "dismissed"].map(s => (
                          <button
                            key={s}
                            onClick={() => setDecisionStatus(s)}
                            className={`text-xs px-2 py-1 rounded border font-medium transition-colors ${decisionStatus === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                          >
                            {s.replace("_", " ")}
                          </button>
                        ))}
                      </div>
                      <textarea
                        className="w-full border rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                        rows={2}
                        placeholder="Admin decision or notes (optional)..."
                        value={decisionText}
                        onChange={e => setDecisionText(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => submitDecision(d.id)} disabled={saving}>
                          {saving ? "Saving…" : "Save decision"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setDecidingId(null); setDecisionText(""); }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => { setDecidingId(d.id); setDecisionStatus("under_review"); }}>
                      Review / Decide
                    </Button>
                  )
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Audit Log ───────────────────────────────────────────────────────────
