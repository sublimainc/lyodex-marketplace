import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Plus, Trash2, Pencil, ChevronDown, ChevronUp, Save } from "lucide-react";
import { ConfirmDialog, FormField, Manufacturer, MfrFormData, SlideOver, Tab, TagInput, api, emptyMfrForm, inputCls } from "../shared";

export function mfrToForm(m: Manufacturer): MfrFormData {
  return {
    name: m.name ?? "", tagline: m.tagline ?? "", description: m.description ?? "",
    website_url: m.website_url ?? "", logo_url: m.logo_url ?? "", country: m.country ?? "",
    city: m.city ?? "", founded_year: m.founded_year ? String(m.founded_year) : "",
    specialties: m.specialties ?? [], market_focus: m.market_focus ?? [],
    certifications: m.certifications ?? [], production_capabilities: m.production_capabilities ?? "",
    contact_name: m.contact_name ?? "", contact_email: m.contact_email ?? "", phone: m.phone ?? "",
    active: m.active ?? true, featured: m.featured ?? false,
  };
}

export function ManufacturersTab() {
  const [rows, setRows] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState<"name" | "avg_rating" | "created_at">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [formOpen, setFormOpen] = useState(false);
  const [editRow, setEditRow] = useState<Manufacturer | null>(null);
  const [formData, setFormData] = useState<MfrFormData>(emptyMfrForm());
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api("/admin/manufacturers").then(setRows).catch(console.error).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditRow(null); setFormData(emptyMfrForm()); setFormError(""); setFormOpen(true); };
  const openEdit = (m: Manufacturer) => { setEditRow(m); setFormData(mfrToForm(m)); setFormError(""); setFormOpen(true); };

  const save = async () => {
    if (!formData.name.trim()) { setFormError("Name is required"); return; }
    setFormSaving(true);
    try {
      const payload = { ...formData, founded_year: formData.founded_year ? Number(formData.founded_year) : null };
      if (editRow) await api(`/admin/manufacturers/${editRow.id}`, "PUT", payload);
      else await api("/admin/manufacturers", "POST", payload);
      setFormOpen(false); load();
    } catch (err) { setFormError(String(err)); }
    finally { setFormSaving(false); }
  };

  const deleteMfr = async () => {
    if (!deleteId) return;
    try { await api(`/admin/manufacturers/${deleteId}`, "DELETE"); setDeleteId(null); load(); }
    catch (err) { console.error(err); }
  };

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  };
  const SortIcon = ({ col }: { col: typeof sortBy }) => sortBy === col
    ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />)
    : null;

  const filtered = rows
    .filter(r => {
      if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus === "active" && !r.active) return false;
      if (filterStatus === "inactive" && r.active) return false;
      return true;
    })
    .sort((a, b) => {
      const cmp = String(a[sortBy] ?? "").localeCompare(String(b[sortBy] ?? ""), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold">Manufacturers</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{rows.length} total</p>
        </div>
        <Button size="sm" className="gap-1.5 shrink-0" onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" /> Add Manufacturer
        </Button>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input className="flex-1 border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Search by name…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="border rounded-lg px-3 py-2 text-sm bg-background" value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider cursor-pointer" onClick={() => toggleSort("name")}>Name <SortIcon col="name" /></th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Location</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Specialties</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider cursor-pointer" onClick={() => toggleSort("avg_rating")}>Rating <SortIcon col="avg_rating" /></th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? [1,2,3].map(i => <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>)
            : filtered.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No manufacturers found.</td></tr>
            : filtered.map(m => (
              <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-medium">
                  <div>{m.name}</div>
                  {m.website_url && <a href={m.website_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-0.5"><ExternalLink className="w-2.5 h-2.5" />{m.website_url.replace(/^https?:\/\//, "")}</a>}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{[m.city, m.country].filter(Boolean).join(", ") || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(m.specialties ?? []).slice(0,3).map(s => <Badge key={s} variant="outline" className="text-[9px] px-1.5 py-0">{s}</Badge>)}
                    {(m.specialties ?? []).length > 3 && <Badge variant="outline" className="text-[9px] px-1.5 py-0">+{m.specialties.length - 3}</Badge>}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{m.avg_rating.toFixed(1)}</td>
                <td className="px-4 py-3">
                  {m.active
                    ? <Badge variant="outline" className="text-[10px] text-green-700 border-green-300">Active</Badge>
                    : <Badge variant="outline" className="text-[10px] text-muted-foreground">Inactive</Badge>}
                  {m.featured && <Badge className="ml-1 text-[10px] bg-amber-100 text-amber-700 border-0">Featured</Badge>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openEdit(m)}><Pencil className="w-3 h-3" /> Edit</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive hover:bg-destructive/10 border-destructive/30" onClick={() => setDeleteId(m.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SlideOver title={editRow ? `Edit — ${editRow.name}` : "Add Manufacturer"} open={formOpen} onClose={() => setFormOpen(false)}
        footer={<>
          <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button disabled={formSaving} onClick={save}>{formSaving ? "Saving…" : (editRow ? "Save changes" : "Create")}</Button>
        </>}
      >
        <div className="space-y-3">
          <FormField label="Company name" required><input className={inputCls} value={formData.name} onChange={e => setFormData(d => ({ ...d, name: e.target.value }))} /></FormField>
          <FormField label="Tagline"><input className={inputCls} value={formData.tagline} onChange={e => setFormData(d => ({ ...d, tagline: e.target.value }))} /></FormField>
          <FormField label="Description"><textarea className={inputCls} rows={3} value={formData.description} onChange={e => setFormData(d => ({ ...d, description: e.target.value }))} /></FormField>
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Country"><input className={inputCls} value={formData.country} onChange={e => setFormData(d => ({ ...d, country: e.target.value }))} placeholder="CA" /></FormField>
            <FormField label="City"><input className={inputCls} value={formData.city} onChange={e => setFormData(d => ({ ...d, city: e.target.value }))} /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Founded year"><input className={inputCls} type="number" value={formData.founded_year} onChange={e => setFormData(d => ({ ...d, founded_year: e.target.value }))} /></FormField>
            <FormField label="Website URL"><input className={inputCls} type="url" value={formData.website_url} onChange={e => setFormData(d => ({ ...d, website_url: e.target.value }))} /></FormField>
          </div>
          <FormField label="Logo URL"><input className={inputCls} type="url" value={formData.logo_url} onChange={e => setFormData(d => ({ ...d, logo_url: e.target.value }))} /></FormField>
          <FormField label="Specialties"><TagInput value={formData.specialties} onChange={v => setFormData(d => ({ ...d, specialties: v }))} placeholder="Lyophilization, Pharma…" /></FormField>
          <FormField label="Market focus"><TagInput value={formData.market_focus} onChange={v => setFormData(d => ({ ...d, market_focus: v }))} placeholder="Pharma, Food, Biotech…" /></FormField>
          <FormField label="Certifications"><TagInput value={formData.certifications} onChange={v => setFormData(d => ({ ...d, certifications: v }))} placeholder="ISO 9001, GMP…" /></FormField>
          <FormField label="Production capabilities"><textarea className={inputCls} rows={2} value={formData.production_capabilities} onChange={e => setFormData(d => ({ ...d, production_capabilities: e.target.value }))} /></FormField>
          <FormField label="Contact name"><input className={inputCls} value={formData.contact_name} onChange={e => setFormData(d => ({ ...d, contact_name: e.target.value }))} /></FormField>
          <FormField label="Contact email"><input className={inputCls} type="email" value={formData.contact_email} onChange={e => setFormData(d => ({ ...d, contact_email: e.target.value }))} /></FormField>
          <FormField label="Phone"><input className={inputCls} type="tel" value={formData.phone} onChange={e => setFormData(d => ({ ...d, phone: e.target.value }))} /></FormField>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={formData.active} onChange={e => setFormData(d => ({ ...d, active: e.target.checked }))} className="accent-primary" /> Active
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={formData.featured} onChange={e => setFormData(d => ({ ...d, featured: e.target.checked }))} className="accent-primary" /> Featured
            </label>
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
        </div>
      </SlideOver>

      {deleteId !== null && (
        <ConfirmDialog
          title="Delete manufacturer"
          message="This will permanently remove the manufacturer and all their reviews."
          onConfirm={deleteMfr}
          onClose={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}

// ─── Tab: Operator Map ────────────────────────────────────────────────────────
