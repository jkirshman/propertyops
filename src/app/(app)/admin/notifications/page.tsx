import { SendTestNotificationButton } from "@/components/admin/SendTestNotificationButton";
import { ADMIN_CAPABILITIES } from "@/lib/admin/admin-hub-config";
import { requireAdminCapability } from "@/lib/admin/require-admin-capability";

export default async function AdminNotificationsPage() {
  await requireAdminCapability(ADMIN_CAPABILITIES.NOTIFICATIONS);

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        <h1>Notifications</h1>
        <p className="muted">
          The notification core stores in-app notifications with a recipient, type, and read
          state. Real event types will be added as future modules produce them.
        </p>
      </div>
      <SendTestNotificationButton />
    </div>
  );
}
