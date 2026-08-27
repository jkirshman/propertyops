import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { auditLog } from "@/db/schema";

export async function listEntityActivity(
  organizationId: string,
  entityType: string,
  entityId: string,
  limit = 50,
) {
  return db
    .select()
    .from(auditLog)
    .where(
      and(
        eq(auditLog.organizationId, organizationId),
        eq(auditLog.entityType, entityType),
        eq(auditLog.entityId, entityId),
      ),
    )
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}
