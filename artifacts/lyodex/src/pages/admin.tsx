import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { TrafficTab, ObservationsTab, NewsletterTab } from "./admin-tabs";
import { BenchmarksTab } from "./admin-benchmarks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, FileText, CheckSquare, DollarSign, Bell, Activity,
  ShieldCheck, ShieldAlert, Shield, BarChart2, ListFilter,
  Ban, UserCheck, ChevronLeft, ChevronRight, ExternalLink,
  XCircle, AlertTriangle, Lock, Unlock, MessageSquare, KeyRound, Copy, Check,
  Scale, ClipboardList, FileSearch, Download, Database,
  Globe, BookOpen, LayoutList, Plus, Trash2, Pencil, CheckCircle2, XOctagon, Upload, Loader2,
  MapPin, Building2, X, ChevronDown, ChevronUp, Package,
  FileDown, Calendar, TrendingUp, RefreshCw, Save,
  Eye, NotebookPen, Mail, Tags,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from "recharts";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function api(path: string, method = "GET", body?: unknown) {
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

interface AdminUser {
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

const ADMIN_ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  support_admin: "Support",
  finance_admin: "Finance",
  data_analyst: "Analyst",
  ad_manager: "Ad Mgr",
};
const ADMIN_ROLE_OPTIONS = ["super_admin", "support_admin", "finance_admin", "data_analyst", "ad_manager"];

interface AdminOperator {
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

interface Manufacturer {
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

interface MapEntry {
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

interface CapacityListing {
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

interface ProductListing {
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

interface Transaction {
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

interface AdminRequest {
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

interface ActivityItem {
  id: number;
  type: string;
  message: string;
  timestamp: string;
}

interface Overview {
  total_users: number;
  active_requests: number;
  completed_contracts: number;
  total_platform_revenue: number;
  activity: ActivityItem[];
}

interface Notification {
  id: string;
  type: string;
  label: string;
  created_at: string;
}

interface SystemAlert {
  id: number;
  alert_key: string;
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  dismissed_at: string | null;
}

// ─── System Alert Banner ──────────────────────────────────────────────────────

function SystemAlertBanner({ alerts, onDismiss }: { alerts: SystemAlert[]; onDismiss: (id: number) => void }) {
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

const AUDIT_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  none: { label: "Not audited", variant: "outline" },
  pending: { label: "Audit pending", variant: "secondary" },
  audited: { label: "Audited", variant: "default" },
};

const COLORS = ["#0F6E56", "#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316"];

function fmt(n: number) {
  return n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
}

const PAGE_SIZE = 25;

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab({ overview, loading }: { overview: Overview | null; loading: boolean }) {
  // The rate is set by PLATFORM_FEE_PERCENT on the server, not baked into this
  // file — the label read "(9%)" while the platform was charging nothing.
  const { platform_fee_percent: feePercent } = useSiteSettings();
  const kpis = [
    { label: "Total users", value: overview?.total_users, icon: Users },
    { label: "Active requests", value: overview?.active_requests, icon: FileText },
    { label: "Completed contracts", value: overview?.completed_contracts, icon: CheckSquare },
    { label: feePercent > 0 ? `Platform revenue (${feePercent}%)` : "Platform revenue (fees waived)", value: overview ? fmt(overview.total_platform_revenue) : undefined, icon: DollarSign },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold mb-5">Platform overview</h2>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{k.label}</CardTitle>
              <k.icon className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-20" /> : (
                <div className="text-2xl font-bold">{k.value ?? "—"}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Live activity feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="w-4 h-4 text-primary" /> Live activity feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (overview?.activity ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No activity yet.</div>
          ) : (
            <div className="space-y-4">
              {(overview?.activity ?? []).map((item) => (
                <div key={item.id} className="flex gap-3 items-start">
                  <div className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{item.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── User Profile Dialog ──────────────────────────────────────────────────────

function UserProfileDialog({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-card border rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">User profile</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">&times;</button>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{user.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Role</span>
            <Badge variant={user.role === "admin" ? "default" : user.role === "operator" ? "secondary" : "outline"} className="text-[10px] uppercase">
              {user.role}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            {user.banned ? (
              <Badge variant="destructive" className="text-[10px] uppercase">Banned</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] uppercase text-green-600 border-green-300">Active</Badge>
            )}
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Joined</span>
            <span>{format(new Date(user.created_at), "MMM d, yyyy")}</span>
          </div>
        </div>
        {user.role === "operator" && (
          <div className="mt-4 pt-4 border-t">
            <Link href="/operators">
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={onClose}>
                <ExternalLink className="w-3.5 h-3.5" /> Browse operator directory
              </Button>
            </Link>
          </div>
        )}
        {user.role === "buyer" && (
          <div className="mt-4 pt-4 border-t">
            <Link href="/requests">
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={onClose}>
                <ExternalLink className="w-3.5 h-3.5" /> View platform requests
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Users ───────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [working, setWorking] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [viewUser, setViewUser] = useState<AdminUser | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [roleWorking, setRoleWorking] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api("/admin/users").then(setUsers).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const setBan = async (id: number, ban: boolean) => {
    setWorking(id);
    try {
      await api(`/admin/users/${id}/${ban ? "ban" : "unban"}`, "POST");
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, banned: ban } : u));
    } finally { setWorking(null); }
  };

  const unlock = async (id: number) => {
    setWorking(id);
    try {
      await api(`/admin/users/${id}/unlock`, "POST");
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, failed_login_count: 0, locked_until: null } : u));
    } finally { setWorking(null); }
  };

  const setAdminRole = async (id: number, role: string | null) => {
    setRoleWorking(id);
    try {
      await api(`/admin/users/${id}/admin-role`, "PATCH", { admin_role: role });
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, admin_role: role } : u));
    } finally { setRoleWorking(null); }
  };

  const triggerAudit = async (id: number) => {
    setWorking(id);
    setAuditError(null);
    try {
      await api(`/admin/users/${id}/trigger-audit`, "POST");
    } catch (err: unknown) {
      let msg = "Audit trigger failed.";
      try { msg = JSON.parse(err instanceof Error ? err.message : String(err)).error ?? msg; } catch {}
      setAuditError(msg);
    } finally { setWorking(null); }
  };

  const filtered = users.filter(
    (u) => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <h2 className="text-xl font-bold">All users</h2>
        <div className="flex items-center gap-2">
          <ListFilter className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="border rounded-lg px-3 py-1.5 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-56"
          />
        </div>
      </div>

      {auditError && (
        <div className="mb-3 px-4 py-2 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          {auditError}
        </div>
      )}

      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              {["Name", "Email", "Role", "Joined", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              [1, 2, 3, 4].map((i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
              ))
            ) : paged.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No users found.</td></tr>
            ) : paged.map((u) => {
              const isLocked = !!u.locked_until && new Date(u.locked_until) > new Date();
              return (
                <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{u.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <Badge variant={u.role === "admin" ? "default" : u.role === "operator" ? "secondary" : "outline"} className="text-[10px] uppercase w-fit">
                        {u.role}
                      </Badge>
                      {u.role === "admin" && u.admin_role && (
                        <Badge variant="outline" className="text-[10px] w-fit border-amber-300 text-amber-700 bg-amber-50">
                          {ADMIN_ROLE_LABELS[u.admin_role] ?? u.admin_role}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {format(new Date(u.created_at), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {u.banned ? (
                        <Badge variant="destructive" className="text-[10px] uppercase w-fit">Banned</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] uppercase w-fit text-green-600 border-green-300">Active</Badge>
                      )}
                      {isLocked && (
                        <Badge variant="outline" className="text-[10px] w-fit border-orange-300 text-orange-700 bg-orange-50 gap-1">
                          <Lock className="w-2.5 h-2.5" /> Locked
                        </Badge>
                      )}
                      {!isLocked && u.failed_login_count > 0 && (
                        <span className="text-[10px] text-muted-foreground">{u.failed_login_count} failed attempt{u.failed_login_count !== 1 ? "s" : ""}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* View profile */}
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 px-2" onClick={() => setViewUser(u)}>
                        View
                      </Button>
                      {/* Unlock locked account */}
                      {isLocked && (
                        <Button size="sm" variant="outline" className="gap-1 h-7 text-xs border-orange-300 text-orange-700" disabled={working === u.id} onClick={() => unlock(u.id)}>
                          <Lock className="w-3 h-3" /> Unlock
                        </Button>
                      )}
                      {/* Ban/Unban — not for admin */}
                      {u.role !== "admin" && (
                        u.banned ? (
                          <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" disabled={working === u.id} onClick={() => setBan(u.id, false)}>
                            <UserCheck className="w-3 h-3" /> Unban
                          </Button>
                        ) : (
                          <Button size="sm" variant="destructive" className="gap-1 h-7 text-xs" disabled={working === u.id} onClick={() => setBan(u.id, true)}>
                            <Ban className="w-3 h-3" /> Ban
                          </Button>
                        )
                      )}
                      {/* Trigger audit for operators */}
                      {u.role === "operator" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={working === u.id} onClick={() => triggerAudit(u.id)}>
                          <Shield className="w-3 h-3" /> Audit
                        </Button>
                      )}
                      {/* Admin sub-role selector */}
                      {u.role === "admin" && (
                        <select
                          className="h-7 text-xs border rounded px-1.5 bg-background text-foreground disabled:opacity-50"
                          value={u.admin_role ?? ""}
                          disabled={roleWorking === u.id}
                          onChange={(e) => { if (e.target.value) setAdminRole(u.id, e.target.value); }}
                        >
                          {/* Clearing the sub-role is intentionally impossible: a null
                              admin_role means full super-admin, so "no sub-role" silently
                              escalated. The server rejects null for the same reason. */}
                          <option value="" disabled>Select a sub-role…</option>
                          {ADMIN_ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r}>{ADMIN_ROLE_LABELS[r]}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-muted-foreground">{filtered.length} user{filtered.length !== 1 ? "s" : ""}</p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" className="h-7 px-2" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">Page {safePage} of {totalPages}</span>
            <Button size="sm" variant="ghost" className="h-7 px-2" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {viewUser && <UserProfileDialog user={viewUser} onClose={() => setViewUser(null)} />}
    </div>
  );
}

// ─── Shared CRUD helpers ──────────────────────────────────────────────────────

function ConfirmDialog({ title, message, onConfirm, onClose, danger = true }: {
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

function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
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

function FormField({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
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
interface NominatimResult { place_id: number; display_name: string; lat: string; lon: string; }

function LocationPicker({
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

function SlideOver({ title, open, onClose, children, footer }: {
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

const inputCls = "w-full border rounded px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring";
const selectCls = "w-full border rounded px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring";

// ─── Operator Form ─────────────────────────────────────────────────────────────

type OperatorFormData = {
  name: string; location: string; description: string; capacity_kg: string; price_per_kg: string;
  turnaround_days: string; certifications: string[]; available: boolean; country: string; city: string;
  website_url: string; contact_page_url: string; role: string; food_market_focus: boolean;
  pharmaceutical_focus: boolean; platform_fee_override: string; gps_lat: string; gps_lng: string;
  service_radius_km: string; map_status: string; contact_name: string; contact_email: string; phone: string;
  audit_status: string; verification_status: string;
};

const emptyOperatorForm = (): OperatorFormData => ({
  name: "", location: "", description: "", capacity_kg: "", price_per_kg: "", turnaround_days: "14",
  certifications: [], available: true, country: "", city: "", website_url: "", contact_page_url: "",
  role: "operator", food_market_focus: false, pharmaceutical_focus: false, platform_fee_override: "",
  gps_lat: "", gps_lng: "", service_radius_km: "", map_status: "active",
  contact_name: "", contact_email: "", phone: "", audit_status: "none", verification_status: "not_verified",
});

function opToForm(op: AdminOperator): OperatorFormData {
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

function OperatorForm({ data, onChange }: { data: OperatorFormData; onChange: (d: OperatorFormData) => void }) {
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

function OperatorsTab() {
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

function TransactionsTab() {
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

function ModerationDialog({
  request,
  action,
  onConfirm,
  onClose,
}: {
  request: AdminRequest;
  action: "close" | "remove";
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (action === "remove" && !reason.trim()) return;
    setSubmitting(true);
    onConfirm(reason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-card border rounded-2xl shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-lg capitalize">
            {action === "close" ? "Close request" : "Remove request"}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">&times;</button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {action === "close"
            ? "Closing this request will stop operators from submitting new bids. Existing bids are preserved and the request remains visible."
            : "Removing this request hides it from the public marketplace listing and blocks new bids. The request detail page remains accessible via direct link."}
        </p>
        <div className="rounded-lg bg-muted/40 border px-4 py-3 mb-4 text-sm">
          <span className="font-medium">{request.material_type}</span>
          <span className="text-muted-foreground"> · {request.quantity_kg} kg · {request.buyer_email}</span>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5">
              Reason / note {action === "remove" && <span className="text-destructive">*</span>}
            </label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none h-20"
              placeholder={action === "remove" ? "Required — explain why this request is being removed..." : "Optional — note for the buyer..."}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required={action === "remove"}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button
              type="submit"
              size="sm"
              variant={action === "remove" ? "destructive" : "default"}
              disabled={submitting || (action === "remove" && !reason.trim())}
            >
              {submitting ? "Saving..." : action === "close" ? "Close request" : "Remove request"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Tab: Requests ────────────────────────────────────────────────────────────

const STATUS_REQUEST: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Pending", variant: "secondary" },
  active: { label: "Active", variant: "default" },
  closed: { label: "Closed", variant: "outline" },
  removed: { label: "Removed", variant: "destructive" },
};

function RequestsTab() {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [working, setWorking] = useState<number | null>(null);
  const [dialog, setDialog] = useState<{ request: AdminRequest; action: "close" | "remove" } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api("/admin/requests").then(setRequests).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const doModerate = async (request: AdminRequest, action: "close" | "remove", reason: string) => {
    setWorking(request.id);
    setDialog(null);
    setError(null);
    try {
      await api(`/admin/requests/${request.id}/${action}`, "POST", { reason: reason || undefined });
      setRequests((prev) =>
        prev.map((r) =>
          r.id === request.id
            ? { ...r, status: action === "close" ? "closed" : "removed", moderation_note: reason || null }
            : r
        )
      );
    } catch (err: unknown) {
      let msg = "Action failed.";
      try { msg = JSON.parse(err instanceof Error ? err.message : String(err)).error ?? msg; } catch {}
      setError(msg);
    } finally {
      setWorking(null);
    }
  };

  const filtered = requests.filter(
    (r) =>
      !search ||
      r.material_type.toLowerCase().includes(search.toLowerCase()) ||
      r.buyer_email.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <h2 className="text-xl font-bold">All requests</h2>
        <div className="flex items-center gap-2">
          <ListFilter className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search material or buyer..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="border rounded-lg px-3 py-1.5 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-56"
          />
        </div>
      </div>

      {error && (
        <div className="mb-3 px-4 py-2 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              {["#", "Material", "Buyer", "Qty (kg)", "Deadline", "Bids", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              [1, 2, 3, 4].map((i) => (
                <tr key={i}><td colSpan={8} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
              ))
            ) : paged.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No requests found.</td></tr>
            ) : paged.map((r) => {
              const st = STATUS_REQUEST[r.status] ?? { label: r.status, variant: "outline" as const };
              const isModerated = r.status === "closed" || r.status === "removed";
              return (
                <tr key={r.id} className={`hover:bg-muted/20 transition-colors ${isModerated ? "opacity-60" : ""}`}>
                  <td className="px-4 py-3 text-muted-foreground text-xs">#{r.id}</td>
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/requests/${r.id}`} className="hover:text-primary transition-colors flex items-center gap-1">
                      {r.material_type} <ExternalLink className="w-3 h-3 opacity-40" />
                    </Link>
                    {r.moderation_note && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[160px]" title={r.moderation_note}>
                        Note: {r.moderation_note}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{r.buyer_email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.quantity_kg}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{r.deadline}</td>
                  <td className="px-4 py-3 text-center font-medium">{r.bid_count}</td>
                  <td className="px-4 py-3">
                    <Badge variant={st.variant} className="text-[10px] uppercase">{st.label}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {r.status !== "closed" && r.status !== "removed" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            disabled={working === r.id}
                            onClick={() => setDialog({ request: r, action: "close" })}
                          >
                            <Lock className="w-3 h-3" /> Close
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs gap-1"
                            disabled={working === r.id}
                            onClick={() => setDialog({ request: r, action: "remove" })}
                          >
                            <XCircle className="w-3 h-3" /> Remove
                          </Button>
                        </>
                      )}
                      {isModerated && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Moderated
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-muted-foreground">{filtered.length} request{filtered.length !== 1 ? "s" : ""}</p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" className="h-7 px-2" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">Page {safePage} of {totalPages}</span>
            <Button size="sm" variant="ghost" className="h-7 px-2" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {dialog && (
        <ModerationDialog
          request={dialog.request}
          action={dialog.action}
          onConfirm={(reason) => doModerate(dialog.request, dialog.action, reason)}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

// ─── Tab: Market Intelligence ─────────────────────────────────────────────────

interface MIData {
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

function InsightsTab() {
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

interface AdminMessage {
  id: number;
  request_id: number;
  user_id: number;
  sender_name: string;
  sender_role: string;
  body: string;
  created_at: string;
}

function MessagesTab() {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    api("/admin/messages")
      .then(setMessages)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = messages.filter(
    (m) =>
      !search ||
      m.sender_name.toLowerCase().includes(search.toLowerCase()) ||
      m.body.toLowerCase().includes(search.toLowerCase()) ||
      String(m.request_id).includes(search)
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const ROLE_COLOR: Record<string, string> = {
    buyer: "text-blue-600",
    operator: "text-emerald-600",
    admin: "text-orange-500",
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <h2 className="text-xl font-bold">All messages</h2>
        <div className="flex items-center gap-2">
          <ListFilter className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search sender, body or request #..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="border rounded-lg px-3 py-1.5 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-64"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  {["#", "Request", "Sender", "Role", "Message", "Sent"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  [1, 2, 3, 4].map((i) => (
                    <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
                  ))
                ) : paged.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No messages found.</td></tr>
                ) : paged.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{m.id}</td>
                    <td className="px-4 py-3">
                      <Link href={`/requests/${m.request_id}`} className="text-primary hover:underline font-medium">
                        #{m.request_id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium">{m.sender_name}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium capitalize text-xs ${ROLE_COLOR[m.sender_role] ?? ""}`}>
                        {m.sender_role}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-sm text-foreground line-clamp-2">{m.body}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-xs text-muted-foreground">
                {filtered.length} message{filtered.length !== 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs px-2">{safePage} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Notification Bell ────────────────────────────────────────────────────────

function NotificationBell() {
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

interface AdminDispute {
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

const DISPUTE_STATUS_COLORS: Record<string, string> = {
  open: "bg-red-100 text-red-700",
  under_review: "bg-amber-100 text-amber-700",
  resolved: "bg-emerald-100 text-emerald-700",
  dismissed: "bg-muted text-muted-foreground",
};

function DisputesTab() {
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [decidingId, setDecidingId] = useState<number | null>(null);
  const [decisionText, setDecisionText] = useState("");
  const [decisionStatus, setDecisionStatus] = useState("resolved");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api("/admin/disputes")
      .then(setDisputes)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const submitDecision = async (id: number) => {
    setSaving(true);
    try {
      await api(`/admin/disputes/${id}`, "PATCH", {
        status: decisionStatus,
        admin_decision: decisionText.trim() || undefined,
      });
      setDisputes(prev => prev.map(d =>
        d.id === id
          ? { ...d, status: decisionStatus, admin_decision: decisionText.trim() || d.admin_decision }
          : d
      ));
      setDecidingId(null);
      setDecisionText("");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
        <Scale className="w-5 h-5 text-primary" /> Disputes
      </h2>
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : disputes.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">No disputes filed.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {disputes.map(d => (
            <Card key={d.id}>
              <CardContent className="pt-5 pb-4">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">Dispute #{d.id}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${DISPUTE_STATUS_COLORS[d.status] ?? "bg-muted text-muted-foreground"}`}>
                      {d.status.replace("_", " ")}
                    </span>
                    <span className="text-xs text-muted-foreground">Request #{d.request_id} / Quote #{d.bid_id}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-1">Filed by: <span className="font-medium text-foreground">{d.opened_by_email}</span></p>
                <p className="text-sm mb-2"><span className="font-medium">Reason:</span> {d.reason}</p>
                {d.evidence && <p className="text-xs text-muted-foreground mb-2 italic">Evidence: {d.evidence}</p>}
                {d.admin_decision && (
                  <div className="text-xs bg-emerald-50 border border-emerald-200 rounded px-3 py-2 mb-2">
                    <span className="font-semibold text-emerald-800">Admin decision:</span> {d.admin_decision}
                  </div>
                )}
                {d.status === "open" || d.status === "under_review" ? (
                  decidingId === d.id ? (
                    <div className="mt-3 space-y-2 border-t pt-3">
                      <div className="flex gap-2">
                        {["under_review", "resolved", "dismissed"].map(s => (
                          <button
                            key={s}
                            onClick={() => setDecisionStatus(s)}
                            className={`text-xs px-2 py-1 rounded border font-medium transition-colors ${decisionStatus === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                          >
                            {s.replace("_", " ")}
                          </button>
                        ))}
                      </div>
                      <textarea
                        className="w-full border rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                        rows={2}
                        placeholder="Admin decision or notes (optional)..."
                        value={decisionText}
                        onChange={e => setDecisionText(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => submitDecision(d.id)} disabled={saving}>
                          {saving ? "Saving…" : "Save decision"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setDecidingId(null); setDecisionText(""); }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => { setDecidingId(d.id); setDecisionStatus("under_review"); }}>
                      Review / Decide
                    </Button>
                  )
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Audit Log ───────────────────────────────────────────────────────────

interface AuditLogEntry {
  id: number;
  admin_email: string;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  ip_address: string | null;
  notes: string | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
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

const ACTION_CATEGORIES: Record<string, string[]> = {
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

function AuditLogTab() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    api("/admin/audit-logs?limit=500")
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredLogs = logs.filter(l => {
    if (categoryFilter) {
      const actions = ACTION_CATEGORIES[categoryFilter] ?? [];
      if (!actions.includes(l.action)) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return (
        l.action.replace(/_/g, " ").includes(q) ||
        l.admin_email.toLowerCase().includes(q) ||
        (l.entity_type ?? "").toLowerCase().includes(q) ||
        (l.notes ?? "").toLowerCase().includes(q) ||
        String(l.entity_id ?? "").includes(q)
      );
    }
    return true;
  });

  return (
    <div>
      <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
        <ClipboardList className="w-5 h-5 text-primary" /> Admin Audit Log
      </h2>
      <p className="text-xs text-muted-foreground mb-4">Every write action performed by an admin is recorded here. Read-only.</p>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          placeholder="Search by action, admin, entity, notes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 border rounded-md px-3 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All categories</option>
          {Object.keys(ACTION_CATEGORIES).map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        {(search || categoryFilter) && (
          <button
            onClick={() => { setSearch(""); setCategoryFilter(""); }}
            className="px-3 py-1.5 text-xs border rounded-md hover:bg-muted/50 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : filteredLogs.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">
          {logs.length === 0 ? "No admin actions recorded yet." : "No entries match your filter."}
        </CardContent></Card>
      ) : (
        <Card>
          <div className="px-4 py-2 border-b text-xs text-muted-foreground">
            Showing {filteredLogs.length} of {logs.length} entries
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left font-semibold text-muted-foreground px-4 py-2.5">Time</th>
                  <th className="text-left font-semibold text-muted-foreground px-4 py-2.5">Admin</th>
                  <th className="text-left font-semibold text-muted-foreground px-4 py-2.5">Action</th>
                  <th className="text-left font-semibold text-muted-foreground px-4 py-2.5">Entity</th>
                  <th className="text-left font-semibold text-muted-foreground px-4 py-2.5">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredLogs.map(l => (
                  <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                      {format(new Date(l.created_at), "MMM d, HH:mm")}
                    </td>
                    <td className="px-4 py-2 font-medium">{l.admin_email}</td>
                    <td className={`px-4 py-2 font-semibold whitespace-nowrap ${ACTION_COLORS[l.action] ?? ""}`}>
                      {l.action.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {l.entity_type ? `${l.entity_type} #${l.entity_id ?? "—"}` : "—"}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground max-w-xs truncate">{l.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Price Data Tab ───────────────────────────────────────────────────────────

interface PriceRecord {
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

function PriceDataTab() {
  const [rows, setRows] = useState<PriceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [editingNotes, setEditingNotes] = useState<Record<number, string>>({});
  const LIMIT = 50;

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (filterCategory) qs.set("category", filterCategory);
    if (filterStatus)   qs.set("status",   filterStatus);
    try {
      const res = await api(`/admin/price-data?${qs}`);
      setRows(res.data);
      setTotal(res.total);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, filterCategory, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const toggleInclude = async (id: number, current: boolean) => {
    await api(`/admin/price-data/${id}`, "PATCH", { included_in_market_intelligence: !current });
    load();
  };

  const saveNotes = async (id: number) => {
    await api(`/admin/price-data/${id}`, "PATCH", { admin_notes: editingNotes[id] ?? "" });
    setEditingNotes(prev => { const n = { ...prev }; delete n[id]; return n; });
    load();
  };

  const CONF: Record<string, string> = {
    high:   "bg-emerald-100 text-emerald-700",
    medium: "bg-amber-100 text-amber-700",
    low:    "bg-red-100 text-red-700",
  };
  const STAT: Record<string, string> = {
    accepted: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
    pending:  "bg-slate-100 text-slate-600",
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Market Intelligence Data</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {total.toLocaleString()} price observations from operator bids
          </p>
        </div>
        <Button
          size="sm" variant="outline"
          onClick={() => window.open(`${BASE}/api/admin/price-data/export`, "_blank")}
          className="shrink-0"
        >
          <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Category</p>
          <select
            value={filterCategory}
            onChange={e => { setFilterCategory(e.target.value); setPage(1); }}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All categories</option>
            {["Fruits","Vegetables","Nutraceuticals","Pet Food","Pharmaceutical","Probiotics","Herbs & Spices","Dairy","Mushrooms"].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Quote status</p>
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        {(filterCategory || filterStatus) && (
          <Button size="sm" variant="ghost" className="text-xs h-8 self-end"
            onClick={() => { setFilterCategory(""); setFilterStatus(""); setPage(1); }}>
            Clear filters
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Database className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No price observations yet.</p>
          <p className="text-xs mt-1">They appear here as operators submit bids on buyer requests.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 border-b">
                <tr>
                  {["Date","Category","Format","$/kg","MOQ","Lead","Cur.","Status","Confidence","Include","Notes","Operator"].map(h => (
                    <th key={h} className={`px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap ${h === "$/kg" || h === "MOQ" || h === "Lead" ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map(row => (
                  <tr key={row.id} className={`hover:bg-muted/20 transition-colors ${!row.included_in_market_intelligence ? "opacity-40" : ""}`}>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{format(new Date(row.created_at), "MMM d, yyyy")}</td>
                    <td className="px-3 py-2 font-medium max-w-[130px] truncate">{row.category}</td>
                    <td className="px-3 py-2 text-muted-foreground capitalize">{row.product_format ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-semibold text-primary">${row.quoted_price.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{row.moq ? `${row.moq} kg` : "—"}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{row.lead_time_days ? `${row.lead_time_days}d` : "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.currency}</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${STAT[row.quote_status] ?? "bg-slate-100 text-slate-600"}`}>
                        {row.quote_status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${CONF[row.confidence_level] ?? ""}`}>
                        {row.confidence_level}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => toggleInclude(row.id, row.included_in_market_intelligence)}
                        className={`w-8 h-4 rounded-full transition-colors relative inline-flex items-center ${row.included_in_market_intelligence ? "bg-primary" : "bg-muted-foreground/30"}`}
                        title={row.included_in_market_intelligence ? "Included — click to exclude" : "Excluded — click to include"}
                      >
                        <span className={`w-3 h-3 rounded-full bg-white shadow absolute transition-transform ${row.included_in_market_intelligence ? "translate-x-4" : "translate-x-0.5"}`} />
                      </button>
                    </td>
                    <td className="px-3 py-2 min-w-[140px]">
                      {editingNotes[row.id] !== undefined ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editingNotes[row.id]}
                            onChange={e => setEditingNotes(prev => ({ ...prev, [row.id]: e.target.value }))}
                            className="flex-1 rounded border border-input bg-background px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === "Enter") saveNotes(row.id);
                              if (e.key === "Escape") setEditingNotes(prev => { const n = { ...prev }; delete n[row.id]; return n; });
                            }}
                          />
                          <button type="button" onClick={() => saveNotes(row.id)} className="text-primary text-[10px] font-semibold">Save</button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingNotes(prev => ({ ...prev, [row.id]: row.admin_notes ?? "" }))}
                          className="text-left max-w-[130px] truncate block hover:text-foreground text-muted-foreground"
                          title={row.admin_notes ?? "Click to add notes"}
                        >
                          {row.admin_notes || <span className="italic opacity-40">Add notes…</span>}
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground max-w-[110px] truncate">{row.operator_name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > LIMIT && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total.toLocaleString()}
              </p>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="outline" disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── SiteControlsTab ─────────────────────────────────────────────────────────

type SiteSettingKey = "marketplace_locked" | "market_intelligence_locked" | "blog_locked";

interface AdminSiteSettings {
  marketplace_locked: boolean;
  market_intelligence_locked: boolean;
  blog_locked: boolean;
}

interface ScheduledReportSettings {
  enabled: boolean;
  cadence: "weekly" | "monthly";
}

function SiteControlsTab() {
  const [settings, setSettings] = useState<AdminSiteSettings | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const [reportSettings, setReportSettings] = useState<ScheduledReportSettings | null>(null);
  const [savingReport, setSavingReport] = useState(false);

  useEffect(() => {
    api("/admin/site-settings").then(setSettings).catch(console.error);
    api("/admin/scheduled-report-settings").then(setReportSettings).catch(console.error);
  }, []);

  const toggle = async (key: SiteSettingKey) => {
    if (!settings) return;
    const newVal = !settings[key];
    setSaving(key);
    try {
      await api(`/admin/site-settings/${key}`, "PATCH", { value: newVal });
      setSettings((s) => s ? { ...s, [key]: newVal } : s);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(null);
    }
  };

  const saveReportSettings = async (patch: Partial<ScheduledReportSettings>) => {
    if (!reportSettings) return;
    const next = { ...reportSettings, ...patch };
    setSavingReport(true);
    try {
      await api("/admin/scheduled-report-settings", "PATCH", patch);
      setReportSettings(next);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingReport(false);
    }
  };

  const locks: { key: SiteSettingKey; label: string; desc: string }[] = [
    { key: "marketplace_locked", label: "Product Market", desc: "Lock the /product-market page" },
    { key: "market_intelligence_locked", label: "Market Intelligence", desc: "Lock the /market-intelligence page" },
    { key: "blog_locked", label: "Blog", desc: "Lock the /blog page" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-1">Site Controls</h2>
        <p className="text-sm text-muted-foreground">Lock public-facing pages. Locked pages show a maintenance notice to all visitors.</p>
      </div>
      {!settings ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : (
        <div className="space-y-3">
          {locks.map(({ key, label, desc }) => {
            const locked = settings[key];
            return (
              <Card key={key}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {locked ? <Lock className="w-5 h-5 text-destructive" /> : <Unlock className="w-5 h-5 text-primary" />}
                    <div>
                      <p className="font-medium text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={locked ? "destructive" : "outline"}
                    disabled={saving === key}
                    onClick={() => toggle(key)}
                  >
                    {locked ? "Unlock" : "Lock"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-1">Scheduled Market Intelligence Reports</h2>
        <p className="text-sm text-muted-foreground">
          Automatically generate and email a market intelligence snapshot to the admin address on a set cadence.
          Reports are sent every Monday (weekly) or on the 1st of each month (monthly) at 07:00 UTC.
        </p>
      </div>
      {!reportSettings ? (
        <div className="space-y-3"><Skeleton className="h-24" /></div>
      ) : (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Calendar className={`w-5 h-5 ${reportSettings.enabled ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <p className="font-medium text-sm">Scheduled Reports</p>
                  <p className="text-xs text-muted-foreground">
                    {reportSettings.enabled
                      ? `Enabled — sending ${reportSettings.cadence} reports to the configured admin address`
                      : "Disabled — no scheduled emails will be sent"}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant={reportSettings.enabled ? "destructive" : "outline"}
                disabled={savingReport}
                onClick={() => saveReportSettings({ enabled: !reportSettings.enabled })}
              >
                {savingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : reportSettings.enabled ? "Disable" : "Enable"}
              </Button>
            </div>

            <div className="flex items-center gap-3 pt-1 border-t">
              <TrendingUp className="w-4 h-4 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground">Cadence</p>
              <div className="flex gap-2 ml-auto">
                {(["weekly", "monthly"] as const).map((c) => (
                  <Button
                    key={c}
                    size="sm"
                    variant={reportSettings.cadence === c ? "default" : "outline"}
                    disabled={savingReport || !reportSettings.enabled}
                    onClick={() => saveReportSettings({ cadence: c })}
                  >
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── BlogAdminTab ─────────────────────────────────────────────────────────────

interface AdminBlogPost {
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

const BLOG_CATEGORIES = ["Industry News", "Case Study", "Regulatory", "Technology", "Company News"];

function autoSlug(title: string): string {
  return title.toLowerCase().trim()
    .replace(/[àâä]/g, "a").replace(/[éèêë]/g, "e").replace(/[îï]/g, "i")
    .replace(/[ôö]/g, "o").replace(/[ùûü]/g, "u").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function blogPostDisplayStatus(p: AdminBlogPost): "draft" | "published" | "scheduled" | "archived" {
  if (p.status === "archived") return "archived";
  if (p.status === "published" && p.published_at) {
    return new Date(p.published_at) <= new Date() ? "published" : "scheduled";
  }
  return "draft";
}

const emptyPost = {
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

function BlogAdminTab() {
  const [posts, setPosts] = useState<AdminBlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyPost);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "published" | "scheduled" | "draft" | "archived">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "az">("newest");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPosts = posts
    .filter(p => {
      const ds = blogPostDisplayStatus(p);
      const statusOk = filterStatus === "all" || ds === filterStatus;
      const categoryOk =
        filterCategory === "all" ||
        (filterCategory === "__none" && !p.category) ||
        p.category === filterCategory;
      const q = searchQuery.trim().toLowerCase();
      const searchOk =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.body.toLowerCase().includes(q) ||
        (p.seo_description ?? "").toLowerCase().includes(q) ||
        (p.author ?? "").toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q));
      return statusOk && categoryOk && searchOk;
    })
    .sort((a, b) => {
      if (sortOrder === "az") return a.title.localeCompare(b.title);
      const aTime = a.published_at ? new Date(a.published_at).getTime() : new Date(a.created_at).getTime();
      const bTime = b.published_at ? new Date(b.published_at).getTime() : new Date(b.created_at).getTime();
      return sortOrder === "newest" ? bTime - aTime : aTime - bTime;
    });

  const uploadCoverImage = async (file: File) => {
    setCoverUploading(true);
    try {
      const res = await fetch(`${BASE}/api/admin/blog/upload-image`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Upload failed (${res.status})`);
      }
      const data = await res.json() as { url: string };
      setForm(f => ({ ...f, cover_image_url: `${BASE}${data.url}` }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Image upload failed. Please try again.");
    } finally {
      setCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const load = () => {
    setLoading(true);
    api("/admin/blog").then(setPosts).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditId(null);
    setForm(emptyPost);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (p: AdminBlogPost) => {
    setEditId(p.id);
    const pdt = p.published_at
      ? new Date(p.published_at).toISOString().slice(0, 16)
      : "";
    setForm({
      title: p.title,
      slug: p.slug,
      slugCustomized: true,
      body: p.body,
      seo_description: p.seo_description ?? "",
      cover_image_url: p.cover_image_url ?? "",
      category: p.category ?? "",
      author: p.author ?? "",
      tagsInput: (p.tags ?? []).join(", "),
      status: p.status,
      publishDateTime: pdt,
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setFormError("Title is required."); return; }
    if (!form.body.trim()) { setFormError("Body is required."); return; }
    setSaving(true);
    setFormError(null);
    try {
      let publishedAt: string | null = null;
      if (form.publishDateTime) {
        const d = new Date(form.publishDateTime);
        publishedAt = !isNaN(d.getTime()) ? d.toISOString() : null;
      }
      const tags = form.tagsInput
        .split(",")
        .map(t => t.trim())
        .filter(Boolean);
      const payload = {
        title: form.title,
        slug: form.slug,
        body: form.body,
        seo_description: form.seo_description || null,
        cover_image_url: form.cover_image_url || null,
        category: form.category || null,
        author: form.author || null,
        tags,
        status: form.status,
        published_at: publishedAt,
      };
      if (editId) {
        await api(`/admin/blog/${editId}`, "PUT", payload);
      } else {
        await api("/admin/blog", "POST", payload);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatus = async (p: AdminBlogPost, newStatus: "draft" | "published" | "archived") => {
    try {
      const payload: Record<string, unknown> = { status: newStatus };
      if (newStatus === "published" && !p.published_at) {
        payload.published_at = new Date().toISOString();
      }
      if (newStatus === "draft") {
        payload.published_at = null;
      }
      await api(`/admin/blog/${p.id}`, "PUT", payload);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this post permanently? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await api(`/admin/blog/${id}`, "DELETE");
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(null);
    }
  };

  if (showForm) {
    return (
      <div className="space-y-4 max-w-2xl">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>← Back</Button>
          <h2 className="text-lg font-semibold">{editId ? "Edit Article" : "New Article"}</h2>
        </div>
        {formError && (
          <div className="bg-destructive/10 text-destructive text-sm rounded px-3 py-2 border border-destructive/20">{formError}</div>
        )}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Title <span className="text-destructive">*</span></label>
            <input
              className="w-full mt-1 border rounded px-3 py-2 text-sm"
              value={form.title}
              onChange={e => {
                const title = e.target.value;
                setForm(f => ({
                  ...f,
                  title,
                  slug: f.slugCustomized ? f.slug : autoSlug(title),
                }));
              }}
              placeholder="Article title"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Slug <span className="text-muted-foreground font-normal text-xs">(auto-generated; edit to override)</span></label>
            <input
              className="w-full mt-1 border rounded px-3 py-2 text-sm font-mono"
              value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: e.target.value, slugCustomized: true }))}
              placeholder="article-url-slug"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                className="w-full mt-1 border rounded px-3 py-2 text-sm"
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as "draft" | "published" | "archived" }))}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">
                Publish Date &amp; Time
                <span className="text-muted-foreground font-normal text-xs ml-1">
                  {form.status === "published" ? "(leave empty to publish immediately)" : "(optional)"}
                </span>
              </label>
              <input
                type="datetime-local"
                className="w-full mt-1 border rounded px-3 py-2 text-sm"
                value={form.publishDateTime}
                onChange={e => setForm(f => ({ ...f, publishDateTime: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Category</label>
              <select
                className="w-full mt-1 border rounded px-3 py-2 text-sm"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              >
                <option value="">— None —</option>
                {BLOG_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Author</label>
              <input
                className="w-full mt-1 border rounded px-3 py-2 text-sm"
                value={form.author}
                onChange={e => setForm(f => ({ ...f, author: e.target.value }))}
                placeholder="e.g. Jane Smith"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Tags <span className="text-muted-foreground font-normal text-xs">(comma-separated)</span></label>
            <input
              className="w-full mt-1 border rounded px-3 py-2 text-sm"
              value={form.tagsInput}
              onChange={e => setForm(f => ({ ...f, tagsInput: e.target.value }))}
              placeholder="e.g. pharma, freeze-drying, GMP"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Featured Image <span className="text-muted-foreground font-normal text-xs">(optional)</span></label>
            <div className="flex gap-2 mt-1">
              <input
                className="flex-1 border rounded px-3 py-2 text-sm"
                value={form.cover_image_url}
                onChange={e => setForm(f => ({ ...f, cover_image_url: e.target.value }))}
                placeholder="https://example.com/image.jpg or upload below"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={coverUploading}
                onClick={() => coverInputRef.current?.click()}
              >
                {coverUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <span className="ml-1">{coverUploading ? "Uploading…" : "Upload"}</span>
              </Button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadCoverImage(f); }}
              />
            </div>
            {form.cover_image_url && (
              <div className="mt-2 relative">
                <img
                  src={form.cover_image_url}
                  alt="Cover preview"
                  className="h-32 w-full object-cover rounded border"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, cover_image_url: "" }))}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/80"
                  title="Remove image"
                >
                  ×
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Excerpt / SEO Description</label>
            <input className="w-full mt-1 border rounded px-3 py-2 text-sm" value={form.seo_description} onChange={e => setForm(f => ({ ...f, seo_description: e.target.value }))} placeholder="Short summary shown on the blog listing and in search results" />
          </div>
          <div>
            <label className="text-sm font-medium">Body (Markdown) <span className="text-destructive">*</span></label>
            <textarea className="w-full mt-1 border rounded px-3 py-2 text-sm font-mono h-64 resize-y" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Write your article content in Markdown…" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving || !form.title.trim() || !form.slug.trim()}>
              {saving ? "Saving…" : editId ? "Save Changes" : "Create Post"}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Blog CMS</h2>
          <p className="text-sm text-muted-foreground">
            {filteredPosts.length}{filteredPosts.length !== posts.length ? ` of ${posts.length}` : ""} article{filteredPosts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button size="sm" onClick={openNew} className="gap-1"><Plus className="w-4 h-4" /> New Article</Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 pb-1 border-b">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <input
            type="search"
            placeholder="Search posts…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-7 w-48 rounded border border-input bg-background px-2.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#0F6E56]"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</span>
          {(["all", "published", "scheduled", "draft", "archived"] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filterStatus === s
                  ? "bg-[#0F6E56] text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</span>
          {(["all", ...BLOG_CATEGORIES, "__none"] as const).map(c => (
            <button
              key={c}
              onClick={() => setFilterCategory(c)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filterCategory === c
                  ? "bg-[#0F6E56] text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {c === "all" ? "All" : c === "__none" ? "No category" : c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sort</span>
          {([
            { value: "newest", label: "Newest first" },
            { value: "oldest", label: "Oldest first" },
            { value: "az",     label: "A \u2192 Z" },
          ] as const).map(opt => (
            <button
              key={opt.value}
              onClick={() => setSortOrder(opt.value)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                sortOrder === opt.value
                  ? "bg-[#0F6E56] text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {posts.length === 0 ? "No articles yet. Create your first post." : "No posts match the selected filters."}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPosts.map(p => {
            const ds = blogPostDisplayStatus(p);
            return (
              <Card key={p.id}>
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  {/* Cover thumbnail */}
                  <div className="shrink-0">
                    {p.cover_image_url ? (
                      <img
                        src={p.cover_image_url}
                        alt=""
                        className="w-16 h-12 object-cover rounded border"
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-16 h-12 rounded border border-dashed bg-muted flex items-center justify-center">
                        <span className="text-[9px] text-muted-foreground text-center leading-tight px-1">No image</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate max-w-xs">{p.title}</span>
                      {ds === "published" && <Badge className="text-[10px] bg-green-100 text-green-700 border-0 shrink-0">Published</Badge>}
                      {ds === "scheduled" && <Badge className="text-[10px] bg-blue-100 text-blue-700 border-0 shrink-0">Scheduled</Badge>}
                      {ds === "draft" && <Badge variant="secondary" className="text-[10px] shrink-0">Draft</Badge>}
                      {ds === "archived" && <Badge className="text-[10px] bg-gray-100 text-gray-600 border-0 shrink-0">Archived</Badge>}
                      {p.category && (
                        <Badge variant="outline" className="text-[10px] text-teal-700 border-teal-200 bg-teal-50 shrink-0">{p.category}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">/blog/{p.slug}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {p.author && <span className="text-xs text-muted-foreground">by {p.author}</span>}
                      {p.published_at && (
                        <span className="text-xs text-muted-foreground">
                          {ds === "scheduled" ? "Scheduled: " : "Published: "}
                          {format(new Date(p.published_at), "MMM d, yyyy HH:mm")}
                        </span>
                      )}
                    </div>
                    {p.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-1">
                        {p.tags.slice(0, 5).map(tag => (
                          <span key={tag} className="text-[10px] bg-muted text-muted-foreground rounded px-1.5 py-0.5">{tag}</span>
                        ))}
                        {p.tags.length > 5 && <span className="text-[10px] text-muted-foreground">+{p.tags.length - 5}</span>}
                      </div>
                    )}
                    {p.seo_description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{p.seo_description}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0 items-end">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(p)} title="Edit"><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} disabled={deleting === p.id} className="text-destructive hover:text-destructive" title="Delete"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                    <div className="flex gap-1">
                      {(ds === "draft" || ds === "archived") && (
                        <Button variant="outline" size="sm" className="text-[10px] h-6 px-2" onClick={() => handleQuickStatus(p, "published")}>Publish</Button>
                      )}
                      {(ds === "published" || ds === "scheduled") && (
                        <Button variant="outline" size="sm" className="text-[10px] h-6 px-2" onClick={() => handleQuickStatus(p, "draft")}>Unpublish</Button>
                      )}
                      {ds !== "archived" && (
                        <Button variant="outline" size="sm" className="text-[10px] h-6 px-2 text-muted-foreground" onClick={() => handleQuickStatus(p, "archived")}>Archive</Button>
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

// ─── Tab: Manufacturers ───────────────────────────────────────────────────────

type MfrFormData = {
  name: string; tagline: string; description: string; website_url: string; logo_url: string;
  country: string; city: string; founded_year: string; specialties: string[]; market_focus: string[];
  certifications: string[]; production_capabilities: string; contact_name: string;
  contact_email: string; phone: string; active: boolean; featured: boolean;
};

const emptyMfrForm = (): MfrFormData => ({
  name: "", tagline: "", description: "", website_url: "", logo_url: "", country: "", city: "",
  founded_year: "", specialties: [], market_focus: [], certifications: [], production_capabilities: "",
  contact_name: "", contact_email: "", phone: "", active: true, featured: false,
});

function mfrToForm(m: Manufacturer): MfrFormData {
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

function ManufacturersTab() {
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

function MapTab() {
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

interface CapacityListing {
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

interface ProductListing {
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

type UnifiedListing = CapacityListing | ProductListing;

function ListingsCRUDTab() {
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

interface MachineryListing {
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

const MACHINERY_CATEGORIES = ["dryer", "chamber", "shelf", "condenser", "pump", "part", "other"] as const;
const MACHINERY_STATUSES = ["active", "pending", "sold", "inactive"] as const;
const MACHINERY_CONDITIONS = ["new", "refurbished", "used"] as const;

type MachFormData = {
  title: string; category: string; listing_status: string; condition: string;
  description: string; price: string; currency: string; manufacturer_name: string;
  model_number: string; year_manufactured: string;
  tech_key: string; tech_val: string; technical_specs: Record<string, string>;
  contact_name: string; contact_email: string; phone: string;
  operator_id: string;
};

const emptyMachForm = (): MachFormData => ({
  title: "", category: "other", listing_status: "active", condition: "used",
  description: "", price: "", currency: "CAD", manufacturer_name: "",
  model_number: "", year_manufactured: "", tech_key: "", tech_val: "",
  technical_specs: {}, contact_name: "", contact_email: "", phone: "", operator_id: "",
});

function machToForm(m: MachineryListing): MachFormData {
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

function MachineryListingsTab() {
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

interface AdminListing {
  id: number;
  type: "capacity" | "product";
  operator_name: string;
  title: string;
  approval_status: string;
  approval_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface RawCapacityListing {
  id: number;
  equipment_type: string;
  operator_name?: string;
  approval_status: string;
  approval_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface RawProductListing {
  id: number;
  name: string;
  operator_name?: string;
  approval_status: string;
  approval_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface ListingsApiResponse {
  capacity: RawCapacityListing[];
  products: RawProductListing[];
}

function flattenListings(data: ListingsApiResponse): AdminListing[] {
  const cap: AdminListing[] = (data.capacity ?? []).map((l) => ({
    id: l.id,
    type: "capacity" as const,
    operator_name: l.operator_name ?? "Unknown",
    title: l.equipment_type,
    approval_status: l.approval_status,
    approval_reason: l.approval_reason,
    created_at: l.created_at,
    updated_at: l.updated_at,
  }));
  const prod: AdminListing[] = (data.products ?? []).map((p) => ({
    id: p.id,
    type: "product" as const,
    operator_name: p.operator_name ?? "Unknown",
    title: p.name,
    approval_status: p.approval_status,
    approval_reason: p.approval_reason,
    created_at: p.created_at,
    updated_at: p.updated_at,
  }));
  return [...cap, ...prod].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

function isResubmission(listing: AdminListing): boolean {
  const created = new Date(listing.created_at).getTime();
  const updated = new Date(listing.updated_at).getTime();
  return listing.approval_status === "pending" && updated - created > 30_000;
}

function ListingsApprovalTab() {
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [actionId, setActionId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = () => {
    setLoading(true);
    api("/admin/listings")
      .then((data: ListingsApiResponse) => setListings(flattenListings(data)))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const approve = async (listing: AdminListing) => {
    setActionId(listing.id);
    try {
      await api(`/admin/listings/${listing.type}/${listing.id}/approve`, "PATCH");
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setActionId(null);
    }
  };

  const reject = async (listing: AdminListing) => {
    setActionId(listing.id);
    try {
      await api(`/admin/listings/${listing.type}/${listing.id}/reject`, "PATCH", { reason: rejectReason });
      setRejectId(null);
      setRejectReason("");
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setActionId(null);
    }
  };

  const filtered = listings.filter(l => filter === "all" || l.approval_status === filter);

  const statusBadge = (status: string) => {
    if (status === "approved") return <Badge className="text-[10px] bg-green-100 text-green-700">Approved</Badge>;
    if (status === "rejected") return <Badge className="text-[10px] bg-red-100 text-red-700">Rejected</Badge>;
    return <Badge className="text-[10px] bg-yellow-100 text-yellow-700">Pending</Badge>;
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold mb-1">Listings Approval</h2>
        <p className="text-sm text-muted-foreground">Review and approve operator capacity and product listings.</p>
      </div>
      <div className="flex gap-2">
        {(["all", "pending", "approved", "rejected"] as const).map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">{f}</Button>
        ))}
      </div>
      {loading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No {filter === "all" ? "" : filter} listings.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(listing => (
            <Card key={`${listing.type}-${listing.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-medium text-sm">{listing.title}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">{listing.type}</Badge>
                      {statusBadge(listing.approval_status)}
                      {isResubmission(listing) && (
                        <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700 bg-amber-50">Resubmission</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {listing.operator_name} · {isResubmission(listing) ? "Resubmitted " : "Submitted "}{formatDistanceToNow(new Date(listing.updated_at), { addSuffix: true })}
                    </p>
                    {listing.approval_reason && <p className="text-xs text-destructive mt-1">Prev. rejection: {listing.approval_reason}</p>}
                  </div>
                  {listing.approval_status !== "approved" && listing.approval_status !== "rejected" ? (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="default" className="gap-1 bg-green-600 hover:bg-green-700" disabled={actionId === listing.id} onClick={() => approve(listing)}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1 text-destructive border-destructive hover:bg-destructive/10" disabled={actionId === listing.id} onClick={() => setRejectId(listing.id)}>
                        <XOctagon className="w-3.5 h-3.5" /> Reject
                      </Button>
                    </div>
                  ) : listing.approval_status === "approved" ? (
                    <Button size="sm" variant="outline" className="gap-1 text-destructive border-destructive hover:bg-destructive/10 shrink-0" disabled={actionId === listing.id} onClick={() => setRejectId(listing.id)}>
                      <XOctagon className="w-3.5 h-3.5" /> Reject
                    </Button>
                  ) : (
                    <Button size="sm" variant="default" className="gap-1 bg-green-600 hover:bg-green-700 shrink-0" disabled={actionId === listing.id} onClick={() => approve(listing)}>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                    </Button>
                  )}
                </div>
                {rejectId === listing.id && (
                  <div className="mt-3 flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-xs font-medium">Rejection reason <span className="text-destructive">*</span></label>
                      <input className="w-full mt-1 border rounded px-3 py-1.5 text-sm" value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="e.g. Missing certifications, incomplete information" />
                    </div>
                    <Button size="sm" variant="destructive" disabled={actionId === listing.id || !rejectReason.trim()} onClick={() => reject(listing)}>
                      {actionId === listing.id ? "…" : "Confirm"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setRejectId(null); setRejectReason(""); }}>Cancel</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Admin Layout + Page ──────────────────────────────────────────────────────

// ─── Tab: Reports ─────────────────────────────────────────────────────────────

interface ReportSnapshot {
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

const REPORT_TYPE_LABELS: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  custom: "Custom",
};

const CATEGORIES = ["Fruits","Vegetables","Nutraceuticals","Pet Food","Pharmaceutical","Probiotics","Herbs & Spices","Dairy","Mushrooms"];

function ReportsTab() {
  const [reports, setReports] = useState<ReportSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportSnapshot | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const reportPreviewRef = useRef<HTMLDivElement>(null);

  const [filterType, setFilterType] = useState<"weekly" | "monthly" | "custom">("monthly");
  const [filterDateFrom, setFilterDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [filterDateTo, setFilterDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [filterCategory, setFilterCategory] = useState("");
  const [filterOperator, setFilterOperator] = useState("");
  const [filterRegion, setFilterRegion] = useState("");
  const [filterManufacturer, setFilterManufacturer] = useState("");
  const [filterProductType, setFilterProductType] = useState("");
  const [filterListingType, setFilterListingType] = useState("");
  const [sortField, setSortField] = useState<"date" | "type">("date");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const loadReports = useCallback(() => {
    setLoading(true);
    api("/admin/reports")
      .then(setReports)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  const generateReport = async () => {
    setGenerating(true);
    try {
      const filters: Record<string, string> = {};
      if (filterCategory) filters.category = filterCategory;
      if (filterOperator) filters.operator = filterOperator;
      if (filterRegion) filters.region = filterRegion;
      if (filterManufacturer) filters.manufacturer = filterManufacturer;
      if (filterProductType) filters.product_type = filterProductType;
      if (filterListingType) filters.listing_type = filterListingType;

      const snap: ReportSnapshot = await api("/admin/reports/generate", "POST", {
        type: filterType,
        date_range_start: filterDateFrom,
        date_range_end: filterDateTo,
        filters: Object.keys(filters).length ? filters : undefined,
      });

      setReports((prev) => [snap, ...prev]);
      setSelectedReport(snap);
    } catch (err) {
      console.error(err);
      alert("Failed to generate report. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const loadAndView = async (id: number) => {
    try {
      const snap: ReportSnapshot = await api(`/admin/reports/${id}`);
      setSelectedReport(snap);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAndDownload = async (id: number) => {
    setDownloadingId(id);
    try {
      const snap: ReportSnapshot = await api(`/admin/reports/${id}`);
      setSelectedReport(snap);
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      await downloadPDF(snap, false);
    } catch (err) {
      console.error("Fetch and download failed", err);
      alert("Failed to download report. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  const downloadCSV = (report: ReportSnapshot) => {
    const d = report.data_json;
    if (!d) return;

    const rows: string[][] = [];
    const esc = (v: string | number) => {
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const row = (...cells: (string | number)[]) => rows.push(cells.map(esc));

    row("LyoDex Market Intelligence Report");
    row("Title", report.title);
    row("Period", `${format(new Date(report.date_range_start), "MMM d, yyyy")} – ${format(new Date(report.date_range_end), "MMM d, yyyy")}`);
    row("Generated by", report.generated_by_email);
    row("Generated at", format(new Date(report.generated_at), "MMM d, yyyy HH:mm"));
    row("");

    if (d.summary) {
      row("Summary");
      row(d.summary);
      row("");
    }

    if (d.sales_volume) {
      row("Sales Volume KPIs");
      row("Metric", "Value");
      row("Total Contracts", d.sales_volume.total_contracts);
      row("Total Volume (kg)", d.sales_volume.total_quantity_kg);
      row("Total Contract Value ($)", d.sales_volume.total_contract_value);
      row("Platform Fees ($)", d.sales_volume.platform_fees);
      row("");
    }

    if (d.avg_price_by_category?.length) {
      row("Avg Price by Category");
      row("Category", "Avg $/kg", "Data Points");
      for (const r of d.avg_price_by_category) row(r.category, r.avg_price, r.count);
      row("");
    }

    if (d.top_materials?.length) {
      row("Top Materials Requested");
      row("Material", "Request Count");
      for (const r of d.top_materials) row(r.name, r.value);
      row("");
    }

    if (d.requests_by_month?.length) {
      row("Requests by Month");
      row("Month", "Request Count");
      for (const r of d.requests_by_month) row(r.month, r.value);
      row("");
    }

    if (d.bids_by_month?.length) {
      row("Bids by Month");
      row("Month", "Bid Count");
      for (const r of d.bids_by_month) row(r.month, r.value);
      row("");
    }

    if (d.revenue_by_month?.length) {
      row("Platform Revenue by Month ($)");
      row("Month", "Revenue ($)");
      for (const r of d.revenue_by_month) row(r.month, r.value);
      row("");
    }

    if (d.operator_win_rates?.length) {
      row("Operator Win Rates");
      row("Operator", "Win Rate (%)");
      for (const r of d.operator_win_rates) row(r.name, r.win_rate);
      row("");
    }

    const csv = rows.map(r => r.join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${format(new Date(report.generated_at), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = async (report: ReportSnapshot, manageLoadingState = true) => {
    if (manageLoadingState) setDownloadingId(report.id);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: html2canvas } = await import("html2canvas");

      if (!reportPreviewRef.current) return;

      const canvas = await html2canvas(reportPreviewRef.current, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 36;
      const imgWidth = pageWidth - 2 * margin;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let y = margin;
      let remaining = imgHeight;
      let srcY = 0;
      const srcHeight = canvas.height;
      const srcWidth = canvas.width;

      while (remaining > 0) {
        const sliceHeight = Math.min(pageHeight - 2 * margin, remaining);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = srcWidth;
        sliceCanvas.height = (sliceHeight / imgWidth) * srcWidth;
        const ctx = sliceCanvas.getContext("2d")!;
        ctx.drawImage(canvas, 0, srcY, srcWidth, sliceCanvas.height, 0, 0, srcWidth, sliceCanvas.height);
        const sliceData = sliceCanvas.toDataURL("image/png");
        pdf.addImage(sliceData, "PNG", margin, y, imgWidth, sliceHeight);
        srcY += sliceCanvas.height;
        remaining -= sliceHeight;
        if (remaining > 0) { pdf.addPage(); y = margin; }
      }

      const filename = `${report.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${format(new Date(report.generated_at), "yyyy-MM-dd")}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error("PDF generation failed", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      if (manageLoadingState) setDownloadingId(null);
    }
  };

  const deleteReport = async (id: number) => {
    if (!confirm("Delete this report? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await api(`/admin/reports/${id}`, "DELETE");
      setReports((prev) => prev.filter((r) => r.id !== id));
      if (selectedReport?.id === id) setSelectedReport(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const sortedReports = [...reports].sort((a, b) => {
    let cmp = 0;
    if (sortField === "date") cmp = new Date(a.generated_at).getTime() - new Date(b.generated_at).getTime();
    else cmp = a.type.localeCompare(b.type);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const toggleSort = (field: "date" | "type") => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  };

  const noData = <div className="text-sm text-muted-foreground py-8 text-center">No data in this range.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Reports</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Generate, filter, download and store platform reports</p>
        </div>
      </div>

      {/* Generate new report */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Generate report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Type</p>
              <select value={filterType} onChange={e => setFilterType(e.target.value as "weekly" | "monthly" | "custom")}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom</option>
              </select>
            </div>
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
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Region</p>
              <input type="text" value={filterRegion} onChange={e => setFilterRegion(e.target.value)} placeholder="e.g. Canada"
                className="rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring w-28" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Operator</p>
              <input type="text" value={filterOperator} onChange={e => setFilterOperator(e.target.value)} placeholder="Operator name"
                className="rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring w-32" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Manufacturer</p>
              <input type="text" value={filterManufacturer} onChange={e => setFilterManufacturer(e.target.value)} placeholder="Manufacturer"
                className="rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring w-32" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Product type</p>
              <input type="text" value={filterProductType} onChange={e => setFilterProductType(e.target.value)} placeholder="e.g. Berries"
                className="rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring w-28" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Listing type</p>
              <select value={filterListingType} onChange={e => setFilterListingType(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">All listings</option>
                <option value="capacity">Capacity only</option>
                <option value="product">Product only</option>
              </select>
            </div>
          </div>
          <Button onClick={generateReport} disabled={generating || !filterDateFrom || !filterDateTo}>
            {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-2" />}
            {generating ? "Generating…" : "Generate Report"}
          </Button>
        </CardContent>
      </Card>

      {/* Report preview */}
      {selectedReport && selectedReport.data_json && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold">{selectedReport.title}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(new Date(selectedReport.date_range_start), "MMM d, yyyy")} – {format(new Date(selectedReport.date_range_end), "MMM d, yyyy")}
                {" · "}Generated by {selectedReport.generated_by_email} on {format(new Date(selectedReport.generated_at), "MMM d, yyyy")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => downloadCSV(selectedReport)}>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download CSV
              </Button>
              <Button size="sm" onClick={() => downloadPDF(selectedReport)} disabled={downloadingId === selectedReport.id}>
                {downloadingId === selectedReport.id
                  ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  : <FileDown className="w-3.5 h-3.5 mr-1.5" />}
                Download PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div ref={reportPreviewRef} className="bg-white space-y-6 p-2">
              {selectedReport.data_json.summary && (
                <p className="text-sm text-muted-foreground border-l-4 border-primary pl-3">{selectedReport.data_json.summary}</p>
              )}

              {/* Sales volume KPIs */}
              {selectedReport.data_json.sales_volume && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Contracts", value: selectedReport.data_json.sales_volume.total_contracts.toLocaleString() },
                    { label: "Volume (kg)", value: selectedReport.data_json.sales_volume.total_quantity_kg.toLocaleString() },
                    { label: "Contract value", value: fmt(selectedReport.data_json.sales_volume.total_contract_value) },
                    { label: "Platform fees", value: fmt(selectedReport.data_json.sales_volume.platform_fees) },
                  ].map(s => (
                    <div key={s.label} className="rounded border p-3 text-center">
                      <div className="text-lg font-bold text-primary">{s.value}</div>
                      <div className="text-xs text-muted-foreground">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Requests by month */}
                {selectedReport.data_json.requests_by_month && selectedReport.data_json.requests_by_month.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Requests over period</p>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={selectedReport.data_json.requests_by_month}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="value" name="Requests" fill="#0F6E56" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Bids by month */}
                {selectedReport.data_json.bids_by_month && selectedReport.data_json.bids_by_month.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Bids by month</p>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={selectedReport.data_json.bids_by_month}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="value" name="Bids" fill="#0F6E56" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Revenue by month */}
                {selectedReport.data_json.revenue_by_month && selectedReport.data_json.revenue_by_month.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Platform revenue (9% fees)</p>
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={selectedReport.data_json.revenue_by_month}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} />
                        <Tooltip formatter={(v: number) => fmt(v)} />
                        <Line type="monotone" dataKey="value" name="Revenue" stroke="#0F6E56" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Top materials */}
              {selectedReport.data_json.top_materials && selectedReport.data_json.top_materials.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Top materials requested</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={selectedReport.data_json.top_materials}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="value" name="Requests" fill="#6366f1" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Avg price by category */}
              {selectedReport.data_json.avg_price_by_category && selectedReport.data_json.avg_price_by_category.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Avg price by category ($/kg)</p>
                  <div className="overflow-x-auto rounded border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/30 border-b">
                        <tr>
                          <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Category</th>
                          <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Avg $/kg</th>
                          <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Data points</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedReport.data_json.avg_price_by_category.map(r => (
                          <tr key={r.category}>
                            <td className="px-3 py-2 font-medium">{r.category}</td>
                            <td className="px-3 py-2 text-right text-primary font-semibold">${r.avg_price.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right text-muted-foreground">{r.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Operator win rates */}
              {selectedReport.data_json.operator_win_rates && selectedReport.data_json.operator_win_rates.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Operator win rates</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={selectedReport.data_json.operator_win_rates} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={80} />
                      <Tooltip formatter={(v: number) => `${v}%`} />
                      <Bar dataKey="win_rate" name="Win rate" fill="#f59e0b" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Report history ({reports.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileDown className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No reports generated yet.</p>
              <p className="text-xs mt-1">Use the form above to generate your first report.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap text-xs">Title</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap text-xs">
                      <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => toggleSort("type")}>
                        Type {sortField === "type" ? (sortDir === "asc" ? "↑" : "↓") : <span className="opacity-30">↕</span>}
                      </button>
                    </th>
                    <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap text-xs">Date range</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap text-xs">
                      <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => toggleSort("date")}>
                        Generated {sortField === "date" ? (sortDir === "asc" ? "↑" : "↓") : <span className="opacity-30">↕</span>}
                      </button>
                    </th>
                    <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap text-xs">By</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedReports.map((r) => (
                    <tr key={r.id} className={`hover:bg-muted/20 transition-colors ${selectedReport?.id === r.id ? "bg-primary/5" : ""}`}>
                      <td className="px-3 py-2.5 font-medium max-w-[200px] truncate">{r.title}</td>
                      <td className="px-3 py-2.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary">
                          {REPORT_TYPE_LABELS[r.type] ?? r.type}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs whitespace-nowrap">
                        {format(new Date(r.date_range_start), "MMM d")} – {format(new Date(r.date_range_end), "MMM d, yyyy")}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs whitespace-nowrap">
                        {format(new Date(r.generated_at), "MMM d, yyyy HH:mm")}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs max-w-[120px] truncate">{r.generated_by_email}</td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                            onClick={() => loadAndView(r.id)}>
                            View
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                            onClick={() => fetchAndDownload(r.id)}
                            disabled={downloadingId === r.id}>
                            {downloadingId === r.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <FileDown className="w-3 h-3" />}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                            onClick={() => deleteReport(r.id)}
                            disabled={deletingId === r.id}>
                            {deletingId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type Tab = "overview" | "traffic" | "benchmarks" | "observations" | "newsletter" | "users" | "operators" | "requests" | "transactions" | "insights" | "messages" | "disputes" | "audit" | "price-data" | "site-controls" | "blog" | "listings" | "machinery" | "listings-approval" | "manufacturers" | "map" | "reports";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
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

export default function AdminPanel() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      setLocation("/");
    }
  }, [user, loading, setLocation]);

  useEffect(() => {
    if (user?.role === "admin") {
      api("/admin/overview")
        .then(setOverview)
        .catch(console.error)
        .finally(() => setOverviewLoading(false));

      api("/admin/system-alerts")
        .then(setSystemAlerts)
        .catch(console.error);
    }
  }, [user]);

  const dismissSystemAlert = useCallback(async (id: number) => {
    try {
      await api(`/admin/system-alerts/${id}/dismiss`, "POST");
      setSystemAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error("Failed to dismiss alert", err);
    }
  }, []);

  if (loading || !user) return null;
  if (user.role !== "admin") return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Admin topbar */}
      <div className="border-b bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 max-w-7xl flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm tracking-tight">LyoDex Admin</span>
            <Badge variant="secondary" className="text-[10px] uppercase">Control panel</Badge>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <span className="text-sm text-muted-foreground hidden sm:block">{user.name}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 container mx-auto max-w-7xl px-4">
        {/* Sidebar */}
        <aside className="w-48 shrink-0 py-6 pr-6 border-r hidden md:block">
          <nav className="space-y-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                  tab === t.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <t.icon className="w-4 h-4 shrink-0" />
                {t.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile tab bar */}
        <div className="md:hidden w-full overflow-x-auto pt-3 pb-1 flex gap-1 border-b mb-4 col-span-full">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Main content */}
        <main className="flex-1 py-6 md:pl-8 overflow-x-auto min-w-0">
          <SystemAlertBanner alerts={systemAlerts} onDismiss={dismissSystemAlert} />
          {tab === "overview" && <OverviewTab overview={overview} loading={overviewLoading} />}
          {tab === "traffic" && <TrafficTab />}
          {tab === "observations" && <ObservationsTab />}
          {tab === "benchmarks" && <BenchmarksTab />}
          {tab === "newsletter" && <NewsletterTab />}
          {tab === "users" && <UsersTab />}
          {tab === "operators" && <OperatorsTab />}
          {tab === "manufacturers" && <ManufacturersTab />}
          {tab === "listings" && <ListingsCRUDTab />}
          {tab === "machinery" && <MachineryListingsTab />}
          {tab === "listings-approval" && <ListingsApprovalTab />}
          {tab === "map" && <MapTab />}
          {tab === "requests" && <RequestsTab />}
          {tab === "transactions" && <TransactionsTab />}
          {tab === "insights" && <InsightsTab />}
          {tab === "reports" && <ReportsTab />}
          {tab === "price-data" && <PriceDataTab />}
          {tab === "messages" && <MessagesTab />}
          {tab === "disputes" && <DisputesTab />}
          {tab === "audit" && <AuditLogTab />}
          {tab === "site-controls" && <SiteControlsTab />}
          {tab === "blog" && <BlogAdminTab />}
        </main>
      </div>
    </div>
  );
}
