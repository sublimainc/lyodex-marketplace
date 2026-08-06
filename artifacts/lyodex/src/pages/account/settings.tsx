import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  User, Lock, Bell, HelpCircle, AlertTriangle, ChevronRight,
  ShieldCheck, Mail, LogOut, ExternalLink
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiCall(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Request failed.");
  return data;
}

const DEFAULT_PREFS: Record<string, boolean> = {
  quote_notifications: true,
  bid_notifications: true,
  order_notifications: true,
  message_notifications: true,
  weekly_report: true,
  market_alerts: true,
  marketing_emails: false,
};

const PREF_LABELS: Record<string, { label: string; desc: string }> = {
  quote_notifications: { label: "New quote requests", desc: "Notify when a buyer submits a new request matching your profile" },
  bid_notifications: { label: "Bid updates", desc: "Notify when bids on your requests change status" },
  order_notifications: { label: "Order & job updates", desc: "Notify on job status changes and order milestones" },
  message_notifications: { label: "Messages", desc: "Notify when you receive a message from a buyer or operator" },
  weekly_report: { label: "Weekly summary", desc: "A weekly digest of platform activity relevant to your account" },
  market_alerts: { label: "Market alerts", desc: "Pricing trends and capacity availability alerts" },
  marketing_emails: { label: "Product updates & announcements", desc: "News about new LyoDex features and marketplace announcements" },
};

type Section = "profile" | "security" | "notifications" | "support" | "danger";

const NAV: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Lock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "support", label: "Support", icon: HelpCircle },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle },
];

function ProfileSection({ user, refreshUser }: { user: { name: string; email: string; role: string }; refreshUser: () => Promise<void> }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiCall("PATCH", "/auth/profile", { name: name.trim(), email: email.trim() });
      await refreshUser();
      toast({ title: "Profile updated", description: "Your name and email have been saved." });
    } catch (err: unknown) {
      toast({ title: "Update failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Profile</h2>
        <p className="text-sm text-muted-foreground mt-1">Update your name and email address.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSave} className="space-y-5">
            <div className="flex items-center gap-4 pb-5 border-b">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl select-none">
                {user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <Badge variant="secondary" className="mt-1 capitalize text-xs">{user.role}</Badge>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="settings-name">Full name</Label>
                <Input
                  id="settings-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={1}
                  maxLength={100}
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-email">Email address</Label>
                <Input
                  id="settings-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function SecuritySection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", description: "Please re-enter your new password.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Password too short", description: "Your new password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await apiCall("PATCH", "/auth/profile", { current_password: currentPassword, new_password: newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password changed", description: "Your password has been updated." });
    } catch (err: unknown) {
      toast({ title: "Password change failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Security</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage your password and account access.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" /> Change password
          </CardTitle>
          <CardDescription>Use a strong password of at least 8 characters.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current_password">Current password</Label>
              <Input
                id="current_password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new_password">New password</Label>
                <Input
                  id="new_password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm new password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? "Updating…" : "Change password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" /> Active sessions
          </CardTitle>
          <CardDescription>You are currently signed in on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 text-sm">
            <div>
              <p className="font-medium">Current session</p>
              <p className="text-xs text-muted-foreground mt-0.5">Signed in via browser — this device</p>
            </div>
            <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50 text-xs">Active</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationsSection() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch(`${BASE}/api/auth/notification-prefs`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : {})
      .then((data) => {
        setPrefs({ ...DEFAULT_PREFS, ...data });
      })
      .catch(() => setPrefs(DEFAULT_PREFS))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = (key: string) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiCall("PATCH", "/auth/notification-prefs", prefs);
      toast({ title: "Preferences saved", description: "Your notification settings have been updated." });
    } catch (err: unknown) {
      toast({ title: "Save failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Notifications</h2>
          <p className="text-sm text-muted-foreground mt-1">Loading preferences…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Notifications</h2>
        <p className="text-sm text-muted-foreground mt-1">Choose which email notifications you receive from LyoDex.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" /> Email preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {Object.entries(PREF_LABELS).map(([key, { label, desc }]) => (
            <div key={key} className="flex items-start justify-between gap-4 py-3 border-b last:border-0">
              <div className="flex-1">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs[key] ?? false}
                onClick={() => handleToggle(key)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary mt-0.5 ${prefs[key] ? "bg-primary" : "bg-muted-foreground/30"}`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transition-transform ${prefs[key] ? "translate-x-4" : "translate-x-0"}`}
                />
              </button>
            </div>
          ))}
          <div className="pt-4 flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save preferences"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SupportSection() {
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");

  const CATEGORIES = [
    { value: "general", label: "General inquiry" },
    { value: "billing", label: "Billing & payments" },
    { value: "technical", label: "Technical issue" },
    { value: "dispute", label: "Dispute" },
    { value: "account", label: "Account & access" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`LyoDex Support: ${CATEGORIES.find((c) => c.value === category)?.label ?? category}`);
    const body = encodeURIComponent(message);
    window.open(`mailto:support@lyodex.com?subject=${subject}&body=${body}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Support</h2>
        <p className="text-sm text-muted-foreground mt-1">Get help from the LyoDex team.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {[
          { icon: Mail, title: "Email support", desc: "Response within 1 business day", href: "mailto:support@lyodex.com", label: "support@lyodex.com" },
          { icon: HelpCircle, title: "Disputes", desc: "For billing or contract disputes", href: "mailto:dispute@lyodex.com", label: "dispute@lyodex.com" },
        ].map(({ icon: Icon, title, desc, href, label }) => (
          <Card key={href}>
            <CardContent className="p-5 flex gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                <a href={href} className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2">
                  {label} <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Send a message</CardTitle>
          <CardDescription>Compose a support request. This will open your email client.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="support-category">Category</Label>
              <select
                id="support-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-message">Message</Label>
              <textarea
                id="support-message"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                placeholder="Describe your issue or question in detail…"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
            <Button type="submit" className="gap-2">
              <Mail className="w-4 h-4" /> Open email client
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function DangerZoneSection({ onLogout }: { onLogout: () => void }) {
  const [deactivateConfirm, setDeactivateConfirm] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-destructive">Danger Zone</h2>
        <p className="text-sm text-muted-foreground mt-1">Actions here are permanent or require support to reverse.</p>
      </div>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <LogOut className="w-4 h-4" /> Sign out
          </CardTitle>
          <CardDescription>Sign out of your account on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={onLogout} className="gap-2">
            <LogOut className="w-4 h-4" /> Sign out
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-4 h-4" /> Deactivate account
          </CardTitle>
          <CardDescription>
            Deactivating your account will remove your access to LyoDex. Your data is retained for 90 days before deletion. This action requires contacting support to reverse.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!deactivateConfirm ? (
            <Button
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground gap-2"
              onClick={() => setDeactivateConfirm(true)}
            >
              <AlertTriangle className="w-4 h-4" /> Deactivate my account
            </Button>
          ) : (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <p className="text-sm font-medium text-destructive">Are you sure you want to deactivate your account?</p>
              <p className="text-xs text-muted-foreground">
                To proceed, email <a href="mailto:support@lyodex.com" className="text-primary underline">support@lyodex.com</a> with the subject line <strong>"Account Deactivation Request"</strong> from your registered email address. Our team will process your request within 2 business days.
              </p>
              <div className="flex gap-3">
                <a href="mailto:support@lyodex.com?subject=Account%20Deactivation%20Request">
                  <Button size="sm" variant="destructive" className="gap-2">
                    <Mail className="w-3.5 h-3.5" /> Send deactivation request
                  </Button>
                </a>
                <Button size="sm" variant="ghost" onClick={() => setDeactivateConfirm(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Settings() {
  const { user, refreshUser, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState<Section>("profile");
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Please <a href="/login" className="text-primary underline">sign in</a> to access settings.</p>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  const activeNav = NAV.find((n) => n.id === activeSection)!;

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Account settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your profile, security, and preferences.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar — desktop */}
        <aside className="hidden md:block w-52 shrink-0">
          <nav className="space-y-0.5">
            {NAV.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  activeSection === id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                } ${id === "danger" ? "mt-4 hover:text-destructive hover:bg-destructive/5" + (activeSection === "danger" ? " bg-destructive/10 text-destructive" : "") : ""}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile nav dropdown */}
        <div className="md:hidden">
          <button
            onClick={() => setMobileOpen((p) => !p)}
            className="w-full flex items-center justify-between px-4 py-3 border rounded-lg bg-muted/20 text-sm font-medium"
          >
            <span className="flex items-center gap-2">
              <activeNav.icon className="w-4 h-4" />
              {activeNav.label}
            </span>
            <ChevronRight className={`w-4 h-4 transition-transform ${mobileOpen ? "rotate-90" : ""}`} />
          </button>
          {mobileOpen && (
            <div className="mt-1 border rounded-lg overflow-hidden bg-background shadow-lg">
              {NAV.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => { setActiveSection(id); setMobileOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium border-b last:border-0 transition-colors text-left ${
                    activeSection === id ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/40"
                  } ${id === "danger" ? "text-destructive" : ""}`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {activeSection === "profile" && <ProfileSection user={user} refreshUser={refreshUser} />}
          {activeSection === "security" && <SecuritySection />}
          {activeSection === "notifications" && <NotificationsSection />}
          {activeSection === "support" && <SupportSection />}
          {activeSection === "danger" && <DangerZoneSection onLogout={handleLogout} />}
        </main>
      </div>
    </div>
  );
}
