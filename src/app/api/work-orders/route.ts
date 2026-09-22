import { NextResponse } from "next/server";

import { recordAuditEvent } from "@/db/audit";
import { getAsset } from "@/lib/assets/assets";
import { getCurrentUserWithCapabilities } from "@/lib/auth/current-user";
import {
  canAccessProperty,
  canUserAccessPropertyUnit,
  forbiddenResponseBody,
  listAccessiblePropertyIds,
  resolveUserPropertyScope,
} from "@/lib/auth/property-access";
import { redactHiddenEquipmentLink, resolveHiddenEquipmentIds } from "@/lib/equipment/equipment-access";
import { getAccessiblePropertyEquipment } from "@/lib/equipment/property-equipment";
import { createNotification } from "@/lib/notifications/notifications";
import { getProperty } from "@/lib/properties/properties";
import { getPropertyComponent } from "@/lib/property-components/property-components";
import { resolveRecordUnit } from "@/lib/property-units/record-units";
import {
  buildWorkOrderAssignedNotification,
  buildWorkOrderScheduledNotification,
} from "@/lib/work-orders/notification-events";
import { WORK_ORDER_CAPABILITIES } from "@/lib/work-orders/constants";
import { filterAccessibleWorkOrders } from "@/lib/work-orders/work-order-access";
import { createWorkOrder, listWorkOrders } from "@/lib/work-orders/work-orders";
import { createWorkOrderSchema } from "@/lib/validation/work-orders";
import { VENDOR_CAPABILITIES } from "@/lib/vendors/constants";
import { getVendor } from "@/lib/vendors/vendors";

export async function GET(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(WORK_ORDER_CAPABILITIES.VIEW)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const scope = await resolveUserPropertyScope(
    context.user.id,
    context.user.organizationId,
    context.capabilityKeys,
  );

  const { searchParams } = new URL(request.url);
  // UNIT-EQUIP-1: filtering by Equipment the caller can't see would reveal
  // which Work Orders concern another Unit's Equipment — answer "none".
  const propertyEquipmentId = searchParams.get("propertyEquipmentId") ?? undefined;
  if (
    propertyEquipmentId &&
    !(await getAccessiblePropertyEquipment(context.user.organizationId, scope, propertyEquipmentId))
  ) {
    return NextResponse.json({ workOrders: [] });
  }

  const [rows, hiddenEquipmentIds] = await Promise.all([
    listWorkOrders(context.user.organizationId, {
      search: searchParams.get("search") ?? undefined,
      propertyId: searchParams.get("propertyId") ?? undefined,
      propertyEquipmentId,
      assetId: searchParams.get("assetId") ?? undefined,
      propertyComponentId: searchParams.get("propertyComponentId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      priority: searchParams.get("priority") ?? undefined,
      categoryId: searchParams.get("categoryId") ?? undefined,
      assignedUserId: searchParams.get("assignedUserId") ?? undefined,
      vendorId: searchParams.get("vendorId") ?? undefined,
      propertyIds: listAccessiblePropertyIds(scope),
    }),
    resolveHiddenEquipmentIds(context.user.organizationId, scope),
  ]);

  // UNIT-OPS-1: another Unit's Work Orders are dropped entirely (search and
  // every filter included, since they all narrow this same list). A visible
  // legacy Shared Work Order that still references another Unit's Equipment
  // keeps UNIT-EQUIP-1's link redaction.
  const workOrders = filterAccessibleWorkOrders(scope, rows).map((row) =>
    redactHiddenEquipmentLink(row, hiddenEquipmentIds),
  );
  return NextResponse.json({ workOrders });
}

export async function POST(request: Request) {
  const context = await getCurrentUserWithCapabilities();
  if (!context) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!context.capabilityKeys.includes(WORK_ORDER_CAPABILITIES.CREATE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createWorkOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { user } = context;

  const scope = await resolveUserPropertyScope(user.id, user.organizationId, context.capabilityKeys);
  if (!canAccessProperty(scope, parsed.data.propertyId)) {
    return NextResponse.json(forbiddenResponseBody(), { status: 403 });
  }

  const property = await getProperty(user.organizationId, parsed.data.propertyId);
  if (!property) {
    return NextResponse.json({ error: "invalid_property" }, { status: 400 });
  }

  const equipment = parsed.data.propertyEquipmentId
    ? await getAccessiblePropertyEquipment(user.organizationId, scope, parsed.data.propertyEquipmentId)
    : null;
  if (parsed.data.propertyEquipmentId && (!equipment || equipment.propertyId !== parsed.data.propertyId)) {
    return NextResponse.json({ error: "invalid_equipment" }, { status: 400 });
  }

  // UNIT-OPS-1: Unit-owned Equipment fixes the Work Order's Unit (adopted
  // when the request doesn't name one, rejected when it contradicts).
  const unit = await resolveRecordUnit({
    organizationId: user.organizationId,
    scope,
    property,
    mode: "create",
    requestedUnitId: parsed.data.propertyUnitId,
    currentUnitId: null,
    equipmentUnitId: equipment?.propertyUnitId ?? null,
    recordNoun: "work orders",
  });
  if (!unit.ok) {
    return NextResponse.json(unit.body, { status: unit.status });
  }

  if (parsed.data.propertyComponentId) {
    const component = await getPropertyComponent(user.organizationId, parsed.data.propertyComponentId);
    if (!component || component.propertyId !== parsed.data.propertyId) {
      return NextResponse.json({ error: "invalid_component" }, { status: 400 });
    }
  }

  if (parsed.data.assetId) {
    const asset = await getAsset(user.organizationId, parsed.data.assetId);
    if (!asset) {
      return NextResponse.json({ error: "invalid_asset" }, { status: 400 });
    }
  }

  if (parsed.data.vendorId) {
    if (!context.capabilityKeys.includes(VENDOR_CAPABILITIES.ASSIGN_WORK_ORDERS)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const vendor = await getVendor(user.organizationId, parsed.data.vendorId);
    if (!vendor) {
      return NextResponse.json({ error: "invalid_vendor" }, { status: 400 });
    }
  }

  if (
    (parsed.data.scheduledStartAt || parsed.data.scheduledEndAt) &&
    !context.capabilityKeys.includes(WORK_ORDER_CAPABILITIES.SCHEDULE)
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const workOrder = await createWorkOrder(user.organizationId, user.id, {
    ...parsed.data,
    propertyUnitId: unit.propertyUnitId,
  });

  await recordAuditEvent({
    organizationId: user.organizationId,
    actorUserId: user.id,
    action: "work_order.create",
    entityType: "work_order",
    entityId: workOrder.id,
    after: workOrder,
  });

  // UNIT-OPS-1: never send a Work Order's title to an assignee who can't open it.
  if (
    workOrder.assignedUserId &&
    workOrder.assignedUserId !== user.id &&
    (await canUserAccessPropertyUnit(
      user.organizationId,
      workOrder.assignedUserId,
      workOrder.propertyId,
      workOrder.propertyUnitId,
    ))
  ) {
    const notification = buildWorkOrderAssignedNotification(workOrder);
    await createNotification({
      organizationId: user.organizationId,
      recipientUserId: workOrder.assignedUserId,
      actorUserId: user.id,
      ...notification,
    });

    if (workOrder.scheduledStartAt) {
      await createNotification({
        organizationId: user.organizationId,
        recipientUserId: workOrder.assignedUserId,
        actorUserId: user.id,
        ...buildWorkOrderScheduledNotification(workOrder),
      });
    }
  }

  return NextResponse.json({ workOrder }, { status: 201 });
}
