import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { equipmentServiceRecords } from "@/db/schema";
import { stripUndefined } from "@/lib/db/strip-undefined";
import type {
  CreateEquipmentServiceRecordInput,
  UpdateEquipmentServiceRecordInput,
} from "@/lib/validation/equipment-service-records";

export async function listEquipmentServiceRecords(organizationId: string, propertyEquipmentId: string) {
  return db
    .select()
    .from(equipmentServiceRecords)
    .where(
      and(
        eq(equipmentServiceRecords.organizationId, organizationId),
        eq(equipmentServiceRecords.propertyEquipmentId, propertyEquipmentId),
      ),
    )
    .orderBy(desc(equipmentServiceRecords.serviceDate), desc(equipmentServiceRecords.createdAt));
}

export async function getEquipmentServiceRecord(
  organizationId: string,
  propertyEquipmentId: string,
  recordId: string,
) {
  const [row] = await db
    .select()
    .from(equipmentServiceRecords)
    .where(
      and(
        eq(equipmentServiceRecords.id, recordId),
        eq(equipmentServiceRecords.propertyEquipmentId, propertyEquipmentId),
        eq(equipmentServiceRecords.organizationId, organizationId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function createEquipmentServiceRecord(
  organizationId: string,
  propertyEquipmentId: string,
  input: CreateEquipmentServiceRecordInput,
) {
  const [row] = await db
    .insert(equipmentServiceRecords)
    .values({
      organizationId,
      propertyEquipmentId,
      serviceDate: input.serviceDate,
      serviceType: input.serviceType,
      summary: input.summary,
      vendorName: input.vendorName ?? null,
      cost: input.cost ?? null,
      meterReading: input.meterReading ?? null,
      performedByUserId: input.performedByUserId ?? null,
      notes: input.notes ?? null,
    })
    .returning();
  return row;
}

export async function updateEquipmentServiceRecord(
  organizationId: string,
  propertyEquipmentId: string,
  recordId: string,
  input: UpdateEquipmentServiceRecordInput,
) {
  const [row] = await db
    .update(equipmentServiceRecords)
    .set({ ...stripUndefined(input), updatedAt: new Date() })
    .where(
      and(
        eq(equipmentServiceRecords.id, recordId),
        eq(equipmentServiceRecords.propertyEquipmentId, propertyEquipmentId),
        eq(equipmentServiceRecords.organizationId, organizationId),
      ),
    )
    .returning();
  return row ?? null;
}
