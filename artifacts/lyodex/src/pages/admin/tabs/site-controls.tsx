import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock, Unlock, Loader2, Calendar, TrendingUp } from "lucide-react";
import { AdminSiteSettings, ScheduledReportSettings, SiteSettingKey, api } from "../shared";

export function SiteControlsTab() {
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
