import { z } from "zod";

import { TENANT_TYPES } from "@/lib/tenants/constants";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const createTenantSchema = z.object({
  tenantType: z.enum(TENANT_TYPES).default("individual"),
  name: z.string({ error: "Tenant name is required." }).trim().min(1, "Tenant name is required.").max(200),
  legalName: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  primaryPhone: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional()),
  primaryEmail: z.preprocess(
    emptyToUndefined,
    z.string().trim().toLowerCase().email("Email address is invalid.").max(200).optional(),
  ),
  website: z.preprocess(emptyToUndefined, z.string().trim().max(300).optional()),
  addressLine1: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  addressLine2: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  city: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  state: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  postalCode: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional()),
  country: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
});

export const updateTenantSchema = z.object({
  tenantType: z.enum(TENANT_TYPES).optional(),
  name: z
    .string({ error: "Tenant name is required." })
    .trim()
    .min(1, "Tenant name is required.")
    .max(200)
    .optional(),
  legalName: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional().nullable()),
  isActive: z.boolean().optional(),
  primaryPhone: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional().nullable()),
  primaryEmail: z.preprocess(
    emptyToUndefined,
    z.string().trim().toLowerCase().email("Email address is invalid.").max(200).optional().nullable(),
  ),
  website: z.preprocess(emptyToUndefined, z.string().trim().max(300).optional().nullable()),
  addressLine1: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional().nullable()),
  addressLine2: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional().nullable()),
  city: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional().nullable()),
  state: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional().nullable()),
  postalCode: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional().nullable()),
  country: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional().nullable()),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional().nullable()),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
