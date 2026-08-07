import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Pencil, MapPin, ChevronDown, ChevronUp, Save } from "lucide-react";
import { ConfirmDialog, FormField, LocationPicker, MapEntry, SlideOver, Tab, api, inputCls, selectCls } from "../shared";

// ─── Tab: Operator Map ────────────────────────────────────────────────────────

export function MapTab() {
  const [entries, setEntries] = useState<MapEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState<"name" | "created_at">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [editId, setEditId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<MapEntry>>({});
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api("/admin/map-entries").then(setEntries).catch(console.error).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const openEdit = (e: MapEntry) => {
    setEditId(e.id); setFormError("");
    setFormData({ ...e }); setFormOpen(true);
  };

  const openCreate = () => {
    setEditId(null); setFormError("");
    setFormData({ map_status: "active" }); setFormOpen(true);
  };

  const save = async () => {
    if (!formData.location?.trim()) { setFormError("Location is required"); return; }
    setFormSaving(true);
    try {
      if (editId === null) {
        if (!formData.name?.trim()) { setFormError("Name is required"); setFormSaving(false); return; }
        await api("/admin/map-entries", "POST", {
          name: formData.name,
          location: formData.location,
          city: formData.city ?? null,
          country: formData.country ?? null,
          gps_lat: formData.gps_lat ?? null,
          gps_lng: formData.gps_lng ?? null,
          service_radius_km: formData.service_radius_km ?? null,
          map_status: formData.map_status ?? "active",
          contact_name: formData.contact_name ?? null,
          contact_email: formData.contact_email ?? null,
          phone: formData.phone ?? null,
        });
      } else {
        await api(`/admin/operators/${editId}`, "PUT", {
          gps_lat: formData.gps_lat ?? null,
          gps_lng: formData.gps_lng ?? null,
          service_radius_km: formData.service_radius_km ?? null,
          map_status: formData.map_status ?? "active",
          location: formData.location ?? "",
          city: formData.city ?? null,
          country: formData.country ?? null,
          contact_name: formData.contact_name ?? null,
          contact_email: formData.contact_email ?? null,
          phone: formData.phone ?? null,
        });
      }
      setFormOpen(false); load();
    } catch (err) { setFormError(String(err)); }
    finally { setFormSaving(false); }
  };

  const removeFromMap = async () => {
    if (!deleteId) return;
    try {
      await api(`/admin/operators/${deleteId}`, "PUT", {
        map_status: "inactive",
        gps_lat: null,
        gps_lng: null,
        service_radius_km: null,
      });
      setDeleteId(null);
      load();
    }
    catch (err) { console.error(err); }
  };

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  };
  const SortIcon = ({ col }: { col: typeof sortBy }) => sortBy === col
    ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />)
    : null;

  const set = (k: keyof MapEntry, v: unknown) => setFormData(d => ({ ...d, [k]: v }));

  const filtered = entries
    .filter(e => {
      if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.location.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus !== "all" && e.map_status !== filterStatus) return false;
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
          <h2 className="text-xl font-bold flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" /> Operator Map</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage GPS coordinates and map visibility for operators.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreate}><Plus className="w-4 h-4" /> Add operator to map</Button>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input className="flex-1 border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Search by name or location…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="border rounded-lg px-3 py-2 text-sm bg-background" value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}>
          <option value="all">All map statuses</option>
          <option value="active">Active on map</option>
          <option value="inactive">Hidden</option>
        </select>
      </div>
      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider cursor-pointer" onClick={() => toggleSort("name")}>Operator <SortIcon col="name" /></th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Address</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">GPS</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Radius</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Map status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? [1,2,3].map(i => <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>)
            : filtered.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No entries found.</td></tr>
            : filtered.map(e => (
              <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-medium">
                  {e.name}
                  {e.contact_name && <span className="block text-[10px] text-muted-foreground">{e.contact_name}</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  <div>{e.location}</div>
                  <div>{[e.city, e.country].filter(Boolean).join(", ")}</div>
                </td>
                <td className="px-4 py-3 text-xs font-mono">
                  {e.gps_lat != null && e.gps_lng != null
                    ? <span className="text-green-700">{e.gps_lat.toFixed(4)}, {e.gps_lng.toFixed(4)}</span>
                    : <span className="text-muted-foreground italic">Not set</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{e.service_radius_km != null ? `${e.service_radius_km} km` : "—"}</td>
                <td className="px-4 py-3">
                  {e.map_status === "active"
                    ? <Badge variant="outline" className="text-[10px] text-green-700 border-green-300">Active</Badge>
                    : <Badge variant="outline" className="text-[10px] text-muted-foreground">Hidden</Badge>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openEdit(e)}><Pencil className="w-3 h-3" /> Edit</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive hover:bg-destructive/10 border-destructive/30" onClick={() => setDeleteId(e.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SlideOver title={editId === null ? "Add operator to map" : `Map entry — ${formData.name ?? ""}`} open={formOpen} onClose={() => setFormOpen(false)}
        footer={<>
          <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button disabled={formSaving} onClick={save}>{formSaving ? "Saving…" : editId === null ? "Add to map" : "Save changes"}</Button>
        </>}
      >
        <div className="space-y-3">
          {editId === null && (
            <FormField label="Operator name *"><input className={inputCls} value={formData.name ?? ""} onChange={e => set("name", e.target.value)} placeholder="e.g. Arctic Lyophilization Inc." /></FormField>
          )}
          <FormField label="Display location *"><input className={inputCls} value={formData.location ?? ""} onChange={e => set("location", e.target.value)} placeholder="e.g. Toronto, ON, Canada" /></FormField>
          <div className="grid grid-cols-2 gap-2">
            <FormField label="City"><input className={inputCls} value={formData.city ?? ""} onChange={e => set("city", e.target.value)} /></FormField>
            <FormField label="Country"><input className={inputCls} value={formData.country ?? ""} onChange={e => set("country", e.target.value)} placeholder="CA" /></FormField>
          </div>
          <FormField label="Pin location">
            <LocationPicker
              lat={formData.gps_lat}
              lng={formData.gps_lng}
              onChangeLatLng={(lat, lng) => { set("gps_lat", lat); set("gps_lng", lng); }}
            />
          </FormField>
          <FormField label="Service radius (km)"><input className={inputCls} type="number" value={formData.service_radius_km ?? ""} onChange={e => set("service_radius_km", e.target.value ? Number(e.target.value) : null)} /></FormField>
          <FormField label="Map status">
            <select className={selectCls} value={formData.map_status ?? "active"} onChange={e => set("map_status", e.target.value)}>
              <option value="active">Active (visible on map)</option>
              <option value="inactive">Inactive (hidden)</option>
            </select>
          </FormField>
          <FormField label="Contact name"><input className={inputCls} value={formData.contact_name ?? ""} onChange={e => set("contact_name", e.target.value)} /></FormField>
          <FormField label="Contact email"><input className={inputCls} type="email" value={formData.contact_email ?? ""} onChange={e => set("contact_email", e.target.value)} /></FormField>
          <FormField label="Phone"><input className={inputCls} type="tel" value={formData.phone ?? ""} onChange={e => set("phone", e.target.value)} /></FormField>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
        </div>
      </SlideOver>

      {deleteId !== null && (
        <ConfirmDialog
          title="Remove from map"
          message="This will set the operator's map status to inactive and clear their GPS coordinates. The operator profile is preserved — you can re-enable them from the Operators tab."
          onConfirm={removeFromMap}
          onClose={() => setDeleteId(null)}
          danger={false}
        />
      )}
    </div>
  );
}

// ─── Tab: Capacity + Product Listings ────────────────────────────────────────
