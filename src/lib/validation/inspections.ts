import { z } from "zod";

import { INSPECTION_STATUSES } from "@/lib/inspections/constants";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Shared pure rule: when both are present, the scheduled end must not precede the start. */
function checkScheduleOrdering(
  data: { scheduledStartAt?: string | null; scheduledEndAt?: string | null },
  ctx: z.RefinementCtx,
) {
  if (data.scheduledStartAt && data.scheduledEndAt && data.scheduledEndAt < data.scheduledStartAt) {
    ctx.addIssue({
      code: "custom",
      path: ["scheduledEndAt"],
      message: "Scheduled end must be on or after the scheduled start.",
    });
  }
}

export const createInspectionSchema = z
  .object({
    propertyId: z.string().uuid("Select a property."),
    propertyEquipmentId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
    templateId: z.string().uuid("Select an inspection template."),
    scheduledDate: z.preprocess(emptyToUndefined, z.string().regex(DATE_PATTERN, "Enter a valid date.").optional()),
    scheduledStartAt: z.preprocess(emptyToUndefined, z.string().optional()),
    scheduledEndAt: z.preprocess(emptyToUndefined, z.string().optional()),
    inspectorUserId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
    summary: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
  })
  .superRefine(checkScheduleOrdering);

export const updateInspectionSchema = z
  .object({
    propertyEquipmentId: z.preprocess(emptyToUndefined, z.string().uuid().optional().nullable()),
    scheduledDate: z.preprocess(
      emptyToUndefined,
      z.string().regex(DATE_PATTERN, "Enter a valid date.").optional().nullable(),
    ),
    scheduledStartAt: z.preprocess(emptyToUndefined, z.string().optional().nullable()),
    scheduledEndAt: z.preprocess(emptyToUndefined, z.string().optional().nullable()),
    inspectorUserId: z.preprocess(emptyToUndefined, z.string().uuid().optional().nullable()),
    summary: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional().nullable()),
    // Only a transition to 'cancelled' is accepted here — completion has its
    // own dedicated endpoint (validates required items, computes the result).
    status: z.enum(INSPECTION_STATUSES).optional(),
  })
  .superRefine(checkScheduleOrdering);

export const updateInspectionResponseSchema = z.object({
  value: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional().nullable()),
  outcome: z.preprocess(emptyToUndefined, z.enum(["pass", "fail"]).optional().nullable()),
  note: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional().nullable()),
});

export type CreateInspectionInput = z.infer<typeof createInspectionSchema>;
export type UpdateInspectionInput = z.infer<typeof updateInspectionSchema>;
export type UpdateInspectionResponseInput = z.infer<typeof updateInspectionResponseSchema>;
