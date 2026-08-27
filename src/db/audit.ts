import { db } from "./client";
import { auditLog } from "./schema";

export async function recordAuditEvent(params: {
  organizationId: string;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}) {
  await db.insert(auditLog).values({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId ?? null,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    beforeData: params.before ?? null,
    afterData: params.after ?? null,
  });
}
