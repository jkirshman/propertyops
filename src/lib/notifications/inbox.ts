// LIFECYCLE-1: notification inbox actions. Pure and DB-free so both the
// server (lib/notifications/notifications.ts builds its UPDATE from
// `inboxRuleFor`) and the NotificationBell (optimistic `applyInboxAction`)
// share one definition of what each action touches.
//
// State lives in two existing-style timestamps: read_at (already present)
// and dismissed_at (added here). Nothing is ever deleted.

export type InboxAction =
  | { type: "read"; id: string }
  | { type: "unread"; id: string }
  | { type: "dismiss"; id: string }
  | { type: "read_all" }
  | { type: "clear_read" };

export interface InboxRule {
  /** Which timestamp the action sets (or, for "unread", clears). */
  effect: "set_read" | "clear_read" | "set_dismissed";
  /** Targets one notification by id, rather than the whole inbox. */
  single: boolean;
  /** Only rows already read — so "Clear read" can never sweep away unread ones. */
  onlyRead: boolean;
  /** Only rows still unread — keeps an existing read_at (first-read time) intact. */
  onlyUnread: boolean;
}

export function inboxRuleFor(action: InboxAction): InboxRule {
  switch (action.type) {
    case "read":
      return { effect: "set_read", single: true, onlyRead: false, onlyUnread: true };
    case "unread":
      return { effect: "clear_read", single: true, onlyRead: true, onlyUnread: false };
    case "dismiss":
      return { effect: "set_dismissed", single: true, onlyRead: false, onlyUnread: false };
    case "read_all":
      return { effect: "set_read", single: false, onlyRead: false, onlyUnread: true };
    case "clear_read":
      return { effect: "set_dismissed", single: false, onlyRead: true, onlyUnread: false };
  }
}

export interface InboxItem {
  id: string;
  readAt: string | null;
  dismissedAt?: string | null;
}

export function isInboxVisible(item: InboxItem): boolean {
  return !item.dismissedAt;
}

export function isUnreadInInbox(item: InboxItem): boolean {
  return isInboxVisible(item) && !item.readAt;
}

/** The badge: unread, non-dismissed only. */
export function countUnreadInInbox(items: readonly InboxItem[]): number {
  return items.filter(isUnreadInInbox).length;
}

function matchesRule(item: InboxItem, rule: InboxRule, action: InboxAction): boolean {
  if (!isInboxVisible(item)) return false;
  if (rule.single && "id" in action && item.id !== action.id) return false;
  if (rule.onlyRead && !item.readAt) return false;
  if (rule.onlyUnread && item.readAt) return false;
  return true;
}

/**
 * Applies an action to the caller's own (already recipient-filtered) items
 * and returns what the inbox should now show — dismissed items drop out.
 */
export function applyInboxAction<T extends InboxItem>(items: readonly T[], action: InboxAction, nowIso: string): T[] {
  const rule = inboxRuleFor(action);
  return items
    .map((item) => {
      if (!matchesRule(item, rule, action)) return item;
      if (rule.effect === "set_read") return { ...item, readAt: nowIso };
      if (rule.effect === "clear_read") return { ...item, readAt: null };
      return { ...item, dismissedAt: nowIso };
    })
    .filter(isInboxVisible);
}
