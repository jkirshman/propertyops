import { z } from "zod";

import { PROPERTY_EQUIPMENT_TEMPLATE_MODES } from "@/lib/equipment/constants";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const createEquipmentTemplateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
});

export const updateEquipmentTemplateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  isActive: z.boolean().optional(),
});

export type CreateEquipmentTemplateInput = z.infer<typeof createEquipmentTemplateSchema>;
export type UpdateEquipmentTemplateInput = z.infer<typeof updateEquipmentTemplateSchema>;

export const createEquipmentTemplateItemSchema = z.object({
  equipmentCatalogItemId: z.string().uuid(),
  expectedQuantity: z.number().int().min(1).max(1000).default(1),
  isRequired: z.boolean().default(true),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  sortOrder: z.number().int().min(0).max(10000).optional(),
});

export const updateEquipmentTemplateItemSchema = z.object({
  expectedQuantity: z.number().int().min(1).max(1000).optional(),
  isRequired: z.boolean().optional(),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  sortOrder: z.number().int().min(0).max(10000).optional(),
});

export type CreateEquipmentTemplateItemInput = z.infer<typeof createEquipmentTemplateItemSchema>;
export type UpdateEquipmentTemplateItemInput = z.infer<typeof updateEquipmentTemplateItemSchema>;

export const propertyEquipmentTemplateSelectionSchema = z
  .object({
    mode: z.enum(PROPERTY_EQUIPMENT_TEMPLATE_MODES),
    templateId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  })
  .refine((value) => value.mode !== "override" || Boolean(value.templateId), {
    message: "Select a template when using 'override' mode.",
    path: ["templateId"],
  });

export type PropertyEquipmentTemplateSelectionInput = z.infer<
  typeof propertyEquipmentTemplateSelectionSchema
>;
