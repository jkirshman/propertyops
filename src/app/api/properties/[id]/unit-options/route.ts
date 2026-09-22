import { NextResponse } from "next/server";

import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { canAccessProperty, resolveUserPropertyScope } from "@/lib/auth/property-access";
import { INSPECTION_CAPABILITIES } from "@/lib/inspections/constants";
import { getProperty } from "@/lib/properties/properties";
import { getRecordUnitOptions } from "@/lib/property-units/record-units";
import { WORK_ORDER_CAPABILITIES } from "@/lib/work-orders/constants";

// UNIT-OPS-1: only editors of Unit-ownable records need Unit options.
const UNIT_OPTION_CAPABILITIES = [
  WORK_ORDER_CAPABILITIES.CREATE,
  WORK_ORDER_CAPABILITIES.EDIT,
  INSPECTION_CAPABILITIES.CREATE,
  INSPECTION_CAPABILITIES.EDIT,
];

/**
 * UNIT-OPS-1: the Unit/Suite selector options for Work Order / Inspection
 * forms — the active Units of this Property the caller can access (never
 * another Unit's label), whether the Property type uses Units at all, and
 * whether the caller has whole-Property access.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!UNIT_OPTION_CAPABILITIES.some((capability) => context.capabilityKeys.includes(capability))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { user, capabilityKeys } = context;
  const scope = await resolveUserPropertyScope(user.id, user.organizationId, capabilityKeys);
  if (!canAccessProperty(scope, id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const property = await getProperty(user.organizationId, id);
  if (!property) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ unitOptions: await getRecordUnitOptions(user.organizationId, property, scope) });
}
