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
    <div className="notification-bell">
      <button
        type="button"
        className="button"
        onClick={() => {
          setOpen((prev) => !prev);
          load();
        }}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
      >
        {/* MOBILE-1: the text label collapses to an icon on narrow screens so
            the bell can stay in the header bar next to the menu button. */}
        <svg
          className="notification-bell-icon"
          width="18"
          height="18"
          viewBox="0 0 20 20"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M10 2.5a5 5 0 0 0-5 5v3.2L3.5 13.5h13L15 10.7V7.5a5 5 0 0 0-5-5zM8 15.5a2 2 0 0 0 4 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
        <span className="notification-bell-label">Notifications</span>
        {unreadCount > 0 ? <span className="badge">{unreadCount}</span> : null}
      </button>
      {open ? (
        <div
          className="card"
          style={{
            position: "absolute",
            right: 0,
            top: "2.75rem",
            width: "min(320px, calc(100vw - 2rem))",
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
            <ul style={{ display: "flex", flexDirection: "column", gap: "0.35rem", listStyle: "none" }}>
              {notifications.map((notification) => (
                <li key={notification.id} style={{ opacity: notification.readAt ? 0.6 : 1 }}>
                  <Link
                    href={notification.deepLinkUrl ?? "/"}
                    className="row-link row-link-compact"
                    onClick={() => {
                      if (!notification.readAt) {
                        handleMarkRead(notification.id);
                      }
                      setOpen(false);
                    }}
                  >
                    <div className="clickable-title" style={{ fontWeight: 600, fontSize: "0.9rem" }}>{notification.title}</div>
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
