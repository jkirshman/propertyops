import { z } from "zod";

import { ASSET_CONDITIONS, ASSET_STATUSES } from "@/lib/assets/constants";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const dateString = z.preprocess(
  emptyToUndefined,
  z.string().trim().regex(DATE_PATTERN, "Use YYYY-MM-DD.").optional(),
);

export const createAssetSchema = z.object({
  displayName: z.string().trim().min(1).max(200),
  categoryId: z.string().uuid(),
  manufacturer: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  model: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  serialNumber: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  status: z.enum(ASSET_STATUSES).default("available"),
  condition: z.enum(ASSET_CONDITIONS).default("unknown"),
  acquiredDate: dateString,
  purchaseCost: z.number().min(0).max(10_000_000).optional(),
  warrantyExpiration: dateString,
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
});

export const updateAssetSchema = createAssetSchema.partial().extend({
  isActive: z.boolean().optional(),
  retiredDate: dateString,
  disposalReason: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;

export const retireAssetSchema = z.object({
  status: z.enum(["retired", "disposed", "lost"]),
  retiredDate: dateString,
  disposalReason: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
});

export const reactivateAssetSchema = z.object({});

export type RetireAssetInput = z.infer<typeof retireAssetSchema>;
