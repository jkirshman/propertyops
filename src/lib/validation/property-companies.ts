import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const createPropertyCompanySchema = z.object({
  name: z.string().trim().min(1).max(200),
  legalName: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
});

export const updatePropertyCompanySchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  legalName: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional().nullable()),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional().nullable()),
  isActive: z.boolean().optional(),
});

export type CreatePropertyCompanyInput = z.infer<typeof createPropertyCompanySchema>;
export type UpdatePropertyCompanyInput = z.infer<typeof updatePropertyCompanySchema>;
