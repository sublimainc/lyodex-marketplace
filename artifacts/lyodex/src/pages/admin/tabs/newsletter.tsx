/**
 * Newsletter subscribers. Addresses accumulate from the blog form; this is the
 * only place they can be read or exported.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Download, Check, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { adminApi, ErrorNote } from "../shared";

interface Subscriber {
  id: number;
  email: string;
  locale: string | null;
  source: string | null;
  subscribed: boolean;
  confirmed_at: string | null;
  created_at: string;
}

interface NewsletterData {
  subscribers: Subscriber[];
  total: number;
  active: number;
  confirmed: number;
  notice: string;
}

export function NewsletterTab() {
  const [data, setData] = useState<NewsletterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi("/admin/newsletter")
      .then(d => { setData(d); setError(null); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Built in the browser from data already on screen — no new export route, and
  // nothing leaves the page that the admin cannot already see.
  const exportCsv = () => {
    if (!data) return;
    const header = "email,locale,source,subscribed,confirmed_at,created_at";
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const body = data.subscribers
      .map(s => [s.email, s.locale, s.source, s.subscribed, s.confirmed_at, s.created_at].map(esc).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `lyodex-newsletter-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold">Newsletter subscribers</h2>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.total} total · ${data.active} active · ${data.confirmed} confirmed` : "Loading…"}
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!data?.subscribers.length} className="gap-2 shrink-0">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      <ErrorNote error={error} onDismiss={() => setError(null)} />

      {data && (
        <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg px-4 py-3 mb-5 text-sm max-w-4xl">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <p className="text-[13px] leading-relaxed text-amber-900 dark:text-amber-200">{data.notice}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : !data || data.subscribers.length === 0 ? (
        <div className="py-12 text-center border rounded-lg">
          <Mail className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No subscribers yet.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-3 py-2">Email</th>
                <th className="text-left font-medium px-3 py-2">Language</th>
                <th className="text-left font-medium px-3 py-2">Signed up from</th>
                <th className="text-center font-medium px-3 py-2">Status</th>
                <th className="text-center font-medium px-3 py-2">Confirmed</th>
                <th className="text-left font-medium px-3 py-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.subscribers.map(s => (
                <tr key={s.id} className="hover:bg-muted/20">
                  <td className="px-3 py-2.5 font-medium">{s.email}</td>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs uppercase">{s.locale ?? "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs">{s.source ?? "—"}</td>
                  <td className="px-3 py-2.5 text-center">
                    <Badge variant={s.subscribed ? "default" : "secondary"} className="text-[10px]">
                      {s.subscribed ? "Active" : "Unsubscribed"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {s.confirmed_at
                      ? <Check className="w-4 h-4 text-primary mx-auto" />
                      : <span className="text-xs text-muted-foreground">Pending</span>}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs">
                    {format(new Date(s.created_at), "d MMM yyyy")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
