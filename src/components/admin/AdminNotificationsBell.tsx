"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

type Notification = {
  id: string;
  type: string;
  orderId: string | null;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

type NotificationsResponse = {
  notifications: Notification[];
  unreadCount: number;
};

function formatTimeAgo(date: string): string {
  try {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.round(diffMs / 1000);
    if (diffSec < 0) return "just now";
    if (diffSec < 60) return "just now";
    const diffMin = Math.round(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.round(diffH / 24);
    if (diffD < 7) return `${diffD}d ago`;
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

function formatFullDate(date: string): string {
  try {
    return new Date(date).toLocaleString();
  } catch {
    return "";
  }
}

async function fetchNotifications(): Promise<NotificationsResponse | null> {
  try {
    const res = await fetch("/api/admin/notifications", {
      method: "GET",
      credentials: "include",
      headers: { "x-nextjs-data": "true" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function markRead(id: string): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/notifications", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markRead", id }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function markAllRead(): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/notifications", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markAllRead" }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export default function AdminNotificationsBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<number | null>(null);

  function refresh() {
    setLoading(true);
    fetchNotifications()
      .then((data) => {
        if (data) {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount);
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
    intervalRef.current = window.setInterval(refresh, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function handleMarkRead(id: string) {
    markRead(id).then((ok) => {
      if (ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
        );
        setUnreadCount((c) => (c > 0 ? c - 1 : 0));
      }
    });
  }

  function handleMarkAllRead() {
    markAllRead().then((ok) => {
      if (ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    });
  }

  const unread = notifications.filter((n) => !n.read);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded p-2 text-ink hover:bg-ink/10"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="text-xl" aria-hidden="true">
          🔔
        </span>
        {unreadCount > 0 && (
          <span
            className="absolute top-0.5 right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-camel-dark text-[10px] font-bold text-white"
            aria-label={`${unreadCount} unread notifications`}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {open && (
        <div
          className="absolute top-full right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-ink/10 bg-paper shadow-lg"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="flex items-center justify-between border-b border-ink/10 px-3 py-2">
            <span className="text-sm font-medium">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  handleMarkAllRead();
                }}
                className="text-xs text-camel-dark hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="px-3 py-4 text-sm text-ink-soft">Loading…</div>
            ) : unread.length === 0 ? (
              <div className="px-3 py-4 text-sm text-ink-soft">No unread notifications</div>
            ) : (
              unread.map((n) => (
                <div
                  key={n.id}
                  className="border-b border-ink/5 px-3 py-2 hover:bg-ink/5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-ink-soft">{n.message}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleMarkRead(n.id)}
                      className="text-xs text-camel-dark hover:underline"
                      aria-label="Mark as read"
                    >
                      Dismiss
                    </button>
                  </div>
                  <div className="mt-1 text-xs text-ink-soft">
                    <time dateTime={n.createdAt} title={formatFullDate(n.createdAt)}>
                      {formatTimeAgo(n.createdAt)}
                    </time>
                    {n.orderId && (
                      <Link
                        href={`/admin/orders/${n.orderId}`}
                        className="ml-2 text-camel-dark hover:underline"
                        onClick={() => setOpen(false)}
                      >
                        View order
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
