import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { propertyComponentServiceRecords } from "@/db/schema";
import type {
  CreatePropertyComponentServiceRecordInput,
  UpdatePropertyComponentServiceRecordInput,
} from "@/lib/validation/property-component-service-records";
import { stripUndefined } from "@/lib/db/strip-undefined";

export async function listPropertyComponentServiceRecords(organizationId: string, propertyComponentId: string) {
  return db
    .select()
    .from(propertyComponentServiceRecords)
    .where(
      and(
        eq(propertyComponentServiceRecords.organizationId, organizationId),
        eq(propertyComponentServiceRecords.propertyComponentId, propertyComponentId),
      ),
    )
    .orderBy(desc(propertyComponentServiceRecords.serviceDate), desc(propertyComponentServiceRecords.createdAt));
}

export async function getPropertyComponentServiceRecord(
  organizationId: string,
  propertyComponentId: string,
  recordId: string,
) {
  const [row] = await db
    .select()
    .from(propertyComponentServiceRecords)
    .where(
      and(
        eq(propertyComponentServiceRecords.id, recordId),
        eq(propertyComponentServiceRecords.propertyComponentId, propertyComponentId),
        eq(propertyComponentServiceRecords.organizationId, organizationId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function createPropertyComponentServiceRecord(
  organizationId: string,
  propertyComponentId: string,
  input: CreatePropertyComponentServiceRecordInput,
) {
  const [row] = await db
    .insert(propertyComponentServiceRecords)
    .values({
      organizationId,
      propertyComponentId,
      serviceDate: input.serviceDate,
      description: input.description,
      vendorId: input.vendorId ?? null,
      cost: input.cost ?? null,
      notes: input.notes ?? null,
      performedByUserId: input.performedByUserId ?? null,
    })
    .returning();
  return row;
}

export async function updatePropertyComponentServiceRecord(
  organizationId: string,
  propertyComponentId: string,
  recordId: string,
  input: UpdatePropertyComponentServiceRecordInput,
) {
  const [row] = await db
    .update(propertyComponentServiceRecords)
    .set({ ...stripUndefined(input), updatedAt: new Date() })
    .where(
      and(
        eq(propertyComponentServiceRecords.id, recordId),
        eq(propertyComponentServiceRecords.propertyComponentId, propertyComponentId),
        eq(propertyComponentServiceRecords.organizationId, organizationId),
      ),
    )
    .returning();
  return row ?? null;
}
