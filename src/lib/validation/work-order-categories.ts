import { z } from "zod";

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const createWorkOrderCategorySchema = z.object({
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

export const updateWorkOrderCategorySchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  isActive: z.boolean().optional(),
});

export type CreateWorkOrderCategoryInput = z.infer<typeof createWorkOrderCategorySchema>;
export type UpdateWorkOrderCategoryInput = z.infer<typeof updateWorkOrderCategorySchema>;
