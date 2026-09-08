import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { inspectionResponses } from "@/db/schema";
import { stripUndefined } from "@/lib/db/strip-undefined";
import type { UpdateInspectionResponseInput } from "@/lib/validation/inspections";

export async function listInspectionResponses(organizationId: string, inspectionId: string) {
  return db
    .select()
    .from(inspectionResponses)
    .where(
      and(
        eq(inspectionResponses.organizationId, organizationId),
        eq(inspectionResponses.inspectionId, inspectionId),
      ),
    )
    .orderBy(asc(inspectionResponses.itemSortOrder));
}

export async function getInspectionResponse(
  organizationId: string,
  inspectionId: string,
  responseId: string,
) {
  const [row] = await db
    .select()
    .from(inspectionResponses)
    .where(
      and(
        eq(inspectionResponses.id, responseId),
        eq(inspectionResponses.inspectionId, inspectionId),
        eq(inspectionResponses.organizationId, organizationId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function updateInspectionResponse(
  organizationId: string,
  inspectionId: string,
  responseId: string,
  input: UpdateInspectionResponseInput,
) {
  const [row] = await db
    .update(inspectionResponses)
    .set({ ...stripUndefined(input), updatedAt: new Date() })
    .where(
      and(
        eq(inspectionResponses.id, responseId),
        eq(inspectionResponses.inspectionId, inspectionId),
        eq(inspectionResponses.organizationId, organizationId),
      ),
    )
    .returning();
  return row ?? null;
}
