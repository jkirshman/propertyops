import { NextResponse } from "next/server";

import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { listAccessiblePropertyIds, resolveUserPropertyScope } from "@/lib/auth/property-access";
import { PROPERTY_CAPABILITIES } from "@/lib/properties/constants";
import { listCoverPhotosForOrganization } from "@/lib/property-photos/property-photos";

// Read-only: powers cover-photo thumbnails on the Properties list without
// adding a join to listProperties' existing shape/consumers. Scoped to the
// same properties listProperties would return for this user (ACCESS-1) — an
// unfiltered version of this endpoint would otherwise leak every property's
// cover photo regardless of the requester's access.
export async function GET() {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(PROPERTY_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const scope = await resolveUserPropertyScope(
    context.user.id,
    context.user.organizationId,
    context.capabilityKeys,
  );

  const covers = await listCoverPhotosForOrganization(context.user.organizationId, {
    propertyIds: listAccessiblePropertyIds(scope),
  });
  return NextResponse.json({ covers });
}
