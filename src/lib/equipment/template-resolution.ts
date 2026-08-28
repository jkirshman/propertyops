import { eq, and } from "drizzle-orm";

import { db } from "@/db/client";
import { properties } from "@/db/schema";
import type { PropertyEquipmentTemplateMode } from "@/lib/equipment/constants";
import { getPropertyType } from "@/lib/properties/property-types";
import type { PropertyEquipmentTemplateSelectionInput } from "@/lib/validation/equipment-templates";

/**
 * Pure resolution rule, independent of the database so it's cheaply testable:
 * property override wins, then the property type's default, then no template.
 */
export function resolveEquipmentTemplateId(params: {
  mode: PropertyEquipmentTemplateMode;
  propertyEquipmentTemplateId: string | null;
  propertyTypeDefaultTemplateId: string | null;
}): string | null {
  if (params.mode === "none") {
    return null;
  }
  if (params.mode === "override") {
    return params.propertyEquipmentTemplateId;
  }
  return params.propertyTypeDefaultTemplateId;
}

export async function resolveEquipmentTemplateIdForProperty(
  organizationId: string,
  property: {
    propertyTypeId: string;
    equipmentTemplateMode: string;
    equipmentTemplateId: string | null;
  },
): Promise<string | null> {
  const propertyType = await getPropertyType(organizationId, property.propertyTypeId);

  return resolveEquipmentTemplateId({
    mode: property.equipmentTemplateMode as PropertyEquipmentTemplateMode,
    propertyEquipmentTemplateId: property.equipmentTemplateId,
    propertyTypeDefaultTemplateId: propertyType?.defaultEquipmentTemplateId ?? null,
  });
}

export async function setPropertyEquipmentTemplateSelection(
  organizationId: string,
  propertyId: string,
  input: PropertyEquipmentTemplateSelectionInput,
) {
  const [row] = await db
    .update(properties)
    .set({
      equipmentTemplateMode: input.mode,
      equipmentTemplateId: input.mode === "override" ? (input.templateId ?? null) : null,
      updatedAt: new Date(),
    })
    .where(and(eq(properties.id, propertyId), eq(properties.organizationId, organizationId)))
    .returning();
  return row ?? null;
}
