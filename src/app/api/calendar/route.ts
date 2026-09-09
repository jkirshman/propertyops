import { NextResponse } from "next/server";

import { listCalendarEvents } from "@/lib/calendar";
import { CALENDAR_CAPABILITIES, CALENDAR_SOURCE_TYPES, type CalendarSourceType } from "@/lib/calendar/constants";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { getOrganizationTimezone } from "@/lib/organizations/organizations";

export async function GET(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!context.capabilityKeys.includes(CALENDAR_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const sourceTypeParam = searchParams.get("sourceType");
  const sourceType =
    sourceTypeParam && (CALENDAR_SOURCE_TYPES as readonly string[]).includes(sourceTypeParam)
      ? (sourceTypeParam as CalendarSourceType)
      : undefined;

  const timezone = await getOrganizationTimezone(context.user.organizationId);

  const events = await listCalendarEvents(context.user.organizationId, timezone, {
    propertyId: searchParams.get("propertyId") ?? undefined,
    sourceType,
    status: searchParams.get("status") ?? undefined,
    vendorId: searchParams.get("vendorId") ?? undefined,
    assignedUserId: searchParams.get("assignedUserId") ?? undefined,
    upcomingOnly: searchParams.get("upcomingOnly") === "true",
    overdueOnly: searchParams.get("overdueOnly") === "true",
    rangeStart: searchParams.get("rangeStart") ?? undefined,
    rangeEnd: searchParams.get("rangeEnd") ?? undefined,
    includeCompletedInspections: searchParams.get("includeCompletedInspections") === "true",
  });

  return NextResponse.json({ events, timezone });
}
