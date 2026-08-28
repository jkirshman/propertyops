import { z } from "zod";

import { EQUIPMENT_CONDITIONS, EQUIPMENT_STATUSES } from "@/lib/equipment/constants";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const dateString = z.preprocess(
  emptyToUndefined,
  z.string().trim().regex(DATE_PATTERN, "Use YYYY-MM-DD.").optional(),
);

export const createPropertyEquipmentSchema = z.object({
  equipmentCatalogItemId: z.string().uuid(),
  displayName: z.string().trim().min(1).max(200),
  equipmentTag: z.preprocess(emptyToUndefined, z.string().trim().max(80).optional()),
  manufacturer: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  model: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  serialNumber: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  installedDate: dateString,
  manufactureYear: z.number().int().min(1900).max(2100).optional(),
  locationInProperty: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  quantity: z.number().int().min(1).max(10000).default(1),
  status: z.enum(EQUIPMENT_STATUSES).default("active"),
  condition: z.enum(EQUIPMENT_CONDITIONS).default("unknown"),
  expectedReplacementDate: dateString,
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
});

export const updatePropertyEquipmentSchema = createPropertyEquipmentSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreatePropertyEquipmentInput = z.infer<typeof createPropertyEquipmentSchema>;
export type UpdatePropertyEquipmentInput = z.infer<typeof updatePropertyEquipmentSchema>;
