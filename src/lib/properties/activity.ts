import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { auditLog } from "@/db/schema";

export async function listPropertyActivity(organizationId: string, propertyId: string, limit = 50) {
  return db
    .select()
    .from(auditLog)
    .where(
      and(
        eq(auditLog.organizationId, organizationId),
        eq(auditLog.entityType, "property"),
        eq(auditLog.entityId, propertyId),
      ),
    )
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}
