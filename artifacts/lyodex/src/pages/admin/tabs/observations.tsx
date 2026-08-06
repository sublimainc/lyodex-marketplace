/**
 * Market observations — prices learned outside the platform, entered by hand.
 * Nothing here reaches the public aggregate until it is published row by row.
 */
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Check, Info, ExternalLink, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { adminApi, ErrorNote } from "../shared";

const SOURCE_TYPES = [
  ["operator_reported", "Operator told us directly"],
  ["buyer_reported", "Buyer told us what they were quoted"],
  ["published_rate_card", "Published rate card / price list"],
  ["industry_publication", "Industry report or trade data"],
  ["admin_research", "My own research or estimate"],
] as const;

const GRADES = ["food", "gmp_pharma", "nutraceutical", "pet_food", "cosmetic", "other"] as const;
const PRICE_UNITS = ["per_kg", "per_lb", "per_batch", "per_hour"] as const;
const CONFIDENCE = ["high", "medium", "low"] as const;

interface Observation {
  id: number;
  source_type: string;
  source_detail: string | null;
  source_url: string | null;
  confidence: string;
  category: string;
  grade: string;
  price_amount: number;
  price_unit: string;
  currency: string;
  volume_min_kg: number | null;
  volume_max_kg: number | null;
  region: string | null;
  country: string;
  observed_at: string;
  included_in_public: boolean;
  admin_notes: string | null;
}

const BLANK = {
  source_type: "operator_reported",
  source_detail: "",
  source_url: "",
  confidence: "medium",
  category: "",
  grade: "food",
  price_amount: "",
  price_unit: "per_kg",
  currency: "CAD",
  volume_min_kg: "",
  volume_max_kg: "",
  region: "",
  country: "CA",
  included_in_public: false,
  admin_notes: "",
};

const inputCls =
  "w-full h-9 px-2.5 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground block mb-1">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-muted-foreground block mt-1">{hint}</span>}
    </label>
  );
}

export function ObservationsTab() {
  const [rows, setRows] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({ ...BLANK });

  const load = useCallback(() => {
    setLoading(true);
    adminApi("/admin/observations")
      .then(d => { setRows(d); setError(null); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { ...form };
      // Empty strings are not the same as "not provided" to the server's schema.
      for (const k of ["source_detail", "source_url", "region", "admin_notes"]) {
        if (!payload[k]) delete payload[k];
      }
      for (const k of ["volume_min_kg", "volume_max_kg"]) {
        if (payload[k] === "") delete payload[k];
      }
      await adminApi("/admin/observations", "POST", payload);
      setForm({ ...BLANK });
      setShowForm(false);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (row: Observation) => {
    setError(null);
    try {
      await adminApi(`/admin/observations/${row.id}`, "PATCH", { included_in_public: !row.included_in_public });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const remove = async (row: Observation) => {
    if (!window.confirm(`Delete the ${row.category} observation at ${row.price_amount} ${row.currency}?`)) return;
    setError(null);
    try {
      await adminApi(`/admin/observations/${row.id}`, "DELETE");
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const published = rows.filter(r => r.included_in_public).length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold">Market observations</h2>
          <p className="text-sm text-muted-foreground">
            {rows.length} recorded · {published} published publicly
          </p>
        </div>
        <Button onClick={() => setShowForm(s => !s)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> {showForm ? "Cancel" : "Record an observation"}
        </Button>
      </div>

      <div className="flex items-start gap-2.5 bg-muted/50 border rounded-lg px-4 py-3 mb-5 text-sm max-w-4xl">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
        <p className="text-muted-foreground text-[13px] leading-relaxed">
          These are prices you learned about outside the platform — a phone call, a rate card, a trade
          report. Nothing here is published until you turn it on for a given row, and the public page
          shows the aggregate only, never who said it.
        </p>
      </div>

      <ErrorNote error={error} onDismiss={() => setError(null)} />

      {showForm && (
        <Card className="mb-6 border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">New observation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Where did this come from? *">
                <select className={inputCls} value={String(form.source_type)} onChange={e => set("source_type", e.target.value)}>
                  {SOURCE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="How confident are you? *" hint="Low-confidence rows still count toward the cohort but are worth revisiting.">
                <select className={inputCls} value={String(form.confidence)} onChange={e => set("confidence", e.target.value)}>
                  {CONFIDENCE.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Source detail" hint="Who or what, in your own words. Never shown publicly.">
              <input className={inputCls} value={String(form.source_detail)} onChange={e => set("source_detail", e.target.value)} placeholder="e.g. call with a Montréal co-packer, 12 March" />
            </Field>

            <Field label="Source URL">
              <input className={inputCls} value={String(form.source_url)} onChange={e => set("source_url", e.target.value)} placeholder="https://…" />
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Product category *" hint="e.g. strawberries, whole fruit, dairy powder">
                <input className={inputCls} value={String(form.category)} onChange={e => set("category", e.target.value)} />
              </Field>
              <Field label="Grade *">
                <select className={inputCls} value={String(form.grade)} onChange={e => set("grade", e.target.value)}>
                  {GRADES.map(g => <option key={g} value={g}>{g.replace(/_/g, " ")}</option>)}
                </select>
              </Field>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Price *">
                <input className={inputCls} type="number" step="0.01" value={String(form.price_amount)} onChange={e => set("price_amount", e.target.value)} />
              </Field>
              <Field label="Unit *">
                <select className={inputCls} value={String(form.price_unit)} onChange={e => set("price_unit", e.target.value)}>
                  {PRICE_UNITS.map(u => <option key={u} value={u}>{u.replace(/_/g, " ")}</option>)}
                </select>
              </Field>
              <Field label="Currency *">
                <select className={inputCls} value={String(form.currency)} onChange={e => set("currency", e.target.value)}>
                  {["CAD", "USD", "EUR"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Volume from (kg)" hint="The price tier this applies to. Leave blank if it does not depend on volume.">
                <input className={inputCls} type="number" value={String(form.volume_min_kg)} onChange={e => set("volume_min_kg", e.target.value)} />
              </Field>
              <Field label="Volume to (kg)">
                <input className={inputCls} type="number" value={String(form.volume_max_kg)} onChange={e => set("volume_max_kg", e.target.value)} />
              </Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Region">
                <input className={inputCls} value={String(form.region)} onChange={e => set("region", e.target.value)} placeholder="e.g. Québec" />
              </Field>
              <Field label="Country *">
                <input className={inputCls} value={String(form.country)} onChange={e => set("country", e.target.value)} maxLength={60} />
              </Field>
            </div>

            <Field label="Private notes">
              <textarea className={`${inputCls} h-auto py-2`} rows={2} value={String(form.admin_notes)} onChange={e => set("admin_notes", e.target.value)} />
            </Field>

            <label className="flex items-start gap-2.5 bg-muted/40 border rounded-lg px-3 py-2.5 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={Boolean(form.included_in_public)}
                onChange={e => set("included_in_public", e.target.checked)}
              />
              <span className="text-sm">
                <span className="font-medium">Publish this observation</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  It joins the public aggregate. The aggregate is only shown once enough distinct
                  sources exist, so a single published row still displays nothing.
                </span>
              </span>
            </label>

            <div className="flex gap-2 pt-1">
              <Button onClick={save} disabled={saving || !form.category || !form.price_amount} className="gap-2">
                <Check className="w-4 h-4" /> {saving ? "Saving…" : "Save observation"}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setForm({ ...BLANK }); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center border rounded-lg">
          No observations recorded yet.
        </p>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-3 py-2">Category</th>
                <th className="text-left font-medium px-3 py-2">Grade</th>
                <th className="text-right font-medium px-3 py-2">Price</th>
                <th className="text-left font-medium px-3 py-2">Volume</th>
                <th className="text-left font-medium px-3 py-2">Source</th>
                <th className="text-left font-medium px-3 py-2">Observed</th>
                <th className="text-center font-medium px-3 py-2">Public</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-muted/20">
                  <td className="px-3 py-2.5 font-medium">{r.category}</td>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs">{r.grade.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-primary">
                    {r.price_amount} {r.currency}
                    <span className="text-muted-foreground font-normal text-xs"> /{r.price_unit.replace("per_", "")}</span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground tabular-nums">
                    {r.volume_min_kg == null && r.volume_max_kg == null
                      ? "—"
                      : `${r.volume_min_kg ?? 0}–${r.volume_max_kg ?? "∞"} kg`}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    <span className="text-muted-foreground">{r.source_type.replace(/_/g, " ")}</span>
                    <Badge variant="outline" className="ml-1.5 text-[10px]">{r.confidence}</Badge>
                    {r.source_url && (
                      <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="ml-1 inline-block align-middle">
                        <ExternalLink className="w-3 h-3 text-primary" />
                      </a>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {r.observed_at ? format(new Date(r.observed_at), "d MMM yyyy") : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <button
                      onClick={() => togglePublish(r)}
                      title={r.included_in_public ? "Published — click to withdraw" : "Private — click to publish"}
                      className={`text-xs px-2 py-0.5 rounded border font-medium transition-colors ${
                        r.included_in_public
                          ? "bg-primary/10 text-primary border-primary/30"
                          : "bg-muted text-muted-foreground border-dashed hover:bg-muted/70"
                      }`}
                    >
                      {r.included_in_public ? "Published" : "Private"}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button onClick={() => remove(r)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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

// ═══════════════════════════════════════════════════════════════════════════
// Newsletter
// ═══════════════════════════════════════════════════════════════════════════
