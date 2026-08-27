import { listEntityActivity } from "@/lib/audit/list-entity-activity";

export async function listWorkOrderActivity(organizationId: string, workOrderId: string) {
  return listEntityActivity(organizationId, "work_order", workOrderId);
}
