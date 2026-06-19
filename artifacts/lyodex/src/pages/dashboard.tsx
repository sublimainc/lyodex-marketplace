import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import {
  Users, FileText, CheckSquare, TrendingUp, Activity,
  ChevronDown, ChevronUp, Package, Briefcase, ArrowRight,
  Plus, BarChart2, Clock, DollarSign, ListChecks, CreditCard, BadgeCheck, MessageSquare,
  ShieldCheck, AlertCircle, Truck, Zap, CheckCircle2, X, CalendarDays, FlaskConical,
  Pencil, Save, Eye, ExternalLink,
} from "lucide-react";
import { OperatorCard } from "@/components/operator-card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetDashboardSummary, useGetRecentActivity } from "@workspace/api-client-react";
import { formatDistanceToNow, format } from "date-fns";
import { useLanguage } from "@/lib/i18n";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Shared helpers ────────────────────────────────────────────────────────────

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  pending: "secondary",
  active: "default",
  completed: "outline",
  accepted: "default",
  rejected: "destructive",
};

function StatusBadge({ status }: { status: string }) {
  const variant: BadgeVariant = STATUS_VARIANT[status] ?? "secondary";
  return <Badge variant={variant} className="text-[10px] uppercase tracking-wider">{status}</Badge>;
}

// ─── Buyer Dashboard ───────────────────────────────────────────────────────────

interface BidItem {
  id: number;
  operator_name: string;
  price_per_kg: number;
  turnaround_days: number;
  status: string;
  notes?: string | null;
  escrow_status: string;
  escrow_amount_cents?: number | null;
  created_at: string;
}

interface RequestWithBids {
  id: number;
  material_type: string;
  quantity_kg: number;
  deadline: string;
  budget_per_kg?: number | null;
  status: string;
  bid_count: number;
  unread_message_count: number;
  created_at: string;
  bids: BidItem[];
}

interface BuyerData {
  requests: RequestWithBids[];
  stats: {
    total_requests: number;
    active_requests: number;
    completed_requests: number;
    total_bids_received: number;
    total_spend: number;
  };
}

function BuyerDashboard() {
  const { t } = useLanguage();
  const d = t.dashboard;
  const [data, setData] = useState<BuyerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [releasingEscrow, setReleasingEscrow] = useState<Record<number, boolean>>({});
  const [escrowNotice, setEscrowNotice] = useState<{ type: "success" | "error" | "pending"; msg?: string } | null>(null);

  const fetchData = () => {
    setLoading(true);
    fetch(`${BASE}/api/dashboard/buyer`, { credentials: "include" })
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    const sp = new URLSearchParams(window.location.search);
    window.history.replaceState({}, "", window.location.pathname);
    if (sp.get("escrow_pending") === "1") {
      setEscrowNotice({ type: "pending" });
    } else if (sp.get("escrow_cancelled") === "1") {
      setEscrowNotice({ type: "error", msg: "Escrow payment cancelled. You can retry from the request page." });
    }
  }, []);

  const toggle = (id: number) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const releaseEscrow = async (bidId: number) => {
    setReleasingEscrow((p) => ({ ...p, [bidId]: true }));
    try {
      const res = await fetch(`${BASE}/api/bids/${bidId}/complete`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to release escrow");
      setEscrowNotice({ type: "success", msg: `Funds released. Operator receives $${json.operator_payout?.toLocaleString("en-CA", { minimumFractionDigits: 2 })} CAD.` });
      fetchData();
    } catch (err: any) {
      setEscrowNotice({ type: "error", msg: err.message });
    } finally {
      setReleasingEscrow((p) => ({ ...p, [bidId]: false }));
    }
  };

  const stats = data?.stats;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">{d.buyerTitle}</h1>
          <p className="text-muted-foreground">{d.buyerSubtitle}</p>
        </div>
        <Link href="/request">
          <Button className="gap-2 shrink-0"><Plus className="w-4 h-4" /> {d.newRequest}</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: d.totalRequests, value: stats?.total_requests ?? "—", icon: FileText },
          { label: d.active, value: stats?.active_requests ?? "—", icon: Activity },
          { label: d.bidsReceived, value: stats?.total_bids_received ?? "—", icon: Briefcase },
          { label: d.totalSpend, value: stats?.total_spend != null ? `$${stats.total_spend.toLocaleString()}` : "—", icon: DollarSign },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-7 w-14" /> : <div className="text-2xl font-bold">{s.value}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Escrow notices */}
      {escrowNotice?.type === "pending" && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold">Awaiting escrow confirmation.</span> Your payment is being processed by Stripe. Once confirmed, funds will be held securely until you mark the project complete.
          </div>
        </div>
      )}
      {escrowNotice?.type === "success" && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <BadgeCheck className="w-4 h-4 mt-0.5 shrink-0" />
          <div><span className="font-semibold">Escrow released.</span> {escrowNotice.msg}</div>
        </div>
      )}
      {escrowNotice?.type === "error" && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>{escrowNotice.msg}</div>
        </div>
      )}

      {/* Requests with expandable bids */}
      <h2 className="text-lg font-semibold mb-4">{d.yourRequests}</h2>
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : data?.requests.length === 0 ? (
        <div className="text-center py-16 border rounded-xl bg-muted/10">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <h3 className="font-semibold mb-2">{d.noRequestsTitle}</h3>
          <p className="text-muted-foreground text-sm mb-4">{d.noRequestsDesc}</p>
          <Link href="/request"><Button>{d.postRequest}</Button></Link>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.requests.map((req) => (
            <div key={req.id} className="rounded-xl border bg-card overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 gap-4">
                <Link href={`/requests/${req.id}`} className="flex-1 min-w-0 group">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold group-hover:text-primary transition-colors">{req.material_type}</span>
                    <StatusBadge status={req.status} />
                  </div>
                  <div className="text-sm text-muted-foreground flex flex-wrap gap-4">
                    <span>{req.quantity_kg} kg</span>
                    <span>{d.due} {req.deadline}</span>
                    {req.budget_per_kg && <span>${req.budget_per_kg}{d.kgBudget}</span>}
                    <span className="text-xs">{formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}</span>
                  </div>
                </Link>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-center">
                    <div className="text-xl font-bold text-primary">{req.bids.length}</div>
                    <div className="text-[10px] uppercase text-muted-foreground">{d.bids}</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-xl font-bold flex items-center justify-center gap-0.5 ${req.unread_message_count > 0 ? "text-primary" : "text-muted-foreground"}`}>
                      <MessageSquare className="w-4 h-4" />{req.unread_message_count}
                    </div>
                    <div className="text-[10px] uppercase text-muted-foreground">{d.unread}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggle(req.id)}
                      className="gap-1"
                      disabled={req.bids.length === 0}
                    >
                      {expanded[req.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {req.bids.length === 0 ? d.noBids : expanded[req.id] ? d.hide : d.bids}
                    </Button>
                    <Link href={`/requests/${req.id}`}>
                      <Button variant="outline" size="sm" className="gap-1">
                        {d.view} <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {expanded[req.id] && req.bids.length > 0 && (
                <div className="border-t bg-muted/20 divide-y">
                  {req.bids.map((bid) => {
                    const contractValue = (bid.escrow_amount_cents ?? 0) / 100;
                    const operatorPayout = +(contractValue * 0.91).toFixed(2);
                    return (
                      <div key={bid.id} className="px-5 py-3 text-sm space-y-2">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <div className="font-medium">{bid.operator_name || d.operatorFallback}</div>
                          <div className="flex flex-wrap gap-4 text-muted-foreground">
                            <span className="font-semibold text-foreground">${bid.price_per_kg}/kg</span>
                            <span>{bid.turnaround_days} {d.daysTurnaround}</span>
                            {bid.notes && <span className="italic text-xs">{bid.notes}</span>}
                            <StatusBadge status={bid.status} />
                          </div>
                        </div>
                        {bid.status === "accepted" && (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
                            {bid.escrow_status === "none" && (
                              <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Awaiting escrow payment from buyer
                              </div>
                            )}
                            {bid.escrow_status === "authorized" && (
                              <>
                                <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  ${contractValue.toLocaleString("en-CA", { minimumFractionDigits: 2 })} CAD held in escrow
                                </div>
                                <Button
                                  size="sm"
                                  className="h-7 text-xs gap-1.5 bg-primary hover:bg-primary/90"
                                  disabled={!!releasingEscrow[bid.id]}
                                  onClick={() => releaseEscrow(bid.id)}
                                >
                                  <BadgeCheck className="w-3.5 h-3.5" />
                                  {releasingEscrow[bid.id] ? "Releasing…" : "Mark complete & release funds"}
                                </Button>
                              </>
                            )}
                            {bid.escrow_status === "captured" && (
                              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                                <BadgeCheck className="w-3.5 h-3.5" />
                                Funds released — ${operatorPayout.toLocaleString("en-CA", { minimumFractionDigits: 2 })} CAD to operator
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Quick links */}
      <div className="mt-8 grid sm:grid-cols-2 gap-4">
        <Link href="/shop">
          <Card className="hover:border-primary/40 transition-colors cursor-pointer">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <div className="font-semibold mb-1">{d.browseProducts}</div>
                <div className="text-sm text-muted-foreground">{d.browseProductsDesc}</div>
              </div>
              <Package className="w-8 h-8 text-primary opacity-60" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/operators">
          <Card className="hover:border-primary/40 transition-colors cursor-pointer">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <div className="font-semibold mb-1">{d.findOperators}</div>
                <div className="text-sm text-muted-foreground">{d.findOperatorsDesc}</div>
              </div>
              <Users className="w-8 h-8 text-primary opacity-60" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

// ─── Operator Dashboard ────────────────────────────────────────────────────────

interface OperatorRequest {
  id: number;
  material_type: string;
  quantity_kg: number;
  deadline: string;
  budget_per_kg?: number | null;
  status: string;
  bid_count: number;
  created_at: string;
}

interface OperatorBid {
  id: number;
  request_id: number;
  price_per_kg: number;
  turnaround_days: number;
  status: string;
  fee_status: string;
  escrow_status: string;
  escrow_amount_cents?: number | null;
  quantity_kg?: number;
  created_at: string;
}

interface OperatorData {
  open_requests: OperatorRequest[];
  my_bids: OperatorBid[];
  stats: {
    total_bids: number;
    won_bids: number;
    lost_bids: number;
    pending_bids: number;
  };
}

interface OperatorJob {
  bid_id: number;
  request_id: number;
  price_per_kg: number;
  turnaround_days: number;
  escrow_status: string;
  escrow_amount_cents: number | null;
  bid_created_at: string;
  job_status: string | null;
  job_status_note: string | null;
  materials_received_at: string | null;
  processing_start_date: string | null;
  job_status_updated_at: string | null;
  material_type: string;
  quantity_kg: number;
  deadline: string;
  buyer_email: string;
  special_requirements: string | null;
}

interface ConnectStatus {
  connected: boolean;
  onboarded: boolean;
  account_id: string | null;
  has_profile?: boolean;
  has_listing?: boolean;
  ready_to_receive?: boolean;
  onboarding_complete?: boolean;
  requirements_status?: string | null;
  disconnected?: boolean;
  error?: string;
}

// ─── Getting Started Checklist ───────────────────────────────────────────────

interface ChecklistStep {
  label: string;
  description: string;
  done: boolean;
  href: string;
  linkLabel: string;
}

function GettingStartedChecklist({ connectStatus, onConnectStripe }: {
  connectStatus: ConnectStatus;
  onConnectStripe: () => void;
}) {
  const profileDone = connectStatus.has_profile === true;
  const stripeDone = connectStatus.onboarded === true;
  const listingDone = connectStatus.has_listing === true;

  if (profileDone && stripeDone && listingDone) return null;

  const completedCount = [profileDone, stripeDone, listingDone].filter(Boolean).length;

  const steps: (ChecklistStep & { stripeAction?: boolean })[] = [
    {
      label: "Create your operator profile",
      description: "Add your facility name, certifications, and location so buyers can find you.",
      done: profileDone,
      href: "#edit-profile-card",
      linkLabel: "Set up profile",
    },
    {
      label: "Connect Stripe for automatic payouts",
      description: "Set up a Stripe account to receive your 91% contract share when buyers release escrow.",
      done: stripeDone,
      href: "#stripe-connect-card",
      linkLabel: connectStatus.connected ? "Complete Stripe setup" : "Connect Stripe",
      stripeAction: !stripeDone,
    },
    {
      label: "Add your first capacity listing",
      description: "Publish your freeze-drying capacity so operators can see your pricing and availability.",
      done: listingDone,
      href: "/operator/listings",
      linkLabel: "Manage listings",
    },
  ];

  return (
    <div className="mb-8 rounded-xl border border-primary/20 bg-primary/5 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm">Getting started</h2>
        </div>
        <span className="text-xs text-muted-foreground font-medium">{completedCount} of 3 complete</span>
      </div>
      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={i} className={`flex items-start gap-3 rounded-lg p-3 transition-colors ${step.done ? "bg-muted/30 opacity-60" : "bg-background border"}`}>
            <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${step.done ? "bg-emerald-100" : "bg-muted"}`}>
              {step.done
                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                : <span className="text-[10px] font-bold text-muted-foreground">{i + 1}</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${step.done ? "line-through text-muted-foreground" : ""}`}>{step.label}</p>
              {!step.done && <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>}
            </div>
            {!step.done && (
              step.stripeAction ? (
                <button
                  onClick={onConnectStripe}
                  className="text-xs font-medium text-primary hover:underline shrink-0 flex items-center gap-1"
                >
                  {step.linkLabel} <ArrowRight className="w-3 h-3" />
                </button>
              ) : (
                <Link href={step.href} className="text-xs font-medium text-primary hover:underline shrink-0 flex items-center gap-1">
                  {step.linkLabel} <ArrowRight className="w-3 h-3" />
                </Link>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Job Status helpers ──────────────────────────────────────────────────────

const JOB_STATUS_LABEL: Record<string, string> = {
  pending_materials: "Awaiting Materials",
  materials_received: "Materials Received",
  in_process: "In Process",
  done: "Done",
  issue: "Issue",
};

const JOB_STATUS_COLOR: Record<string, string> = {
  pending_materials: "bg-amber-100 text-amber-700",
  materials_received: "bg-blue-100 text-blue-700",
  in_process: "bg-indigo-100 text-indigo-700",
  done: "bg-emerald-100 text-emerald-700",
  issue: "bg-red-100 text-red-700",
};

function JobStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-muted-foreground italic">No status set</span>;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${JOB_STATUS_COLOR[status] ?? "bg-muted text-muted-foreground"}`}>
      {JOB_STATUS_LABEL[status] ?? status}
    </span>
  );
}

// ─── Active Jobs Panel ───────────────────────────────────────────────────────

interface JobPanelProps {
  jobs: OperatorJob[];
  onRefresh: () => void;
  connectStatus?: ConnectStatus | null;
}

function ActiveJobsPanel({ jobs, onRefresh, connectStatus }: JobPanelProps) {
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [issueOpen, setIssueOpen] = useState<number | null>(null);
  const [issueNote, setIssueNote] = useState("");
  const [matReceivedOpen, setMatReceivedOpen] = useState<number | null>(null);
  const [processingDate, setProcessingDate] = useState("");

  const patchStatus = async (
    bidId: number,
    job_status: string,
    extra?: { job_status_note?: string; processing_start_date?: string }
  ) => {
    setSaving((s) => ({ ...s, [bidId]: true }));
    try {
      const r = await fetch(`${BASE}/api/bids/${bidId}/job-status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_status, ...extra }),
      });
      if (!r.ok) {
        const j = await r.json();
        alert(j.error ?? "Failed to update status");
        return;
      }
      onRefresh();
    } finally {
      setSaving((s) => ({ ...s, [bidId]: false }));
    }
  };

  if (jobs.length === 0) {
    return (
      <div className="text-center py-10 border rounded-xl bg-muted/10 text-sm text-muted-foreground">
        No active jobs yet — won bids will appear here once a buyer accepts your quote.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => {
        const contractValue =
          (job.escrow_amount_cents ?? 0) > 0
            ? job.escrow_amount_cents! / 100
            : job.price_per_kg * job.quantity_kg;
        const isSaving = saving[job.bid_id] ?? false;
        const isIssue = issueOpen === job.bid_id;
        const isMat = matReceivedOpen === job.bid_id;

        return (
          <Card key={job.bid_id} className={`border ${job.job_status === "issue" ? "border-red-300 bg-red-50/30" : job.job_status === "done" ? "border-emerald-300 bg-emerald-50/20" : ""}`}>
            <CardContent className="p-5">
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="font-semibold">{job.material_type}</span>
                    <JobStatusBadge status={job.job_status} />
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-3 mt-1">
                    <span><strong>{job.quantity_kg} kg</strong></span>
                    <span>Due: {job.deadline}</span>
                    <span>${job.price_per_kg}/kg</span>
                    {contractValue > 0 && (
                      <span className="font-medium text-foreground">
                        Contract: ${contractValue.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
                      </span>
                    )}
                    <Link href={`/requests/${job.request_id}`}>
                      <span className="text-primary underline cursor-pointer">Request #{job.request_id}</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Timeline row */}
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground mb-4 border-t pt-3">
                <span className="flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" />
                  Materials received:{" "}
                  <strong className="ml-1 text-foreground">
                    {job.materials_received_at ? format(new Date(job.materials_received_at), "MMM d, yyyy") : "—"}
                  </strong>
                </span>
                <span className="flex items-center gap-1">
                  <FlaskConical className="w-3.5 h-3.5" />
                  Processing starts:{" "}
                  <strong className="ml-1 text-foreground">
                    {job.processing_start_date ?? "—"}
                  </strong>
                </span>
                {job.job_status_updated_at && (
                  <span className="text-muted-foreground/70">
                    Updated {formatDistanceToNow(new Date(job.job_status_updated_at), { addSuffix: true })}
                  </span>
                )}
              </div>

              {/* Issue note (if any) */}
              {job.job_status === "issue" && job.job_status_note && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                  <strong>Issue:</strong> {job.job_status_note}
                </div>
              )}

              {/* Disconnected-Stripe payout warning */}
              {connectStatus?.disconnected && job.escrow_status === "authorized" && (
                <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                  <span>
                    Payout blocked — your Stripe account is disconnected.{" "}
                    <a
                      href="#stripe-connect-card"
                      className="underline font-semibold hover:text-amber-900"
                    >
                      Reconnect Stripe
                    </a>{" "}
                    to receive this payout.
                  </span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                {/* Materials Received */}
                {job.job_status !== "done" && (
                  <Button
                    size="sm"
                    variant={job.job_status === "materials_received" ? "default" : "outline"}
                    className="gap-1.5 text-xs h-7 px-2.5"
                    disabled={isSaving}
                    onClick={() => {
                      if (isMat) {
                        setMatReceivedOpen(null);
                      } else {
                        setMatReceivedOpen(job.bid_id);
                        setIssueOpen(null);
                        setProcessingDate("");
                      }
                    }}
                  >
                    <Truck className="w-3.5 h-3.5" /> Materials Received
                  </Button>
                )}

                {/* In Process */}
                {job.job_status !== "done" && (
                  <Button
                    size="sm"
                    variant={job.job_status === "in_process" ? "default" : "outline"}
                    className="gap-1.5 text-xs h-7 px-2.5"
                    disabled={isSaving}
                    onClick={() => {
                      setIssueOpen(null);
                      setMatReceivedOpen(null);
                      patchStatus(job.bid_id, "in_process");
                    }}
                  >
                    <Zap className="w-3.5 h-3.5" /> In Process
                  </Button>
                )}

                {/* Done */}
                {job.job_status !== "done" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs h-7 px-2.5 border-emerald-400 text-emerald-700 hover:bg-emerald-50"
                    disabled={isSaving}
                    onClick={() => {
                      setIssueOpen(null);
                      setMatReceivedOpen(null);
                      patchStatus(job.bid_id, "done");
                    }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Done
                  </Button>
                )}

                {/* Issue */}
                <Button
                  size="sm"
                  variant={isIssue || job.job_status === "issue" ? "destructive" : "outline"}
                  className="gap-1.5 text-xs h-7 px-2.5"
                  disabled={isSaving}
                  onClick={() => {
                    if (isIssue) {
                      setIssueOpen(null);
                    } else {
                      setIssueOpen(job.bid_id);
                      setMatReceivedOpen(null);
                      setIssueNote(job.job_status_note ?? "");
                    }
                  }}
                >
                  <AlertCircle className="w-3.5 h-3.5" /> Issue
                </Button>
              </div>

              {/* Inline: Materials received form */}
              {isMat && (
                <div className="mt-3 rounded-lg border bg-muted/30 p-3 space-y-3">
                  <div className="text-xs font-medium text-muted-foreground">Log materials received</div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Processing start date (optional)</label>
                    <input
                      type="date"
                      value={processingDate}
                      onChange={(e) => setProcessingDate(e.target.value)}
                      className="text-sm border rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={isSaving}
                      onClick={async () => {
                        await patchStatus(job.bid_id, "materials_received", {
                          processing_start_date: processingDate || undefined,
                        });
                        setMatReceivedOpen(null);
                      }}
                    >
                      {isSaving ? "Saving…" : "Confirm Receipt"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setMatReceivedOpen(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Inline: Issue form */}
              {isIssue && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50/40 p-3 space-y-3">
                  <div className="text-xs font-medium text-red-700">Describe the issue — this will notify the buyer</div>
                  <Textarea
                    value={issueNote}
                    onChange={(e) => setIssueNote(e.target.value)}
                    placeholder="e.g. Equipment malfunction on batch line 2. Estimated delay: 3 days."
                    className="text-sm min-h-[80px]"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={isSaving || !issueNote.trim()}
                      onClick={async () => {
                        await patchStatus(job.bid_id, "issue", { job_status_note: issueNote.trim() });
                        setIssueOpen(null);
                      }}
                    >
                      {isSaving ? "Saving…" : "Report Issue"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setIssueOpen(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Edit Profile Panel ───────────────────────────────────────────────────────

interface OperatorProfile {
  id: number;
  name: string;
  location: string;
  description?: string | null;
  capacity_kg: number;
  price_per_kg: number;
  certifications: string[];
  turnaround_days: number;
  available: boolean;
  website_url?: string | null;
  country?: string | null;
  city?: string | null;
  food_market_focus?: boolean | null;
  pharmaceutical_focus?: boolean | null;
  contact_page_url?: string | null;
  gps_lat?: number | null;
  gps_lng?: number | null;
  service_radius_km?: number | null;
  map_status?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  phone?: string | null;
}

function EditProfilePanel({ onSaved }: { onSaved?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [profile, setProfile] = useState<OperatorProfile | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [capacityKg, setCapacityKg] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [turnaroundDays, setTurnaroundDays] = useState("");
  const [certifications, setCertifications] = useState("");
  const [available, setAvailable] = useState(true);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [contactPageUrl, setContactPageUrl] = useState("");
  const [foodFocus, setFoodFocus] = useState(false);
  const [pharmaFocus, setPharmaFocus] = useState(false);
  const [providerTypes, setProviderTypes] = useState<string[]>(["operator"]);
  const [gpsLat, setGpsLat] = useState("");
  const [gpsLng, setGpsLng] = useState("");
  const [serviceRadius, setServiceRadius] = useState("");

  const populate = (p: OperatorProfile) => {
    setName(p.name ?? "");
    setLocation(p.location ?? "");
    setDescription(p.description ?? "");
    setCapacityKg(String(p.capacity_kg ?? ""));
    setPricePerKg(String(p.price_per_kg ?? ""));
    setTurnaroundDays(String(p.turnaround_days ?? ""));
    setCertifications((p.certifications ?? []).join(", "));
    setAvailable(p.available ?? true);
    setWebsiteUrl(p.website_url ?? "");
    setCountry(p.country ?? "");
    setCity(p.city ?? "");
    setContactName(p.contact_name ?? "");
    setContactEmail(p.contact_email ?? "");
    setPhone(p.phone ?? "");
    setContactPageUrl(p.contact_page_url ?? "");
    setFoodFocus(p.food_market_focus ?? false);
    setPharmaFocus(p.pharmaceutical_focus ?? false);
    setProviderTypes((p as any).provider_types?.length ? (p as any).provider_types : ["operator"]);
    setGpsLat(p.gps_lat != null ? String(p.gps_lat) : "");
    setGpsLng(p.gps_lng != null ? String(p.gps_lng) : "");
    setServiceRadius(p.service_radius_km != null ? String(p.service_radius_km) : "");
  };

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/operators/me`, { credentials: "include" });
      if (r.ok) {
        const p = await r.json();
        setProfile(p);
        setHasProfile(true);
        populate(p);
      } else if (r.status === 404) {
        setHasProfile(false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    // Auto-expand the panel if the page was navigated to via #edit-profile-card
    if (window.location.hash === "#edit-profile-card") {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (open && !loading && !profile && hasProfile !== false) {
      fetchProfile();
    }
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus("idle");
    setErrorMsg("");
    try {
      const isCreating = !hasProfile;

      if (isCreating && !name.trim()) {
        setSaveStatus("error");
        setErrorMsg("Facility name is required to create your profile.");
        setSaving(false);
        return;
      }

      const body: Record<string, unknown> = {
        name: name.trim() || undefined,
        location: location.trim() || undefined,
        description: description.trim() || null,
        capacity_kg: capacityKg ? parseInt(capacityKg, 10) : undefined,
        price_per_kg: pricePerKg ? parseFloat(pricePerKg) : undefined,
        turnaround_days: turnaroundDays ? parseInt(turnaroundDays, 10) : undefined,
        certifications: certifications.split(",").map(s => s.trim()).filter(Boolean),
        available,
        website_url: websiteUrl.trim() || null,
        country: country.trim() || null,
        city: city.trim() || null,
        contact_name: contactName.trim() || null,
        contact_email: contactEmail.trim() || null,
        phone: phone.trim() || null,
        contact_page_url: contactPageUrl.trim() || null,
        food_market_focus: foodFocus,
        pharmaceutical_focus: pharmaFocus,
        provider_types: providerTypes,
        gps_lat: gpsLat ? parseFloat(gpsLat) : null,
        gps_lng: gpsLng ? parseFloat(gpsLng) : null,
        service_radius_km: serviceRadius ? parseInt(serviceRadius, 10) : null,
      };

      const r = await fetch(`${BASE}/api/operators/me`, {
        method: isCreating ? "POST" : "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? "Failed to save profile");
      setProfile(json);
      setHasProfile(true);
      populate(json);
      setSaveStatus("success");
      onSaved?.();
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err: any) {
      setSaveStatus("error");
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card id="edit-profile-card" className="mb-8">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Pencil className="w-4 h-4 text-primary" />
            {hasProfile === false ? "Create your profile" : "Edit my profile"}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(v => !v)}
            className="gap-1 text-xs"
          >
            {open ? <><ChevronUp className="w-3.5 h-3.5" /> Collapse</> : <><ChevronDown className="w-3.5 h-3.5" /> Expand</>}
          </Button>
        </div>
        {!open && profile && (
          <p className="text-xs text-muted-foreground mt-1">{profile.name} · {profile.location}</p>
        )}
        {!open && hasProfile === false && (
          <p className="text-xs text-muted-foreground mt-1">No profile yet — expand to set one up.</p>
        )}
      </CardHeader>

      {open && (
        <CardContent className="pt-0 space-y-5">
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-9 w-full" />)}</div>
          ) : (
            <>
              {/* Basic info */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Basic information</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Facility name</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. ArcticLyo Canada" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Location</Label>
                    <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Calgary, AB, Canada" />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-xs">Description</Label>
                    <Textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Describe your facility, specialties, and services…"
                      rows={3}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Capacity & pricing */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Capacity &amp; pricing</h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Capacity (kg/batch)</Label>
                    <Input type="number" min={0} value={capacityKg} onChange={e => setCapacityKg(e.target.value)} placeholder="500" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Base price ($/kg)</Label>
                    <Input type="number" min={0} step="0.01" value={pricePerKg} onChange={e => setPricePerKg(e.target.value)} placeholder="12.00" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Turnaround (days)</Label>
                    <Input type="number" min={1} value={turnaroundDays} onChange={e => setTurnaroundDays(e.target.value)} placeholder="14" />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="available-toggle"
                    checked={available}
                    onChange={e => setAvailable(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="available-toggle" className="text-xs cursor-pointer">
                    Available for new projects
                  </Label>
                </div>
              </div>

              {/* Certifications */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Certifications</h3>
                <div className="space-y-1.5">
                  <Label className="text-xs">Certifications (comma-separated)</Label>
                  <Input
                    value={certifications}
                    onChange={e => setCertifications(e.target.value)}
                    placeholder="GMP, HACCP, FDA, ISO 9001"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Verification of certifications is done by the LyoDex team. Adding a cert here does not automatically verify it.
                  </p>
                </div>
              </div>

              {/* What do you offer */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">What do you offer?</h3>
                <p className="text-[11px] text-muted-foreground mb-3">Select all that apply — this controls which filter tabs your listing appears in on the Operator Directory.</p>
                <div className="flex flex-wrap gap-4">
                  {[
                    { value: "operator",          label: "Freeze-drying services" },
                    { value: "ingredient_seller", label: "Ingredient supply" },
                    { value: "service_provider",  label: "Consulting / other services" },
                  ].map(({ value, label }) => (
                    <label key={value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={providerTypes.includes(value)}
                        onChange={e => {
                          setProviderTypes(prev =>
                            e.target.checked
                              ? [...prev.filter(v => v !== value), value]
                              : prev.filter(v => v !== value)
                          );
                        }}
                      />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Market focus */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Market focus</h3>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={foodFocus} onChange={e => setFoodFocus(e.target.checked)} className="rounded" />
                    <span className="text-sm">Food market</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={pharmaFocus} onChange={e => setPharmaFocus(e.target.checked)} className="rounded" />
                    <span className="text-sm">Pharmaceutical market</span>
                  </label>
                </div>
              </div>

              {/* Contact */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Contact information</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Contact name</Label>
                    <Input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Jane Smith" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Contact email</Label>
                    <Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="jane@example.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Phone</Label>
                    <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 403 555 0100" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Website URL</Label>
                    <Input type="url" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://example.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Contact page URL</Label>
                    <Input type="url" value={contactPageUrl} onChange={e => setContactPageUrl(e.target.value)} placeholder="https://example.com/contact" />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Location details</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">City</Label>
                    <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Calgary" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Country</Label>
                    <Input value={country} onChange={e => setCountry(e.target.value)} placeholder="CA" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">GPS latitude</Label>
                    <Input type="number" step="any" value={gpsLat} onChange={e => setGpsLat(e.target.value)} placeholder="51.0447" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">GPS longitude</Label>
                    <Input type="number" step="any" value={gpsLng} onChange={e => setGpsLng(e.target.value)} placeholder="-114.0719" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Service radius (km)</Label>
                    <Input type="number" min={0} value={serviceRadius} onChange={e => setServiceRadius(e.target.value)} placeholder="500" />
                  </div>
                </div>
              </div>

              {/* Live card preview */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  Directory preview
                </h3>
                <p className="text-[11px] text-muted-foreground mb-3">
                  This is how your card appears to buyers browsing the operator directory. It updates as you edit.
                </p>
                <div className="max-w-sm">
                  <OperatorCard
                    preview
                    op={{
                      id: profile?.id ?? null,
                      name,
                      location,
                      city: city || null,
                      country: country || null,
                      available,
                      role: (profile as any)?.role ?? "operator",
                      verification_status: (profile as any)?.verification_status ?? "not_verified",
                      description: description || null,
                      capacity_kg: capacityKg ? parseInt(capacityKg, 10) : null,
                      price_per_kg: pricePerKg ? parseFloat(pricePerKg) : null,
                      certifications: certifications.split(",").map(s => s.trim()).filter(Boolean),
                      verified_certifications: (profile as any)?.verified_certifications ?? [],
                      website_url: websiteUrl || null,
                    }}
                  />
                </div>
              </div>

              {/* Status messages */}
              {saveStatus === "success" && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <div className="flex items-center gap-2 mb-1.5">
                    <BadgeCheck className="w-4 h-4 shrink-0" />
                    {hasProfile ? "Profile saved successfully." : "Profile created successfully."}
                  </div>
                  {profile?.id && (
                    <Link
                      href={`/operators/${profile.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-900 underline underline-offset-2 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      View my public profile
                    </Link>
                  )}
                </div>
              )}
              {saveStatus === "error" && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {errorMsg}
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  <Save className="w-4 h-4" />
                  {saving ? (hasProfile ? "Saving…" : "Creating…") : (hasProfile ? "Save profile" : "Create profile")}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Operator Dashboard ────────────────────────────────────────────────────────

function OperatorDashboard() {
  const { t } = useLanguage();
  const d = t.dashboard;
  const [data, setData] = useState<OperatorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<OperatorJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [materialFilter, setMaterialFilter] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");

  // Stripe Connect onboarding state
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [connectLoading, setConnectLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const fetchData = (mat: string, bMin: string, bMax: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (mat) params.set("material", mat);
    if (bMin) params.set("budget_min", bMin);
    if (bMax) params.set("budget_max", bMax);
    const qs = params.toString() ? `?${params.toString()}` : "";
    fetch(`${BASE}/api/dashboard/operator${qs}`, { credentials: "include" })
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const fetchJobs = () => {
    setJobsLoading(true);
    fetch(`${BASE}/api/operator/jobs`, { credentials: "include" })
      .then((r) => r.json())
      .then((rows) => setJobs(Array.isArray(rows) ? rows : []))
      .catch(console.error)
      .finally(() => setJobsLoading(false));
  };

  const fetchConnectStatus = () => {
    setConnectLoading(true);
    fetch(`${BASE}/api/stripe/connect/status`, { credentials: "include" })
      .then((r) => r.json())
      .then(setConnectStatus)
      .catch(() => setConnectStatus({ connected: false, onboarded: false, account_id: null }))
      .finally(() => setConnectLoading(false));
  };

  useEffect(() => {
    fetchData(materialFilter, budgetMin, budgetMax);
    fetchJobs();
    fetchConnectStatus();
    // Clear connect_return / connect_refresh query params after Stripe redirect
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const applyFilters = () => fetchData(materialFilter, budgetMin, budgetMax);
  const clearFilters = () => {
    setMaterialFilter(""); setBudgetMin(""); setBudgetMax("");
    fetchData("", "", "");
  };

  // Starts the Connect onboarding flow — creates an account then redirects to Stripe
  const connectStripe = async () => {
    setConnecting(true);
    try {
      const r = await fetch(`${BASE}/api/stripe/connect/create-account`, {
        method: "POST",
        credentials: "include",
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? "Failed to start onboarding");
      // Use window.top so the redirect escapes the Replit preview iframe;
      // Stripe Connect pages block being loaded inside iframes.
      (window.top ?? window).location.href = json.url;
    } catch (err: any) {
      alert(err.message);
      setConnecting(false);
    }
  };

  // Generates a fresh Account Link for operators who need to resume onboarding
  const resumeOnboarding = async () => {
    setConnecting(true);
    try {
      const r = await fetch(`${BASE}/api/stripe/connect/onboarding-link`, {
        method: "POST",
        credentials: "include",
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? "Failed to generate link");
      (window.top ?? window).location.href = json.url;
    } catch (err: any) {
      alert(err.message);
      setConnecting(false);
    }
  };

  const stats = data?.stats;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">{d.operatorTitle}</h1>
          <p className="text-muted-foreground">{d.operatorSubtitle}</p>
        </div>
        <Link href="/operator/listings">
          <Button variant="outline" className="gap-2 shrink-0"><ListChecks className="w-4 h-4" /> {d.myListings}</Button>
        </Link>
      </div>

      {/* Getting Started Checklist — shown until all 3 steps are complete */}
      {!connectLoading && connectStatus && (
        <GettingStartedChecklist
          connectStatus={connectStatus}
          onConnectStripe={connectStatus.connected ? resumeOnboarding : connectStripe}
        />
      )}

      {/* Self-service profile editor */}
      <EditProfilePanel onSaved={fetchConnectStatus} />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: d.totalBids, value: stats?.total_bids ?? "—", icon: Briefcase },
          { label: d.won, value: stats?.won_bids ?? "—", icon: CheckSquare },
          { label: d.pending, value: stats?.pending_bids ?? "—", icon: Clock },
          { label: d.winRate, value: stats?.total_bids ? `${Math.round((stats.won_bids / stats.total_bids) * 100)}%` : "—", icon: BarChart2 },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-7 w-14" /> : <div className="text-2xl font-bold">{s.value}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stripe Connect — payout onboarding */}
      <Card id="stripe-connect-card" className="mb-8 border border-dashed">
        <CardContent className="p-5">
          {connectLoading ? (
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-72" />
              </div>
            </div>
          ) : connectStatus?.onboarded ? (
            /* ── Fully onboarded ── */
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <BadgeCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-sm">Stripe payouts active</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  When a buyer releases escrow, your 91% share is automatically transferred to your Stripe account — no manual steps needed.
                </p>
              </div>
            </div>
          ) : connectStatus?.connected ? (
            /* ── Account created but onboarding not complete ── */
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Complete your Stripe setup</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your Stripe account was created but onboarding isn&apos;t finished. Complete setup to receive automatic payouts.
                    {connectStatus.requirements_status && (
                      <span className="ml-1 text-amber-600">Requirements: {connectStatus.requirements_status}.</span>
                    )}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={resumeOnboarding}
                disabled={connecting}
                className="shrink-0 gap-1.5"
              >
                <CreditCard className="w-3.5 h-3.5" />
                {connecting ? "Redirecting…" : "Continue setup"}
              </Button>
            </div>
          ) : connectStatus?.disconnected ? (
            /* ── Previously connected but deauthorized ── */
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Stripe account disconnected</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your Stripe account was disconnected from LyoDex. Reconnect to continue receiving automatic payouts when buyers release escrow.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={connectStripe}
                disabled={connecting}
                className="shrink-0 gap-1.5"
              >
                <CreditCard className="w-3.5 h-3.5" />
                {connecting ? "Redirecting…" : "Reconnect Stripe"}
              </Button>
            </div>
          ) : connectStatus?.has_profile === false ? (
            /* ── No operator profile yet ── */
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Create your operator profile first</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    You need an operator profile before you can connect Stripe and receive automatic payouts.
                  </p>
                </div>
              </div>
              <Link href="/settings">
                <Button size="sm" variant="outline" className="shrink-0">
                  Go to profile settings
                </Button>
              </Link>
            </div>
          ) : (
            /* ── Not connected yet ── */
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Set up automatic payouts</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Connect a Stripe account to receive your 91% contract share automatically when buyers release escrow.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={connectStripe}
                disabled={connecting}
                className="shrink-0 gap-1.5"
              >
                <CreditCard className="w-3.5 h-3.5" />
                {connecting ? "Redirecting…" : "Connect Stripe"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Active Jobs ── */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-primary" /> Active Jobs
          {jobs.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">({jobs.length} contract{jobs.length !== 1 ? "s" : ""})</span>
          )}
        </h2>
        {jobsLoading ? (
          <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-36 w-full" />)}</div>
        ) : (
          <ActiveJobsPanel jobs={jobs} onRefresh={fetchJobs} connectStatus={connectStatus} />
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Open requests */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-3">{d.openRequests}</h2>
          <div className="flex flex-wrap gap-2 mb-4 items-end">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{d.material}</label>
              <input
                type="text"
                placeholder={d.materialPlaceholder}
                value={materialFilter}
                onChange={(e) => setMaterialFilter(e.target.value)}
                className="text-sm border rounded-lg px-3 py-1.5 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-36"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{d.budgetMin}</label>
              <input
                type="number"
                placeholder="0"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                className="text-sm border rounded-lg px-3 py-1.5 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-28"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{d.budgetMax}</label>
              <input
                type="number"
                placeholder="∞"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                className="text-sm border rounded-lg px-3 py-1.5 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-28"
              />
            </div>
            <Button size="sm" onClick={applyFilters}>{d.apply}</Button>
            {(materialFilter || budgetMin || budgetMax) && (
              <Button size="sm" variant="ghost" onClick={clearFilters}>{d.clear}</Button>
            )}
          </div>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : (data?.open_requests ?? []).length === 0 ? (
            <div className="text-center py-12 border rounded-xl bg-muted/10 text-muted-foreground text-sm">{d.noOpenRequests}</div>
          ) : (
            <div className="space-y-3">
              {(data?.open_requests ?? []).map((req) => (
                <Card key={req.id} className="hover:border-primary/40 transition-colors">
                  <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold">{req.material_type}</span>
                        <StatusBadge status={req.status} />
                      </div>
                      <div className="text-sm text-muted-foreground flex flex-wrap gap-4">
                        <span>{req.quantity_kg} kg</span>
                        <span>{d.due} {req.deadline}</span>
                        {req.budget_per_kg && <span className="text-foreground font-medium">${req.budget_per_kg}{d.kgBudget}</span>}
                        <span className="text-xs">{req.bid_count} {req.bid_count !== 1 ? d.bidsSuffix : d.bidSuffix}</span>
                      </div>
                    </div>
                    <Link href={`/requests/${req.id}`}>
                      <Button size="sm" className="gap-1.5 shrink-0">
                        {d.placeBid} <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Bid history sidebar */}
        <div>
          <h2 className="text-lg font-semibold mb-4">{d.myBidHistory}</h2>

          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : (data?.my_bids.length ?? 0) === 0 ? (
            <div className="text-center py-10 border rounded-xl bg-muted/10 text-sm text-muted-foreground">
              {d.noBidsPlaced}<br />{d.noBidsPlacedDesc}
            </div>
          ) : (
            <div className="space-y-2">
              {data?.my_bids.slice(0, 15).map((bid) => {
                const contractValue = (bid.escrow_amount_cents ?? 0) > 0
                  ? (bid.escrow_amount_cents! / 100)
                  : (bid.price_per_kg * (bid.quantity_kg ?? 0));
                return (
                  <div key={bid.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{d.requestNumber}{bid.request_id}</span>
                      <StatusBadge status={bid.status} />
                    </div>
                    <div className="text-muted-foreground flex gap-3 mb-2">
                      <span>${bid.price_per_kg}/kg</span>
                      <span>{bid.turnaround_days}d</span>
                      <span className="text-xs">{formatDistanceToNow(new Date(bid.created_at), { addSuffix: true })}</span>
                    </div>
                    {bid.status === "accepted" && bid.escrow_status === "authorized" && (
                      <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium mt-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {contractValue > 0
                          ? `Escrow: $${contractValue.toLocaleString("en-CA", { minimumFractionDigits: 2 })} CAD held`
                          : "Funds in escrow"}
                      </div>
                    )}
                    {bid.status === "accepted" && bid.escrow_status === "captured" && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium mt-1">
                        <BadgeCheck className="w-3.5 h-3.5" />
                        {contractValue > 0
                          ? `Released — $${(contractValue * 0.91).toLocaleString("en-CA", { minimumFractionDigits: 2 })} CAD payout`
                          : "Funds released"}
                      </div>
                    )}
                    {bid.status === "accepted" && bid.escrow_status === "none" && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium mt-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Awaiting buyer escrow payment
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6 space-y-3">
            <Link href="/operator/listings">
              <Button variant="outline" className="w-full gap-2 justify-start">
                <ListChecks className="w-4 h-4" /> {d.manageListings}
              </Button>
            </Link>
            <Link href="/requests">
              <Button variant="ghost" className="w-full gap-2 justify-start">
                <FileText className="w-4 h-4" /> {d.allPlatformRequests}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Generic / Network Dashboard (unauthenticated or admin) ───────────────────

function NetworkDashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: activity, isLoading: loadingActivity } = useGetRecentActivity();
  const { t } = useLanguage();
  const d = t.dashboard;

  const metrics = [
    { title: d.networkOperators, value: summary?.total_operators, icon: Users, desc: d.activeVerified },
    { title: d.liveRequests, value: summary?.active_requests, icon: FileText, desc: d.inBidding },
    { title: d.completedContracts, value: summary?.completed_contracts, icon: CheckSquare, desc: d.successDelivered },
    { title: d.marketAvgPrice, value: summary?.avg_price_per_kg ? `$${summary.avg_price_per_kg}/kg` : "-", icon: TrendingUp, desc: d.acrossCategories },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">{d.title}</h1>
        <p className="text-muted-foreground">{d.subtitle}</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((m, i) => (
          <Card key={i} className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{m.title}</CardTitle>
              <m.icon className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              {loadingSummary ? <Skeleton className="h-8 w-16 mb-1" /> : <div className="text-3xl font-bold">{m.value}</div>}
              <p className="text-xs text-muted-foreground mt-1">{m.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-primary" /> {d.networkActivity}</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingActivity ? (
            <div className="space-y-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="space-y-6">
              {activity?.map((item) => (
                <div key={item.id} className="flex gap-4 items-start">
                  <div className="mt-1 w-2 h-2 rounded-full bg-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{item.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
              {activity?.length === 0 && <div className="text-sm text-muted-foreground">{d.noActivity}</div>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Role Router ──────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-64 mb-4" />
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!user) return null;
  if (user.role === "buyer") return <BuyerDashboard />;
  if (user.role === "operator") return <OperatorDashboard />;
  return <NetworkDashboard />;
}
