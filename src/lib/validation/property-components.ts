import { z } from "zod";

import { EQUIPMENT_CONDITIONS } from "@/lib/equipment/constants";
import { COMPONENT_TYPES } from "@/lib/property-components/constants";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const dateOnly = z.preprocess(emptyToUndefined, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.").optional());
const nullableDateOnly = z.preprocess(
  emptyToUndefined,
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.").optional().nullable(),
);

function requireOtherTypeLabel<T extends { componentType: string; otherTypeLabel?: string }>(
  data: T,
  ctx: z.RefinementCtx,
) {
  if (data.componentType === "other" && !data.otherTypeLabel?.trim()) {
    ctx.addIssue({ code: "custom", path: ["otherTypeLabel"], message: "Describe the component type." });
  }
}

export const createPropertyComponentSchema = z
  .object({
    componentType: z.enum(COMPONENT_TYPES),
    otherTypeLabel: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
    name: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
    description: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
    installedDate: dateOnly,
    replacementDate: dateOnly,
    expectedUsefulLifeYears: z.preprocess(emptyToUndefined, z.number().int().min(0).max(200).optional()),
    warrantyExpiration: dateOnly,
    vendorId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
    condition: z.enum(EQUIPMENT_CONDITIONS).default("unknown"),
    notes: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  })
  .superRefine(requireOtherTypeLabel);

export const updatePropertyComponentSchema = z
  .object({
    componentType: z.enum(COMPONENT_TYPES).optional(),
    otherTypeLabel: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional().nullable()),
    name: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional().nullable()),
    description: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional().nullable()),
    installedDate: nullableDateOnly,
    replacementDate: nullableDateOnly,
    expectedUsefulLifeYears: z.preprocess(emptyToUndefined, z.number().int().min(0).max(200).optional().nullable()),
    warrantyExpiration: nullableDateOnly,
    vendorId: z.preprocess(emptyToUndefined, z.string().uuid().optional().nullable()),
    condition: z.enum(EQUIPMENT_CONDITIONS).optional(),
    notes: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional().nullable()),
    isActive: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.componentType !== undefined) {
      requireOtherTypeLabel(
        { componentType: data.componentType, otherTypeLabel: data.otherTypeLabel ?? undefined },
        ctx,
      );
    }
  });

export type CreatePropertyComponentInput = z.infer<typeof createPropertyComponentSchema>;
export type UpdatePropertyComponentInput = z.infer<typeof updatePropertyComponentSchema>;
