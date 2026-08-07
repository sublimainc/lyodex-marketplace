import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Tab, Transaction, api, fmt } from "../shared";

// ─── Tab: Transactions ────────────────────────────────────────────────────────

export function TransactionsTab() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/admin/transactions").then(setTxns).catch(console.error).finally(() => setLoading(false));
  }, []);

  const totalFees = txns.reduce((acc, t) => acc + t.fee_amount, 0);
  const totalValue = txns.reduce((acc, t) => acc + t.contract_value, 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <h2 className="text-xl font-bold">Completed contracts</h2>
        <div className="text-sm space-x-4">
          <span className="text-muted-foreground">Total value: <span className="font-semibold text-foreground">{fmt(totalValue)}</span></span>
          <span className="text-muted-foreground">Fees collected: <span className="font-bold text-primary">{fmt(totalFees)}</span></span>
        </div>
      </div>

      {txns.length === 0 && !loading && (
        <div className="text-center py-12 border rounded-xl bg-muted/10 text-muted-foreground text-sm">
          No completed contracts yet. Contracts appear here once a bid is accepted.
        </div>
      )}

      {(txns.length > 0 || loading) && (
        <div className="rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                {["#", "Material", "Buyer", "Operator", "Contract value", "Platform fee (9%)", "Escrow status", "Date"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i}><td colSpan={8} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
                ))
              ) : txns.map((t) => {
                const escrowValue = (t.escrow_amount_cents ?? 0) > 0 ? t.escrow_amount_cents! / 100 : t.contract_value;
                // The server already computed this from the rate snapshotted on the
                // bid (historicalFeeRate). Recomputing at a flat 9% here restated
                // grandfathered contracts and disagreed with the header total.
                const platformFee = t.fee_amount;
                return (
                <tr key={t.bid_id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground text-xs">#{t.request_id}</td>
                  <td className="px-4 py-3 font-medium">{t.material_type ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{t.buyer_email ?? "—"}</td>
                  <td className="px-4 py-3">{t.operator_name}</td>
                  <td className="px-4 py-3 font-semibold">{fmt(escrowValue)}</td>
                  <td className="px-4 py-3 text-primary font-semibold">{fmt(platformFee)}</td>
                  <td className="px-4 py-3">
                    {t.escrow_status === "captured" && (
                      <Badge variant="default" className="text-[10px] uppercase bg-emerald-600 hover:bg-emerald-600">Released</Badge>
                    )}
                    {t.escrow_status === "authorized" && (
                      <Badge variant="secondary" className="text-[10px] uppercase bg-blue-100 text-blue-700 hover:bg-blue-100">In escrow</Badge>
                    )}
                    {t.escrow_status === "refunded" && (
                      <Badge variant="destructive" className="text-[10px] uppercase">Refunded</Badge>
                    )}
                    {(!t.escrow_status || t.escrow_status === "none") && (
                      <Badge variant="outline" className="text-[10px] uppercase text-muted-foreground">Awaiting payment</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                    {format(new Date(t.created_at), "MMM d, yyyy")}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Moderation Dialog ────────────────────────────────────────────────────────
