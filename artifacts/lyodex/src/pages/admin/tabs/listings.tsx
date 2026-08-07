import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Pencil, Package, Save } from "lucide-react";
import { CapacityListing, ConfirmDialog, FormField, ProductListing, SlideOver, Tab, UnifiedListing, api, inputCls, selectCls } from "../shared";

export function ListingsCRUDTab() {
  const [data, setData] = useState<{ capacity: CapacityListing[]; products: ProductListing[] }>({ capacity: [], products: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "capacity" | "product">("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<UnifiedListing | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({ listing_type: "capacity" });
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; type: "capacity" | "product" } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api("/admin/listings")
      .then((d: { capacity: Omit<CapacityListing, "listing_type">[]; products: Omit<ProductListing, "listing_type">[] }) => {
        setData({
          capacity: (d.capacity ?? []).map(l => ({ ...l, listing_type: "capacity" as const })),
          products: (d.products ?? []).map(p => ({ ...p, listing_type: "product" as const })),
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditItem(null);
    setFormData({ listing_type: "capacity", available: true, approval_status: "approved" });
    setFormError(""); setFormOpen(true);
  };

  const openEdit = (item: UnifiedListing) => {
    setEditItem(item);
    setFormData({ ...item });
    setFormError(""); setFormOpen(true);
  };

  const save = async () => {
    setFormSaving(true);
    try {
      if (editItem) {
        await api(`/admin/listings/${editItem.id}`, "PUT", formData);
      } else {
        await api("/admin/listings", "POST", formData);
      }
      setFormOpen(false); load();
    } catch (err) { setFormError(String(err)); }
    finally { setFormSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api(`/admin/listings/${deleteTarget.id}?listing_type=${deleteTarget.type}`, "DELETE");
      setDeleteTarget(null); load();
    } catch (err) { console.error(err); }
  };

  const setF = (k: string, v: unknown) => setFormData(d => ({ ...d, [k]: v }));

  const all: UnifiedListing[] = [
    ...data.capacity,
    ...data.products,
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const filtered = all.filter(item => {
    if (filterType !== "all" && item.listing_type !== filterType) return false;
    if (filterStatus !== "all" && item.approval_status !== filterStatus) return false;
    const label = item.listing_type === "capacity" ? item.equipment_type : item.name;
    if (search && !label.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const listingType = String(formData.listing_type ?? "capacity");

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Package className="w-5 h-5 text-primary" /> Listings</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage capacity and product listings submitted by operators.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreate}><Plus className="w-4 h-4" /> Add listing</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input className="flex-1 border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Search by name or equipment…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="border rounded-lg px-3 py-2 text-sm bg-background" value={filterType} onChange={e => setFilterType(e.target.value as typeof filterType)}>
          <option value="all">All types</option>
          <option value="capacity">Capacity</option>
          <option value="product">Product</option>
        </select>
        <select className="border rounded-lg px-3 py-2 text-sm bg-background" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Name / Equipment</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Details</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? [1,2,3].map(i => <tr key={i}><td colSpan={5} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>)
            : filtered.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No listings found.</td></tr>
            : filtered.map(item => (
              <tr key={`${item.listing_type}-${item.id}`} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <Badge variant="outline" className={`text-[10px] ${item.listing_type === "capacity" ? "text-blue-700 border-blue-300" : "text-purple-700 border-purple-300"}`}>
                    {item.listing_type === "capacity" ? "Capacity" : "Product"}
                  </Badge>
                </td>
                <td className="px-4 py-3 font-medium">
                  {item.listing_type === "capacity" ? item.equipment_type : item.name}
                  {item.listing_type === "product" && item.operator_name && <span className="block text-[10px] text-muted-foreground">{item.operator_name}</span>}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {item.listing_type === "capacity"
                    ? `${item.capacity_kg} kg · $${item.price_per_kg_min}–$${item.price_per_kg_max}/kg`
                    : `${item.weight_kg} kg · $${item.price_per_unit}/unit`}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={`text-[10px] ${item.approval_status === "approved" ? "text-green-700 border-green-300" : item.approval_status === "pending" ? "text-yellow-700 border-yellow-300" : "text-destructive border-destructive/30"}`}>
                    {item.approval_status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openEdit(item)}><Pencil className="w-3 h-3" /> Edit</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:bg-destructive/10 border-destructive/30" onClick={() => setDeleteTarget({ id: item.id, type: item.listing_type })}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SlideOver title={editItem ? "Edit listing" : "Add listing"} open={formOpen} onClose={() => setFormOpen(false)}
        footer={<>
          <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button disabled={formSaving} onClick={save}>{formSaving ? "Saving…" : editItem ? "Save changes" : "Create listing"}</Button>
        </>}
      >
        <div className="space-y-3">
          {!editItem && (
            <FormField label="Listing type">
              <select className={selectCls} value={listingType} onChange={e => setF("listing_type", e.target.value)}>
                <option value="capacity">Capacity listing</option>
                <option value="product">Product listing</option>
              </select>
            </FormField>
          )}
          {listingType === "capacity" ? (
            <>
              <FormField label="Equipment type *"><input className={inputCls} value={String(formData.equipment_type ?? "")} onChange={e => setF("equipment_type", e.target.value)} placeholder="e.g. Freeze-drying system" /></FormField>
              <FormField label="Capacity (kg)"><input className={inputCls} type="number" value={String(formData.capacity_kg ?? "")} onChange={e => setF("capacity_kg", Number(e.target.value))} /></FormField>
              <div className="grid grid-cols-2 gap-2">
                <FormField label="Price min ($/kg)"><input className={inputCls} type="number" step="0.01" value={String(formData.price_per_kg_min ?? "")} onChange={e => setF("price_per_kg_min", Number(e.target.value))} /></FormField>
                <FormField label="Price max ($/kg)"><input className={inputCls} type="number" step="0.01" value={String(formData.price_per_kg_max ?? "")} onChange={e => setF("price_per_kg_max", Number(e.target.value))} /></FormField>
              </div>
              <FormField label="Turnaround (days)"><input className={inputCls} type="number" value={String(formData.turnaround_days ?? "")} onChange={e => setF("turnaround_days", Number(e.target.value))} /></FormField>
              <FormField label="Notes"><textarea className={inputCls} rows={2} value={String(formData.notes ?? "")} onChange={e => setF("notes", e.target.value || null)} /></FormField>
              {!editItem && <FormField label="User ID"><input className={inputCls} type="number" value={String(formData.user_id ?? "")} onChange={e => setF("user_id", e.target.value ? Number(e.target.value) : undefined)} placeholder="Required — owner user ID" /></FormField>}
            </>
          ) : (
            <>
              <FormField label="Product name *"><input className={inputCls} value={String(formData.name ?? "")} onChange={e => setF("name", e.target.value)} /></FormField>
              <FormField label="Operator name"><input className={inputCls} value={String(formData.operator_name ?? "")} onChange={e => setF("operator_name", e.target.value)} /></FormField>
              <FormField label="Material type"><input className={inputCls} value={String(formData.material_type ?? "")} onChange={e => setF("material_type", e.target.value)} placeholder="e.g. pharmaceutical" /></FormField>
              <div className="grid grid-cols-2 gap-2">
                <FormField label="Weight (kg)"><input className={inputCls} type="number" step="0.01" value={String(formData.weight_kg ?? "")} onChange={e => setF("weight_kg", Number(e.target.value))} /></FormField>
                <FormField label="Moisture %"><input className={inputCls} type="number" step="0.01" value={String(formData.moisture_pct ?? "")} onChange={e => setF("moisture_pct", e.target.value ? Number(e.target.value) : null)} /></FormField>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <FormField label="Price/unit"><input className={inputCls} type="number" step="0.01" value={String(formData.price_per_unit ?? "")} onChange={e => setF("price_per_unit", Number(e.target.value))} /></FormField>
                <FormField label="MOQ"><input className={inputCls} type="number" value={String(formData.moq ?? "")} onChange={e => setF("moq", Number(e.target.value))} /></FormField>
              </div>
              <FormField label="Contact email"><input className={inputCls} type="email" value={String(formData.contact_email ?? "")} onChange={e => setF("contact_email", e.target.value)} /></FormField>
              <FormField label="Description"><textarea className={inputCls} rows={2} value={String(formData.description ?? "")} onChange={e => setF("description", e.target.value || null)} /></FormField>
            </>
          )}
          <FormField label="Approval status">
            <select className={selectCls} value={String(formData.approval_status ?? "approved")} onChange={e => setF("approval_status", e.target.value)}>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </FormField>
          <FormField label="Available">
            <select className={selectCls} value={formData.available === false ? "false" : "true"} onChange={e => setF("available", e.target.value === "true")}>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </FormField>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
        </div>
      </SlideOver>

      {deleteTarget && (
        <ConfirmDialog
          title="Delete listing"
          message="This will permanently delete this listing. This action cannot be undone."
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// ─── Tab: Machinery & Parts Listings ─────────────────────────────────────────
