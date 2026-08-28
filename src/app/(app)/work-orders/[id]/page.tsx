import Link from "next/link";
import { notFound } from "next/navigation";

import { WorkOrderDetailPanel } from "@/components/work-orders/WorkOrderDetailPanel";
import { requireCapability } from "@/lib/auth/require-capability";
import { getProperty } from "@/lib/properties/properties";
import { listOrganizationUsers } from "@/lib/users/users";
import { WORK_ORDER_CAPABILITIES, WORK_ORDER_STATUS_LABELS, type WorkOrderStatus } from "@/lib/work-orders/constants";
import { listWorkOrderCategories } from "@/lib/work-orders/categories";
import { getWorkOrder } from "@/lib/work-orders/work-orders";

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireCapability(WORK_ORDER_CAPABILITIES.VIEW, "/work-orders");

  const workOrder = await getWorkOrder(context.user.organizationId, id);
  if (!workOrder) {
    notFound();
  }

  const [property, categories, users] = await Promise.all([
    getProperty(context.user.organizationId, workOrder.propertyId),
    listWorkOrderCategories(context.user.organizationId, { activeOnly: true }),
    listOrganizationUsers(context.user.organizationId),
  ]);

  const { capabilityKeys } = context;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div className="muted" style={{ fontSize: "0.85rem" }}>{workOrder.number}</div>
          <h1 style={{ marginBottom: "0.3rem" }}>{workOrder.subject}</h1>
          <div className="muted" style={{ fontSize: "0.9rem" }}>
            {property ? <Link href={`/properties/${property.id}`}>{property.name}</Link> : "Unknown property"}
            {" · "}
            {WORK_ORDER_STATUS_LABELS[workOrder.status as WorkOrderStatus] ?? workOrder.status}
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
          propertyEquipmentId: workOrder.propertyEquipmentId,
          resolutionSummary: workOrder.resolutionSummary,
          resolvedAt: workOrder.resolvedAt ? workOrder.resolvedAt.toISOString() : null,
          closedAt: workOrder.closedAt ? workOrder.closedAt.toISOString() : null,
        }}
        propertyId={workOrder.propertyId}
        categories={categories}
        users={users}
        canEdit={capabilityKeys.includes(WORK_ORDER_CAPABILITIES.EDIT)}
        canAssign={capabilityKeys.includes(WORK_ORDER_CAPABILITIES.ASSIGN)}
        canManageStatus={capabilityKeys.includes(WORK_ORDER_CAPABILITIES.MANAGE_STATUS)}
        canManageNotes={capabilityKeys.includes(WORK_ORDER_CAPABILITIES.MANAGE_NOTES)}
        canManageAttachments={capabilityKeys.includes(WORK_ORDER_CAPABILITIES.MANAGE_ATTACHMENTS)}
      />
    </div>
  );
}
