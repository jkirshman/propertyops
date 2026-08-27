import { z } from "zod";

import { CONTACT_TYPES } from "@/lib/properties/constants";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const createPropertyContactSchema = z.object({
  name: z.string().trim().min(1).max(200),
  contactType: z.enum(CONTACT_TYPES),
  company: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  email: z.preprocess(emptyToUndefined, z.string().trim().toLowerCase().email().max(200).optional()),
  phone: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional()),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  isPrimary: z.boolean().optional(),
});

export const updatePropertyContactSchema = createPropertyContactSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreatePropertyContactInput = z.infer<typeof createPropertyContactSchema>;
export type UpdatePropertyContactInput = z.infer<typeof updatePropertyContactSchema>;
