import { z } from "zod";

import { PHOTO_CATEGORIES } from "@/lib/property-photos/constants";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const createPropertyPhotoSchema = z.object({
  fileId: z.string().uuid(),
  category: z.enum(PHOTO_CATEGORIES),
  caption: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
  propertyUnitId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
});

export const updatePropertyPhotoSchema = z.object({
  category: z.enum(PHOTO_CATEGORIES).optional(),
  caption: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional().nullable()),
  propertyUnitId: z.preprocess(emptyToUndefined, z.string().uuid().optional().nullable()),
});

export type CreatePropertyPhotoInput = z.infer<typeof createPropertyPhotoSchema>;
export type UpdatePropertyPhotoInput = z.infer<typeof updatePropertyPhotoSchema>;
