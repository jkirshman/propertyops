import { UpcomingOperationsPanel } from "@/components/home/UpcomingOperationsPanel";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { CALENDAR_CAPABILITIES } from "@/lib/calendar/constants";
import { getOrganizationTimezone } from "@/lib/organizations/organizations";

export default async function DashboardHomePage() {
  const context = await getCurrentUserWithCapabilities();
  const canViewCalendar = Boolean(context?.capabilityKeys.includes(CALENDAR_CAPABILITIES.VIEW));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <h1>Welcome to PropertyOps Hub</h1>
        <p className="muted">
          Property, work order, equipment, and asset management are in place, with operations
          scheduling now layered on top.
        </p>
      </div>
      {canViewCalendar && context ? (
        <UpcomingOperationsPanel
          organizationId={context.user.organizationId}
          timezone={await getOrganizationTimezone(context.user.organizationId)}
        />
      ) : null}
    </div>
  );
}
