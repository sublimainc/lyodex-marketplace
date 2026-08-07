import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, ListFilter, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AdminMessage, Notification, PAGE_SIZE, api } from "../shared";

export function MessagesTab() {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    api("/admin/messages")
      .then(setMessages)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = messages.filter(
    (m) =>
      !search ||
      m.sender_name.toLowerCase().includes(search.toLowerCase()) ||
      m.body.toLowerCase().includes(search.toLowerCase()) ||
      String(m.request_id).includes(search)
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const ROLE_COLOR: Record<string, string> = {
    buyer: "text-blue-600",
    operator: "text-emerald-600",
    admin: "text-orange-500",
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <h2 className="text-xl font-bold">All messages</h2>
        <div className="flex items-center gap-2">
          <ListFilter className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search sender, body or request #..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="border rounded-lg px-3 py-1.5 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-64"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  {["#", "Request", "Sender", "Role", "Message", "Sent"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  [1, 2, 3, 4].map((i) => (
                    <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
                  ))
                ) : paged.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No messages found.</td></tr>
                ) : paged.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{m.id}</td>
                    <td className="px-4 py-3">
                      <Link href={`/requests/${m.request_id}`} className="text-primary hover:underline font-medium">
                        #{m.request_id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium">{m.sender_name}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium capitalize text-xs ${ROLE_COLOR[m.sender_role] ?? ""}`}>
                        {m.sender_role}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-sm text-foreground line-clamp-2">{m.body}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-xs text-muted-foreground">
                {filtered.length} message{filtered.length !== 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs px-2">{safePage} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Notification Bell ────────────────────────────────────────────────────────
