import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, ShieldAlert, Shield, ExternalLink, FileSearch, Plus, Trash2, Pencil, ChevronDown, ChevronUp, Save } from "lucide-react";
import { AUDIT_LABEL, AdminOperator, BASE, ConfirmDialog, FormField, LocationPicker, OperatorFormData, SlideOver, Tab, TagInput, api, emptyOperatorForm, inputCls, selectCls } from "../shared";

export function opToForm(op: AdminOperator): OperatorFormData {
  return {
    name: op.name ?? "", location: op.location ?? "", description: op.description ?? "",
    capacity_kg: String(op.capacity_kg ?? ""), price_per_kg: String(op.price_per_kg ?? ""),
    turnaround_days: String(op.turnaround_days ?? "14"), certifications: op.certifications ?? [],
    available: op.available ?? true, country: op.country ?? "", city: op.city ?? "",
    website_url: op.website_url ?? "", contact_page_url: op.contact_page_url ?? "",
    role: op.role ?? "operator", food_market_focus: op.food_market_focus ?? false,
    pharmaceutical_focus: op.pharmaceutical_focus ?? false,
    platform_fee_override: op.platform_fee_override ?? "",
    gps_lat: op.gps_lat != null ? String(op.gps_lat) : "",
    gps_lng: op.gps_lng != null ? String(op.gps_lng) : "",
    service_radius_km: op.service_radius_km != null ? String(op.service_radius_km) : "",
    map_status: op.map_status ?? "active", contact_name: op.contact_name ?? "",
    contact_email: op.contact_email ?? "", phone: op.phone ?? "",
    audit_status: op.audit_status ?? "none", verification_status: op.verification_status ?? "not_verified",
  };
}

export function OperatorForm({ data, onChange }: { data: OperatorFormData; onChange: (d: OperatorFormData) => void }) {
  const set = (k: keyof OperatorFormData, v: unknown) => onChange({ ...data, [k]: v });
  const [section, setSection] = useState<"basic" | "location" | "platform" | "map">("basic");
  const sections = [
    { id: "basic" as const, label: "Basic info" },
    { id: "location" as const, label: "Location" },
    { id: "platform" as const, label: "Platform" },
    { id: "map" as const, label: "Map / contact" },
  ];
  return (
    <div className="space-y-4">
      <div className="flex gap-1 flex-wrap">
        {sections.map(s => (
          <button key={s.id} type="button" onClick={() => setSection(s.id)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${section === s.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
            {s.label}
          </button>
        ))}
      </div>
      {section === "basic" && (
        <div className="space-y-3">
          <FormField label="Name" required><input className={inputCls} value={data.name} onChange={e => set("name", e.target.value)} /></FormField>
          <FormField label="Location (display)" required><input className={inputCls} value={data.location} onChange={e => set("location", e.target.value)} /></FormField>
          <FormField label="Description"><textarea className={inputCls} rows={3} value={data.description} onChange={e => set("description", e.target.value)} /></FormField>
          <div className="grid grid-cols-3 gap-2">
            <FormField label="Capacity (kg)"><input className={inputCls} type="number" value={data.capacity_kg} onChange={e => set("capacity_kg", e.target.value)} /></FormField>
            <FormField label="Price/kg ($)"><input className={inputCls} type="number" step="0.01" value={data.price_per_kg} onChange={e => set("price_per_kg", e.target.value)} /></FormField>
            <FormField label="Turnaround (days)"><input className={inputCls} type="number" value={data.turnaround_days} onChange={e => set("turnaround_days", e.target.value)} /></FormField>
          </div>
          <FormField label="Role">
            <select className={selectCls} value={data.role} onChange={e => set("role", e.target.value)}>
              <option value="operator">Operator</option>
              <option value="ingredient_seller">Ingredient Seller</option>
              <option value="machinery_supplier">Machinery Supplier</option>
              <option value="service_provider">Service Provider</option>
            </select>
          </FormField>
          <FormField label="Certifications"><TagInput value={data.certifications} onChange={v => set("certifications", v)} placeholder="GMP, FDA, HACCP…" /></FormField>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={data.available} onChange={e => set("available", e.target.checked)} className="accent-primary" /> Available
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={data.food_market_focus} onChange={e => set("food_market_focus", e.target.checked)} className="accent-primary" /> Food focus
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={data.pharmaceutical_focus} onChange={e => set("pharmaceutical_focus", e.target.checked)} className="accent-primary" /> Pharma focus
            </label>
          </div>
        </div>
      )}
      {section === "location" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Country"><input className={inputCls} value={data.country} onChange={e => set("country", e.target.value)} placeholder="CA" /></FormField>
            <FormField label="City"><input className={inputCls} value={data.city} onChange={e => set("city", e.target.value)} /></FormField>
          </div>
          <FormField label="Website URL"><input className={inputCls} type="url" value={data.website_url} onChange={e => set("website_url", e.target.value)} /></FormField>
          <FormField label="Contact page URL"><input className={inputCls} type="url" value={data.contact_page_url} onChange={e => set("contact_page_url", e.target.value)} /></FormField>
        </div>
      )}
      {section === "platform" && (
        <div className="space-y-3">
          <FormField label="Platform fee override (%)">
            <input className={inputCls} type="number" step="0.01" min="0" max="100" value={data.platform_fee_override} onChange={e => set("platform_fee_override", e.target.value)} placeholder="Leave blank to use global default (9%)" />
          </FormField>
          <FormField label="Audit status">
            <select className={selectCls} value={data.audit_status} onChange={e => set("audit_status", e.target.value)}>
              <option value="none">Not audited</option>
              <option value="pending">Pending</option>
              <option value="audited">Audited</option>
            </select>
          </FormField>
          <FormField label="Verification status">
            <select className={selectCls} value={data.verification_status} onChange={e => set("verification_status", e.target.value)}>
              <option value="not_verified">Not verified</option>
              <option value="partially_verified">Partially verified</option>
              <option value="verified">Verified</option>
            </select>
          </FormField>
        </div>
      )}
      {section === "map" && (
        <div className="space-y-3">
          <FormField label="Pin location">
            <LocationPicker
              lat={data.gps_lat}
              lng={data.gps_lng}
              onChangeLatLng={(lat, lng) => { set("gps_lat", String(lat)); set("gps_lng", String(lng)); }}
            />
          </FormField>
          <FormField label="Service radius (km)"><input className={inputCls} type="number" value={data.service_radius_km} onChange={e => set("service_radius_km", e.target.value)} /></FormField>
          <FormField label="Map status">
            <select className={selectCls} value={data.map_status} onChange={e => set("map_status", e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </FormField>
          <FormField label="Contact name"><input className={inputCls} value={data.contact_name} onChange={e => set("contact_name", e.target.value)} /></FormField>
          <FormField label="Contact email"><input className={inputCls} type="email" value={data.contact_email} onChange={e => set("contact_email", e.target.value)} /></FormField>
          <FormField label="Phone"><input className={inputCls} type="tel" value={data.phone} onChange={e => set("phone", e.target.value)} /></FormField>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Operators ───────────────────────────────────────────────────────────

// ─── Tab: Operators ───────────────────────────────────────────────────────────

export function OperatorsTab() {
  const [operators, setOperators] = useState<AdminOperator[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [certWorking, setCertWorking] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "available" | "unavailable">("all");
  const [sortBy, setSortBy] = useState<"name" | "rating" | "created_at">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [formOpen, setFormOpen] = useState(false);
  const [editOp, setEditOp] = useState<AdminOperator | null>(null);
  const [formData, setFormData] = useState<OperatorFormData>(emptyOperatorForm());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formSaving, setFormSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api("/admin/operators").then(setOperators).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditOp(null); setFormData(emptyOperatorForm()); setFormErrors({}); setFormOpen(true); };
  const openEdit = (op: AdminOperator) => { setEditOp(op); setFormData(opToForm(op)); setFormErrors({}); setFormOpen(true); };

  const saveOperator = async () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Name is required";
    if (!formData.location.trim()) errors.location = "Location is required";
    if (Object.keys(errors).length) { setFormErrors(errors); return; }
    setFormSaving(true);
    try {
      const payload = {
        ...formData,
        capacity_kg: formData.capacity_kg ? Number(formData.capacity_kg) : 0,
        price_per_kg: formData.price_per_kg ? Number(formData.price_per_kg) : 0,
        turnaround_days: formData.turnaround_days ? Number(formData.turnaround_days) : 14,
        platform_fee_override: formData.platform_fee_override || null,
        gps_lat: formData.gps_lat ? Number(formData.gps_lat) : null,
        gps_lng: formData.gps_lng ? Number(formData.gps_lng) : null,
        service_radius_km: formData.service_radius_km ? Number(formData.service_radius_km) : null,
      };
      if (editOp) {
        await api(`/admin/operators/${editOp.id}`, "PUT", payload);
      } else {
        await api("/admin/operators", "POST", payload);
      }
      setFormOpen(false);
      load();
    } catch (err) {
      console.error(err);
    } finally { setFormSaving(false); }
  };

  const deleteOperator = async () => {
    if (!deleteId) return;
    try {
      await api(`/admin/operators/${deleteId}`, "DELETE");
      setDeleteId(null);
      load();
    } catch (err) { console.error(err); }
  };

  const triggerAudit = async (id: number) => {
    setWorking(id);
    try {
      await api(`/admin/operators/${id}/audit`, "POST");
      setOperators((prev) => prev.map((o) => o.id === id ? { ...o, audit_status: "pending", audit_triggered_at: new Date().toISOString() } : o));
    } finally { setWorking(null); }
  };

  const markAudited = async (id: number) => {
    setWorking(id);
    try {
      await api(`/admin/operators/${id}/audited`, "POST");
      setOperators((prev) => prev.map((o) => o.id === id ? { ...o, audit_status: "audited" } : o));
    } finally { setWorking(null); }
  };

  const toggleCert = async (operatorId: number, cert: string, verified: boolean) => {
    const key = `${operatorId}:${cert}`;
    setCertWorking(key);
    try {
      await api(`/admin/operators/${operatorId}/certifications`, "PATCH", { cert, verified });
      setOperators((prev) => prev.map((o) => {
        if (o.id !== operatorId) return o;
        const current = o.verified_certifications ?? [];
        const updated = verified
          ? current.includes(cert) ? current : [...current, cert]
          : current.filter((c) => c !== cert);
        return { ...o, verified_certifications: updated };
      }));
    } finally { setCertWorking(null); }
  };

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  };
  const SortIcon = ({ col }: { col: typeof sortBy }) => sortBy === col
    ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />)
    : null;

  const filtered = operators
    .filter(op => {
      if (search && !op.name.toLowerCase().includes(search.toLowerCase()) && !op.location.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus === "available" && !op.available) return false;
      if (filterStatus === "unavailable" && op.available) return false;
      return true;
    })
    .sort((a, b) => {
      let va: unknown = a[sortBy]; let vb: unknown = b[sortBy];
      if (sortBy === "rating") { va = a.rating; vb = b.rating; }
      const cmp = String(va ?? "").localeCompare(String(vb ?? ""), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <h2 className="text-xl font-bold">Operators</h2>
        <Button size="sm" className="gap-1.5 shrink-0" onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" /> Add Operator
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input className="flex-1 border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Search by name or location…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}>
          <option value="all">All statuses</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
        </select>
      </div>

      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => toggleSort("name")}>Operator <SortIcon col="name" /></th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Location</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Certifications</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => toggleSort("rating")}>Rating <SortIcon col="rating" /></th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Audit</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              [1, 2, 3].map((i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No operators found.</td></tr>
            ) : filtered.map((op) => {
              const audit = AUDIT_LABEL[op.audit_status] ?? AUDIT_LABEL.none;
              const verifiedCount = (op.verified_certifications ?? []).length;
              const totalCount = op.certifications.length;
              const isExpanded = expandedId === op.id;
              return (
                <>
                  <tr key={op.id} className={`hover:bg-muted/20 transition-colors ${isExpanded ? "bg-muted/10" : ""}`}>
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/operators/${op.id}`} className="hover:text-primary transition-colors flex items-center gap-1">
                        {op.name} <ExternalLink className="w-3 h-3 opacity-40" />
                      </Link>
                      {op.platform_fee_override != null && (
                        <span className="block text-[10px] text-amber-600 mt-0.5">Fee: {op.platform_fee_override}%</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{op.location}</td>
                    <td className="px-4 py-3">
                      <button
                        className="text-left group"
                        onClick={() => setExpandedId(isExpanded ? null : op.id)}
                        title="Click to verify individual certifications"
                      >
                        <div className="flex flex-wrap gap-1 mb-1">
                          {op.certifications.slice(0, 3).map((c) => {
                            const isVerified = (op.verified_certifications ?? []).includes(c);
                            return (
                              <Badge key={c} variant="outline" className={`text-[9px] px-1.5 py-0 ${isVerified ? "border-emerald-400 text-emerald-700 bg-emerald-50" : ""}`}>
                                {isVerified && <ShieldCheck className="w-2.5 h-2.5 mr-0.5 inline" />}
                                {c}
                              </Badge>
                            );
                          })}
                          {op.certifications.length > 3 && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0">+{op.certifications.length - 3}</Badge>
                          )}
                        </div>
                        {totalCount > 0 && (
                          <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors">
                            {verifiedCount}/{totalCount} verified — click to manage
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{op.rating.toFixed(1)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {op.audit_status === "audited" && <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />}
                        {op.audit_status === "pending" && <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                        {op.audit_status === "none" && <Shield className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                        <Badge variant={audit.variant} className="text-[10px] uppercase">{audit.label}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 flex-wrap">
                        {op.audit_status === "none" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" disabled={working === op.id} onClick={() => triggerAudit(op.id)}>Audit</Button>
                        )}
                        {op.audit_status === "pending" && (
                          <Button size="sm" variant="default" className="h-7 text-xs gap-1" disabled={working === op.id} onClick={() => markAudited(op.id)}>
                            <ShieldCheck className="w-3 h-3" /> Audited
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openEdit(op)}>
                          <Pencil className="w-3 h-3" /> Edit
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive hover:bg-destructive/10 border-destructive/30" onClick={() => setDeleteId(op.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${op.id}-certs`} className="bg-muted/5">
                      <td colSpan={6} className="px-6 py-4 border-b">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-primary" />
                            Certification verification — {op.name}
                          </p>
                          <span className="text-xs text-muted-foreground">{verifiedCount}/{totalCount} verified</span>
                        </div>
                        {op.certifications.length === 0 ? (
                          <p className="text-sm text-muted-foreground italic">No certifications claimed.</p>
                        ) : (
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {op.certifications.map((cert) => {
                              const isVerified = (op.verified_certifications ?? []).includes(cert);
                              const key = `${op.id}:${cert}`;
                              const busy = certWorking === key;
                              const docPath = (op.cert_documents ?? {})[cert];
                              return (
                                <label
                                  key={cert}
                                  className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors select-none ${
                                    isVerified ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-border bg-background hover:bg-muted/40"
                                  } ${busy ? "opacity-60 pointer-events-none" : ""}`}
                                >
                                  <input type="checkbox" checked={isVerified} disabled={busy} onChange={(e) => toggleCert(op.id, cert, e.target.checked)} className="w-4 h-4 rounded accent-emerald-600 mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm font-medium">{cert}</span>
                                    {docPath ? (
                                      <a href={`${BASE}/api/storage${docPath}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-[10px] text-primary hover:underline mt-0.5">
                                        <FileSearch className="w-3 h-3" /> View document
                                      </a>
                                    ) : (
                                      <span className="block text-[10px] text-muted-foreground mt-0.5 italic">No document</span>
                                    )}
                                  </div>
                                  {isVerified && <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                                </label>
                              );
                            })}
                          </div>
                        )}
                        <button className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors" onClick={() => setExpandedId(null)}>Collapse</button>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      <SlideOver title={editOp ? `Edit — ${editOp.name}` : "Add Operator"} open={formOpen} onClose={() => setFormOpen(false)}
        footer={<>
          <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button disabled={formSaving} onClick={saveOperator}>{formSaving ? "Saving…" : (editOp ? "Save changes" : "Create operator")}</Button>
        </>}
      >
        <OperatorForm data={formData} onChange={d => { setFormData(d); setFormErrors({}); }} />
        {Object.keys(formErrors).length > 0 && (
          <div className="text-sm text-destructive bg-destructive/10 rounded p-3">
            {Object.values(formErrors).join(" · ")}
          </div>
        )}
      </SlideOver>

      {deleteId !== null && (
        <ConfirmDialog
          title="Delete operator"
          message="This will permanently remove the operator and all associated data. This cannot be undone."
          onConfirm={deleteOperator}
          onClose={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}

// ─── Tab: Transactions ────────────────────────────────────────────────────────
