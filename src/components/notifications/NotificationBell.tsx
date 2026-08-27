"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  deepLinkUrl: string | null;
  readAt: string | null;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  async function load() {
    try {
      const response = await fetch("/api/notifications");
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleMarkRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    await load();
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className="button"
        onClick={() => {
          setOpen((prev) => !prev);
          load();
        }}
        aria-label="Notifications"
      >
        Notifications
        {unreadCount > 0 ? <span className="badge">{unreadCount}</span> : null}
      </button>
      {open ? (
        <div
          className="card"
          style={{
            position: "absolute",
            right: 0,
            top: "2.75rem",
            width: 320,
            zIndex: 20,
            maxHeight: 360,
            overflowY: "auto",
          }}
        >
          {!loaded ? (
            <p className="muted">Loading…</p>
          ) : notifications.length === 0 ? (
            <p className="muted">No notifications yet.</p>
          ) : (
            <ul style={{ display: "flex", flexDirection: "column", gap: "0.75rem", listStyle: "none" }}>
              {notifications.map((notification) => (
                <li key={notification.id} style={{ opacity: notification.readAt ? 0.6 : 1 }}>
                  <Link
                    href={notification.deepLinkUrl ?? "/"}
                    onClick={() => {
                      if (!notification.readAt) {
                        handleMarkRead(notification.id);
                      }
                      setOpen(false);
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{notification.title}</div>
                    {notification.body ? (
                      <div className="muted" style={{ fontSize: "0.8rem" }}>
                        {notification.body}
                      </div>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
