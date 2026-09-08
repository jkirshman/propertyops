import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const createInspectionTemplateSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  description: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  categoryId: z.string().uuid("Select a category."),
  propertyTypeId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
});

export const updateInspectionTemplateSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200).optional(),
  description: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional().nullable()),
  categoryId: z.string().uuid("Select a category.").optional(),
  propertyTypeId: z.preprocess(emptyToUndefined, z.string().uuid().optional().nullable()),
  isActive: z.boolean().optional(),
});

export type CreateInspectionTemplateInput = z.infer<typeof createInspectionTemplateSchema>;
export type UpdateInspectionTemplateInput = z.infer<typeof updateInspectionTemplateSchema>;
