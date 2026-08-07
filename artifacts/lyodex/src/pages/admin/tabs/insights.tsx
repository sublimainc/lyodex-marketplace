import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, RefreshCw, Save } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";
import { COLORS, MIData, Manufacturer, Tab, api, fmt } from "../shared";

export function InsightsTab() {
  const [data, setData] = useState<MIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (filterDateFrom) qs.set("date_from", filterDateFrom);
    if (filterDateTo) qs.set("date_to", filterDateTo);
    if (filterCategory) qs.set("category", filterCategory);
    api(`/admin/market-intelligence${qs.toString() ? `?${qs}` : ""}`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filterDateFrom, filterDateTo, filterCategory]);

  useEffect(() => { load(); }, [load]);

  const enterEdit = () => {
    if (!data) return;
    const init: Record<string, string> = {};
    // avg price by category
    data.avg_price_by_category.forEach((r) => {
      init[`avg_price.${r.category}`] = String(data.overrides[`avg_price.${r.category}`] ?? r.avg_price);
    });
    // sales volume KPIs
    (["total_contracts", "total_quantity_kg", "total_contract_value", "platform_fees"] as const).forEach((k) => {
      init[`sales_volume.${k}`] = String(data.overrides[`sales_volume.${k}`] ?? data.sales_volume[k]);
    });
    // listing performance
    (["total_capacity_listings", "total_product_listings", "approved_capacity", "approved_products"] as const).forEach((k) => {
      init[`listing_performance.${k}`] = String(data.overrides[`listing_performance.${k}`] ?? data.listing_performance[k]);
    });
    // manufacturer activity total_active
    if (data.manufacturer_activity) {
      init["manufacturer_activity.total_active"] = String(
        data.overrides["manufacturer_activity.total_active"] ?? data.manufacturer_activity.total_active
      );
      data.manufacturer_activity.top_manufacturers.forEach((m) => {
        init[`manufacturer_activity.${m.name}.avg_rating`] = String(data.overrides[`manufacturer_activity.${m.name}.avg_rating`] ?? m.avg_rating);
        init[`manufacturer_activity.${m.name}.review_count`] = String(data.overrides[`manufacturer_activity.${m.name}.review_count`] ?? m.review_count);
      });
    }
    // machinery demand avg prices + total listings
    (data.machinery_demand ?? []).forEach((m) => {
      if (m.avg_price != null) {
        init[`machinery_demand.${m.category}.avg_price`] = String(data.overrides[`machinery_demand.${m.category}.avg_price`] ?? m.avg_price);
      }
      init[`machinery_demand.${m.category}.total_listings`] = String(data.overrides[`machinery_demand.${m.category}.total_listings`] ?? m.total_listings);
    });
    setEditValues(init);
    setEditMode(true);
  };

  const saveOverrides = async () => {
    setSaving(true);
    try {
      for (const [key, val] of Object.entries(editValues)) {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          await api("/admin/market-intelligence/override", "PATCH", { key, value: num });
        }
      }
      setEditMode(false);
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 w-full" />)}</div>;
  if (!data) return <div className="text-muted-foreground">Failed to load market intelligence data.</div>;

  const noData = <div className="text-sm text-muted-foreground py-8 text-center">No data yet.</div>;

  const avgPriceDisplay = data.avg_price_by_category.map((r) => ({
    ...r,
    avg_price: data.overrides[`avg_price.${r.category}`] ?? r.avg_price,
    overridden: `avg_price.${r.category}` in data.overrides,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Market Intelligence</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Live metrics derived from platform activity</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
          {!editMode ? (
            <Button size="sm" variant="outline" onClick={enterEdit}>
              <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
            </Button>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={() => setEditMode(false)}>Cancel</Button>
              <Button size="sm" onClick={saveOverrides} disabled={saving}>
                <Save className="w-3.5 h-3.5 mr-1.5" /> {saving ? "Saving…" : "Save overrides"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">From</p>
          <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">To</p>
          <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Category</p>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">All categories</option>
            {["Fruits","Vegetables","Nutraceuticals","Pet Food","Pharmaceutical","Probiotics","Herbs & Spices","Dairy","Mushrooms"].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        {(filterDateFrom || filterDateTo || filterCategory) && (
          <Button size="sm" variant="ghost" className="text-xs h-8 self-end"
            onClick={() => { setFilterDateFrom(""); setFilterDateTo(""); setFilterCategory(""); }}>
            Clear
          </Button>
        )}
      </div>

      {editMode && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
          Edit mode active — adjust any metric below. All changes are persisted as admin overrides and applied server-side.
        </div>
      )}

      {/* Sales volume KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {([
          { label: "Completed contracts", key: "sales_volume.total_contracts" as const, raw: data.sales_volume.total_contracts, display: data.sales_volume.total_contracts.toLocaleString(), step: "1" },
          { label: "Total volume (kg)", key: "sales_volume.total_quantity_kg" as const, raw: data.sales_volume.total_quantity_kg, display: data.sales_volume.total_quantity_kg.toLocaleString(), step: "0.01" },
          { label: "Contract value", key: "sales_volume.total_contract_value" as const, raw: data.sales_volume.total_contract_value, display: fmt(data.sales_volume.total_contract_value), step: "0.01" },
          { label: "Platform fees (9%)", key: "sales_volume.platform_fees" as const, raw: data.sales_volume.platform_fees, display: fmt(data.sales_volume.platform_fees), step: "0.01" },
        ] as const).map((s) => {
          const overridden = s.key in data.overrides;
          return (
            <Card key={s.key}>
              <CardContent className="p-4 text-center">
                {editMode ? (
                  <>
                    <input
                      type="number"
                      step={s.step}
                      value={editValues[s.key] ?? String(s.raw)}
                      onChange={e => setEditValues(prev => ({ ...prev, [s.key]: e.target.value }))}
                      className="w-full text-center text-base font-bold rounded border border-input bg-background px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-ring text-primary"
                    />
                    {overridden && <span className="text-[10px] text-amber-600 font-semibold">Override active</span>}
                  </>
                ) : (
                  <div className={`text-xl font-bold ${overridden ? "text-amber-600" : "text-primary"}`}>{s.display}</div>
                )}
                <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Avg price by category (editable) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Avg price by category ($/kg)</CardTitle>
          {editMode && <span className="text-[10px] text-amber-600 font-medium">Edit mode — click values to override</span>}
        </CardHeader>
        <CardContent>
          {avgPriceDisplay.length === 0 ? noData : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Category</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Avg $/kg</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Data points</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {avgPriceDisplay.map((r) => (
                    <tr key={r.category} className="hover:bg-muted/20">
                      <td className="py-2 px-3 font-medium">{r.category}</td>
                      <td className="py-2 px-3 text-right font-semibold text-primary">
                        {editMode ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editValues[`avg_price.${r.category}`] ?? String(r.avg_price)}
                            onChange={e => setEditValues(prev => ({ ...prev, [`avg_price.${r.category}`]: e.target.value }))}
                            className="w-24 text-right rounded border border-input bg-background px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        ) : (
                          <>${r.avg_price.toFixed(2)}</>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{r.count}</td>
                      <td className="py-2 px-3">
                        {r.overridden && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">Override</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Requests over time + Top materials */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Requests over time</CardTitle>
          </CardHeader>
          <CardContent>
            {data.requests_by_month.length === 0 ? noData : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.requests_by_month}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="Requests" fill="#0F6E56" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Top materials requested</CardTitle>
          </CardHeader>
          <CardContent>
            {data.top_materials.length === 0 ? noData : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={data.top_materials} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {data.top_materials.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue by month + Operator win rates */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Platform revenue (9% fees)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.revenue_by_month.length === 0 ? noData : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.revenue_by_month}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Line type="monotone" dataKey="value" name="Revenue" stroke="#0F6E56" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Operator win rates</CardTitle>
          </CardHeader>
          <CardContent>
            {data.operator_win_rates.length === 0 ? noData : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.operator_win_rates} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={80} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="win_rate" name="Win rate" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Demand by region + Operator supply by region */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Bid demand by region</CardTitle>
          </CardHeader>
          <CardContent>
            {(!data.demand_by_region || data.demand_by_region.length === 0) ? noData : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.demand_by_region}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="region" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Bids" fill="#0F6E56" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Operator supply by region</CardTitle>
          </CardHeader>
          <CardContent>
            {data.requests_by_region.length === 0 ? noData : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.requests_by_region}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="region" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Operators" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Listing performance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Listing performance</CardTitle>
          {editMode && <span className="text-[10px] text-amber-600 font-medium">Editable in edit mode</span>}
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          {([
            { label: "Capacity listings — total", totalKey: "listing_performance.total_capacity_listings" as const, approvedKey: "listing_performance.approved_capacity" as const },
            { label: "Product listings — total", totalKey: "listing_performance.total_product_listings" as const, approvedKey: "listing_performance.approved_products" as const },
          ] as const).map((item) => {
            const total = data.overrides[item.totalKey] ?? data.listing_performance[item.totalKey.split(".")[1] as keyof typeof data.listing_performance];
            const approved = data.overrides[item.approvedKey] ?? data.listing_performance[item.approvedKey.split(".")[1] as keyof typeof data.listing_performance];
            return (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1 gap-2">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  {editMode ? (
                    <div className="flex items-center gap-1">
                      <input type="number" step="1"
                        value={editValues[item.approvedKey] ?? String(approved)}
                        onChange={e => setEditValues(prev => ({ ...prev, [item.approvedKey]: e.target.value }))}
                        className="w-16 text-right rounded border border-input bg-background px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <span className="text-xs text-muted-foreground">/</span>
                      <input type="number" step="1"
                        value={editValues[item.totalKey] ?? String(total)}
                        onChange={e => setEditValues(prev => ({ ...prev, [item.totalKey]: e.target.value }))}
                        className="w-16 text-right rounded border border-input bg-background px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  ) : (
                    <span className={`text-xs font-medium ${item.totalKey in data.overrides || item.approvedKey in data.overrides ? "text-amber-600" : ""}`}>
                      {String(approved)} / {String(total)}
                    </span>
                  )}
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-2 bg-primary rounded-full"
                    style={{ width: Number(total) > 0 ? `${(Number(approved) / Number(total)) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            );
          })}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="text-center">
              <div className="text-xl font-bold text-primary">{data.bids_by_month.reduce((a, b) => a + b.value, 0)}</div>
              <div className="text-xs text-muted-foreground">Total bids</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-primary">
                {data.requests_by_month.length > 0 && data.bids_by_month.length > 0
                  ? (data.bids_by_month.reduce((a, b) => a + b.value, 0) /
                     Math.max(1, data.requests_by_month.reduce((a, b) => a + b.value, 0))).toFixed(1)
                  : "—"}
              </div>
              <div className="text-xs text-muted-foreground">Avg bids/request</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manufacturer activity */}
      {data.manufacturer_activity && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Manufacturer activity</CardTitle>
              <div className="flex items-center gap-2">
                {editMode ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">Active count:</span>
                    <input type="number" step="1"
                      value={editValues["manufacturer_activity.total_active"] ?? String(data.manufacturer_activity.total_active)}
                      onChange={e => setEditValues(prev => ({ ...prev, "manufacturer_activity.total_active": e.target.value }))}
                      className="w-16 rounded border border-input bg-background px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                ) : (
                  <span className={`text-xs font-medium ${
                    "manufacturer_activity.total_active" in data.overrides ? "text-amber-600" : "text-muted-foreground"
                  }`}>{data.manufacturer_activity.total_active} active</span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {data.manufacturer_activity.top_manufacturers.length === 0 ? noData : (
              <div className="overflow-x-auto rounded border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/30 border-b">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Manufacturer</th>
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Country</th>
                      <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Avg rating</th>
                      <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Reviews</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.manufacturer_activity.top_manufacturers.map((m) => {
                      const ratingKey = `manufacturer_activity.${m.name}.avg_rating`;
                      const reviewKey = `manufacturer_activity.${m.name}.review_count`;
                      return (
                        <tr key={m.name} className="hover:bg-muted/20">
                          <td className="px-3 py-2 font-medium">{m.name}</td>
                          <td className="px-3 py-2 text-muted-foreground">{m.country}</td>
                          <td className="px-3 py-2 text-right font-semibold">
                            {editMode ? (
                              <input type="number" step="0.1" min="0" max="5"
                                value={editValues[ratingKey] ?? String(m.avg_rating)}
                                onChange={e => setEditValues(prev => ({ ...prev, [ratingKey]: e.target.value }))}
                                className="w-16 text-right rounded border border-input bg-background px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                              />
                            ) : (
                              <span className={ratingKey in data.overrides ? "text-amber-600" : "text-primary"}>
                                {m.avg_rating.toFixed(1)}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {editMode ? (
                              <input type="number" step="1"
                                value={editValues[reviewKey] ?? String(m.review_count)}
                                onChange={e => setEditValues(prev => ({ ...prev, [reviewKey]: e.target.value }))}
                                className="w-16 text-right rounded border border-input bg-background px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                              />
                            ) : (
                              <span className={reviewKey in data.overrides ? "text-amber-600" : "text-muted-foreground"}>
                                {m.review_count}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Machinery/parts demand */}
      {data.machinery_demand && data.machinery_demand.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Machinery demand by category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.machinery_demand}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="category" tick={{ fontSize: 9 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="total_listings" name="Total listings" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="active_listings" name="Active" fill="#0F6E56" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Avg machinery price by category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/30 border-b">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Category</th>
                      <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Listings</th>
                      <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Avg price</th>
                      <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.machinery_demand.map((m) => {
                      const priceKey = `machinery_demand.${m.category}.avg_price`;
                      const listingsKey = `machinery_demand.${m.category}.total_listings`;
                      return (
                        <tr key={m.category} className="hover:bg-muted/20">
                          <td className="px-3 py-2 font-medium capitalize">{m.category}</td>
                          <td className="px-3 py-2 text-right">
                            {editMode ? (
                              <input type="number" step="1"
                                value={editValues[listingsKey] ?? String(m.total_listings)}
                                onChange={e => setEditValues(prev => ({ ...prev, [listingsKey]: e.target.value }))}
                                className="w-14 text-right rounded border border-input bg-background px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                              />
                            ) : (
                              <span className={listingsKey in data.overrides ? "text-amber-600 font-medium" : "text-muted-foreground"}>
                                {m.total_listings}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {editMode ? (
                              <input type="number" step="0.01"
                                value={editValues[priceKey] ?? (m.avg_price != null ? String(m.avg_price) : "")}
                                onChange={e => setEditValues(prev => ({ ...prev, [priceKey]: e.target.value }))}
                                className="w-20 text-right rounded border border-input bg-background px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                                placeholder="—"
                              />
                            ) : (
                              <span className={`font-semibold ${priceKey in data.overrides ? "text-amber-600" : "text-primary"}`}>
                                {m.avg_price != null ? fmt(m.avg_price) : "—"}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-muted-foreground">{m.active_listings}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Messages ────────────────────────────────────────────────────────────
