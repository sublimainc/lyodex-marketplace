import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Download, Database, Save } from "lucide-react";
import { format } from "date-fns";
import { BASE, PriceRecord, api } from "../shared";

export function PriceDataTab() {
  const [rows, setRows] = useState<PriceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [editingNotes, setEditingNotes] = useState<Record<number, string>>({});
  const LIMIT = 50;

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (filterCategory) qs.set("category", filterCategory);
    if (filterStatus)   qs.set("status",   filterStatus);
    try {
      const res = await api(`/admin/price-data?${qs}`);
      setRows(res.data);
      setTotal(res.total);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, filterCategory, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const toggleInclude = async (id: number, current: boolean) => {
    await api(`/admin/price-data/${id}`, "PATCH", { included_in_market_intelligence: !current });
    load();
  };

  const saveNotes = async (id: number) => {
    await api(`/admin/price-data/${id}`, "PATCH", { admin_notes: editingNotes[id] ?? "" });
    setEditingNotes(prev => { const n = { ...prev }; delete n[id]; return n; });
    load();
  };

  const CONF: Record<string, string> = {
    high:   "bg-emerald-100 text-emerald-700",
    medium: "bg-amber-100 text-amber-700",
    low:    "bg-red-100 text-red-700",
  };
  const STAT: Record<string, string> = {
    accepted: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
    pending:  "bg-slate-100 text-slate-600",
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Market Intelligence Data</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {total.toLocaleString()} price observations from operator bids
          </p>
        </div>
        <Button
          size="sm" variant="outline"
          onClick={() => window.open(`${BASE}/api/admin/price-data/export`, "_blank")}
          className="shrink-0"
        >
          <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Category</p>
          <select
            value={filterCategory}
            onChange={e => { setFilterCategory(e.target.value); setPage(1); }}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All categories</option>
            {["Fruits","Vegetables","Nutraceuticals","Pet Food","Pharmaceutical","Probiotics","Herbs & Spices","Dairy","Mushrooms"].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Quote status</p>
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        {(filterCategory || filterStatus) && (
          <Button size="sm" variant="ghost" className="text-xs h-8 self-end"
            onClick={() => { setFilterCategory(""); setFilterStatus(""); setPage(1); }}>
            Clear filters
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Database className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No price observations yet.</p>
          <p className="text-xs mt-1">They appear here as operators submit bids on buyer requests.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 border-b">
                <tr>
                  {["Date","Category","Format","$/kg","MOQ","Lead","Cur.","Status","Confidence","Include","Notes","Operator"].map(h => (
                    <th key={h} className={`px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap ${h === "$/kg" || h === "MOQ" || h === "Lead" ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map(row => (
                  <tr key={row.id} className={`hover:bg-muted/20 transition-colors ${!row.included_in_market_intelligence ? "opacity-40" : ""}`}>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{format(new Date(row.created_at), "MMM d, yyyy")}</td>
                    <td className="px-3 py-2 font-medium max-w-[130px] truncate">{row.category}</td>
                    <td className="px-3 py-2 text-muted-foreground capitalize">{row.product_format ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-semibold text-primary">${row.quoted_price.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{row.moq ? `${row.moq} kg` : "—"}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{row.lead_time_days ? `${row.lead_time_days}d` : "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.currency}</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${STAT[row.quote_status] ?? "bg-slate-100 text-slate-600"}`}>
                        {row.quote_status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${CONF[row.confidence_level] ?? ""}`}>
                        {row.confidence_level}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => toggleInclude(row.id, row.included_in_market_intelligence)}
                        className={`w-8 h-4 rounded-full transition-colors relative inline-flex items-center ${row.included_in_market_intelligence ? "bg-primary" : "bg-muted-foreground/30"}`}
                        title={row.included_in_market_intelligence ? "Included — click to exclude" : "Excluded — click to include"}
                      >
                        <span className={`w-3 h-3 rounded-full bg-white shadow absolute transition-transform ${row.included_in_market_intelligence ? "translate-x-4" : "translate-x-0.5"}`} />
                      </button>
                    </td>
                    <td className="px-3 py-2 min-w-[140px]">
                      {editingNotes[row.id] !== undefined ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editingNotes[row.id]}
                            onChange={e => setEditingNotes(prev => ({ ...prev, [row.id]: e.target.value }))}
                            className="flex-1 rounded border border-input bg-background px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === "Enter") saveNotes(row.id);
                              if (e.key === "Escape") setEditingNotes(prev => { const n = { ...prev }; delete n[row.id]; return n; });
                            }}
                          />
                          <button type="button" onClick={() => saveNotes(row.id)} className="text-primary text-[10px] font-semibold">Save</button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingNotes(prev => ({ ...prev, [row.id]: row.admin_notes ?? "" }))}
                          className="text-left max-w-[130px] truncate block hover:text-foreground text-muted-foreground"
                          title={row.admin_notes ?? "Click to add notes"}
                        >
                          {row.admin_notes || <span className="italic opacity-40">Add notes…</span>}
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground max-w-[110px] truncate">{row.operator_name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > LIMIT && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total.toLocaleString()}
              </p>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="outline" disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── SiteControlsTab ─────────────────────────────────────────────────────────
