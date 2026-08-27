import { z } from "zod";

import { OCCUPANCY_MODELS } from "@/lib/properties/constants";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const createPropertySchema = z.object({
  propertyTypeId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  propertyCode: z.preprocess(emptyToUndefined, z.string().trim().max(50).optional()),
  occupancyModel: z.enum(OCCUPANCY_MODELS).default("other"),
  addressLine1: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  addressLine2: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  city: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  state: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  postalCode: z.preprocess(emptyToUndefined, z.string().trim().max(20).optional()),
  country: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  squareFootage: z.number().int().min(0).max(100_000_000).optional(),
  yearBuilt: z.number().int().min(1600).max(2100).optional(),
  parcelId: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  description: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
  operationalNotes: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
  primaryPhone: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional()),
  primaryEmail: z.preprocess(
    emptyToUndefined,
    z.string().trim().toLowerCase().email().max(200).optional(),
  ),
});

export const updatePropertySchema = createPropertySchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
