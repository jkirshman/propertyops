import { handleInboxAction } from "@/lib/notifications/inbox-route";

export async function POST() {
  return handleInboxAction({ type: "read_all" });
}
