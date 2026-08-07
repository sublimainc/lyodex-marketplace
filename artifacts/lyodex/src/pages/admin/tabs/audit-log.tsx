import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { ACTION_CATEGORIES, ACTION_COLORS, AuditLogEntry, Tab, api } from "../shared";

export function AuditLogTab() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    api("/admin/audit-logs?limit=500")
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredLogs = logs.filter(l => {
    if (categoryFilter) {
      const actions = ACTION_CATEGORIES[categoryFilter] ?? [];
      if (!actions.includes(l.action)) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return (
        l.action.replace(/_/g, " ").includes(q) ||
        l.admin_email.toLowerCase().includes(q) ||
        (l.entity_type ?? "").toLowerCase().includes(q) ||
        (l.notes ?? "").toLowerCase().includes(q) ||
        String(l.entity_id ?? "").includes(q)
      );
    }
    return true;
  });

  return (
    <div>
      <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
        <ClipboardList className="w-5 h-5 text-primary" /> Admin Audit Log
      </h2>
      <p className="text-xs text-muted-foreground mb-4">Every write action performed by an admin is recorded here. Read-only.</p>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          placeholder="Search by action, admin, entity, notes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 border rounded-md px-3 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All categories</option>
          {Object.keys(ACTION_CATEGORIES).map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        {(search || categoryFilter) && (
          <button
            onClick={() => { setSearch(""); setCategoryFilter(""); }}
            className="px-3 py-1.5 text-xs border rounded-md hover:bg-muted/50 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : filteredLogs.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">
          {logs.length === 0 ? "No admin actions recorded yet." : "No entries match your filter."}
        </CardContent></Card>
      ) : (
        <Card>
          <div className="px-4 py-2 border-b text-xs text-muted-foreground">
            Showing {filteredLogs.length} of {logs.length} entries
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left font-semibold text-muted-foreground px-4 py-2.5">Time</th>
                  <th className="text-left font-semibold text-muted-foreground px-4 py-2.5">Admin</th>
                  <th className="text-left font-semibold text-muted-foreground px-4 py-2.5">Action</th>
                  <th className="text-left font-semibold text-muted-foreground px-4 py-2.5">Entity</th>
                  <th className="text-left font-semibold text-muted-foreground px-4 py-2.5">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredLogs.map(l => (
                  <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                      {format(new Date(l.created_at), "MMM d, HH:mm")}
                    </td>
                    <td className="px-4 py-2 font-medium">{l.admin_email}</td>
                    <td className={`px-4 py-2 font-semibold whitespace-nowrap ${ACTION_COLORS[l.action] ?? ""}`}>
                      {l.action.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {l.entity_type ? `${l.entity_type} #${l.entity_id ?? "—"}` : "—"}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground max-w-xs truncate">{l.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Price Data Tab ───────────────────────────────────────────────────────────
