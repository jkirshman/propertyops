import Link from "next/link";
import { notFound } from "next/navigation";

import { ManualEventEditPanel } from "@/components/calendar/ManualEventEditPanel";
import { requireCapability } from "@/lib/auth/require-capability";
import { CALENDAR_CAPABILITIES } from "@/lib/calendar/constants";
import { getOperationalEvent } from "@/lib/calendar/operational-events";
import { getOrganizationTimezone } from "@/lib/organizations/organizations";
import { listProperties } from "@/lib/properties/properties";

export default async function ManualEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireCapability(CALENDAR_CAPABILITIES.VIEW, "/calendar");

  const event = await getOperationalEvent(context.user.organizationId, id);
  if (!event) {
    notFound();
  }

  const [properties, timezone] = await Promise.all([
    listProperties(context.user.organizationId, { isActive: true }),
    getOrganizationTimezone(context.user.organizationId),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div className="muted" style={{ fontSize: "0.85rem" }}>
            <Link href="/calendar">← Back to calendar</Link>
          </div>
          <h1 style={{ marginBottom: "0.3rem" }}>{event.title}</h1>
        </div>
      </div>

      <ManualEventEditPanel
        event={event}
        properties={properties.map((property) => ({ id: property.id, name: property.name }))}
        timezone={timezone}
        canEdit={context.capabilityKeys.includes(CALENDAR_CAPABILITIES.EDIT_MANUAL_EVENT)}
      />
    </div>
  );
}
