import { listEquipmentCatalogItems } from "@/lib/equipment/catalog";
import { listPropertyEquipment } from "@/lib/equipment/property-equipment";
import { resolveEquipmentTemplateIdForProperty } from "@/lib/equipment/template-resolution";
import { listEquipmentTemplateItems } from "@/lib/equipment/templates";

export type ExpectedVsActualStatus =
  | "expected_present"
  | "expected_partial"
  | "expected_missing"
  | "optional_present"
  | "optional_partial"
  | "optional_missing"
  | "extra";

export interface ExpectedVsActualRow {
  equipmentCatalogItemId: string;
  catalogName: string;
  isRequired: boolean;
  expectedQuantity: number;
  actualQuantity: number;
  status: ExpectedVsActualStatus;
}

/**
 * Pure comparison rule, independent of the database so it's cheaply testable.
 * Only isActive PropertyEquipment counts as "actual" — a retired/deactivated
 * record no longer satisfies an expectation. Matching is by explicit
 * equipmentCatalogItemId only; there is no fuzzy/name-based matching.
 */
export function compareExpectedToActual(params: {
  templateItems: Array<{ equipmentCatalogItemId: string; expectedQuantity: number; isRequired: boolean }>;
  actualCountsByCatalogItemId: Map<string, number>;
  catalogNamesById: Map<string, string>;
}): ExpectedVsActualRow[] {
  const { templateItems, actualCountsByCatalogItemId, catalogNamesById } = params;
  const rows: ExpectedVsActualRow[] = [];
  const coveredCatalogItemIds = new Set<string>();

  for (const item of templateItems) {
    coveredCatalogItemIds.add(item.equipmentCatalogItemId);
    const actualQuantity = actualCountsByCatalogItemId.get(item.equipmentCatalogItemId) ?? 0;

    let status: ExpectedVsActualStatus;
    if (actualQuantity >= item.expectedQuantity) {
      status = item.isRequired ? "expected_present" : "optional_present";
    } else if (actualQuantity === 0) {
      status = item.isRequired ? "expected_missing" : "optional_missing";
    } else {
      status = item.isRequired ? "expected_partial" : "optional_partial";
    }

    rows.push({
      equipmentCatalogItemId: item.equipmentCatalogItemId,
      catalogName: catalogNamesById.get(item.equipmentCatalogItemId) ?? "Unknown equipment",
      isRequired: item.isRequired,
      expectedQuantity: item.expectedQuantity,
      actualQuantity,
      status,
    });
  }

  for (const [catalogItemId, actualQuantity] of actualCountsByCatalogItemId) {
    if (coveredCatalogItemIds.has(catalogItemId) || actualQuantity === 0) {
      continue;
    }
    rows.push({
      equipmentCatalogItemId: catalogItemId,
      catalogName: catalogNamesById.get(catalogItemId) ?? "Unknown equipment",
      isRequired: false,
      expectedQuantity: 0,
      actualQuantity,
      status: "extra",
    });
  }

  return rows;
}

export async function getExpectedVsActualForProperty(organizationId: string, property: {
  id: string;
  propertyTypeId: string;
  equipmentTemplateMode: string;
  equipmentTemplateId: string | null;
}) {
  const templateId = await resolveEquipmentTemplateIdForProperty(organizationId, property);

  const [templateItems, installedEquipment, catalogItems] = await Promise.all([
    templateId ? listEquipmentTemplateItems(organizationId, templateId) : Promise.resolve([]),
    listPropertyEquipment(organizationId, property.id, { activeOnly: true }),
    listEquipmentCatalogItems(organizationId),
  ]);

  const catalogNamesById = new Map(catalogItems.map((item) => [item.id, item.name]));

  const actualCountsByCatalogItemId = new Map<string, number>();
  for (const equipment of installedEquipment) {
    actualCountsByCatalogItemId.set(
      equipment.equipmentCatalogItemId,
      (actualCountsByCatalogItemId.get(equipment.equipmentCatalogItemId) ?? 0) + equipment.quantity,
    );
  }

  const rows = compareExpectedToActual({
    templateItems: templateItems.map((item) => ({
      equipmentCatalogItemId: item.equipmentCatalogItemId,
      expectedQuantity: item.expectedQuantity,
      isRequired: item.isRequired,
    })),
    actualCountsByCatalogItemId,
    catalogNamesById,
  });

  return { templateId, rows };
}
