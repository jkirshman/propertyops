import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const createVendorContactSchema = z.object({
  name: z.string().trim().min(1).max(200),
  title: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  email: z.preprocess(emptyToUndefined, z.string().trim().toLowerCase().email().max(200).optional()),
  phone: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional()),
  mobilePhone: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional()),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  isPrimary: z.boolean().optional(),
});

export const updateVendorContactSchema = createVendorContactSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateVendorContactInput = z.infer<typeof createVendorContactSchema>;
export type UpdateVendorContactInput = z.infer<typeof updateVendorContactSchema>;
