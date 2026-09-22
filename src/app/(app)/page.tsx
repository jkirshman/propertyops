import { AppBrief } from "@/components/home/AppBrief";
import { UpcomingOperationsPanel } from "@/components/home/UpcomingOperationsPanel";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { resolveUserPropertyScope } from "@/lib/auth/property-access";
import { CALENDAR_CAPABILITIES } from "@/lib/calendar/constants";
import { getAppBrief } from "@/lib/home/app-brief";
import { getOrganizationTimezone } from "@/lib/organizations/organizations";

export default async function DashboardHomePage() {
  const context = await getCurrentUserWithCapabilities();
  const canViewCalendar = Boolean(context?.capabilityKeys.includes(CALENDAR_CAPABILITIES.VIEW));

  const scope = context
    ? await resolveUserPropertyScope(context.user.id, context.user.organizationId, context.capabilityKeys)
    : null;

  const brief =
    context && scope
      ? await getAppBrief(context.user.organizationId, context.capabilityKeys, context.user.id, scope)
      : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <h1>Welcome to PropertyOps Hub</h1>
        <p className="muted">What needs your attention today.</p>
      </div>
      {brief ? <AppBrief brief={brief} /> : null}
      {canViewCalendar && context && scope ? (
        <UpcomingOperationsPanel
          organizationId={context.user.organizationId}
          timezone={await getOrganizationTimezone(context.user.organizationId)}
          scope={scope}
        />
      ) : null}
    </div>
  );
}
