import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const createPropertyComponentServiceRecordSchema = z.object({
  serviceDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
  description: z.string().trim().min(1).max(2000),
  vendorId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  cost: z.preprocess(emptyToUndefined, z.number().min(0).max(10_000_000).optional()),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
  performedByUserId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
});

export const updatePropertyComponentServiceRecordSchema = createPropertyComponentServiceRecordSchema.partial();

export type CreatePropertyComponentServiceRecordInput = z.infer<
  typeof createPropertyComponentServiceRecordSchema
>;
export type UpdatePropertyComponentServiceRecordInput = z.infer<
  typeof updatePropertyComponentServiceRecordSchema
>;
