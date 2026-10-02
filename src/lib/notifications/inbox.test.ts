import { describe, expect, it } from "vitest";

import { applyInboxAction, countUnreadInInbox, inboxRuleFor, isInboxVisible, type InboxItem } from "./inbox";

const NOW = "2026-10-02T15:00:00.000Z";
const EARLIER = "2026-10-01T09:00:00.000Z";

const unreadA: InboxItem = { id: "a", readAt: null, dismissedAt: null };
const unreadB: InboxItem = { id: "b", readAt: null, dismissedAt: null };
const readC: InboxItem = { id: "c", readAt: EARLIER, dismissedAt: null };
const INBOX = [unreadA, unreadB, readC];

const ids = (items: InboxItem[]) => items.map((item) => item.id);

describe("read / unread", () => {
  it("marks one notification read and the badge drops by one", () => {
    const next = applyInboxAction(INBOX, { type: "read", id: "a" }, NOW);
    expect(next.find((item) => item.id === "a")?.readAt).toBe(NOW);
    expect(countUnreadInInbox(INBOX)).toBe(2);
    expect(countUnreadInInbox(next)).toBe(1);
  });

  it("keeps the original read time when an already-read notification is opened again", () => {
    const next = applyInboxAction(INBOX, { type: "read", id: "c" }, NOW);
    expect(next.find((item) => item.id === "c")?.readAt).toBe(EARLIER);
  });

  it("marks a read notification unread again", () => {
    const next = applyInboxAction(INBOX, { type: "unread", id: "c" }, NOW);
    expect(next.find((item) => item.id === "c")?.readAt).toBeNull();
    expect(countUnreadInInbox(next)).toBe(3);
  });

  it("marks all as read and clears the badge", () => {
    const next = applyInboxAction(INBOX, { type: "read_all" }, NOW);
    expect(countUnreadInInbox(next)).toBe(0);
    expect(ids(next)).toEqual(["a", "b", "c"]);
  });
});

describe("dismiss / clear read", () => {
  it("dismisses one notification out of the list without touching the others", () => {
    const next = applyInboxAction(INBOX, { type: "dismiss", id: "b" }, NOW);
    expect(ids(next)).toEqual(["a", "c"]);
  });

  it("can dismiss an unread notification explicitly, and the badge no longer counts it", () => {
    const next = applyInboxAction(INBOX, { type: "dismiss", id: "a" }, NOW);
    expect(countUnreadInInbox(next)).toBe(1);
  });

  it("Clear read dismisses only read notifications — unread ones survive", () => {
    const next = applyInboxAction(INBOX, { type: "clear_read" }, NOW);
    expect(ids(next)).toEqual(["a", "b"]);
    expect(countUnreadInInbox(next)).toBe(2);
  });

  it("never counts a dismissed notification as unread", () => {
    expect(countUnreadInInbox([{ id: "x", readAt: null, dismissedAt: EARLIER }])).toBe(0);
    expect(isInboxVisible({ id: "x", readAt: null, dismissedAt: EARLIER })).toBe(false);
  });

  it("soft-dismisses: the action sets dismissedAt rather than deleting a row", () => {
    expect(inboxRuleFor({ type: "dismiss", id: "a" }).effect).toBe("set_dismissed");
    expect(inboxRuleFor({ type: "clear_read" }).effect).toBe("set_dismissed");
  });
});

describe("inboxRuleFor (drives the server UPDATE)", () => {
  it("restricts Clear read to rows that are already read", () => {
    expect(inboxRuleFor({ type: "clear_read" })).toEqual({
      effect: "set_dismissed",
      single: false,
      onlyRead: true,
      onlyUnread: false,
    });
  });

  it("targets exactly one row for per-notification actions", () => {
    for (const type of ["read", "unread", "dismiss"] as const) {
      expect(inboxRuleFor({ type, id: "a" }).single).toBe(true);
    }
    expect(inboxRuleFor({ type: "read_all" }).single).toBe(false);
  });

  it("an id that is not in the caller's own inbox changes nothing", () => {
    // The server applies the same rule within WHERE recipient_user_id = <session user>.
    expect(applyInboxAction(INBOX, { type: "dismiss", id: "someone-elses" }, NOW)).toEqual(INBOX);
    expect(applyInboxAction(INBOX, { type: "read", id: "someone-elses" }, NOW)).toEqual(INBOX);
  });
});
