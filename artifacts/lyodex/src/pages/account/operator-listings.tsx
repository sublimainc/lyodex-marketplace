import { useAuth } from "@/lib/auth";
import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import {
  Plus, Pencil, Trash2,
  Package, Zap, CheckCircle2, XCircle, ShieldCheck, Upload, X, FileText, Bell
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const CERT_OPTIONS = ["GMP", "HACCP", "FDA", "ISO", "Organic", "Kosher", "Halal"];

interface CapacityListing {
  id: number;
  equipment_type: string;
  capacity_kg: number;
  certifications: string[];
  price_per_kg_min: number;
  price_per_kg_max: number;
  turnaround_days: number;
  available: boolean;
  notes?: string | null;
  approval_status?: string;
  approval_reason?: string | null;
}

interface ProductListing {
  id: number;
  name: string;
  material_type: string;
  weight_kg: number;
  moisture_pct?: number | null;
  price_per_unit: number;
  moq: number;
  available: boolean;
  description?: string | null;
  contact_email: string;
  operator_name: string;
  approval_status?: string;
  approval_reason?: string | null;
}

function AvailBadge({ val, available, unavailable }: { val: boolean; available: string; unavailable: string }) {
  return val
    ? <Badge variant="default" className="gap-1 text-[10px]"><CheckCircle2 className="w-3 h-3" /> {available}</Badge>
    : <Badge variant="secondary" className="gap-1 text-[10px]"><XCircle className="w-3 h-3" /> {unavailable}</Badge>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium mb-1">{children}</label>;
}

function FieldInput({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
    />
  );
}

function FieldTextarea({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      rows={3}
      className="w-full border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
    />
  );
}

function emptyCapacity() {
  return {
    equipment_type: "",
    capacity_kg: "",
    certifications: [] as string[],
    price_per_kg_min: "",
    price_per_kg_max: "",
    turnaround_days: "",
    notes: "",
  };
}

function CapacityForm({
  initial,
  rejectionReason,
  onSave,
  onCancel,
}: {
  initial?: ReturnType<typeof emptyCapacity>;
  rejectionReason?: string | null;
  onSave: (data: ReturnType<typeof emptyCapacity>) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial ?? emptyCapacity());
  const [saving, setSaving] = useState(false);
  const { t } = useLanguage();
  const ol = t.operatorListings;

  const set = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  const toggleCert = (c: string) => {
    setForm((p) => ({
      ...p,
      certifications: p.certifications.includes(c)
        ? p.certifications.filter((x) => x !== c)
        : [...p.certifications, c],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border rounded-xl p-5 bg-muted/20 space-y-4">
      {rejectionReason && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
          <p className="text-xs font-semibold text-destructive mb-0.5">Rejected — reason to address:</p>
          <p className="text-xs text-destructive">{rejectionReason}</p>
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel>{ol.equipmentType} *</FieldLabel>
          <FieldInput placeholder="e.g. Virtis Advantage Pro" value={form.equipment_type} onChange={(e) => set("equipment_type", e.target.value)} />
        </div>
        <div>
          <FieldLabel>{ol.capacityKg} *</FieldLabel>
          <FieldInput type="number" placeholder="e.g. 200" value={form.capacity_kg} onChange={(e) => set("capacity_kg", e.target.value)} />
        </div>
        <div>
          <FieldLabel>{ol.priceMin} *</FieldLabel>
          <FieldInput type="number" placeholder="e.g. 15" value={form.price_per_kg_min} onChange={(e) => set("price_per_kg_min", e.target.value)} />
        </div>
        <div>
          <FieldLabel>{ol.priceMax} *</FieldLabel>
          <FieldInput type="number" placeholder="e.g. 35" value={form.price_per_kg_max} onChange={(e) => set("price_per_kg_max", e.target.value)} />
        </div>
        <div>
          <FieldLabel>{ol.turnaroundDays} *</FieldLabel>
          <FieldInput type="number" placeholder="e.g. 14" value={form.turnaround_days} onChange={(e) => set("turnaround_days", e.target.value)} />
        </div>
      </div>

      <div>
        <FieldLabel>{ol.certifications}</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {CERT_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggleCert(c)}
              className={`px-3 py-1 rounded-full text-xs border font-medium transition-colors ${form.certifications.includes(c) ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary"}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>{ol.notes}</FieldLabel>
        <FieldTextarea placeholder={ol.notesPlaceholder} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
      </div>

      <div className="flex gap-3 justify-end">
        <Button variant="ghost" onClick={onCancel}>{ol.cancel}</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? ol.saving : ol.save}</Button>
      </div>
    </div>
  );
}

function CapacityTab({ userEmail }: { userEmail: string }) {
  const [listings, setListings] = useState<CapacityListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const { toast } = useToast();
  const { t } = useLanguage();
  const ol = t.operatorListings;

  const fetchListings = () => {
    fetch(`${BASE}/api/operator/listings`, { credentials: "include" })
      .then((r) => r.json())
      .then(setListings)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchListings(); }, []);

  const handleCreate = async (data: ReturnType<typeof emptyCapacity>) => {
    const r = await fetch(`${BASE}/api/operator/listings`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (r.ok) {
      toast({ title: ol.listingCreated });
      setShowForm(false);
      fetchListings();
    } else {
      const err = await r.json();
      toast({ title: ol.error, description: err.error, variant: "destructive" });
    }
  };

  const handleUpdate = async (id: number, data: ReturnType<typeof emptyCapacity>) => {
    const wasRejected = listings.find((l) => l.id === id)?.approval_status === "rejected";
    const r = await fetch(`${BASE}/api/operator/listings/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (r.ok) {
      toast({
        title: wasRejected ? "Re-submitted for review" : ol.listingUpdated,
        description: wasRejected ? "Your listing is pending admin approval again." : undefined,
      });
      setEditId(null);
      fetchListings();
    } else {
      toast({ title: ol.error, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`${BASE}/api/operator/listings/${id}`, { method: "DELETE", credentials: "include" });
    toast({ title: ol.listingRemoved });
    fetchListings();
  };

  if (loading) return <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      {listings.map((l) =>
        editId === l.id ? (
          <CapacityForm
            key={l.id}
            initial={{ ...l, capacity_kg: String(l.capacity_kg), price_per_kg_min: String(l.price_per_kg_min), price_per_kg_max: String(l.price_per_kg_max), turnaround_days: String(l.turnaround_days), notes: l.notes ?? "", certifications: l.certifications }}
            rejectionReason={l.approval_status === "rejected" ? l.approval_reason : null}
            onSave={(d) => handleUpdate(l.id, d)}
            onCancel={() => setEditId(null)}
          />
        ) : (
          <Card key={l.id}>
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-semibold">{l.equipment_type}</span>
                    {l.approval_status === "pending" && <Badge variant="secondary" className="text-[10px] bg-yellow-100 text-yellow-700">Pending Review</Badge>}
                    {l.approval_status === "approved" && <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700">Approved</Badge>}
                    {l.approval_status === "rejected" && <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-700">Rejected</Badge>}
                  </div>
                  {l.approval_status === "rejected" && l.approval_reason && (
                    <p className="text-xs text-destructive mb-1">Reason: {l.approval_reason}</p>
                  )}
                  <div className="text-sm text-muted-foreground flex flex-wrap gap-4">
                    <span>{l.capacity_kg} {ol.kgBatch}</span>
                    <span>${l.price_per_kg_min}–${l.price_per_kg_max}/kg</span>
                    <span>{l.turnaround_days} {ol.daysTurnaround}</span>
                  </div>
                  {l.certifications.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {l.certifications.map((c) => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
                    </div>
                  )}
                  {l.notes && <p className="text-xs text-muted-foreground mt-2 italic">{l.notes}</p>}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {l.approval_status === "rejected" ? (
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs border-amber-400 text-amber-700 hover:bg-amber-50" onClick={() => setEditId(l.id)}>
                      <Pencil className="w-3.5 h-3.5" /> Edit &amp; Re-submit
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setEditId(l.id)}><Pencil className="w-4 h-4" /></Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(l.id)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      )}

      {showForm ? (
        <CapacityForm onSave={handleCreate} onCancel={() => setShowForm(false)} />
      ) : (
        <Button variant="outline" className="w-full gap-2" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> {ol.addCapacity}
        </Button>
      )}

      {listings.length === 0 && !showForm && (
        <div className="text-center py-10 text-sm text-muted-foreground">
          {ol.noCapacity}
        </div>
      )}
    </div>
  );
}

function emptyProduct(email: string) {
  return {
    name: "",
    material_type: "",
    weight_kg: "",
    moisture_pct: "",
    price_per_unit: "",
    moq: "1",
    available: true,
    description: "",
    contact_email: email,
  };
}

function ProductForm({
  initial,
  userEmail,
  rejectionReason,
  onSave,
  onCancel,
}: {
  initial?: ReturnType<typeof emptyProduct>;
  userEmail: string;
  rejectionReason?: string | null;
  onSave: (data: ReturnType<typeof emptyProduct>) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial ?? emptyProduct(userEmail));
  const [saving, setSaving] = useState(false);
  const { t } = useLanguage();
  const ol = t.operatorListings;
  const set = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <div className="border rounded-xl p-5 bg-muted/20 space-y-4">
      {rejectionReason && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
          <p className="text-xs font-semibold text-destructive mb-0.5">Rejected — reason to address:</p>
          <p className="text-xs text-destructive">{rejectionReason}</p>
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel>{ol.productName} *</FieldLabel>
          <FieldInput placeholder="e.g. Freeze-Dried Raspberry Powder" value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <FieldLabel>{ol.materialType} *</FieldLabel>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            value={form.material_type.startsWith("other:") ? "other" : (["powder","granule","whole"].includes(form.material_type) ? form.material_type : "")}
            onChange={(e) => {
              if (e.target.value !== "other") set("material_type", e.target.value);
              else set("material_type", "other:");
            }}
          >
            <option value="" disabled>{ol.formatSelectPlaceholder}</option>
            <option value="powder">{ol.formatPowder}</option>
            <option value="granule">{ol.formatGranule}</option>
            <option value="whole">{ol.formatWhole}</option>
            <option value="other">{ol.formatOther}</option>
          </select>
          {form.material_type.startsWith("other:") && (
            <FieldInput
              className="mt-2"
              placeholder={ol.formatOtherPlaceholder}
              value={form.material_type.slice(6)}
              onChange={(e) => set("material_type", `other:${e.target.value}`)}
            />
          )}
        </div>
        <div>
          <FieldLabel>{ol.weightPerUnit} *</FieldLabel>
          <FieldInput type="number" placeholder="e.g. 1.0" value={form.weight_kg} onChange={(e) => set("weight_kg", e.target.value)} />
        </div>
        <div>
          <FieldLabel>{ol.pricePerUnit} *</FieldLabel>
          <FieldInput type="number" placeholder="e.g. 45.00" value={form.price_per_unit} onChange={(e) => set("price_per_unit", e.target.value)} />
        </div>
        <div>
          <FieldLabel>{ol.minOrderQty}</FieldLabel>
          <FieldInput type="number" placeholder="e.g. 10" value={form.moq} onChange={(e) => set("moq", e.target.value)} />
        </div>
        <div>
          <FieldLabel>{ol.contactEmail}</FieldLabel>
          <FieldInput type="email" placeholder="orders@yourcompany.com" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} />
        </div>
        <div className="flex items-end gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium">
            <input type="checkbox" checked={form.available} onChange={(e) => set("available", e.target.checked)} className="w-4 h-4" />
            {ol.availableForPurchase}
          </label>
        </div>
      </div>
      <div>
        <FieldLabel>{ol.description}</FieldLabel>
        <FieldTextarea placeholder={ol.descriptionPlaceholder} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
      </div>
      <div className="flex gap-3 justify-end">
        <Button variant="ghost" onClick={onCancel}>{ol.cancel}</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? ol.saving : ol.saveProduct}</Button>
      </div>
    </div>
  );
}

function ProductsTab({ userEmail }: { userEmail: string }) {
  const [products, setProducts] = useState<ProductListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const { toast } = useToast();
  const { t } = useLanguage();
  const ol = t.operatorListings;

  const fetchProducts = () => {
    fetch(`${BASE}/api/operator/products`, { credentials: "include" })
      .then((r) => r.json())
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleCreate = async (data: ReturnType<typeof emptyProduct>) => {
    const r = await fetch(`${BASE}/api/operator/products`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (r.ok) {
      toast({ title: ol.productListed });
      setShowForm(false);
      fetchProducts();
    } else {
      const err = await r.json().catch(() => ({ error: "Unknown error" }));
      toast({ title: ol.error, description: err.error, variant: "destructive" });
    }
  };

  const handleUpdate = async (id: number, data: ReturnType<typeof emptyProduct>) => {
    const wasRejected = products.find((p) => p.id === id)?.approval_status === "rejected";
    const r = await fetch(`${BASE}/api/operator/products/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (r.ok) {
      toast({
        title: wasRejected ? "Re-submitted for review" : ol.productUpdated,
        description: wasRejected ? "Your product listing is pending admin approval again." : undefined,
      });
      setEditId(null);
      fetchProducts();
    } else {
      toast({ title: ol.error, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`${BASE}/api/operator/products/${id}`, { method: "DELETE", credentials: "include" });
    toast({ title: ol.productRemoved });
    fetchProducts();
  };

  if (loading) return <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      {products.map((p) =>
        editId === p.id ? (
          <ProductForm
            key={p.id}
            userEmail={userEmail}
            initial={{ ...p, weight_kg: String(p.weight_kg), moisture_pct: p.moisture_pct != null ? String(p.moisture_pct) : "", price_per_unit: String(p.price_per_unit), moq: String(p.moq), description: p.description ?? "", contact_email: p.contact_email }}
            rejectionReason={p.approval_status === "rejected" ? p.approval_reason : null}
            onSave={(d) => handleUpdate(p.id, d)}
            onCancel={() => setEditId(null)}
          />
        ) : (
          <Card key={p.id}>
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold">{p.name}</span>
                    <Badge variant="outline" className="text-[10px]">{p.material_type}</Badge>
                    <AvailBadge val={p.available} available={ol.available} unavailable={ol.unavailable} />
                    {p.approval_status === "pending" && <Badge variant="secondary" className="text-[10px] bg-yellow-100 text-yellow-700">Pending Review</Badge>}
                    {p.approval_status === "approved" && <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700">Approved</Badge>}
                    {p.approval_status === "rejected" && <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-700">Rejected</Badge>}
                  </div>
                  {p.approval_status === "rejected" && p.approval_reason && (
                    <p className="text-xs text-destructive mt-1">Reason: {p.approval_reason}</p>
                  )}
                  <div className="text-sm text-muted-foreground flex flex-wrap gap-4">
                    <span>${p.price_per_unit}/{ol.kgPerUnit.split("/")[1]}</span>
                    <span>{p.weight_kg} {ol.kgPerUnit}</span>
                    <span>{ol.moqLabel} {p.moq}</span>
                  </div>
                  {p.description && <p className="text-xs text-muted-foreground mt-2 italic">{p.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{ol.contactLabel} {p.contact_email}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {p.approval_status === "rejected" ? (
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs border-amber-400 text-amber-700 hover:bg-amber-50" onClick={() => setEditId(p.id)}>
                      <Pencil className="w-3.5 h-3.5" /> Edit &amp; Re-submit
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setEditId(p.id)}><Pencil className="w-4 h-4" /></Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      )}

      {showForm ? (
        <ProductForm userEmail={userEmail} onSave={handleCreate} onCancel={() => setShowForm(false)} />
      ) : (
        <Button variant="outline" className="w-full gap-2" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> {ol.addProduct}
        </Button>
      )}

      {products.length === 0 && !showForm && (
        <div className="text-center py-10 text-sm text-muted-foreground">
          {ol.noProducts}
        </div>
      )}
    </div>
  );
}

// ─── Certifications Tab ───────────────────────────────────────────────────────

interface OperatorProfile {
  id: number;
  name: string;
  certifications: string[];
  verified_certifications: string[];
  cert_documents: Record<string, string>;
}

function CertificationsTab() {
  const [profile, setProfile] = useState<OperatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCerts, setSelectedCerts] = useState<string[]>([]);
  const [savingCerts, setSavingCerts] = useState(false);
  const [uploadingCert, setUploadingCert] = useState<string | null>(null);
  const [removingCert, setRemovingCert] = useState<string | null>(null);
  const { toast } = useToast();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${BASE}/api/operator/profile`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setSelectedCerts(data.certifications ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const toggleCert = (cert: string) => {
    setSelectedCerts((prev) =>
      prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert]
    );
  };

  const handleSaveCerts = async () => {
    setSavingCerts(true);
    try {
      const res = await fetch(`${BASE}/api/operator/certifications`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certifications: selectedCerts }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to save");
      const data = await res.json();
      setProfile((prev) => prev ? { ...prev, certifications: data.certifications, verified_certifications: data.verified_certifications } : prev);
      toast({ title: "Certifications updated", description: "Your claimed certifications have been saved." });
    } catch (err: unknown) {
      toast({ title: "Save failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setSavingCerts(false);
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const res = await fetch(`${BASE}/api/storage/uploads`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? `Upload failed (${res.status})`);
    }
    const data = await res.json() as { objectPath: string };
    return data.objectPath;
  };

  const saveCertDoc = async (cert: string, objectPath: string | null) => {
    const res = await fetch(`${BASE}/api/operator/cert-documents`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cert, objectPath }),
    });
    if (!res.ok) throw new Error("Failed to save document link");
    const data = await res.json();
    setProfile((prev) => prev ? { ...prev, cert_documents: data.cert_documents } : prev);
  };

  const handleUpload = async (cert: string, file: File) => {
    setUploadingCert(cert);
    try {
      const objectPath = await uploadFile(file);
      await saveCertDoc(cert, objectPath);
      toast({ title: "Document uploaded", description: `Supporting document for ${cert} saved.` });
    } catch (err) {
      toast({ title: "Upload failed", description: err instanceof Error ? err.message : "Could not upload the document. Please try again.", variant: "destructive" });
    } finally {
      setUploadingCert(null);
      if (fileInputRefs.current[cert]) fileInputRefs.current[cert]!.value = "";
    }
  };

  const handleRemoveDoc = async (cert: string) => {
    setRemovingCert(cert);
    try {
      await saveCertDoc(cert, null);
      toast({ title: "Document removed", description: `Document for ${cert} removed.` });
    } catch {
      toast({ title: "Error", description: "Could not remove the document.", variant: "destructive" });
    } finally {
      setRemovingCert(null);
    }
  };

  if (loading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }

  if (!profile) {
    return (
      <div className="text-center py-10 text-sm text-muted-foreground">
        No operator profile found. Your account may not be linked to an operator profile yet.
      </div>
    );
  }

  const hasChanges = JSON.stringify([...selectedCerts].sort()) !== JSON.stringify([...(profile.certifications ?? [])].sort());

  return (
    <div className="space-y-6">
      {/* Cert selection */}
      <div className="border rounded-xl p-5 bg-muted/20 space-y-4">
        <div>
          <h3 className="font-semibold text-sm mb-1">Your certifications</h3>
          <p className="text-xs text-muted-foreground">
            Select all certifications your facility holds. Claimed certifications are shown as "pending" on your public profile until LyoDex verifies them. Upload supporting documents below to speed up verification.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {CERT_OPTIONS.map((cert) => {
            const isSelected = selectedCerts.includes(cert);
            const isVerified = (profile.verified_certifications ?? []).includes(cert);
            return (
              <button
                key={cert}
                type="button"
                onClick={() => toggleCert(cert)}
                className={`relative px-3 py-1.5 rounded-full text-xs border font-medium transition-colors ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary"
                }`}
              >
                {cert}
                {isVerified && isSelected && (
                  <span className="ml-1 text-[10px] opacity-80">✓</span>
                )}
              </button>
            );
          })}
        </div>
        {selectedCerts.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No certifications selected. Select the ones your facility holds.</p>
        )}
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={handleSaveCerts} disabled={savingCerts || !hasChanges}>
            {savingCerts ? "Saving..." : "Save certifications"}
          </Button>
          {hasChanges && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setSelectedCerts(profile.certifications ?? [])}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Document uploads for claimed certs */}
      {profile.certifications.length > 0 && (
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-sm mb-1">Supporting documents</h3>
            <p className="text-xs text-muted-foreground">
              Upload a PDF or image for each certification to help LyoDex verify your credentials. Accepted: PDF, JPG, PNG, WebP.
            </p>
          </div>
          {profile.certifications.map((cert) => {
            const isVerified = (profile.verified_certifications ?? []).includes(cert);
            const docPath = profile.cert_documents[cert];
            const isUploading = uploadingCert === cert;
            const isRemoving = removingCert === cert;

            return (
              <Card key={cert}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      {isVerified
                        ? <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        : <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                      }
                      <span className="font-medium text-sm">{cert}</span>
                      {isVerified ? (
                        <Badge variant="outline" className="text-[10px] border-emerald-400 text-emerald-700 bg-emerald-50">Verified</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Pending</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 sm:ml-auto">
                      {docPath ? (
                        <>
                          <a
                            href={`${BASE}/api/storage${docPath}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline border border-primary/30 rounded-md px-2 py-1"
                          >
                            <FileText className="w-3.5 h-3.5" /> View
                          </a>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" disabled={isRemoving} onClick={() => handleRemoveDoc(cert)} title="Remove document">
                            <X className="w-3.5 h-3.5" />
                          </Button>
                          <label className="cursor-pointer">
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 pointer-events-none" disabled={isUploading} asChild>
                              <span><Upload className="w-3 h-3" /> Replace</span>
                            </Button>
                            <input type="file" accept=".pdf,image/*" className="sr-only" ref={(el) => { fileInputRefs.current[cert] = el; }} disabled={isUploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(cert, f); }} />
                          </label>
                        </>
                      ) : (
                        <label className="cursor-pointer">
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 pointer-events-none" disabled={isUploading} asChild>
                            <span>{isUploading ? "Uploading..." : <><Upload className="w-3 h-3" /> Upload</>}</span>
                          </Button>
                          <input type="file" accept=".pdf,image/*" className="sr-only" ref={(el) => { fileInputRefs.current[cert] = el; }} disabled={isUploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(cert, f); }} />
                        </label>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface ListingNotification {
  id: number;
  listing_type: string;
  listing_id: number;
  message: string;
  read: boolean;
  created_at: string;
}

function NotificationsPanel() {
  const [notifications, setNotifications] = useState<ListingNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE}/api/listing-notifications/me`, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((data: ListingNotification[]) => setNotifications(data))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  const unread = notifications.filter(n => !n.read).length;

  const markRead = async (id: number) => {
    await fetch(`${BASE}/api/listing-notifications/me/${id}/read`, { method: "PATCH", credentials: "include" });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  if (loading || notifications.length === 0) return null;

  return (
    <div className="mb-6">
      <button
        className="flex items-center gap-2 text-sm font-medium text-foreground"
        onClick={() => setOpen(o => !o)}
      >
        <Bell className="w-4 h-4" />
        Listing Notifications
        {unread > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-primary text-primary-foreground">{unread}</span>
        )}
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`rounded-lg border px-4 py-3 text-sm flex items-start justify-between gap-3 ${n.read ? "bg-muted/40 text-muted-foreground" : "bg-background"}`}
            >
              <p>{n.message}</p>
              {!n.read && (
                <button className="shrink-0 text-xs text-primary hover:underline" onClick={() => markRead(n.id)}>
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type Tab = "capacity" | "products" | "certifications";

export default function OperatorListings() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<Tab>("capacity");
  const { t } = useLanguage();
  const ol = t.operatorListings;

  useEffect(() => {
    if (!loading) {
      if (!user) { setLocation("/login"); return; }
      if (user.role !== "operator" && user.role !== "admin") { setLocation("/dashboard"); }
    }
  }, [user, loading]);

  if (loading || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-64 mb-4" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-1">{ol.title}</h1>
        <p className="text-muted-foreground">{ol.subtitle}</p>
      </div>

      <NotificationsPanel />

      <div className="flex border-b mb-6 overflow-x-auto">
        {([
          ["capacity", ol.capacityTab, Zap],
          ["products", ol.productsTab, Package],
          ["certifications", "Certifications", ShieldCheck],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${tab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "capacity" && <CapacityTab userEmail={user.email} />}
      {tab === "products" && <ProductsTab userEmail={user.email} />}
      {tab === "certifications" && <CertificationsTab />}
    </div>
  );
}
