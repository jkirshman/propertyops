import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const createPropertyUnitSchema = z.object({
  unitLabel: z.string().trim().min(1).max(80),
  name: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  squareFootage: z.coerce.number().int().min(0).max(10_000_000).optional(),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
});

export const updatePropertyUnitSchema = z.object({
  unitLabel: z.string().trim().min(1).max(80).optional(),
  name: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional().nullable()),
  squareFootage: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).max(10_000_000).optional().nullable()),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional().nullable()),
  isActive: z.boolean().optional(),
});

export type CreatePropertyUnitInput = z.infer<typeof createPropertyUnitSchema>;
export type UpdatePropertyUnitInput = z.infer<typeof updatePropertyUnitSchema>;
