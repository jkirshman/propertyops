import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { complianceRecords } from "@/db/schema";
import { stripUndefined } from "@/lib/db/strip-undefined";
import type {
  CreateComplianceRecordInput,
  UpdateComplianceRecordInput,
} from "@/lib/validation/compliance";

export type ComplianceRecordRow = typeof complianceRecords.$inferSelect;

export interface ListComplianceRecordsOptions {
  propertyId?: string;
  isActive?: boolean;
  category?: string;
}

export async function listComplianceRecords(
  organizationId: string,
  options: ListComplianceRecordsOptions = {},
) {
  const conditions = [eq(complianceRecords.organizationId, organizationId)];
  if (options.propertyId) conditions.push(eq(complianceRecords.propertyId, options.propertyId));
  if (options.isActive !== undefined) conditions.push(eq(complianceRecords.isActive, options.isActive));
  if (options.category) conditions.push(eq(complianceRecords.category, options.category));

  return db
    .select()
    .from(complianceRecords)
    .where(and(...conditions))
    .orderBy(asc(complianceRecords.expirationDate));
}

export async function getComplianceRecord(
  organizationId: string,
  id: string,
): Promise<ComplianceRecordRow | null> {
  const [row] = await db
    .select()
    .from(complianceRecords)
    .where(and(eq(complianceRecords.id, id), eq(complianceRecords.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

export async function createComplianceRecord(
  organizationId: string,
  input: CreateComplianceRecordInput,
): Promise<ComplianceRecordRow> {
  const [row] = await db
    .insert(complianceRecords)
    .values({
      organizationId,
      propertyId: input.propertyId,
      category: input.category,
      name: input.name,
      issuer: input.issuer ?? null,
      issuedDate: input.issuedDate ?? null,
      expirationDate: input.expirationDate ?? null,
      notes: input.notes ?? null,
    })
    .returning();
  return row;
}

export async function updateComplianceRecord(
  organizationId: string,
  id: string,
  input: UpdateComplianceRecordInput,
): Promise<ComplianceRecordRow | null> {
  const [row] = await db
    .update(complianceRecords)
    .set({ ...stripUndefined(input), updatedAt: new Date() })
    .where(and(eq(complianceRecords.id, id), eq(complianceRecords.organizationId, organizationId)))
    .returning();
  return row ?? null;
}
