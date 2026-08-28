import { z } from "zod";

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const createPropertyTypeSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(120)
    .regex(SLUG_PATTERN, "Slug must be lowercase letters, numbers, and hyphens only."),
  description: z.string().trim().max(2000).optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
});

export const updatePropertyTypeSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  isActive: z.boolean().optional(),
  // null clears the default template; undefined leaves it untouched.
  defaultEquipmentTemplateId: z.preprocess(emptyToUndefined, z.string().uuid().nullable().optional()),
});

export type CreatePropertyTypeInput = z.infer<typeof createPropertyTypeSchema>;
export type UpdatePropertyTypeInput = z.infer<typeof updatePropertyTypeSchema>;
