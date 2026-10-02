import { handleInboxAction } from "@/lib/notifications/inbox-route";

/** Dismisses only notifications already read — unread ones always survive. */
export async function POST() {
  return handleInboxAction({ type: "clear_read" });
}
