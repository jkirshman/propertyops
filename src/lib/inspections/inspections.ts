import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { inspectionResponses, inspections } from "@/db/schema";
import { stripUndefined } from "@/lib/db/strip-undefined";
import type { CreateInspectionInput, UpdateInspectionInput } from "@/lib/validation/inspections";

import { getInspectionTemplate, listInspectionTemplateItems } from "./templates";
import { calculateOverallResult } from "./result";
import { getIncompleteRequiredResponses } from "./completion";
import type { InspectionOutcome } from "./constants";

export type InspectionRow = typeof inspections.$inferSelect;
export type InspectionResponseRow = typeof inspectionResponses.$inferSelect;

export interface ListInspectionsOptions {
  propertyId?: string;
  propertyEquipmentId?: string;
  templateId?: string;
  status?: string;
  inspectorUserId?: string;
}

export async function listInspections(organizationId: string, options: ListInspectionsOptions = {}) {
  const conditions = [eq(inspections.organizationId, organizationId)];
  if (options.propertyId) conditions.push(eq(inspections.propertyId, options.propertyId));
  if (options.propertyEquipmentId) {
    conditions.push(eq(inspections.propertyEquipmentId, options.propertyEquipmentId));
  }
  if (options.templateId) conditions.push(eq(inspections.templateId, options.templateId));
  if (options.status) conditions.push(eq(inspections.status, options.status));
  if (options.inspectorUserId) conditions.push(eq(inspections.inspectorUserId, options.inspectorUserId));

  return db
    .select()
    .from(inspections)
    .where(and(...conditions))
    .orderBy(desc(inspections.updatedAt));
}

export async function getInspection(organizationId: string, id: string): Promise<InspectionRow | null> {
  const [row] = await db
    .select()
    .from(inspections)
    .where(and(eq(inspections.id, id), eq(inspections.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

/**
 * Creates the inspection and snapshots every current template item into an
 * inspection_responses row. Later edits to the template never touch these
 * rows — this is the historical-integrity guarantee.
 */
export async function createInspection(
  organizationId: string,
  createdByUserId: string,
  input: CreateInspectionInput,
): Promise<{ inspection: InspectionRow; responses: InspectionResponseRow[] } | null> {
  const template = await getInspectionTemplate(organizationId, input.templateId);
  if (!template) {
    return null;
  }

  const items = await listInspectionTemplateItems(organizationId, input.templateId);

  const [inspection] = await db
    .insert(inspections)
    .values({
      organizationId,
      propertyId: input.propertyId,
      propertyEquipmentId: input.propertyEquipmentId ?? null,
      templateId: input.templateId,
      templateName: template.name,
      scheduledDate: input.scheduledDate ?? null,
      inspectorUserId: input.inspectorUserId ?? null,
      summary: input.summary ?? null,
      createdByUserId,
    })
    .returning();

  let responses: InspectionResponseRow[] = [];
  if (items.length > 0) {
    responses = await db
      .insert(inspectionResponses)
      .values(
        items.map((item) => ({
          organizationId,
          inspectionId: inspection.id,
          templateItemId: item.id,
          itemLabel: item.label,
          itemDescription: item.description,
          itemResponseType: item.responseType,
          itemRequired: item.isRequired,
          itemAllowNote: item.allowNote,
          itemChoices: item.choices,
          itemSortOrder: item.sortOrder,
        })),
      )
      .returning();
  }

  return { inspection, responses };
}

export async function updateInspection(
  organizationId: string,
  id: string,
  input: UpdateInspectionInput,
): Promise<InspectionRow | null> {
  const [row] = await db
    .update(inspections)
    .set({ ...stripUndefined(input), updatedAt: new Date() })
    .where(and(eq(inspections.id, id), eq(inspections.organizationId, organizationId)))
    .returning();
  return row ?? null;
}

/** Flips a draft inspection to in_progress on its first touched response. No-op (returns null) if it wasn't draft. */
export async function startInspectionIfDraft(
  organizationId: string,
  id: string,
): Promise<InspectionRow | null> {
  const [row] = await db
    .update(inspections)
    .set({ status: "in_progress", startedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(inspections.id, id),
        eq(inspections.organizationId, organizationId),
        eq(inspections.status, "draft"),
      ),
    )
    .returning();
  return row ?? null;
}

export async function cancelInspection(
  organizationId: string,
  id: string,
): Promise<InspectionRow | null> {
  const existing = await getInspection(organizationId, id);
  if (!existing || (existing.status !== "draft" && existing.status !== "in_progress")) {
    return null;
  }

  const [row] = await db
    .update(inspections)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(inspections.id, id), eq(inspections.organizationId, organizationId)))
    .returning();
  return row ?? null;
}

export type CompleteInspectionResult =
  | { ok: true; inspection: InspectionRow }
  | { ok: false; reason: "not_found" | "already_finalized" | "incomplete_required_items"; incompleteItemLabels?: string[] };

export async function completeInspection(
  organizationId: string,
  id: string,
): Promise<CompleteInspectionResult> {
  const existing = await getInspection(organizationId, id);
  if (!existing) {
    return { ok: false, reason: "not_found" };
  }
  if (existing.status === "completed" || existing.status === "cancelled") {
    return { ok: false, reason: "already_finalized" };
  }

  const responses = await db
    .select()
    .from(inspectionResponses)
    .where(
      and(
        eq(inspectionResponses.organizationId, organizationId),
        eq(inspectionResponses.inspectionId, id),
      ),
    );

  const incomplete = getIncompleteRequiredResponses(
    responses.map((response) => ({
      id: response.id,
      itemLabel: response.itemLabel,
      itemRequired: response.itemRequired,
      itemResponseType: response.itemResponseType,
      value: response.value,
      outcome: response.outcome as "pass" | "fail" | null,
    })),
  );

  if (incomplete.length > 0) {
    return {
      ok: false,
      reason: "incomplete_required_items",
      incompleteItemLabels: incomplete.map((response) => response.itemLabel),
    };
  }

  const overallResult = calculateOverallResult(
    responses.map((response) => ({
      itemRequired: response.itemRequired,
      outcome: response.outcome as InspectionOutcome | null,
    })),
  );

  const [row] = await db
    .update(inspections)
    .set({
      status: "completed",
      completedAt: new Date(),
      overallResult,
      updatedAt: new Date(),
    })
    .where(and(eq(inspections.id, id), eq(inspections.organizationId, organizationId)))
    .returning();

  return { ok: true, inspection: row };
}
