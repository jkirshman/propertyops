import { NextResponse } from "next/server";

import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { listAccessiblePropertyIds, resolveUserPropertyScope } from "@/lib/auth/property-access";
import { canArchiveProperty } from "@/lib/properties/archive-rules";
import { lifecycleFilterToIsActive, parsePropertyLifecycleFilter } from "@/lib/properties/lifecycle-views";
import { listProperties } from "@/lib/properties/properties";

/**
 * LIFECYCLE-1A: GET /api/admin/properties?status=all|active|archived — every
 * Property (Active and Archived) for Admin → Properties. Same gate as the
 * archive/restore endpoints, and the same Property scope, so every row
 * listed is one the caller can actually archive or restore.
 */
export async function GET(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!canArchiveProperty(context.capabilityKeys)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const filter = parsePropertyLifecycleFilter(searchParams.get("status"));

  const { user } = context;
  const scope = await resolveUserPropertyScope(user.id, user.organizationId, context.capabilityKeys);
  const results = await listProperties(user.organizationId, {
    isActive: lifecycleFilterToIsActive(filter),
    propertyIds: listAccessiblePropertyIds(scope),
  });

  return NextResponse.json({ properties: results, status: filter });
}
