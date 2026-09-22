import Link from "next/link";
import { notFound } from "next/navigation";

import { WorkOrderDetailPanel } from "@/components/work-orders/WorkOrderDetailPanel";
import { listAssets } from "@/lib/assets/assets";
import { requireCapability } from "@/lib/auth/require-capability";
import { resolveUserPropertyScope } from "@/lib/auth/property-access";
import { redactHiddenEquipmentLink, resolveHiddenEquipmentIds } from "@/lib/equipment/equipment-access";
import { getOrganizationTimezone } from "@/lib/organizations/organizations";
import { getProperty } from "@/lib/properties/properties";
import { getPropertyUnit } from "@/lib/property-units/property-units";
import { getRecordUnitOptions } from "@/lib/property-units/record-units";
import { formatRecordUnitLabel } from "@/lib/property-units/unit-display";
import { listOrganizationUsers } from "@/lib/users/users";
import { VENDOR_CAPABILITIES } from "@/lib/vendors/constants";
import { listVendors } from "@/lib/vendors/vendors";
import {
  WORK_ORDER_CAPABILITIES,
  WORK_ORDER_SOURCE_LABELS,
  WORK_ORDER_STATUS_LABELS,
  type WorkOrderSource,
  type WorkOrderStatus,
} from "@/lib/work-orders/constants";
import { listWorkOrderCategories } from "@/lib/work-orders/categories";
import { getAccessibleWorkOrder } from "@/lib/work-orders/work-order-access";

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireCapability(WORK_ORDER_CAPABILITIES.VIEW, "/work-orders");

  const scope = await resolveUserPropertyScope(
    context.user.id,
    context.user.organizationId,
    context.capabilityKeys,
  );
  // UNIT-OPS-1: another Unit's Work Order is a 404, same as another Property's.
  const workOrder = await getAccessibleWorkOrder(context.user.organizationId, scope, id);
  if (!workOrder) {
    notFound();
  }

  const { capabilityKeys } = context;
  const { propertyEquipmentId, propertyEquipmentRestricted } = redactHiddenEquipmentLink(
    workOrder,
    await resolveHiddenEquipmentIds(context.user.organizationId, scope),
  );

  const [property, currentUnit, categories, users, assets, vendors, timezone] = await Promise.all([
    getProperty(context.user.organizationId, workOrder.propertyId),
    workOrder.propertyUnitId
      ? getPropertyUnit(context.user.organizationId, workOrder.propertyId, workOrder.propertyUnitId)
      : Promise.resolve(null),
    listWorkOrderCategories(context.user.organizationId, { activeOnly: true }),
    listOrganizationUsers(context.user.organizationId),
    listAssets(context.user.organizationId, { isActive: true }),
    listVendors(context.user.organizationId, { isActive: true }),
    getOrganizationTimezone(context.user.organizationId),
  ]);

  const canEdit = capabilityKeys.includes(WORK_ORDER_CAPABILITIES.EDIT);
  // Only ever the viewer's own accessible Units — safe for view-only users too.
  const unitOptions = property ? await getRecordUnitOptions(context.user.organizationId, property, scope) : null;
  // "(inactive)" keeps a deactivated Unit's history readable (UNIT-OPS-1).
  const unitLabel = formatRecordUnitLabel({
    propertyUnitId: workOrder.propertyUnitId,
    unitLabel: currentUnit?.unitLabel ?? null,
    unitIsActive: currentUnit?.isActive ?? null,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div className="muted" style={{ fontSize: "0.85rem" }}>{workOrder.number}</div>
          <h1 style={{ marginBottom: "0.3rem" }}>{workOrder.subject}</h1>
          <div className="muted" style={{ fontSize: "0.9rem" }}>
            {property ? <Link href={`/properties/${property.id}`} className="text-link">{property.name}</Link> : "Unknown property"}
            {workOrder.propertyUnitId ? ` · ${unitLabel}` : ""}
            {" · "}
            {WORK_ORDER_STATUS_LABELS[workOrder.status as WorkOrderStatus] ?? workOrder.status}
            {workOrder.source && workOrder.source !== "staff" ? (
              <>
                {" · "}
                {WORK_ORDER_SOURCE_LABELS[workOrder.source as WorkOrderSource] ?? workOrder.source}
              </>
            ) : null}
          </div>
        </div>
      </div>

      <WorkOrderDetailPanel
        initialWorkOrder={{
          id: workOrder.id,
          number: workOrder.number,
          subject: workOrder.subject,
          description: workOrder.description,
          categoryId: workOrder.categoryId,
          priority: workOrder.priority,
          status: workOrder.status,
          assignedUserId: workOrder.assignedUserId,
          propertyUnitId: workOrder.propertyUnitId,
          propertyEquipmentId,
          propertyEquipmentRestricted,
          assetId: workOrder.assetId,
          resolutionSummary: workOrder.resolutionSummary,
          resolvedAt: workOrder.resolvedAt ? workOrder.resolvedAt.toISOString() : null,
          closedAt: workOrder.closedAt ? workOrder.closedAt.toISOString() : null,
          vendorId: workOrder.vendorId,
          scheduledStartAt: workOrder.scheduledStartAt ? workOrder.scheduledStartAt.toISOString() : null,
          scheduledEndAt: workOrder.scheduledEndAt ? workOrder.scheduledEndAt.toISOString() : null,
        }}
        propertyId={workOrder.propertyId}
        unitOptions={unitOptions}
        initialUnitLabel={unitLabel}
        categories={categories}
        users={users}
        assets={assets}
        vendors={vendors}
        timezone={timezone}
        canEdit={canEdit}
        canAssign={capabilityKeys.includes(WORK_ORDER_CAPABILITIES.ASSIGN)}
        canAssignVendor={capabilityKeys.includes(VENDOR_CAPABILITIES.ASSIGN_WORK_ORDERS)}
        canManageStatus={capabilityKeys.includes(WORK_ORDER_CAPABILITIES.MANAGE_STATUS)}
        canManageNotes={capabilityKeys.includes(WORK_ORDER_CAPABILITIES.MANAGE_NOTES)}
        canManageAttachments={capabilityKeys.includes(WORK_ORDER_CAPABILITIES.MANAGE_ATTACHMENTS)}
        canSchedule={capabilityKeys.includes(WORK_ORDER_CAPABILITIES.SCHEDULE)}
      />
    </div>
  );
}
