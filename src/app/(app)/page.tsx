import { AppBrief } from "@/components/home/AppBrief";
import { UpcomingOperationsPanel } from "@/components/home/UpcomingOperationsPanel";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { CALENDAR_CAPABILITIES } from "@/lib/calendar/constants";
import { getAppBrief } from "@/lib/home/app-brief";
import { getOrganizationTimezone } from "@/lib/organizations/organizations";

export default async function DashboardHomePage() {
  const context = await getCurrentUserWithCapabilities();
  const canViewCalendar = Boolean(context?.capabilityKeys.includes(CALENDAR_CAPABILITIES.VIEW));

  const brief = context
    ? await getAppBrief(context.user.organizationId, context.capabilityKeys)
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <h1>Welcome to PropertyOps Hub</h1>
        <p className="muted">What needs your attention today.</p>
      </div>
      {brief ? <AppBrief brief={brief} /> : null}
      {canViewCalendar && context ? (
        <UpcomingOperationsPanel
          organizationId={context.user.organizationId}
          timezone={await getOrganizationTimezone(context.user.organizationId)}
        />
      ) : null}
    </div>
  );
}
