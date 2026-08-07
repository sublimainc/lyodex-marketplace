import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Shield, ListFilter, Ban, UserCheck, ChevronLeft, ChevronRight, ExternalLink, Lock, Unlock } from "lucide-react";
import { format } from "date-fns";
import { ADMIN_ROLE_LABELS, ADMIN_ROLE_OPTIONS, AdminUser, PAGE_SIZE, Tab, api } from "../shared";

// ─── User Profile Dialog ──────────────────────────────────────────────────────

export function UserProfileDialog({ user, onClose }: { user: AdminUser; onClose: () => void }) {
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

// ─── Tab: Users ───────────────────────────────────────────────────────────────

export function UsersTab() {
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
