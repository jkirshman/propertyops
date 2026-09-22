import { NextResponse } from "next/server";

import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import {
  canAccessProperty,
  listAccessibleUnitIdsForProperty,
  resolveUserPropertyScope,
} from "@/lib/auth/property-access";
import { EQUIPMENT_CAPABILITIES } from "@/lib/equipment/constants";
import { getExpectedVsActualForProperty } from "@/lib/equipment/expected-vs-actual";
import { getProperty } from "@/lib/properties/properties";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(EQUIPMENT_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user, capabilityKeys } = context;

  const property = await getProperty(user.organizationId, id);
  if (!property) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const scope = await resolveUserPropertyScope(user.id, user.organizationId, capabilityKeys);
  if (!canAccessProperty(scope, property.id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // UNIT-EQUIP-1: the comparison counts every installed item, so for a
  // Unit-restricted user it would reveal how much Equipment other Units have.
  // Computing it over only their visible subset would instead report
  // misleading "Missing" rows, so it's withheld entirely.
  if (listAccessibleUnitIdsForProperty(scope, property.id) !== null) {
    return NextResponse.json({ templateId: null, rows: [], restricted: true });
  }

  const comparison = await getExpectedVsActualForProperty(context.user.organizationId, property);
  return NextResponse.json(comparison);
}
