import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import { createEquipmentCatalogItem, listEquipmentCatalogItems } from "@/lib/equipment/catalog";
import { EQUIPMENT_CAPABILITIES, EQUIPMENT_CATALOG_CAPABILITIES } from "@/lib/equipment/constants";
import { createEquipmentCatalogItemSchema } from "@/lib/validation/equipment-catalog";

export async function GET(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  // The catalog is reference data needed anywhere equipment is viewed, created,
  // or templated, so any of these capabilities is sufficient to read the list.
  const canView =
    context.capabilityKeys.includes(EQUIPMENT_CATALOG_CAPABILITIES.VIEW) ||
    context.capabilityKeys.includes(EQUIPMENT_CATALOG_CAPABILITIES.MANAGE) ||
    context.capabilityKeys.includes(EQUIPMENT_CAPABILITIES.VIEW);
  if (!canView) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("activeOnly") === "true";

  const items = await listEquipmentCatalogItems(context.user.organizationId, { activeOnly });
  return NextResponse.json({ catalogItems: items });
}

export async function POST(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(EQUIPMENT_CATALOG_CAPABILITIES.MANAGE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createEquipmentCatalogItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { user } = context;
  const catalogItem = await createEquipmentCatalogItem(user.organizationId, parsed.data);

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "equipment_catalog.create",
    entityType: "equipment_catalog_item",
    entityId: catalogItem.id,
    after: catalogItem,
  });

  return NextResponse.json({ catalogItem }, { status: 201 });
}
