import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Pencil, X, ChevronDown, ChevronUp, Save } from "lucide-react";
import { ConfirmDialog, FormField, MACHINERY_CATEGORIES, MACHINERY_CONDITIONS, MACHINERY_STATUSES, MachFormData, MachineryListing, Manufacturer, SlideOver, api, emptyMachForm, inputCls, selectCls } from "../shared";

export function machToForm(m: MachineryListing): MachFormData {
  return {
    title: m.title, category: m.category, listing_status: m.listing_status,
    condition: m.condition, description: m.description ?? "", price: m.price != null ? String(m.price) : "",
    currency: m.currency, manufacturer_name: m.manufacturer_name ?? "",
    model_number: m.model_number ?? "", year_manufactured: m.year_manufactured != null ? String(m.year_manufactured) : "",
    tech_key: "", tech_val: "", technical_specs: m.technical_specs ?? {},
    contact_name: m.contact_name ?? "", contact_email: m.contact_email ?? "", phone: m.phone ?? "",
    operator_id: m.operator_id != null ? String(m.operator_id) : "",
  };
}

export function MachineryListingsTab() {
  const [rows, setRows] = useState<MachineryListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"title" | "price" | "created_at">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [formOpen, setFormOpen] = useState(false);
  const [editRow, setEditRow] = useState<MachineryListing | null>(null);
  const [formData, setFormData] = useState<MachFormData>(emptyMachForm());
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api("/admin/machinery").then(setRows).catch(console.error).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditRow(null); setFormData(emptyMachForm()); setFormError(""); setFormOpen(true); };
  const openEdit = (m: MachineryListing) => { setEditRow(m); setFormData(machToForm(m)); setFormError(""); setFormOpen(true); };

  const save = async () => {
    if (!formData.title.trim()) { setFormError("Title is required"); return; }
    setFormSaving(true);
    const { tech_key, tech_val, ...rest } = formData;
    void tech_key; void tech_val;
    try {
      const payload = {
        ...rest,
        price: formData.price ? Number(formData.price) : null,
        year_manufactured: formData.year_manufactured ? Number(formData.year_manufactured) : null,
        operator_id: formData.operator_id ? Number(formData.operator_id) : null,
      };
      if (editRow) await api(`/admin/machinery/${editRow.id}`, "PUT", payload);
      else await api("/admin/machinery", "POST", payload);
      setFormOpen(false); load();
    } catch (err) { setFormError(String(err)); }
    finally { setFormSaving(false); }
  };

  const deleteMach = async () => {
    if (!deleteId) return;
    try { await api(`/admin/machinery/${deleteId}`, "DELETE"); setDeleteId(null); load(); }
    catch (err) { console.error(err); }
  };

  const addSpec = () => {
    const k = formData.tech_key.trim(); const v = formData.tech_val.trim();
    if (!k) return;
    setFormData(d => ({ ...d, technical_specs: { ...d.technical_specs, [k]: v }, tech_key: "", tech_val: "" }));
  };
  const removeSpec = (k: string) => setFormData(d => { const s = { ...d.technical_specs }; delete s[k]; return { ...d, technical_specs: s }; });

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  };
  const SortIcon = ({ col }: { col: typeof sortBy }) => sortBy === col
    ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />)
    : null;

  const filtered = rows
    .filter(r => {
      if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !(r.manufacturer_name ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus !== "all" && r.listing_status !== filterStatus) return false;
      if (filterCategory !== "all" && r.category !== filterCategory) return false;
      return true;
    })
    .sort((a, b) => {
      const va = a[sortBy] ?? 0; const vb = b[sortBy] ?? 0;
      const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { active: "text-green-700 border-green-300", sold: "text-blue-700 border-blue-300", pending: "text-yellow-700 border-yellow-300", inactive: "text-muted-foreground" };
    return <Badge variant="outline" className={`text-[10px] capitalize ${map[s] ?? ""}`}>{s}</Badge>;
  };
  const condBadge = (c: string) => {
    const map: Record<string, string> = { new: "text-emerald-700 border-emerald-300", refurbished: "text-blue-700 border-blue-300", used: "text-muted-foreground" };
    return <Badge variant="outline" className={`text-[10px] capitalize ${map[c] ?? ""}`}>{c}</Badge>;
  };

  const set = (k: keyof MachFormData, v: unknown) => setFormData(d => ({ ...d, [k]: v }));

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold">Machinery &amp; Parts</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{rows.length} listings total</p>
        </div>
        <Button size="sm" className="gap-1.5 shrink-0" onClick={openAdd}><Plus className="w-3.5 h-3.5" /> Add Listing</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <input className="flex-1 border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Search by title or manufacturer…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="border rounded-lg px-3 py-2 text-sm bg-background" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {MACHINERY_STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
        <select className="border rounded-lg px-3 py-2 text-sm bg-background" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="all">All categories</option>
          {MACHINERY_CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
        </select>
      </div>

      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider cursor-pointer" onClick={() => toggleSort("title")}>Title <SortIcon col="title" /></th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Category / Cond.</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Manufacturer</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider cursor-pointer" onClick={() => toggleSort("price")}>Price <SortIcon col="price" /></th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? [1,2,3].map(i => <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>)
            : filtered.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No machinery listings found.</td></tr>
            : filtered.map(r => (
              <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-medium">
                  {r.title}
                  {r.model_number && <div className="text-[10px] text-muted-foreground font-mono">Model: {r.model_number}</div>}
                </td>
                <td className="px-4 py-3">
                  <div className="capitalize text-xs">{r.category}</div>
                  <div className="mt-0.5">{condBadge(r.condition)}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  <div>{r.manufacturer_name || "—"}</div>
                  {r.year_manufactured && <div className="text-[10px]">{r.year_manufactured}</div>}
                </td>
                <td className="px-4 py-3 text-xs">
                  {r.price != null ? `${r.currency} ${r.price.toLocaleString()}` : <span className="text-muted-foreground italic">Contact</span>}
                </td>
                <td className="px-4 py-3">{statusBadge(r.listing_status)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openEdit(r)}><Pencil className="w-3 h-3" /> Edit</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:bg-destructive/10 border-destructive/30" onClick={() => setDeleteId(r.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SlideOver title={editRow ? `Edit — ${editRow.title}` : "Add Machinery / Parts Listing"} open={formOpen} onClose={() => setFormOpen(false)}
        footer={<>
          <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button disabled={formSaving} onClick={save}>{formSaving ? "Saving…" : (editRow ? "Save changes" : "Create listing")}</Button>
        </>}
      >
        <div className="space-y-3">
          <FormField label="Title" required><input className={inputCls} value={formData.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Hull Lyomax 10 Freeze Dryer" /></FormField>
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Category">
              <select className={selectCls} value={formData.category} onChange={e => set("category", e.target.value)}>
                {MACHINERY_CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </FormField>
            <FormField label="Condition">
              <select className={selectCls} value={formData.condition} onChange={e => set("condition", e.target.value)}>
                {MACHINERY_CONDITIONS.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="Listing status">
            <select className={selectCls} value={formData.listing_status} onChange={e => set("listing_status", e.target.value)}>
              {MACHINERY_STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
            </select>
          </FormField>
          <FormField label="Description"><textarea className={inputCls} rows={3} value={formData.description} onChange={e => set("description", e.target.value)} /></FormField>
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Manufacturer"><input className={inputCls} value={formData.manufacturer_name} onChange={e => set("manufacturer_name", e.target.value)} placeholder="e.g. Hull, Usifroid" /></FormField>
            <FormField label="Model number"><input className={inputCls} value={formData.model_number} onChange={e => set("model_number", e.target.value)} /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Year"><input className={inputCls} type="number" min="1950" max="2030" value={formData.year_manufactured} onChange={e => set("year_manufactured", e.target.value)} /></FormField>
            <FormField label="Operator ID"><input className={inputCls} type="number" value={formData.operator_id} onChange={e => set("operator_id", e.target.value)} placeholder="Link to operator" /></FormField>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2"><FormField label="Price"><input className={inputCls} type="number" step="0.01" min="0" value={formData.price} onChange={e => set("price", e.target.value)} placeholder="Leave blank = on request" /></FormField></div>
            <FormField label="Currency">
              <select className={selectCls} value={formData.currency} onChange={e => set("currency", e.target.value)}>
                <option value="CAD">CAD</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </FormField>
          </div>
          <FormField label="Technical specs">
            <div className="space-y-1.5">
              {Object.entries(formData.technical_specs).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5 text-xs bg-muted rounded px-2 py-1">
                  <span className="font-mono font-medium">{k}</span>
                  <span className="text-muted-foreground">:</span>
                  <span className="flex-1">{v}</span>
                  <button type="button" onClick={() => removeSpec(k)} className="text-destructive hover:opacity-70"><X className="w-3 h-3" /></button>
                </div>
              ))}
              <div className="flex gap-1">
                <input className="flex-1 border rounded px-2 py-1 text-xs" value={formData.tech_key} onChange={e => set("tech_key", e.target.value)} placeholder="Key (e.g. Shelf area)" />
                <input className="flex-1 border rounded px-2 py-1 text-xs" value={formData.tech_val} onChange={e => set("tech_val", e.target.value)} placeholder="Value (e.g. 10 m²)" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSpec(); } }} />
                <Button type="button" size="sm" variant="outline" onClick={addSpec} className="text-xs">Add</Button>
              </div>
            </div>
          </FormField>
          <FormField label="Contact name"><input className={inputCls} value={formData.contact_name} onChange={e => set("contact_name", e.target.value)} /></FormField>
          <FormField label="Contact email"><input className={inputCls} type="email" value={formData.contact_email} onChange={e => set("contact_email", e.target.value)} /></FormField>
          <FormField label="Phone"><input className={inputCls} type="tel" value={formData.phone} onChange={e => set("phone", e.target.value)} /></FormField>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
        </div>
      </SlideOver>

      {deleteId !== null && (
        <ConfirmDialog
          title="Delete machinery listing"
          message="This will permanently remove this listing."
          onConfirm={deleteMach}
          onClose={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}

// ─── ListingsApprovalTab ──────────────────────────────────────────────────────
