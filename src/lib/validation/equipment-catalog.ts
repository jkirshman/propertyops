import { z } from "zod";

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const createEquipmentCatalogItemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(200)
    .regex(SLUG_PATTERN, "Slug must be lowercase letters, numbers, and hyphens only."),
  category: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  description: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
});

export const updateEquipmentCatalogItemSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  category: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  description: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  isActive: z.boolean().optional(),
});

export type CreateEquipmentCatalogItemInput = z.infer<typeof createEquipmentCatalogItemSchema>;
export type UpdateEquipmentCatalogItemInput = z.infer<typeof updateEquipmentCatalogItemSchema>;
