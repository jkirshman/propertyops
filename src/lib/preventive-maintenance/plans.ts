import { and, asc, eq, ilike } from "drizzle-orm";

import { db } from "@/db/client";
import { preventiveMaintenancePlans } from "@/db/schema";
import { stripUndefined } from "@/lib/db/strip-undefined";
import type {
  CreatePreventiveMaintenancePlanInput,
  UpdatePreventiveMaintenancePlanInput,
} from "@/lib/validation/preventive-maintenance";

import { classifyDueState } from "./recurrence";
import type { PmDueState } from "./constants";

export type PreventiveMaintenancePlanRow = typeof preventiveMaintenancePlans.$inferSelect;

export interface ListPreventiveMaintenancePlansOptions {
  search?: string;
  propertyId?: string;
  propertyEquipmentId?: string;
  isActive?: boolean;
  defaultAssigneeUserId?: string;
  dueState?: PmDueState;
}

export async function listPreventiveMaintenancePlans(
  organizationId: string,
  options: ListPreventiveMaintenancePlansOptions = {},
): Promise<PreventiveMaintenancePlanRow[]> {
  const conditions = [eq(preventiveMaintenancePlans.organizationId, organizationId)];

  if (options.propertyId) {
    conditions.push(eq(preventiveMaintenancePlans.propertyId, options.propertyId));
  }
  if (options.propertyEquipmentId) {
    conditions.push(eq(preventiveMaintenancePlans.propertyEquipmentId, options.propertyEquipmentId));
  }
  if (options.isActive !== undefined) {
    conditions.push(eq(preventiveMaintenancePlans.isActive, options.isActive));
  }
  if (options.defaultAssigneeUserId) {
    conditions.push(eq(preventiveMaintenancePlans.defaultAssigneeUserId, options.defaultAssigneeUserId));
  }
  if (options.search) {
    conditions.push(ilike(preventiveMaintenancePlans.name, `%${options.search.trim()}%`));
  }

  const rows = await db
    .select()
    .from(preventiveMaintenancePlans)
    .where(and(...conditions))
    .orderBy(asc(preventiveMaintenancePlans.nextDueAt));

  // Due state is derived, not a column, so it's filtered in application code
  // against the same pure classifier the UI uses to render badges.
  return options.dueState
    ? rows.filter((row) => classifyDueState(row.nextDueAt) === options.dueState)
    : rows;
}

export async function getPreventiveMaintenancePlan(
  organizationId: string,
  id: string,
): Promise<PreventiveMaintenancePlanRow | null> {
  const [row] = await db
    .select()
    .from(preventiveMaintenancePlans)
    .where(and(eq(preventiveMaintenancePlans.id, id), eq(preventiveMaintenancePlans.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

export async function createPreventiveMaintenancePlan(
  organizationId: string,
  input: CreatePreventiveMaintenancePlanInput,
): Promise<PreventiveMaintenancePlanRow> {
  const [row] = await db
    .insert(preventiveMaintenancePlans)
    .values({
      organizationId,
      propertyId: input.propertyId,
      propertyEquipmentId: input.propertyEquipmentId ?? null,
      categoryId: input.categoryId,
      name: input.name,
      description: input.description ?? null,
      instructions: input.instructions ?? null,
      defaultPriority: input.defaultPriority,
      defaultAssigneeUserId: input.defaultAssigneeUserId ?? null,
      defaultVendorId: input.defaultVendorId ?? null,
      intervalUnit: input.intervalUnit,
      intervalValue: input.intervalValue,
      nextDueAt: input.nextDueAt,
    })
    .returning();
  return row;
}

export async function updatePreventiveMaintenancePlan(
  organizationId: string,
  id: string,
  input: UpdatePreventiveMaintenancePlanInput,
): Promise<PreventiveMaintenancePlanRow | null> {
  const [row] = await db
    .update(preventiveMaintenancePlans)
    .set({ ...stripUndefined(input), updatedAt: new Date() })
    .where(and(eq(preventiveMaintenancePlans.id, id), eq(preventiveMaintenancePlans.organizationId, organizationId)))
    .returning();
  return row ?? null;
}
