"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { applyInboxAction, countUnreadInInbox, type InboxAction } from "@/lib/notifications/inbox";

interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  deepLinkUrl: string | null;
  readAt: string | null;
  dismissedAt?: string | null;
}

// LIFECYCLE-1: each action's server route; the server only ever touches the
// session user's own notifications.
function actionUrl(action: InboxAction): string {
  switch (action.type) {
    case "read":
    case "unread":
    case "dismiss":
      return `/api/notifications/${action.id}/${action.type}`;
    case "read_all":
      return "/api/notifications/read-all";
    case "clear_read":
      return "/api/notifications/clear-read";
  }
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

  // Optimistic: update the list and badge at once with the same rule the
  // server applies, then re-sync (the server count also covers notifications
  // beyond the 20 shown here).
  async function run(action: InboxAction) {
    const next = applyInboxAction(notifications, action, new Date().toISOString());
    const unreadDelta = countUnreadInInbox(next) - countUnreadInInbox(notifications);
    setNotifications(next);
    setUnreadCount((count) => Math.max(0, count + unreadDelta));
    await fetch(actionUrl(action), { method: "POST" }).catch(() => null);
    await load();
  }

  const hasUnread = unreadCount > 0;
  const hasRead = notifications.some((notification) => notification.readAt);

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
        <div className="card notification-panel">
          {loaded && (hasUnread || hasRead) ? (
            <div className="notification-panel-actions">
              {hasUnread ? (
                <button type="button" className="notification-text-action" onClick={() => run({ type: "read_all" })}>
                  Mark all as read
                </button>
              ) : null}
              {hasRead ? (
                <button
                  type="button"
                  className="notification-text-action"
                  onClick={() => run({ type: "clear_read" })}
                  title="Removes read notifications from this list. Unread ones stay."
                >
                  Clear read
                </button>
              ) : null}
            </div>
          ) : null}
          {!loaded ? (
            <p className="muted">Loading…</p>
          ) : notifications.length === 0 ? (
            <p className="muted">No notifications.</p>
          ) : (
            <ul className="notification-list">
              {notifications.map((notification) => {
                const unread = !notification.readAt;
                return (
                  <li key={notification.id} className="notification-row" data-unread={unread ? "true" : undefined}>
                    <span className="notification-unread-dot" aria-hidden="true" />
                    <Link
                      href={notification.deepLinkUrl ?? "/"}
                      className="row-link row-link-compact notification-row-link"
                      onClick={() => {
                        if (unread) {
                          run({ type: "read", id: notification.id });
                        }
                        setOpen(false);
                      }}
                    >
                      <div className="clickable-title" style={{ fontWeight: unread ? 600 : 500, fontSize: "0.9rem" }}>
                        {unread ? <span className="sr-only">Unread: </span> : null}
                        {notification.title}
                      </div>
                      {notification.body ? (
                        <div className="muted" style={{ fontSize: "0.8rem" }}>
                          {notification.body}
                        </div>
                      ) : null}
                    </Link>
                    <div className="notification-row-actions">
                      <button
                        type="button"
                        className="notification-icon-action"
                        onClick={() => run({ type: unread ? "read" : "unread", id: notification.id })}
                        aria-label={unread ? "Mark as read" : "Mark as unread"}
                        title={unread ? "Mark as read" : "Mark as unread"}
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                          {unread ? (
                            <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          ) : (
                            <circle cx="8" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                          )}
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="notification-icon-action"
                        onClick={() => run({ type: "dismiss", id: notification.id })}
                        aria-label="Dismiss notification"
                        title="Dismiss"
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
