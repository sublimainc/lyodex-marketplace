/**
 * Pieces used by more than one admin tab: the fetch helper, the shared record
 * types and label maps, and the widgets that several screens render.
 *
 * These lived at the top of a 5,679-line admin.tsx. They are here so that a tab
 * can be opened, read and changed without loading the whole panel into your head.
 */

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Users, FileText, DollarSign, Bell, Activity, ShieldCheck, XCircle, AlertTriangle, MessageSquare, KeyRound, Copy, Check, Scale, ClipboardList, Database, Globe, BookOpen, LayoutList, CheckCircle2, Loader2, MapPin, Building2, X, Package, FileDown, TrendingUp, Eye, NotebookPen, Mail, Tags } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

export const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export async function api(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  admin_role: string | null;
  banned: boolean;
  failed_login_count: number;
  locked_until: string | null;
  created_at: string;
}

export const ADMIN_ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  support_admin: "Support",
  finance_admin: "Finance",
  data_analyst: "Analyst",
  ad_manager: "Ad Mgr",
};

export const ADMIN_ROLE_OPTIONS = ["super_admin", "support_admin", "finance_admin", "data_analyst", "ad_manager"];

export interface AdminOperator {
  id: number;
  name: string;
  location: string;
  description?: string | null;
  capacity_kg: number;
  price_per_kg: number;
  turnaround_days: number;
  certifications: string[];
  verified_certifications: string[];
  cert_documents: Record<string, string>;
  rating: number;
  review_count: number;
  available: boolean;
  audit_status: string;
  audit_triggered_at: string | null;
  country?: string | null;
  city?: string | null;
  website_url?: string | null;
  contact_page_url?: string | null;
  role?: string | null;
  food_market_focus?: boolean;
  pharmaceutical_focus?: boolean;
  platform_fee_override?: string | null;
  gps_lat?: number | null;
  gps_lng?: number | null;
  service_radius_km?: number | null;
  map_status?: string;
  contact_name?: string | null;
  contact_email?: string | null;
  phone?: string | null;
  verification_status?: string | null;
  created_at: string;
}

export interface Manufacturer {
  id: number;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  website_url: string | null;
  logo_url: string | null;
  country: string | null;
  city: string | null;
  founded_year: number | null;
  specialties: string[];
  market_focus: string[];
  certifications: string[];
  production_capabilities: string | null;
  contact_name: string | null;
  contact_email: string | null;
  phone: string | null;
  featured: boolean;
  active: boolean;
  avg_rating: number;
  review_count: number;
  created_at: string;
}

export interface MapEntry {
  id: number;
  name: string;
  location: string;
  city: string | null;
  country: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  service_radius_km: number | null;
  map_status: string;
  contact_name: string | null;
  contact_email: string | null;
  phone: string | null;
  available: boolean;
  certifications: string[];
  created_at: string;
}

export interface CapacityListing {
  id: number;
  user_id: number;
  operator_id: number | null;
  equipment_type: string;
  capacity_kg: number;
  certifications: string[];
  price_per_kg_min: number;
  price_per_kg_max: number;
  turnaround_days: number;
  available: boolean;
  notes: string | null;
  approval_status: string;
  listing_type: "capacity";
  created_at: string;
  updated_at: string;
}

export interface ProductListing {
  id: number;
  user_id: number | null;
  operator_name: string;
  name: string;
  material_type: string;
  weight_kg: number;
  moisture_pct: number | null;
  price_per_unit: number;
  moq: number;
  available: boolean;
  description: string | null;
  contact_email: string;
  approval_status: string;
  listing_type: "product";
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  bid_id: number;
  request_id: number;
  operator_name: string;
  buyer_email: string;
  material_type: string;
  quantity_kg: number;
  price_per_kg: number;
  status: string;
  fee_status: string;
  escrow_status: string;
  escrow_amount_cents?: number | null;
  contract_value: number;
  fee_amount: number;
  created_at: string;
}

export interface AdminRequest {
  id: number;
  material_type: string;
  quantity_kg: number;
  deadline: string;
  budget_per_kg: number | null;
  status: string;
  buyer_email: string;
  bid_count: number;
  created_at: string;
  moderation_note: string | null;
  moderated_by: string | null;
}

export interface ActivityItem {
  id: number;
  type: string;
  message: string;
  timestamp: string;
}

export interface Overview {
  total_users: number;
  active_requests: number;
  completed_contracts: number;
  total_platform_revenue: number;
  activity: ActivityItem[];
}

export interface Notification {
  id: string;
  type: string;
  label: string;
  created_at: string;
}

export interface SystemAlert {
  id: number;
  alert_key: string;
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  dismissed_at: string | null;
}

// ─── System Alert Banner ──────────────────────────────────────────────────────

// ─── System Alert Banner ──────────────────────────────────────────────────────

export function SystemAlertBanner({ alerts, onDismiss }: { alerts: SystemAlert[]; onDismiss: (id: number) => void }) {
  const [copied, setCopied] = useState<string | null>(null);

  if (alerts.length === 0) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2500);
    });
  };

  return (
    <div className="space-y-3 mb-6">
      {alerts.map((alert) => {
        const meta = alert.metadata ?? {};
        const secret = meta.STRIPE_WEBHOOK_SECRET as string | undefined;
        const instructions = meta.instructions as string[] | undefined;

        return (
          <div key={alert.id} className="rounded-xl border-2 border-destructive bg-destructive/5 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-semibold text-destructive text-sm">{alert.title}</h3>
                  <button
                    onClick={() => onDismiss(alert.id)}
                    className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
                    aria-label="Dismiss alert"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-foreground/80 mt-1 leading-relaxed">{alert.message}</p>

                {secret && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2 mb-1">
                      <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">STRIPE_WEBHOOK_SECRET</span>
                    </div>
                    <div className="flex items-center gap-2 bg-background border rounded-lg px-3 py-2 font-mono text-xs break-all">
                      <span className="flex-1 select-all">{secret}</span>
                      <button
                        onClick={() => copyToClipboard(secret, `secret-${alert.id}`)}
                        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Copy secret"
                      >
                        {copied === `secret-${alert.id}` ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {instructions && instructions.length > 0 && (
                  <div className="mt-3 bg-background/60 border rounded-lg p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Steps to resolve</p>
                    <ol className="space-y-1">
                      {instructions.map((step, i) => (
                        <li key={i} className="text-xs text-foreground/80">{step}</li>
                      ))}
                    </ol>
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-3">
                  Created {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                  {" — "}
                  <button
                    onClick={() => onDismiss(alert.id)}
                    className="underline hover:text-foreground transition-colors"
                  >
                    Dismiss once resolved
                  </button>
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

// ─── Shared helpers ───────────────────────────────────────────────────────────

export const AUDIT_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  none: { label: "Not audited", variant: "outline" },
  pending: { label: "Audit pending", variant: "secondary" },
  audited: { label: "Audited", variant: "default" },
};

export const COLORS = ["#0F6E56", "#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316"];

export function fmt(n: number) {
  return n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
}

export const PAGE_SIZE = 25;

// ─── Tab: Overview ────────────────────────────────────────────────────────────

// ─── Shared CRUD helpers ──────────────────────────────────────────────────────

export function ConfirmDialog({ title, message, onConfirm, onClose, danger = true }: {
  title: string; message: string; onConfirm: () => void; onClose: () => void; danger?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-card border rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-lg mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-5">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant={danger ? "destructive" : "default"} size="sm" onClick={onConfirm}>Confirm</Button>
        </div>
      </div>
    </div>
  );
}

export function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState("");
  const add = () => {
    const t = input.trim();
    if (t && !value.includes(t)) { onChange([...value, t]); }
    setInput("");
  };
  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-1.5">
        {value.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded text-xs">
            {tag}
            <button type="button" onClick={() => onChange(value.filter(v => v !== tag))} className="hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        <input
          className="flex-1 border rounded px-2 py-1 text-sm"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
          placeholder={placeholder ?? "Type and press Enter"}
        />
        <Button type="button" size="sm" variant="outline" onClick={add}>Add</Button>
      </div>
    </div>
  );
}

export function FormField({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-foreground/80">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <div className="mt-1">{children}</div>
      {error && <p className="text-xs text-destructive mt-0.5">{error}</p>}
    </div>
  );
}

// ── LocationPicker ─────────────────────────────────────────────────────────────
// Geocodes addresses via Nominatim (OpenStreetMap) — no API key required.
// Lets admins search by name/address and auto-fill GPS coordinates, with
// manual override inputs kept visible for fine-tuning.

// ── LocationPicker ─────────────────────────────────────────────────────────────
// Geocodes addresses via Nominatim (OpenStreetMap) — no API key required.
// Lets admins search by name/address and auto-fill GPS coordinates, with
// manual override inputs kept visible for fine-tuning.
export interface NominatimResult { place_id: number; display_name: string; lat: string; lon: string; }

export function LocationPicker({
  lat, lng, onChangeLatLng,
}: {
  lat: number | string | null | undefined;
  lng: number | string | null | undefined;
  onChangeLatLng: (lat: number, lng: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearchError(null);
    setShowResults(false);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=6&countrycodes=ca,us`,
        { headers: { "Accept-Language": "en" } }
      );
      const data: NominatimResult[] = await res.json();
      setResults(data);
      setShowResults(data.length > 0);
      if (data.length === 0) setSearchError("No results found — try a more specific address.");
    } catch {
      setSearchError("Search unavailable. Enter coordinates manually below.");
    }
    setSearching(false);
  };

  const pick = (r: NominatimResult) => {
    onChangeLatLng(parseFloat(r.lat), parseFloat(r.lon));
    setQuery(r.display_name);
    setShowResults(false);
    setResults([]);
  };

  const latNum = lat != null && lat !== "" ? Number(lat) : null;
  const lngNum = lng != null && lng !== "" ? Number(lng) : null;
  const hasCoordsNow = latNum !== null && lngNum !== null && !isNaN(latNum) && !isNaN(lngNum);

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        <input
          className="flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
          value={query}
          onChange={e => { setQuery(e.target.value); setShowResults(false); }}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); search(); } }}
          placeholder="Search address — e.g. Toronto, ON, Canada"
        />
        <button
          type="button"
          onClick={search}
          disabled={searching || !query.trim()}
          className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5 text-[#0F6E56]" />}
          {searching ? "Searching…" : "Search"}
        </button>
      </div>

      {showResults && results.length > 0 && (
        <div className="border border-border rounded-md bg-background shadow-md overflow-hidden z-50">
          {results.map(r => (
            <button
              key={r.place_id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent/60 border-b border-border/40 last:border-0 leading-snug"
              onClick={() => pick(r)}
            >
              {r.display_name}
            </button>
          ))}
        </div>
      )}

      {searchError && <p className="text-xs text-amber-600">{searchError}</p>}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Latitude (fine-tune)</p>
          <input
            className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm font-mono"
            type="number" step="any"
            value={lat ?? ""}
            onChange={e => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) onChangeLatLng(v, lngNum ?? 0);
            }}
            placeholder="43.6532"
          />
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Longitude (fine-tune)</p>
          <input
            className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm font-mono"
            type="number" step="any"
            value={lng ?? ""}
            onChange={e => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) onChangeLatLng(latNum ?? 0, v);
            }}
            placeholder="-79.3832"
          />
        </div>
      </div>

      {hasCoordsNow && (
        <p className="text-xs text-[#0F6E56] flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          Pin set: {latNum!.toFixed(5)}, {lngNum!.toFixed(5)}
        </p>
      )}
    </div>
  );
}

export function SlideOver({ title, open, onClose, children, footer }: {
  title: string; open: boolean; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-lg bg-card border-l shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h3 className="font-bold text-base">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">{children}</div>
        {footer && <div className="shrink-0 border-t px-6 py-4 flex gap-3 justify-end">{footer}</div>}
      </div>
    </div>
  );
}

export const inputCls = "w-full border rounded px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring";

export const selectCls = "w-full border rounded px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring";

// ─── Operator Form ─────────────────────────────────────────────────────────────

// ─── Operator Form ─────────────────────────────────────────────────────────────

export type OperatorFormData = {
  name: string; location: string; description: string; capacity_kg: string; price_per_kg: string;
  turnaround_days: string; certifications: string[]; available: boolean; country: string; city: string;
  website_url: string; contact_page_url: string; role: string; food_market_focus: boolean;
  pharmaceutical_focus: boolean; platform_fee_override: string; gps_lat: string; gps_lng: string;
  service_radius_km: string; map_status: string; contact_name: string; contact_email: string; phone: string;
  audit_status: string; verification_status: string;
};

export const emptyOperatorForm = (): OperatorFormData => ({
  name: "", location: "", description: "", capacity_kg: "", price_per_kg: "", turnaround_days: "14",
  certifications: [], available: true, country: "", city: "", website_url: "", contact_page_url: "",
  role: "operator", food_market_focus: false, pharmaceutical_focus: false, platform_fee_override: "",
  gps_lat: "", gps_lng: "", service_radius_km: "", map_status: "active",
  contact_name: "", contact_email: "", phone: "", audit_status: "none", verification_status: "not_verified",
});

// ─── Tab: Requests ────────────────────────────────────────────────────────────

export const STATUS_REQUEST: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Pending", variant: "secondary" },
  active: { label: "Active", variant: "default" },
  closed: { label: "Closed", variant: "outline" },
  removed: { label: "Removed", variant: "destructive" },
};

// ─── Tab: Market Intelligence ─────────────────────────────────────────────────

export interface MIData {
  avg_price_by_category: { category: string; avg_price: number; count: number }[];
  top_materials: { name: string; value: number }[];
  requests_by_region: { region: string; count: number }[];
  demand_by_region: { region: string; count: number }[];
  operator_win_rates: { name: string; win_rate: number; total_bids: number; won_bids: number }[];
  bids_by_month: { month: string; value: number }[];
  requests_by_month: { month: string; value: number }[];
  revenue_by_month: { month: string; value: number }[];
  listing_performance: { total_capacity_listings: number; total_product_listings: number; approved_capacity: number; approved_products: number };
  sales_volume: { total_contracts: number; total_quantity_kg: number; total_contract_value: number; platform_fees: number };
  manufacturer_activity: {
    total_active: number;
    top_manufacturers: { name: string; country: string; avg_rating: number; review_count: number }[];
  };
  machinery_demand: { category: string; total_listings: number; avg_price: number | null; active_listings: number; pending_listings: number }[];
  overrides: Record<string, number>;
}

// ─── Tab: Messages ────────────────────────────────────────────────────────────

export interface AdminMessage {
  id: number;
  request_id: number;
  user_id: number;
  sender_name: string;
  sender_role: string;
  body: string;
  created_at: string;
}

// ─── Notification Bell ────────────────────────────────────────────────────────

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [count, setCount] = useState(0);

  const load = useCallback(() => {
    api("/admin/notifications")
      .then((d) => { setNotifications(d.notifications); setCount(d.count); })
      .catch(console.error);
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load]);

  const clear = async () => {
    await api("/admin/notifications/clear", "POST");
    setCount(0);
    setNotifications([]);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-white text-[9px] rounded-full flex items-center justify-center font-bold">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-card border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <span className="font-semibold text-sm">Notifications</span>
            {count > 0 && (
              <button onClick={clear} className="text-xs text-muted-foreground hover:text-foreground">
                Clear all
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto divide-y">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground text-center">All caught up.</div>
            ) : notifications.map((n) => (
              <div key={n.id} className="px-4 py-3 text-sm hover:bg-muted/20">
                <div className="font-medium">{n.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Disputes ────────────────────────────────────────────────────────────

// ─── Tab: Disputes ────────────────────────────────────────────────────────────

export interface AdminDispute {
  id: number;
  request_id: number;
  bid_id: number;
  opened_by_email: string;
  reason: string;
  evidence: string | null;
  status: string;
  admin_decision: string | null;
  refund_amount: number | null;
  created_at: string;
  resolved_at: string | null;
}

export const DISPUTE_STATUS_COLORS: Record<string, string> = {
  open: "bg-red-100 text-red-700",
  under_review: "bg-amber-100 text-amber-700",
  resolved: "bg-emerald-100 text-emerald-700",
  dismissed: "bg-muted text-muted-foreground",
};

// ─── Tab: Audit Log ───────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: number;
  admin_email: string;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  ip_address: string | null;
  notes: string | null;
  created_at: string;
}

export const ACTION_COLORS: Record<string, string> = {
  ban_user: "text-red-600",
  unban_user: "text-emerald-600",
  remove_request: "text-red-600",
  close_request: "text-amber-600",
  trigger_operator_audit: "text-blue-600",
  mark_operator_audited: "text-emerald-600",
  verify_operator_cert: "text-emerald-600",
  unverify_operator_cert: "text-amber-600",
  dispute_resolved: "text-emerald-600",
  dispute_dismissed: "text-muted-foreground",
  dispute_under_review: "text-amber-600",
  create_operator: "text-blue-600",
  update_operator: "text-amber-600",
  delete_operator: "text-red-600",
  create_manufacturer: "text-blue-600",
  update_manufacturer: "text-amber-600",
  delete_manufacturer: "text-red-600",
  create_listing: "text-blue-600",
  update_listing: "text-amber-600",
  delete_listing: "text-red-600",
  approve_listing: "text-emerald-600",
  reject_listing: "text-red-600",
  create_map_entry: "text-blue-600",
  create_machinery_listing: "text-blue-600",
  update_machinery_listing: "text-amber-600",
  delete_machinery_listing: "text-red-600",
};

export const ACTION_CATEGORIES: Record<string, string[]> = {
  "User moderation": ["ban_user", "unban_user"],
  "Requests": ["remove_request", "close_request"],
  "Operator CRUD": ["create_operator", "update_operator", "delete_operator"],
  "Operator audit": ["trigger_operator_audit", "mark_operator_audited", "verify_operator_cert", "unverify_operator_cert"],
  "Manufacturer CRUD": ["create_manufacturer", "update_manufacturer", "delete_manufacturer"],
  "Listing CRUD": ["create_listing", "update_listing", "delete_listing", "approve_listing", "reject_listing"],
  "Disputes": ["dispute_resolved", "dispute_dismissed", "dispute_under_review"],
  "Machinery": ["create_machinery_listing", "update_machinery_listing", "delete_machinery_listing"],
  "Map": ["create_map_entry"],
};

// ─── Price Data Tab ───────────────────────────────────────────────────────────

export interface PriceRecord {
  id: number;
  bid_id: number;
  request_id: number;
  operator_name: string | null;
  category: string;
  quoted_price: number;
  currency: string;
  product_format: string | null;
  moq: number | null;
  lead_time_days: number | null;
  certifications: string[];
  quote_status: string;
  accepted: boolean;
  confidence_level: string;
  included_in_market_intelligence: boolean;
  admin_notes: string | null;
  created_at: string;
}

// ─── SiteControlsTab ─────────────────────────────────────────────────────────

export type SiteSettingKey = "marketplace_locked" | "market_intelligence_locked" | "blog_locked";

export interface AdminSiteSettings {
  marketplace_locked: boolean;
  market_intelligence_locked: boolean;
  blog_locked: boolean;
}

export interface ScheduledReportSettings {
  enabled: boolean;
  cadence: "weekly" | "monthly";
}

// ─── BlogAdminTab ─────────────────────────────────────────────────────────────

export interface AdminBlogPost {
  id: number;
  slug: string;
  title: string;
  body: string;
  seo_description: string | null;
  cover_image_url: string | null;
  category: string | null;
  author: string | null;
  tags: string[];
  status: "draft" | "published" | "archived";
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export const BLOG_CATEGORIES = ["Industry News", "Case Study", "Regulatory", "Technology", "Company News"];

export const emptyPost = {
  title: "",
  slug: "",
  slugCustomized: false,
  body: "",
  seo_description: "",
  cover_image_url: "",
  category: "",
  author: "",
  tagsInput: "",
  status: "draft" as "draft" | "published" | "archived",
  publishDateTime: "",
};

// ─── Tab: Manufacturers ───────────────────────────────────────────────────────

export type MfrFormData = {
  name: string; tagline: string; description: string; website_url: string; logo_url: string;
  country: string; city: string; founded_year: string; specialties: string[]; market_focus: string[];
  certifications: string[]; production_capabilities: string; contact_name: string;
  contact_email: string; phone: string; active: boolean; featured: boolean;
};

export const emptyMfrForm = (): MfrFormData => ({
  name: "", tagline: "", description: "", website_url: "", logo_url: "", country: "", city: "",
  founded_year: "", specialties: [], market_focus: [], certifications: [], production_capabilities: "",
  contact_name: "", contact_email: "", phone: "", active: true, featured: false,
});

// ─── Tab: Capacity + Product Listings ────────────────────────────────────────

export interface CapacityListing {
  id: number;
  user_id: number;
  operator_id: number | null;
  equipment_type: string;
  capacity_kg: number;
  certifications: string[];
  price_per_kg_min: number;
  price_per_kg_max: number;
  turnaround_days: number;
  available: boolean;
  notes: string | null;
  approval_status: string;
  created_at: string;
  listing_type: "capacity";
}

export interface ProductListing {
  id: number;
  operator_name: string;
  name: string;
  material_type: string;
  weight_kg: number;
  moisture_pct: number | null;
  price_per_unit: number;
  moq: number;
  available: boolean;
  description: string | null;
  contact_email: string;
  approval_status: string;
  user_id: number | null;
  created_at: string;
  listing_type: "product";
}

export type UnifiedListing = CapacityListing | ProductListing;

// ─── Tab: Machinery & Parts Listings ─────────────────────────────────────────

export interface MachineryListing {
  id: number;
  title: string;
  category: string;
  listing_status: string;
  condition: string;
  description: string | null;
  price: number | null;
  currency: string;
  manufacturer_name: string | null;
  model_number: string | null;
  year_manufactured: number | null;
  technical_specs: Record<string, string>;
  images: string[];
  contact_name: string | null;
  contact_email: string | null;
  phone: string | null;
  operator_id: number | null;
  user_id: number | null;
  created_at: string;
  updated_at: string;
}

export const MACHINERY_CATEGORIES = ["dryer", "chamber", "shelf", "condenser", "pump", "part", "other"] as const;

export const MACHINERY_STATUSES = ["active", "pending", "sold", "inactive"] as const;

export const MACHINERY_CONDITIONS = ["new", "refurbished", "used"] as const;

export type MachFormData = {
  title: string; category: string; listing_status: string; condition: string;
  description: string; price: string; currency: string; manufacturer_name: string;
  model_number: string; year_manufactured: string;
  tech_key: string; tech_val: string; technical_specs: Record<string, string>;
  contact_name: string; contact_email: string; phone: string;
  operator_id: string;
};

export const emptyMachForm = (): MachFormData => ({
  title: "", category: "other", listing_status: "active", condition: "used",
  description: "", price: "", currency: "CAD", manufacturer_name: "",
  model_number: "", year_manufactured: "", tech_key: "", tech_val: "",
  technical_specs: {}, contact_name: "", contact_email: "", phone: "", operator_id: "",
});

// ─── ListingsApprovalTab ──────────────────────────────────────────────────────

export interface AdminListing {
  id: number;
  type: "capacity" | "product";
  operator_name: string;
  title: string;
  approval_status: string;
  approval_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface RawCapacityListing {
  id: number;
  equipment_type: string;
  operator_name?: string;
  approval_status: string;
  approval_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface RawProductListing {
  id: number;
  name: string;
  operator_name?: string;
  approval_status: string;
  approval_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListingsApiResponse {
  capacity: RawCapacityListing[];
  products: RawProductListing[];
}

// ─── Admin Layout + Page ──────────────────────────────────────────────────────

// ─── Tab: Reports ─────────────────────────────────────────────────────────────

export interface ReportSnapshot {
  id: number;
  type: string;
  title: string;
  date_range_start: string;
  date_range_end: string;
  filters_json: Record<string, string>;
  generated_at: string;
  generated_by: number;
  generated_by_email: string;
  data_json?: {
    avg_price_by_category?: { category: string; avg_price: number; count: number }[];
    top_materials?: { name: string; value: number }[];
    requests_by_month?: { month: string; value: number }[];
    bids_by_month?: { month: string; value: number }[];
    revenue_by_month?: { month: string; value: number }[];
    operator_win_rates?: { name: string; win_rate: number }[];
    sales_volume?: { total_contracts: number; total_quantity_kg: number; total_contract_value: number; platform_fees: number };
    summary?: string;
  };
}

export const REPORT_TYPE_LABELS: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  custom: "Custom",
};

export const CATEGORIES = ["Fruits","Vegetables","Nutraceuticals","Pet Food","Pharmaceutical","Probiotics","Herbs & Spices","Dairy","Mushrooms"];

export type Tab = "overview" | "traffic" | "benchmarks" | "observations" | "newsletter" | "users" | "operators" | "requests" | "transactions" | "insights" | "messages" | "disputes" | "audit" | "price-data" | "site-controls" | "blog" | "listings" | "machinery" | "listings-approval" | "manufacturers" | "map" | "reports";

export const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "traffic", label: "Traffic", icon: Eye },
  { id: "users", label: "Users", icon: Users },
  { id: "operators", label: "Operators", icon: ShieldCheck },
  { id: "manufacturers", label: "Manufacturers", icon: Building2 },
  { id: "listings", label: "Listings", icon: Package },
  { id: "machinery", label: "Machinery", icon: LayoutList },
  { id: "listings-approval", label: "Listing Approval", icon: CheckCircle2 },
  { id: "map", label: "Map", icon: MapPin },
  { id: "requests", label: "Requests", icon: FileText },
  { id: "transactions", label: "Transactions", icon: DollarSign },
  { id: "insights", label: "Market Intel", icon: TrendingUp },
  { id: "reports", label: "Reports", icon: FileDown },
  { id: "price-data", label: "Price Data", icon: Database },
  { id: "observations", label: "Observations", icon: NotebookPen },
  { id: "benchmarks", label: "Prix produits", icon: Tags },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "disputes", label: "Disputes", icon: Scale },
  { id: "audit", label: "Audit Log", icon: ClipboardList },
  { id: "site-controls", label: "Site Controls", icon: Globe },
  { id: "blog", label: "Blog CMS", icon: BookOpen },
  { id: "newsletter", label: "Newsletter", icon: Mail },
];


/**
 * Fetch helper that surfaces the server's own error message.
 *
 * The older `api` in this file threw the raw response body, so a 403 from a
 * capability check reached the screen as unreadable JSON. This one unwraps the
 * `error` field, which is what every route returns.
 */
export async function adminApi(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      message = (JSON.parse(text) as { error?: string }).error ?? text;
    } catch {
      /* not JSON — show the raw body */
    }
    throw new Error(message || `Request failed (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

/**
 * A visible failure. Several older handlers only called console.error, so a 403
 * produced no feedback on screen at all.
 */
export function ErrorNote({ error, onDismiss }: { error: string | null; onDismiss?: () => void }) {
  if (!error) return null;
  return (
    <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-3 py-2 text-sm mb-4">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <span className="flex-1">{error}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="shrink-0 opacity-70 hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
