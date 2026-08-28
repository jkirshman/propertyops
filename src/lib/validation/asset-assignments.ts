import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const moveAssetSchema = z
  .object({
    targetType: z.enum(["person", "property", "unassigned"]),
    personId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
    propertyId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
    notes: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  })
  .refine((value) => value.targetType !== "person" || Boolean(value.personId), {
    message: "Select a person.",
    path: ["personId"],
  })
  .refine((value) => value.targetType !== "property" || Boolean(value.propertyId), {
    message: "Select a property.",
    path: ["propertyId"],
  });

export type MoveAssetInput = z.infer<typeof moveAssetSchema>;

export const onboardAssetsSchema = z.object({
  assetIds: z.array(z.string().uuid()).min(1),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
});

export type OnboardAssetsInput = z.infer<typeof onboardAssetsSchema>;

const offboardActionSchema = z
  .object({
    assetId: z.string().uuid(),
    targetType: z.enum(["unassigned", "property"]),
    propertyId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  })
  .refine((value) => value.targetType !== "property" || Boolean(value.propertyId), {
    message: "Select a property.",
    path: ["propertyId"],
  });

export const offboardAssetsSchema = z.object({
  actions: z.array(offboardActionSchema).min(1),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
});

export type OffboardAssetsInput = z.infer<typeof offboardAssetsSchema>;
