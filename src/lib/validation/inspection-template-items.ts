import { z } from "zod";

import { INSPECTION_RESPONSE_TYPES } from "@/lib/inspections/constants";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const baseInspectionTemplateItemFields = {
  label: z.string().trim().min(1, "Label is required.").max(300),
  description: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  responseType: z.enum(INSPECTION_RESPONSE_TYPES),
  isRequired: z.boolean().optional(),
  allowNote: z.boolean().optional(),
  choices: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
};

function requireChoicesForChoiceType<T extends { responseType: string; choices?: string[] }>(
  data: T,
  ctx: z.RefinementCtx,
) {
  if (data.responseType === "choice" && (!data.choices || data.choices.length < 2)) {
    ctx.addIssue({
      code: "custom",
      path: ["choices"],
      message: "Add at least two choices for a choice-type item.",
    });
  }
}

export const createInspectionTemplateItemSchema = z
  .object(baseInspectionTemplateItemFields)
  .superRefine(requireChoicesForChoiceType);

export const updateInspectionTemplateItemSchema = z
  .object({
    label: z.string().trim().min(1, "Label is required.").max(300).optional(),
    description: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional().nullable()),
    responseType: z.enum(INSPECTION_RESPONSE_TYPES).optional(),
    isRequired: z.boolean().optional(),
    allowNote: z.boolean().optional(),
    choices: z.array(z.string().trim().min(1).max(120)).max(20).optional().nullable(),
    sortOrder: z.number().int().min(0).max(10000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.responseType === "choice") {
      requireChoicesForChoiceType({ responseType: data.responseType, choices: data.choices ?? undefined }, ctx);
    }
  });

export type CreateInspectionTemplateItemInput = z.infer<typeof createInspectionTemplateItemSchema>;
export type UpdateInspectionTemplateItemInput = z.infer<typeof updateInspectionTemplateItemSchema>;
