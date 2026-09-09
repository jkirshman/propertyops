import { NextResponse } from "next/server";

import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { PROPERTY_CAPABILITIES } from "@/lib/properties/constants";
import { listCoverPhotosForOrganization } from "@/lib/property-photos/property-photos";

// Org-wide, read-only: powers cover-photo thumbnails on the Properties list
// without adding a join to listProperties' existing shape/consumers.
export async function GET() {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(PROPERTY_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const covers = await listCoverPhotosForOrganization(context.user.organizationId);
  return NextResponse.json({ covers });
}
