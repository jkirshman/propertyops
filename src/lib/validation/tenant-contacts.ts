import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const createTenantContactSchema = z.object({
  name: z.string({ error: "Name is required." }).trim().min(1, "Name is required.").max(200),
  title: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  email: z.preprocess(
    emptyToUndefined,
    z.string().trim().toLowerCase().email("Email address is invalid.").max(200).optional(),
  ),
  phone: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional()),
  mobilePhone: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional()),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  isPrimary: z.boolean().optional(),
  isEmergencyContact: z.boolean().optional(),
});

export const updateTenantContactSchema = createTenantContactSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateTenantContactInput = z.infer<typeof createTenantContactSchema>;
export type UpdateTenantContactInput = z.infer<typeof updateTenantContactSchema>;
