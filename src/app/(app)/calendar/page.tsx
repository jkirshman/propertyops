import { CalendarView } from "@/components/calendar/CalendarView";
import { requireCapability } from "@/lib/auth/require-capability";
import { CALENDAR_CAPABILITIES } from "@/lib/calendar/constants";
import { getOrganizationTimezone } from "@/lib/organizations/organizations";

export default async function CalendarPage() {
  const context = await requireCapability(CALENDAR_CAPABILITIES.VIEW);
  const timezone = await getOrganizationTimezone(context.user.organizationId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div>
        <h1>Operations Calendar</h1>
        <p className="muted">
          Work orders, preventive maintenance, inspections, compliance, and lease milestones in one view.
        </p>
      </div>
      <CalendarView
        timezone={timezone}
        canCreateManualEvent={context.capabilityKeys.includes(CALENDAR_CAPABILITIES.CREATE_MANUAL_EVENT)}
      />
    </div>
  );
}
