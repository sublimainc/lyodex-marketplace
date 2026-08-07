/**
 * Admin panel shell: authentication gate, tab registry and layout.
 *
 * Each tab lives in its own module under ./tabs. This file was 5,679 lines when
 * every tab was inlined here, which meant two people touching different screens
 * edited the same file, and finding one tab meant scrolling past seventeen others.
 */

import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { TrafficTab } from "./tabs/traffic";
import { ObservationsTab } from "./tabs/observations";
import { NewsletterTab } from "./tabs/newsletter";
import { BenchmarksTab } from "./tabs/benchmarks";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";
import { NotificationBell, Overview, SystemAlert, SystemAlertBanner, TABS, Tab, api } from "./shared";
import { AuditLogTab } from "./tabs/audit-log";
import { BlogAdminTab } from "./tabs/blog";
import { DisputesTab } from "./tabs/disputes";
import { InsightsTab } from "./tabs/insights";
import { ListingsCRUDTab } from "./tabs/listings";
import { ListingsApprovalTab } from "./tabs/listings-approval";
import { MachineryListingsTab } from "./tabs/machinery";
import { ManufacturersTab } from "./tabs/manufacturers";
import { MapTab } from "./tabs/map";
import { MessagesTab } from "./tabs/messages";
import { OperatorsTab } from "./tabs/operators";
import { OverviewTab } from "./tabs/overview";
import { PriceDataTab } from "./tabs/price-data";
import { ReportsTab } from "./tabs/reports";
import { RequestsTab } from "./tabs/requests";
import { SiteControlsTab } from "./tabs/site-controls";
import { TransactionsTab } from "./tabs/transactions";
import { UsersTab } from "./tabs/users";

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
