import { z } from "zod";

import { COMPLIANCE_CATEGORIES } from "@/lib/compliance/constants";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MESSAGE = "Enter a valid date.";

export const createComplianceRecordSchema = z.object({
  propertyId: z.string().uuid("Select a property."),
  category: z.enum(COMPLIANCE_CATEGORIES, { error: "Select a category." }),
  name: z.string().trim().min(1, "Name is required.").max(200),
  issuer: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  issuedDate: z.preprocess(emptyToUndefined, z.string().regex(DATE_PATTERN, DATE_MESSAGE).optional()),
  expirationDate: z.preprocess(emptyToUndefined, z.string().regex(DATE_PATTERN, DATE_MESSAGE).optional()),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
});

export const updateComplianceRecordSchema = z.object({
  category: z.enum(COMPLIANCE_CATEGORIES, { error: "Select a category." }).optional(),
  name: z.string().trim().min(1, "Name is required.").max(200).optional(),
  issuer: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional().nullable()),
  issuedDate: z.preprocess(emptyToUndefined, z.string().regex(DATE_PATTERN, DATE_MESSAGE).optional().nullable()),
  expirationDate: z.preprocess(
    emptyToUndefined,
    z.string().regex(DATE_PATTERN, DATE_MESSAGE).optional().nullable(),
  ),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional().nullable()),
  isActive: z.boolean().optional(),
});

export type CreateComplianceRecordInput = z.infer<typeof createComplianceRecordSchema>;
export type UpdateComplianceRecordInput = z.infer<typeof updateComplianceRecordSchema>;
