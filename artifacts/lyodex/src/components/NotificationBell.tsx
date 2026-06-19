import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const POLL_MS = 30_000;

interface BuyerNotification {
  id: number;
  request_id: number;
  bid_id: number;
  message: string;
  read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<BuyerNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/buyer/notifications`, { credentials: "include" });
      if (!res.ok) return;
      const data: BuyerNotification[] = await res.json();
      setNotifications(data);
    } catch {
      // silently ignore network errors on background poll
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, POLL_MS);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = async (notif: BuyerNotification) => {
    if (!notif.read) {
      try {
        await fetch(`${BASE}/api/buyer/notifications/${notif.id}/read`, {
          method: "POST",
          credentials: "include",
        });
        setNotifications(prev =>
          prev.map(n => n.id === notif.id ? { ...n, read: true } : n)
        );
      } catch {
        // ignore
      }
    }
    setOpen(false);
    setLocation(`/requests/${notif.request_id}`);
  };

  const clearAll = async () => {
    try {
      await fetch(`${BASE}/api/buyer/notifications/clear`, {
        method: "POST",
        credentials: "include",
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {
      // ignore
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center justify-center w-8 h-8 rounded-full hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-80 rounded-xl border bg-background shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2.5 border-b flex items-center justify-between">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y">
              {notifications.map(n => (
                <li key={n.id}>
                  <button
                    onClick={() => markRead(n)}
                    className={`w-full text-left px-3 py-3 hover:bg-muted/40 transition-colors flex items-start gap-2.5 ${!n.read ? "bg-primary/5" : ""}`}
                  >
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${!n.read ? "bg-primary" : "bg-transparent"}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${!n.read ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                        {n.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
