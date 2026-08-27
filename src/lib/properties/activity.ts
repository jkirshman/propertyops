import { listEntityActivity } from "@/lib/audit/list-entity-activity";

export async function listPropertyActivity(organizationId: string, propertyId: string) {
  return listEntityActivity(organizationId, "property", propertyId);
}
